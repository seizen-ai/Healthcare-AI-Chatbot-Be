import nodemailer from "nodemailer";
import dns from "dns";
import emailConfig from "../config/email.config.js";

// Force IPv4 first to fix ENETUNREACH errors on servers with limited IPv6 (like Render)
dns.setDefaultResultOrder("ipv4first");

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
