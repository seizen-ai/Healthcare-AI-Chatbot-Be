import emailTransporter from "./email/email.transporter.js";
import { startEmailConsumer } from "./consumers/email.consumer.js";

export const startNotificationService = async () => {
    const hasSmtpCredentials = Boolean(
        (process.env.EMAIL_USER)
        && (process.env.EMAIL_PASS)
    );

    if (hasSmtpCredentials) {
        emailTransporter.verifyConnection().catch(error => {
            console.error("Failed to verify SMTP connection. Emails might not send:", error.message);
        });
    } else {
        console.warn("Email credentials are not configured. Emails will not be sent until SMTP is set up.");
    }

    await startEmailConsumer();
    console.log("Notification service started.");
};
