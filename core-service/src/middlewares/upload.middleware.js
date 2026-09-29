// middlewares/upload.middleware.js
import multer from 'multer';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
    storage,
    limits: {
        files: 20,
        fileSize: 10 * 1024 * 1024,
    },
}).array('documents', 20);