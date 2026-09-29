import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import { pipeline } from 'stream/promises';

const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
    forcePathStyle: true,
});

const BUCKET = process.env.B2_BUCKET;

export const downloadToTempFile = async (fileRef, tempPath) => {
    const response = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: fileRef,
    }));

    await pipeline(response.Body, fs.createWriteStream(tempPath));
};

export default s3;
