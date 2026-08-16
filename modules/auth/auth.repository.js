import { User } from "./auth.model.js";
import { AuthToken, RefreshToken } from "./auth.token.model.js";
import { EMAIL_VERIFICATION_EXPIRY_MS, TOKEN_PURPOSES } from "./auth.token.constants.js";

class authRepository {

    createUserOrUpdate(email, updateData) {
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

    findByEmailOrUsername(data) {
        return User.findOne({
            $or: [
                { email: data.email },
                { username: data.username }
            ]
        });
    }
        
    findUserById(userId) {
        return User.findById(userId);
    }
    
    findTokenByHash(tokenHash){
        return RefreshToken.findOne({ tokenHash })
    }
    findTokenAndUpdate(query, work, options){
         return RefreshToken.findOneAndUpdate(query, work, options);
    }

    markTokenAsUsed(tokenId) {
        AuthToken.findOneAndUpdate({ _id : tokenId }, { used : true });
        return;
    }

    createEmailVerificationToken(userId, tokenHash) {
        return AuthToken.create({
            userId,
            tokenHash,
            purpose: TOKEN_PURPOSES.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
        });
    }

    findActiveToken({ tokenHash, purpose }) {
        return AuthToken.findOne({
            tokenHash,
            purpose,
            used: false,
            expiresAt: { $gt: new Date() }
        });
    }

    

    markUserEmailAsVerified(userId) {
        return User.findByIdAndUpdate(userId, { isVerfied: true });
    }

    findRefreshTokenAndDelete(tokenHash){
        return RefreshToken.findOneAndDelete({ tokenHash });
    }

    deleteManyRefreshToken(userId){
        RefreshToken.deleteMany({ userId });
        return;
    }

}

export default new authRepository();
