/**
 * Tests: Hospital onboarding status transitions.
 *
 * Tests the status state machine logic:
 *   NOT_STARTED → IN_PROGRESS → ACTIVE | FAILED
 *
 * These are pure logic tests — no DB or Kafka needed.
 *
 * Run: node --test tests/hospital.status-transitions.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Status transition rules ────────────────────────────
const VALID_TRANSITIONS = {
    hospital_created:      ['knowledge_processing'],
    website_added:         ['knowledge_processing'],
    website_verified:      ['knowledge_processing'],
    bot_configured:        ['knowledge_processing'],
    knowledge_processing:  ['knowledge_ready', 'crawler_failed'],
    knowledge_ready:       ['knowledge_processing'],  // re-activation
    crawler_failed:        ['knowledge_processing'],  // retry
};

const canTransition = (from, to) => {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
};

// ─── Simulate status consumer logic ─────────────────────
const applyStatusEvent = (currentStep, statusEvent) => {
    if (statusEvent.success) {
        if (currentStep !== 'knowledge_processing') {
            return { updated: false, reason: 'Not in processing state' };
        }
        return { updated: true, newStep: 'knowledge_ready', newStatus: 'active' };
    } else {
        if (currentStep !== 'knowledge_processing') {
            return { updated: false, reason: 'Not in processing state' };
        }
        return { updated: true, newStep: 'crawler_failed', newStatus: 'onboarding' };
    }
};

// ─── Tests ──────────────────────────────────────────────
describe('Status transitions — canTransition', () => {
    it('allows hospital_created → knowledge_processing', () => {
        assert.equal(canTransition('hospital_created', 'knowledge_processing'), true);
    });

    it('allows knowledge_processing → knowledge_ready', () => {
        assert.equal(canTransition('knowledge_processing', 'knowledge_ready'), true);
    });

    it('allows knowledge_processing → crawler_failed', () => {
        assert.equal(canTransition('knowledge_processing', 'crawler_failed'), true);
    });

    it('allows crawler_failed → knowledge_processing (retry)', () => {
        assert.equal(canTransition('crawler_failed', 'knowledge_processing'), true);
    });

    it('allows knowledge_ready → knowledge_processing (re-activation)', () => {
        assert.equal(canTransition('knowledge_ready', 'knowledge_processing'), true);
    });

    it('blocks hospital_created → knowledge_ready (skip)', () => {
        assert.equal(canTransition('hospital_created', 'knowledge_ready'), false);
    });

    it('blocks knowledge_ready → crawler_failed', () => {
        assert.equal(canTransition('knowledge_ready', 'crawler_failed'), false);
    });
});

describe('Status consumer — applyStatusEvent', () => {
    it('success event during processing → knowledge_ready + active', () => {
        const result = applyStatusEvent('knowledge_processing', { success: true });
        assert.equal(result.updated, true);
        assert.equal(result.newStep, 'knowledge_ready');
        assert.equal(result.newStatus, 'active');
    });

    it('failure event during processing → crawler_failed', () => {
        const result = applyStatusEvent('knowledge_processing', {
            success: false,
            error: 'Timeout',
        });
        assert.equal(result.updated, true);
        assert.equal(result.newStep, 'crawler_failed');
    });

    it('success event when NOT processing → no update', () => {
        const result = applyStatusEvent('hospital_created', { success: true });
        assert.equal(result.updated, false);
    });

    it('failure event when NOT processing → no update', () => {
        const result = applyStatusEvent('knowledge_ready', { success: false, error: 'x' });
        assert.equal(result.updated, false);
    });
});
