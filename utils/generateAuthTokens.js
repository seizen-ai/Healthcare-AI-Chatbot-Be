import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RefreshToken } from "../modules/auth/auth.token.model.js";
import { v4 } from 'uuid';


export const generateAuthTokens = async (user, cookie, oldTokenDoc = null) => {
    
    
    let refreshTokenExpiry;
    
    if (oldTokenDoc) {  
        refreshTokenExpiry = oldTokenDoc.expiresAt; 
    } else {    
        refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
    }

    //Generate New Tokens
    const accessToken = jwt.sign({ id: user._id, role: user.role, username: user.username}, process.env.JWT_SECRET_KEY, { expiresIn: '15m', jwtid : v4() });
    const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(newRefreshTokenString).digest('hex');

    
    await RefreshToken.create({
        userId: user._id,
        tokenHash: tokenHash,
        expiresAt: refreshTokenExpiry 
    });

    //Set Cookie with the remaining time
    const remainingTimeMs = refreshTokenExpiry - Date.now();
    
    cookie('refreshToken', newRefreshTokenString, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        signed: true,
        maxAge: remainingTimeMs // Browser cookie bhi usi time par expire hogi!
    });

    return accessToken;
};

export const isValidJwt = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if(!decoded) return {};//Return empty object as jwt is not valid

    return decoded;//Return decoded object as jwt is valid
}