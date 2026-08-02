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
import { CacheService } from "../../redis/services/cache.service.js";
import { REDIS_KEYS } from "../../redis/constants/redis.constants.js";

const buildEmailVerificationLink = (rawToken) => {
    const apiBaseUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${apiBaseUrl}/verify-email/${rawToken}`;
};

class authService {

  
    async signup(data) {
        const { username, email, password } = data;

        const existingUser = await authRepository.findByEmailOrUsername({ username, email });

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

        await authRepository.createEmailVerificationToken(newUser._id, tokenHash);

        const verificationLink = buildEmailVerificationLink(rawToken);

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

    async login(data){
        const { email, password, username, cookie } = data;
        const user = await authRepository.findByEmailOrUsername({
            username,
            email
        });

        if(!user) throw new AppError('There is no user associated with this credentials.', 400);
        if(!user.isVerfied) throw new AppError('Please verify your email to perform this action.', 400);

        const isValid = await bcrypt.compare(password, user.password);
        if(!isValid) throw new AppError('Incorrect credentials, Please check the credentials and try again.', 400);


        const accessToken = await generateAuthTokens(user, cookie);

        return {
            message : 'Login Successful',
            accessToken,
        }
    }

    async logout(refreshToken, accessToken) {
    

    if(refreshToken){
        const tokenHash = getTokenHash(refreshToken);
        await authRepository.findRefreshTokenAndDelete(tokenHash);
    }
   

    //Blacklist the token in the centralized redis cache if it's valid and not expired at the current point of time
    if(accessToken){
        const decoded = isValidJwt(accessToken);

        if(!decoded) return;

        //But if jwt is valid then extract the jwtid from the token and mark it as blacklisted in the centralized redis cache
        const jwtid = decoded.jwtid;
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);
        const secondsLeft = decoded.exp - currentTimeInSeconds;
        
        const EXPIRE_TIME =  Math.max(0, secondsLeft);

        if (EXPIRE_TIME > 0) {
            // Use the reusable CacheService instead of the raw redisClient
            await CacheService.set(
                REDIS_KEYS.BLACKLISTED_TOKEN(jwtid), 
                'blacklisted', // Storing a simple string flag
                EXPIRE_TIME
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
            
            // Security Alert: Token reuse detected!
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

        //Generate New Pair
        // NOTE: Make sure your `generateAuthTokens` helper is updated to accept the `cookie` function instead of the raw `res` object!
        const accessToken = await generateAuthTokens(user, cookie, tokenDoc);

        return accessToken;
    }

}


export default new authService();
