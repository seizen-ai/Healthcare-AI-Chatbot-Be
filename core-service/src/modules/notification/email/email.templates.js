import { EMAIL_TYPES } from "./email.types.js";

const templates = {
    [EMAIL_TYPES.EMAIL_VERIFICATION]: ({ username, verificationLink }) => ({
        subject: "Verify your email address",
        text: `Hi ${username},\n\nPlease verify your email by clicking the link below:\n${verificationLink}\n\nThis link expires in 15 minutes.\n\nIf you did not create an account, please ignore this email.`,
        html: `
            <p>Hi <strong>${username}</strong>,</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p>
                <a href="${verificationLink}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Verify Email
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not create an account, please ignore this email.</p>
        `
    }),

    [EMAIL_TYPES.PASSWORD_RESET]: ({ username, resetLink }) => ({
        subject: "Reset your password",
        text: `Hi ${username},\n\nReset your password using the link below:\n${resetLink}\n\nThis link expires in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
        html: `
            <p>Hi <strong>${username}</strong>,</p>
            <p>Click the button below to reset your password:</p>
            <p>
                <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Reset Password
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
        `
    })
};

export const getEmailTemplate = (type, data) => {
    const template = templates[type];

    if (!template) {
        throw new Error(`Unsupported email type: ${type}`);
    }

    return template(data);
};
