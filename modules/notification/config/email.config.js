const isProduction = process.env.NODE_ENV === "production";

const getFromAddress = () => {
    return process.env.SMTP_FROM
        || process.env.EMAIL_USER
        || process.env.SMTP_USER;
};

const emailConfig = {
    from: {
        name: isProduction ? process.env.SENDGRID_FROM : (process.env.SMTP_FROM_NAME || "Seizen-AI"),
        address: getFromAddress()
    },

    transport: isProduction ? {
        host: "smtp.sendgrid.net",
        port: 2525,
        auth: {
            user: "apikey",
            pass: process.env.SENDGRID_API_KEY
        }
    } : {
        host: "smtp.gmail.com",
        port: 587,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    }
};

export default emailConfig;
