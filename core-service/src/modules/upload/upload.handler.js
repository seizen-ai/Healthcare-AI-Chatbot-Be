import { createHash } from 'crypto';
import { Transform, PassThrough, pipeline as pipelineCb } from 'stream';
import { promisify } from 'util';
import Busboy from 'busboy';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../../utils/AppError.js';
import { streamUpload, deleteObject } from '../../../../shared/s3/s3.client.js';
import knowledgeDocFileRepository from './knowledgeDocFile.repository.js';
import mongoose from 'mongoose';

const pipeline = promisify(pipelineCb);

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DOCS_PER_HOSPITAL = 20;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt']);

const ALLOWED_MIME_MAP = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
};

const sanitizeFileName = (name) =>
    name
        .replace(/[/\\:\x00-\x1f]/g, '_')
        .replace(/\.{2,}/g, '.')
        .slice(0, 200);

const getExtension = (filename) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const PDF_MAGIC = Buffer.from('%PDF');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const detectTypeFromBytes = (buffer, extension) => {
    if (extension === 'pdf') {
        return buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC);
    }
    if (extension === 'docx') {
        if (buffer.length < 4 || !buffer.subarray(0, 4).equals(ZIP_MAGIC)) return false;
        return true;
    }
    if (extension === 'txt') {
        try {
            const decoded = new TextDecoder('utf-8', { fatal: true });
            decoded.decode(buffer.subarray(0, Math.min(buffer.length, 512)));
            return true;
        } catch {
            return false;
        }
    }
    return false;
};

class MagicByteValidatorTransform extends Transform {
    constructor(extension, onValidated) {
        super();
        this._headerBuf = Buffer.alloc(0);
        this._validated = false;
        this._extension = extension;
        this._onValidated = onValidated;
    }

    _transform(chunk, _encoding, callback) {
        if (!this._validated) {
            this._headerBuf = Buffer.concat([this._headerBuf, chunk]);
            if (this._headerBuf.length >= 8) {
                if (!detectTypeFromBytes(this._headerBuf, this._extension)) {
                    return callback(new AppError('File content does not match declared type (magic byte check failed).', 400));
                }
                this._validated = true;
                this._onValidated?.();
                this.push(this._headerBuf);
                this._headerBuf = null;
            }
            return callback();
        }
        this.push(chunk);
        callback();
    }

    _flush(callback) {
        if (!this._validated && this._headerBuf?.length > 0) {
            if (!detectTypeFromBytes(this._headerBuf, this._extension)) {
                return callback(new AppError('File content does not match declared type (magic byte check failed).', 400));
            }
            this.push(this._headerBuf);
        }
        callback();
    }
}

class SizeLimitTransform extends Transform {
    constructor(maxBytes) {
        super();
        this._totalBytes = 0;
        this._maxBytes = maxBytes;
    }

    _transform(chunk, _encoding, callback) {
        this._totalBytes += chunk.length;
        if (this._totalBytes > this._maxBytes) {
            return callback(new AppError(`File exceeds the ${this._maxBytes / (1024 * 1024)} MB per-file limit.`, 400));
        }
        this.push(chunk);
        callback();
    }

    get totalBytes() {
        return this._totalBytes;
    }
}

class HashTransform extends Transform {
    constructor() {
        super();
        this._hash = createHash('sha256');
    }

    _transform(chunk, _encoding, callback) {
        this._hash.update(chunk);
        this.push(chunk);
        callback();
    }

    get digest() {
        return this._hash.digest('hex');
    }
}

export const streamingUploadHandler = (req, res, next) => {
    const hospitalId = req.params.hospitalId;
    // client-provided hash is no longer used; hash will be calculated on server
    let fileProcessed = false;
    let uploadedKey = null;
    let finished = false;

    const finish = (err) => {
        if (finished) return;
        finished = true;
        if (err) return next(err);
    };

    const busboy = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: MAX_FILE_SIZE + 1 },
    });

    // No hash field expected from client; ignore any fields.

    busboy.on('file', async (fieldName, fileStream, info) => {
        if (fileProcessed) {
            fileStream.resume();
            return;
        }
        fileProcessed = true;

        const { filename: rawFileName, mimeType: declaredMime } = info;

        try {
            const ext = getExtension(rawFileName);
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                fileStream.resume();
                return finish(new AppError(`Unsupported file extension ".${ext}". Allowed: pdf, docx, txt.`, 400));
            }

            const mimeExt = ALLOWED_MIME_MAP[declaredMime];
            if (!mimeExt) {
                fileStream.resume();
                return finish(new AppError(`Unsupported MIME type "${declaredMime}". Allowed: pdf, docx, txt.`, 400));
            }

            if (mimeExt !== ext) {
                fileStream.resume();
                return finish(new AppError(`MIME type "${declaredMime}" does not match file extension ".${ext}".`, 400));
            }

            // Duplicate check will be performed after server hash calculation.

            const { count, totalSize } = await knowledgeDocFileRepository.getHospitalDocStats(
                new mongoose.Types.ObjectId(hospitalId)
            );
            if (count >= MAX_DOCS_PER_HOSPITAL) {
                fileStream.resume();
                return finish(new AppError(`Document limit reached. Maximum ${MAX_DOCS_PER_HOSPITAL} documents per hospital.`, 400));
            }

            const sanitized = sanitizeFileName(rawFileName);
            const objectKey = `${hospitalId}/${uuidv4()}-${sanitized}`;

            const sizeLimiter = new SizeLimitTransform(MAX_FILE_SIZE);
            const hashTransform = new HashTransform();
            const magicValidator = new MagicByteValidatorTransform(ext, () => {
                const estimatedNewTotal = totalSize + MAX_FILE_SIZE;
                if (estimatedNewTotal > MAX_TOTAL_SIZE && totalSize > 0) {
                    // We'll do exact check after we know actual size
                }
            });

            const uploadTarget = new PassThrough();

            const uploadPromise = streamUpload(uploadTarget, objectKey, declaredMime)
                .then(() => { uploadedKey = objectKey; });

            const pipelinePromise = pipeline(
                fileStream,
                magicValidator,
                sizeLimiter,
                hashTransform,
                uploadTarget
            );

            await Promise.all([pipelinePromise, uploadPromise]);

            const actualSize = sizeLimiter.totalBytes;
            const serverHash = hashTransform.digest;

            // Check for duplicate based on server-calculated hash
            const existingDup = await knowledgeDocFileRepository.findByHospitalAndHash(hospitalId, serverHash);
            if (existingDup) {
                // Duplicate found, clean up uploaded object and respond
                await deleteObject(objectKey).catch(() => {});
                return res.status(200).json({
                    status: 'already_uploaded',
                    file: { id: existingDup._id, fileName: existingDup.fileName, fileRef: existingDup.fileRef },
                });
            }

            if (totalSize + actualSize > MAX_TOTAL_SIZE) {
                await deleteObject(objectKey);
                return finish(new AppError(
                    `Total storage limit exceeded. Maximum ${MAX_TOTAL_SIZE / (1024 * 1024)} MB total across all documents.`,
                    400
                ));
            }

            // No client hash to compare; serverHash is authoritative.

            let doc;
            try {
                doc = await knowledgeDocFileRepository.create({
                    hospitalId,
                    fileName: rawFileName,
                    mimeType: declaredMime,
                    sizeBytes: actualSize,
                    hash: serverHash,
                    fileRef: objectKey,
                    status: 'UPLOADED',
                });
            } catch (err) {
                if (err.code === 11000) {
                    await deleteObject(objectKey);
                    const existing = await knowledgeDocFileRepository.findByHospitalAndHash(hospitalId, serverHash);
                    if (existing) {
                        finished = true;
                        return res.status(200).json({
                            status: 'already_uploaded',
                            file: { id: existing._id, fileName: existing.fileName, fileRef: existing.fileRef },
                        });
                    }
                }
                throw err;
            }

            finished = true;
            return res.status(201).json({
                id: doc._id,
                fileName: doc.fileName,
                fileRef: doc.fileRef,
                mimeType: doc.mimeType,
                sizeBytes: doc.sizeBytes,
            });
        } catch (err) {
            if (uploadedKey) {
                await deleteObject(uploadedKey).catch(() => {});
            }
            return finish(err);
        }
    });

    busboy.on('error', (err) => finish(err));
    busboy.on('close', () => {
        if (!fileProcessed && !finished) {
            finish(new AppError('No file provided in the request.', 400));
        }
    });

    req.pipe(busboy);
};
