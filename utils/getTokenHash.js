import crypto from 'crypto';

export const getTokenHash = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
}