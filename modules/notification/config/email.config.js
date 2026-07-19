const isProduction = process.env.NODE_ENV === "production";

const getFromAddress = () => {
    return process.env.SMTP_FROM
        || process.env.EMAIL_USER
        || process.env.SMTP_USER;
};

const emailConfig = {
    from: {
        name: process.env.SMTP_FROM_NAME || "Healthcare AI Chatbot",
        address: getFromAddress()
    },

    transport: isProduction
        ? {
            host: process.env.SMTP_HOST || "smtp.sendgrid.net",
            port: Number(process.env.SMTP_PORT) || 2525,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER || "apikey",
                pass: process.env.SENDGRID_API_KEY || process.env.SMTP_PASS
            }
        }
        : {
            service: process.env.SMTP_SERVICE || "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        }
};

export default emailConfig;
