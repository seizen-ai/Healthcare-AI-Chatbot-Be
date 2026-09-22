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

    transport: {
        service: process.env.SMTP_SERVICE || "gmail",
        port: 2525,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    }
};

export default emailConfig;
