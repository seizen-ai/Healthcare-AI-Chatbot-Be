import { User } from "./auth.model.js";
import { AuthToken, RefreshToken } from "./auth.token.model.js";
import { EMAIL_VERIFICATION_EXPIRY_MS, TOKEN_PURPOSES } from "./auth.token.constants.js";

class authRepository {

    

    async createUserOrUpdate(email, updateData) {
        return User.findOneAndUpdate(
            { email },
            { $set: updateData }, 
            { 
                new: true, 
                upsert: true,
                setDefaultsOnInsert: true
            }
        );
    }

    async findByEmailOrUsername(data) {
        return User.findOne({
            $or: [
                { email: data.email },
                { username: data.username }
            ]
        });
    }
        
    async findUserById(userId) {
        return User.findById(userId);
    }

    async createEmailVerificationToken(userId, tokenHash) {
        return AuthToken.create({
            userId,
            tokenHash,
            purpose: TOKEN_PURPOSES.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
        });
    }

    async findActiveToken({ tokenHash, purpose }) {
        return AuthToken.findOne({
            tokenHash,
            purpose,
            used: false,
            expiresAt: { $gt: new Date() }
        });
    }

    async markTokenAsUsed(tokenId) {
        return AuthToken.findByIdAndUpdate(tokenId, { used: true });
    }

    async markUserEmailAsVerified(userId) {
        return User.findByIdAndUpdate(userId, { isVerfied: true });
    }

    async findRefreshTokenAndDelete(tokenHash){
        return RefreshToken.findOneAndDelete({ tokenHash });
    }

}

export default new authRepository();
