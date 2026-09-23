import authRepository from "./auth.repository.js";
import { AppError } from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import kafkaProducer from "../../kafka/producer/kafka.producer.js";
import { KAFKA_TOPICS } from "../../kafka/topics/kafka.topics.js";
import { EMAIL_TYPES } from "../notification/email/email.types.js";
import { TOKEN_PURPOSES } from "./auth.token.constants.js";
import { generateVerificationToken, hashVerificationToken } from "../../utils/generateVerificationToken.js";
import { generateAuthTokens } from '../../utils/generateAuthTokens.js';
import { getTokenHash } from "../../utils/getTokenHash.js";
import { isValidJwt } from "../../utils/generateAuthTokens.js";
import { REDIS_KEYS } from "../../redis/constants/redis.constants.js";
import { cacheService } from "../../redis/index.js";
import { ENDPOINTS } from "./auth.endpoints.js";

import { PASSWORD_RESET_EXPIRY_MS, EMAIL_VERIFICATION_EXPIRY_MS } from "./auth.token.constants.js";

const buildLink = (rawToken, endpoint) => {
    const apiBaseUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${apiBaseUrl}/${endpoint}/${rawToken}`;
};




class authService {

    async forgetPassword(identifier) {
        const user = await authRepository.findByEmailOrUsername(identifier);

        // Security: return same message regardless of whether user exists or is verified
        // This prevents user enumeration attacks
        if (!user || !user.isVerfied) {
            return { message: 'If an account exists with these credentials, a password reset email will be sent.' };
        }

        // Invalidate any previous unused reset tokens before issuing a fresh one
        await authRepository.invalidatePreviousTokens(user._id, TOKEN_PURPOSES.PASSWORD_RESET);

        const { rawToken, tokenHash } = generateVerificationToken();
        const payload = {
            userId: user._id,
            tokenHash,
            purpose: TOKEN_PURPOSES.PASSWORD_RESET,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS)
        };

        await authRepository.createAuthToken(payload);
        const resetLink = buildLink(rawToken, ENDPOINTS.RESET_PASSWORD);

        await kafkaProducer.publish(KAFKA_TOPICS.SEND_EMAIL, {
            type: EMAIL_TYPES.PASSWORD_RESET,
            to: user.email,
            data: {
                username: user.username,
                resetLink
            }
        });

        return { message: 'If an account exists with these credentials, a password reset email will be sent.' };
    }

    async resetPassword({ rawToken, newPassword }) {
        const tokenHash = hashVerificationToken(rawToken);

        // Atomically find a valid, unused, non‑expired reset token and mark it used
        const tokenDoc = await authRepository.findActiveTokenAndMarkUsed({
            tokenHash,
            purpose: TOKEN_PURPOSES.PASSWORD_RESET
        });

        if (!tokenDoc) {
            throw new AppError('Invalid or expired password reset link. Please request a new one.', 400);
        }

        const user = await authRepository.findUserById(tokenDoc.userId);
        if (!user) {
            throw new AppError('User account not found.', 404);
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and invalidate any other unused reset tokens for this user
        await Promise.all([
            authRepository.updateUserPassword(user._id, hashedPassword),
            authRepository.invalidatePreviousTokens(user._id, TOKEN_PURPOSES.PASSWORD_RESET)
        ]);

        return { message: 'Password reset successful. You can now log in with your new password.' };
    }
    async signup(data) {
        const { username, email, password } = data;

        const existingUser = await authRepository.checkExistingUserForSignup({ username, email });
        if (existingUser) {

            if (existingUser.email === email && existingUser.isVerfied) {
                throw new AppError("This email is already registered. Please login.", 400);
            }


            if (existingUser.username === username) {
                if (existingUser.isVerfied) {
                    throw new AppError("Username is not available.", 400);
                }

                if (existingUser.email !== email) {
                    throw new AppError("Username is currently reserved. Please try another.", 400);
                }
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);



        const newUser = await authRepository.createUserOrUpdate(email, {
            username,
            password: hashedPassword,
            isVerfied: false
        });



        const { rawToken, tokenHash } = generateVerificationToken();
        const payload = {
            userId: newUser._id,
            tokenHash,
            purpose: TOKEN_PURPOSES.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
        }
        await authRepository.createAuthToken(payload);

        const verificationLink = buildLink(rawToken, ENDPOINTS.VERIFY_EMAIL);

        await kafkaProducer.publish(KAFKA_TOPICS.SEND_EMAIL, {
            type: EMAIL_TYPES.EMAIL_VERIFICATION,
            to: email,
            data: {
                username,
                verificationLink
            }
        });

        return {
            message: "Verification email sent. Please check your inbox to verify your account."
        };
    }

    async verifyEmail(rawToken) {
        const tokenHash = hashVerificationToken(rawToken);

        const tokenDoc = await authRepository.findActiveToken({
            tokenHash,
            purpose: TOKEN_PURPOSES.EMAIL_VERIFICATION
        });

        if (!tokenDoc) {
            throw new AppError("Invalid or expired verification link.", 400);
        }

        const user = await authRepository.findUserById(tokenDoc.userId);

        if (!user) {
            throw new AppError("User account not found.", 404);
        }

        if (user.isVerfied) {
            throw new AppError("Email is already verified.", 400);
        }

        await authRepository.markUserEmailAsVerified(user._id);
        await authRepository.markTokenAsUsed(tokenDoc._id);

        return {
            message: "Email verified successfully. You can now sign in."
        };
    }

    async login(data) {
        const { identifier, password, cookie } = data;
        const user = await authRepository.findByEmailOrUsername(
            identifier
        );

        if (!user) throw new AppError('There is no user associated with this credentials.', 400);
        if (!user.isVerfied) throw new AppError('Please verify your email to perform this action.', 400);

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new AppError('Incorrect credentials, Please check the credentials and try again.', 400);


        const accessToken = await generateAuthTokens(user, cookie);

        return {
            message: 'Login Successful',
            accessToken,
        }
    }

    async logout(refreshToken, accessToken) {


        if (refreshToken) {
            const tokenHash = getTokenHash(refreshToken);
            await authRepository.findRefreshTokenAndDelete(tokenHash);
        }


        //Blacklist the token in the centralized redis cache if it's valid and not expired at the current point of time
        if (accessToken) {
            const decoded = isValidJwt(accessToken);

            if (!decoded) return;

            //But if jwt is valid then extract the jwtid from the token and mark it as blacklisted in the centralized redis cache
            const jwtid = decoded.jti;
            const currentTimeInSeconds = Math.floor(Date.now() / 1000);
            const secondsLeft = decoded.exp - currentTimeInSeconds;

            const EXPIRE_TIME = Math.max(0, secondsLeft);

            if (EXPIRE_TIME > 0) {
                // Use the reusable CacheService instead of the raw redisClient
                await cacheService.set(
                    REDIS_KEYS.BLACKLISTED_TOKEN(jwtid),
                    'blacklisted', // Storing a simple string flag
                    { ttlSeconds: EXPIRE_TIME }
                );
            }
        }

        return;
    }

    async refresh(data) {
        const { refreshToken, cookie, clearCookie } = data;

        //Check if token exists in request
        if (!refreshToken) {
            throw new AppError('Error : Token not found or Tampered token detected.', 401);
        }

        //Hash the token
        const tokenHash = getTokenHash(refreshToken);

        //Check if exists and it's not used, then mark as used immediately (Atomic operation)
        const tokenDoc = await authRepository.findTokenAndUpdate(
            { tokenHash: tokenHash, used: false },
            { $set: { used: true } },
            { new: true }
        );

        //Handle invalid or reused token
        if (!tokenDoc) {
            const reusedToken = await authRepository.findTokenByHash({ tokenHash });

            //Token reuse detected -> revoke all sessions for this user for their safety -> safety/security > UX
            if (reusedToken && reusedToken.used === true) {
                await authRepository.deleteManyRefreshToken({ userId: reusedToken.userId });

                clearCookie('refreshToken', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    signed: true
                });

                throw new AppError('Security Alert: Suspicious session detected. All devices logged out.', 403);
            }

            throw new AppError('Provided token is expired or invalid.', 401);
        }

        //User Validation
        const user = await authRepository.findUserById(tokenDoc.userId);

        if (!user) {
            clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                signed: true
            });
            throw new AppError('Cannot generate auth tokens for inactive user.', 404);
        }


        const accessToken = await generateAuthTokens(user, cookie, tokenDoc);

        return accessToken;
    }

}


export default new authService();
