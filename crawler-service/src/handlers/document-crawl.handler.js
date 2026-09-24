import { chunkText } from '../lib/chunker.js';
import { generateEmbeddings, VECTOR_SIZE } from '../lib/embeddings.js';
import {
    ensureCollection,
    deletePointsByHospital,
    upsertEmbeddedChunks,
} from '../../../shared/qdrant/qdrant.client.js';

// TODO: replace with real S3/GCS download + text extraction (pdf-parse, mammoth)
const fetchDocumentContent = async (fileRef, mimeType) => {
    console.warn(`[DocumentCrawl] fetchDocumentContent is a stub. fileRef=${fileRef}, mimeType=${mimeType}`);
    return `[Document content placeholder for ${fileRef}]`;
};

export const handleDocumentCrawl = async (event) => {
    const { hospitalId, documents } = event;

    if (!documents || documents.length === 0) {
        throw new Error('No documents provided in the event.');
    }

    console.log(`[DocumentCrawl] Starting for hospital ${hospitalId}: ${documents.length} document(s).`);

    const docTexts = [];
    for (const doc of documents) {
        try {
            const text = await fetchDocumentContent(doc.fileRef, doc.mimeType);
            if (text && text.length > 10) {
                docTexts.push({ fileName: doc.fileName, text });
            } else {
                console.warn(`[DocumentCrawl] Empty content for ${doc.fileName}, skipping.`);
            }
        } catch (err) {
            console.error(`[DocumentCrawl] Failed to read ${doc.fileName}: ${err.message}`);
        }
    }

    if (!docTexts.length) {
        throw new Error('No usable content extracted from any of the uploaded documents.');
    }

    console.log(`[DocumentCrawl] Extracted text from ${docTexts.length} document(s).`);

    const allChunks = docTexts.flatMap(({ fileName, text }) =>
        chunkText(text, fileName)
    );
    console.log(`[DocumentCrawl] ${allChunks.length} chunk(s) created.`);

    const embeddedChunks = await generateEmbeddings(allChunks);

    await ensureCollection(VECTOR_SIZE);
    await deletePointsByHospital(hospitalId);
    const vectorCount = await upsertEmbeddedChunks(hospitalId, embeddedChunks);

    console.log(`[DocumentCrawl] Done. ${vectorCount} vector(s) stored.`);

    return { pagesOrFiles: docTexts.length, chunks: allChunks.length };
};
