import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { downloadToTempFile } from '../lib/storage.js';
import { extractText } from '../lib/extractors.js';
import { chunkText } from '../lib/chunker.js';
import { generateEmbeddings, VECTOR_SIZE } from '../lib/embeddings.js';
import {
    ensureCollection,
    upsertEmbeddedChunks,
    deletePointsByIngestionId,
    deletePointsByHospitalExceptIngestion,
} from '../../../shared/qdrant/qdrant.client.js';

const TEMP_DIR = os.tmpdir();

export const handleDocumentCrawl = async (event) => {
    const { hospitalId, documents, eventId: ingestionId } = event;

    if (!documents || documents.length === 0) {
        throw new Error('No documents provided in the event.');
    }

    console.log(`[DocumentCrawl] Starting for hospital ${hospitalId}: ${documents.length} document(s), ingestionId=${ingestionId}.`);

    const tempFiles = [];

    try {
        // Phase 1: Extract all
        const docTexts = [];
        for (const doc of documents) {
            const tempPath = path.join(TEMP_DIR, `${uuidv4()}-${path.basename(doc.fileName)}`);
            tempFiles.push(tempPath);

            try {
                await downloadToTempFile(doc.fileRef, tempPath);
                const text = await extractText(tempPath, doc.mimeType);

                if (!text || text.trim().length < 10) {
                    throw new Error(`Empty or near-empty content extracted from ${doc.fileName}.`);
                }

                docTexts.push({ fileName: doc.fileName, fileRef: doc.fileRef, text });
            } catch (err) {
                throw new Error(`Extraction failed for "${doc.fileName}": ${err.message}`);
            }
        }

        console.log(`[DocumentCrawl] Extracted text from ${docTexts.length} document(s).`);

        // Phase 2: Chunk all
        const allChunks = docTexts.flatMap(({ fileName, fileRef, text }) =>
            chunkText(text, fileName).map((chunk) => ({ ...chunk, fileRef }))
        );
        console.log(`[DocumentCrawl] ${allChunks.length} chunk(s) created.`);

        // Phase 3: Embed all
        const embeddedChunks = await generateEmbeddings(allChunks);

        // Phase 4: Write to Qdrant (all-or-nothing)
        await ensureCollection(VECTOR_SIZE);

        let vectorCount;
        try {
            vectorCount = await upsertEmbeddedChunks(hospitalId, ingestionId, embeddedChunks);
        } catch (err) {
            console.error(`[DocumentCrawl] Qdrant upsert failed, running compensation: ${err.message}`);
            await deletePointsByIngestionId(ingestionId);
            throw new Error(`Qdrant write failed: ${err.message}`);
        }

        // Success: delete old ingestion points
        await deletePointsByHospitalExceptIngestion(hospitalId, ingestionId);

        console.log(`[DocumentCrawl] Done. ${vectorCount} vector(s) stored.`);

        return { pagesOrFiles: docTexts.length, chunks: allChunks.length };
    } finally {
        for (const tempPath of tempFiles) {
            await fs.unlink(tempPath).catch(() => {});
        }
    }
};
