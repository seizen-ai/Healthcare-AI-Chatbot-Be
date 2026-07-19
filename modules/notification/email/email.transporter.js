import nodemailer from "nodemailer";
import emailConfig from "../config/email.config.js";

class EmailTransporter {

    constructor() {
        this.transporter = null;
    }

    getTransporter() {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport(emailConfig.transport);
        }

        return this.transporter;
    }

    async verifyConnection() {
        const transporter = this.getTransporter();
        await transporter.verify();
        console.log("SMTP connection verified successfully.");
    }

}

export default new EmailTransporter();
