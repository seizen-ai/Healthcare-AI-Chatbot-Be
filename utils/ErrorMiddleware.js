export const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    return res.status(err.statusCode).json({
        success : false,
        status: err.status,
        message: err.message,
        error : err.errors,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
};