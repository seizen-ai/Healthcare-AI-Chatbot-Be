import authRepository from "./auth.repository.js";
import { AppError } from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import kafkaProducer from "../../kafka/producer/kafka.producer.js";
import { KAFKA_TOPICS } from "../../kafka/topics/kafka.topics.js";
import { EMAIL_TYPES } from "../notification/email/email.types.js";
import { TOKEN_PURPOSES } from "./auth.token.constants.js";
import { generateVerificationToken, hashVerificationToken } from "../../utils/generateVerificationToken.js";



const buildEmailVerificationLink = (rawToken) => {
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${apiBaseUrl}/api/auth/verify-email/${rawToken}`;
};

class authService {

    async signup(data) {
        const { username, email, password } = data;

        const existingUser = await authRepository.findByEmailOrUsername({ username, email });

        if (existingUser?.email === email) {
            throw new AppError("This email is already registered.", 400);
        }

        if (existingUser?.username === username) {
            throw new AppError("Username is not available.", 400);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await authRepository.createUser({
            username,
            email,
            password: hashedPassword
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

}


export default new authService();
