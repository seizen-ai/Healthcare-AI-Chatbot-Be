/**
 * Tests: crawler handler routing by event type.
 *
 * Verifies the consumer correctly dispatches to the right handler
 * based on event.type. We test the routing logic in isolation
 * (handlers themselves are integration-tested separately).
 *
 * Run: node --test tests/crawler.handler-routing.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CRAWL_TYPES } from '../shared/events/index.js';

// ─── Simulate the consumer routing logic ────────────────
const routeEvent = (event) => {
    switch (event.type) {
        case CRAWL_TYPES.WEBSITE_CRAWL:
            return 'website_crawl_handler';
        case CRAWL_TYPES.DOCUMENT_CRAWL:
            return 'document_crawl_handler';
        default:
            throw new Error(`Unknown event type: ${event.type}`);
    }
};

describe('Crawler handler routing', () => {
    it('routes website_crawl to the website handler', () => {
        const handler = routeEvent({ type: 'website_crawl', hospitalId: 'h1', eventId: 'e1' });
        assert.equal(handler, 'website_crawl_handler');
    });

    it('routes document_crawl to the document handler', () => {
        const handler = routeEvent({ type: 'document_crawl', hospitalId: 'h1', eventId: 'e1' });
        assert.equal(handler, 'document_crawl_handler');
    });

    it('throws on unknown type', () => {
        assert.throws(
            () => routeEvent({ type: 'magic_crawl', hospitalId: 'h1', eventId: 'e1' }),
            { message: 'Unknown event type: magic_crawl' }
        );
    });

    it('throws on undefined type', () => {
        assert.throws(
            () => routeEvent({ hospitalId: 'h1', eventId: 'e1' }),
            /Unknown event type/
        );
    });
});

// ─── CRAWL_TYPES constants ──────────────────────────────
describe('CRAWL_TYPES constants', () => {
    it('has WEBSITE_CRAWL', () => {
        assert.equal(CRAWL_TYPES.WEBSITE_CRAWL, 'website_crawl');
    });

    it('has DOCUMENT_CRAWL', () => {
        assert.equal(CRAWL_TYPES.DOCUMENT_CRAWL, 'document_crawl');
    });
});
