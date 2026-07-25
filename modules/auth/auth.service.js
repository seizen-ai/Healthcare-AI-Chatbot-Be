import authRepository from "./auth.repository.js";
import { AppError } from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import kafkaProducer from "../../kafka/producer/kafka.producer.js";
import { KAFKA_TOPICS } from "../../kafka/topics/kafka.topics.js";
import { EMAIL_TYPES } from "../notification/email/email.types.js";
import { TOKEN_PURPOSES } from "./auth.token.constants.js";
import { generateVerificationToken, hashVerificationToken } from "../../utils/generateVerificationToken.js";
import { generateAuthTokens } from '../../utils/generateAuthTokens.js';



const buildEmailVerificationLink = (rawToken) => {
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${apiBaseUrl}/api/auth/verify-email/${rawToken}`;
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
        const { email, password, username } = data;
        const user = await authRepository.findByEmailOrUsername({
            username,
            email
        });

        if(!user) throw new AppError('There is no user associated with this credentials.', 400);
        if(!user.isVerfied) throw new AppError('Please verify your email to perform this action.', 400);

        const isValid = await bcrypt.compare(password, user.password);
        if(!isValid) throw new AppError('Incorrect credentials, Please check the credentials and try again.', 400);


        const accessToken = await generateAuthTokens(user, data.res);

        return accessToken;
    }

}


export default new authService();
