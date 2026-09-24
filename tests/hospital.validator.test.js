/**
 * Tests: hospital.validator — activateBotSchema
 *
 * Run: node --test tests/hospital.validator.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activateBotSchema } from '../core-service/src/modules/hospital/hospital.validator.js';

// ─── Helpers ────────────────────────────────────────────
const parse = (body, params = { hospitalId: '507f1f77bcf86cd799439011' }) =>
    activateBotSchema.safeParse({ body, params });

// ─── website_crawl ──────────────────────────────────────
describe('activateBotSchema — website_crawl', () => {
    it('accepts a valid website_crawl payload', () => {
        const result = parse({ type: 'website_crawl', websiteUrl: 'https://example-hospital.com' });
        assert.equal(result.success, true);
        assert.equal(result.data.body.type, 'website_crawl');
        assert.equal(result.data.body.websiteUrl, 'https://example-hospital.com');
    });

    it('rejects missing websiteUrl', () => {
        const result = parse({ type: 'website_crawl' });
        assert.equal(result.success, false);
    });

    it('rejects non-URL websiteUrl', () => {
        const result = parse({ type: 'website_crawl', websiteUrl: 'not-a-url' });
        assert.equal(result.success, false);
    });

    it('rejects ftp:// protocol', () => {
        const result = parse({ type: 'website_crawl', websiteUrl: 'ftp://files.hospital.com/data' });
        assert.equal(result.success, false);
    });
});

// ─── document_crawl ─────────────────────────────────────
describe('activateBotSchema — document_crawl', () => {
    const validDoc = {
        fileRef: 'uploads/abc123.pdf',
        fileName: 'guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
    };

    it('accepts a valid document_crawl payload', () => {
        const result = parse({ type: 'document_crawl', documents: [validDoc] });
        assert.equal(result.success, true);
        assert.equal(result.data.body.documents.length, 1);
    });

    it('rejects empty documents array', () => {
        const result = parse({ type: 'document_crawl', documents: [] });
        assert.equal(result.success, false);
    });

    it('rejects unsupported MIME type', () => {
        const result = parse({
            type: 'document_crawl',
            documents: [{ ...validDoc, mimeType: 'application/zip' }],
        });
        assert.equal(result.success, false);
    });

    it('rejects file exceeding 10 MB', () => {
        const result = parse({
            type: 'document_crawl',
            documents: [{ ...validDoc, sizeBytes: 11 * 1024 * 1024 }],
        });
        assert.equal(result.success, false);
    });

    it('rejects more than 10 documents', () => {
        const docs = Array.from({ length: 11 }, (_, i) => ({
            ...validDoc,
            fileRef: `file-${i}`,
            fileName: `doc-${i}.pdf`,
        }));
        const result = parse({ type: 'document_crawl', documents: docs });
        assert.equal(result.success, false);
    });

    it('rejects batch total size > 50 MB', () => {
        const docs = Array.from({ length: 6 }, (_, i) => ({
            ...validDoc,
            fileRef: `file-${i}`,
            fileName: `doc-${i}.pdf`,
            sizeBytes: 9 * 1024 * 1024, // 9 MB each × 6 = 54 MB > 50 MB
        }));
        const result = parse({ type: 'document_crawl', documents: docs });
        assert.equal(result.success, false);
    });
});

// ─── Invalid type ───────────────────────────────────────
describe('activateBotSchema — invalid type', () => {
    it('rejects unknown type', () => {
        const result = parse({ type: 'magic_crawl', websiteUrl: 'https://example.com' });
        assert.equal(result.success, false);
    });

    it('rejects missing type', () => {
        const result = parse({ websiteUrl: 'https://example.com' });
        assert.equal(result.success, false);
    });

    it('rejects missing hospitalId param', () => {
        const result = activateBotSchema.safeParse({
            body: { type: 'website_crawl', websiteUrl: 'https://example.com' },
            params: {},
        });
        assert.equal(result.success, false);
    });
});
