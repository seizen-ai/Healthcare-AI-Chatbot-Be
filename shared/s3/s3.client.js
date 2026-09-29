import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import { pipeline } from 'stream/promises';

const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION || 'us-east-005',
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.B2_BUCKET;

export const streamUpload = async (readableStream, key, contentType, abortSignal) => {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: BUCKET,
            Key: key,
            Body: readableStream,
            ContentType: contentType,
        },
        queueSize: 1,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
        abortController: abortSignal ? { signal: abortSignal } : undefined,
    });

    await upload.done();
};

export const deleteObject = async (key) => {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

export const getObjectStream = (key) => {
    return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
};

export const downloadToTempFile = async (fileRef, tempPath) => {
    const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: fileRef,
    }));

    await pipeline(response.Body, fs.createWriteStream(tempPath));
};

export default s3;
