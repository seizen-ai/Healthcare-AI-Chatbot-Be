import crypto from 'crypto';

// Secure 6-digit OTP generation
const generateEmailOTP = () => {
  return crypto.randomInt(100000, 999999).toString(); 
};

export default generateEmailOTP;