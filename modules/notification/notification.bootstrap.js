import emailTransporter from "./email/email.transporter.js";
import { startEmailConsumer } from "./consumers/email.consumer.js";

export const startNotificationService = async () => {
    const hasSmtpCredentials = process.env.NODE_ENV === "production"
        ? Boolean(process.env.SENDGRID_API_KEY || process.env.SMTP_PASS)
        : Boolean(
            (process.env.EMAIL_USER)
            && (process.env.EMAIL_PASS)
        );

    if (hasSmtpCredentials) {
        await emailTransporter.verifyConnection();
    } else {
        console.warn("Email credentials are not configured. Emails will not be sent until SMTP is set up.");
    }

    await startEmailConsumer();
    console.log("Notification service started.");
};
