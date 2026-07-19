import mongoose from "mongoose";
import { TOKEN_PURPOSES } from "./auth.token.constants.js";

const authTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true
    },
    purpose: {
        type: String,
        enum: Object.values(TOKEN_PURPOSES),
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    used: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken = mongoose.model("AuthToken", authTokenSchema);
