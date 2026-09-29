import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// We mock the magic byte detector logic to test it purely
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

describe('Knowledge Ingestion Tests', () => {
    describe('Upload Flow - Magic Byte Validation', () => {
        it('accepts valid PDF magic bytes', () => {
            const validPdf = Buffer.concat([PDF_MAGIC, Buffer.from('some content')]);
            assert.equal(detectTypeFromBytes(validPdf, 'pdf'), true);
        });

        it('rejects invalid PDF magic bytes', () => {
            const invalidPdf = Buffer.from('this is not a pdf');
            assert.equal(detectTypeFromBytes(invalidPdf, 'pdf'), false);
        });

        it('accepts valid DOCX (ZIP) magic bytes', () => {
            const validDocx = Buffer.concat([ZIP_MAGIC, Buffer.from('word/document.xml')]);
            assert.equal(detectTypeFromBytes(validDocx, 'docx'), true);
        });

        it('rejects invalid DOCX magic bytes', () => {
            const invalidDocx = Buffer.from('not a zip file');
            assert.equal(detectTypeFromBytes(invalidDocx, 'docx'), false);
        });
    });

    describe('Upload Flow - Dedupe & Policy logic (Simulated)', () => {
        const MAX_DOCS = 20;
        const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
        
        let dbDocs = [];
        const simulatedRepo = {
            findByHash: (hash) => dbDocs.find(d => d.hash === hash),
            getStats: () => ({ 
                count: dbDocs.length, 
                totalSize: dbDocs.reduce((acc, doc) => acc + doc.size, 0) 
            }),
            create: (doc) => {
                if (dbDocs.find(d => d.hash === doc.hash)) throw new Error('E11000 duplicate key');
                dbDocs.push(doc);
                return doc;
            }
        };

        it('rejects upload if total size exceeds limit', () => {
            dbDocs = [{ hash: 'h1', size: 8 * 1024 * 1024 }];
            const stats = simulatedRepo.getStats();
            const incomingSize = 3 * 1024 * 1024;
            
            const allowed = (stats.totalSize + incomingSize) <= MAX_TOTAL_SIZE;
            assert.equal(allowed, false);
        });

        it('rejects upload if max docs exceeded', () => {
            dbDocs = Array(20).fill({ hash: 'rand', size: 100 });
            const stats = simulatedRepo.getStats();
            
            const allowed = stats.count < MAX_DOCS;
            assert.equal(allowed, false);
        });

        it('dedupes properly on hash match', () => {
            // Seed a document with a specific hash
            dbDocs = [{ hash: 'hashdup', size: 100, fileRef: 'ref-1' }];
            // Attempt to create another document with the same hash should throw duplicate error
            let threw = false;
            try {
                simulatedRepo.create({ hash: 'hashdup', size: 200, fileRef: 'ref-2' });
            } catch (err) {
                threw = err.message.includes('E11000');
            }
            assert.ok(threw, 'Expected duplicate key error for same hash');
        });

        it('handles DB race condition on insert correctly', () => {
            dbDocs = [{ hash: 'hash1', size: 100 }];
            let caughtError = null;
            let finalDoc = null;
            try {
                simulatedRepo.create({ hash: 'hash1', size: 100 });
            } catch (err) {
                if (err.message.includes('E11000')) {
                    caughtError = true;
                    finalDoc = simulatedRepo.findByHash('hash1');
                }
            }
            assert.ok(caughtError);
            assert.ok(finalDoc);
        });
    });

    describe('Crawler Flow - All-or-nothing (Simulated)', () => {
        it('aborts all-or-nothing if one file fails to extract', async () => {
            const docs = [
                { id: 1, text: 'valid content' },
                { id: 2, text: null }, // fails extraction
            ];

            let qdrantUpserted = false;

            try {
                for (const doc of docs) {
                    if (!doc.text) throw new Error('Extraction failed');
                }
                qdrantUpserted = true;
            } catch (err) {
                assert.match(err.message, /Extraction failed/);
            }

            assert.equal(qdrantUpserted, false);
        });
    });
});
