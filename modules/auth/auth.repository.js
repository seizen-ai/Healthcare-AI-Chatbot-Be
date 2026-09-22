import { User } from "./auth.model.js";
import { AuthToken, RefreshToken } from "./auth.token.model.js";


class authRepository {

    findUser(query) {
        return User.findOne(query);
    }
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

    // createGenricToken(data) {
    //     return GenericToken.create({
    //         data
    //     });
    // }

    findByEmailOrUsername(identifier) {
        return User.findOne({
            $or: [
                { email: identifier },
                { username: identifier }
            ]
        });
    }

    findUserById(userId) {
        return User.findById(userId);
    }

    findTokenByHash(tokenHash) {
        return RefreshToken.findOne({ tokenHash })
    }
    findTokenAndUpdate(query, work, options) {
        return RefreshToken.findOneAndUpdate(query, work, options);
    }

    markTokenAsUsed(tokenId) {
        AuthToken.findOneAndUpdate({ _id: tokenId }, { used: true });
        return;
    }

    createAuthToken(data) {
        return AuthToken.create(data);
    }

    findActiveToken({ tokenHash, purpose }) {
        return AuthToken.findOne({
            tokenHash,
            purpose,
            used: false,
            expiresAt: { $gt: new Date() }
        });
    }

    // Atomic: find a valid unused token AND mark it as used in one operation
    // Prevents race conditions where two concurrent requests both pass the used=false check
    findActiveTokenAndMarkUsed({ tokenHash, purpose }) {
        return AuthToken.findOneAndUpdate(
            { tokenHash, purpose, used: false, expiresAt: { $gt: new Date() } },
            { $set: { used: true } },
            { new: true }
        );
    }

    // Invalidate all previous unused tokens for a user+purpose before issuing a new one
    invalidatePreviousTokens(userId, purpose) {
        return AuthToken.updateMany(
            { userId, purpose, used: false },
            { $set: { used: true } }
        );
    }



    updateUserPassword(userId, hashedPassword) {
        return User.findByIdAndUpdate(userId, { password: hashedPassword });
    }

    markUserEmailAsVerified(userId) {
        return User.findByIdAndUpdate(userId, { isVerfied: true });
    }

    findRefreshTokenAndDelete(tokenHash) {
        return RefreshToken.findOneAndDelete({ tokenHash });
    }

    deleteManyRefreshToken(userId) {
        RefreshToken.deleteMany({ userId });
        return;
    }

}

export default new authRepository();
