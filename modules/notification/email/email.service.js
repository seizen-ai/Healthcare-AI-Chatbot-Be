import emailTransporter from "./email.transporter.js";
import emailConfig from "../config/email.config.js";
import { getEmailTemplate } from "./email.templates.js";

export class EmailService {

    async send({ to, subject, text, html }) {
        const transporter = emailTransporter.getTransporter();

        await transporter.sendMail({
            from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
            to,
            subject,
            text,
            html
        });
    }

    async sendByType(type, { to, data }) {
        const { subject, text, html } = getEmailTemplate(type, data);

        await this.send({ to, subject, text, html });
    }

    async handleEmailEvent(payload) {
        const { type, to, data } = payload;

        if (!type || !to || !data) {
            throw new Error("Invalid email event payload. Required fields: type, to, data");
        }

        await this.sendByType(type, { to, data });
    }

}
