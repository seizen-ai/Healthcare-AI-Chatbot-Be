import fs from 'fs/promises';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export const extractText = async (filePath, mimeType) => {
    switch (mimeType) {
        case 'application/pdf':
            return extractPdf(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return extractDocx(filePath);
        case 'text/plain':
            return extractTxt(filePath);
        default:
            throw new Error(`Unsupported mime type for extraction: ${mimeType}`);
    }
};

const extractPdf = async (filePath) => {
    const dataBuffer = await fs.readFile(filePath);
    const result = await pdfParse(dataBuffer);
    return result.text || '';
};

const extractDocx = async (filePath) => {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
};

const extractTxt = async (filePath) => {
    return fs.readFile(filePath, 'utf-8');
};
