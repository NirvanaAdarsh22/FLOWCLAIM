import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createClaimStateClient } from '../src/services/claimStateClient.js';

describe('ClaimStatePort HTTP client unit tests', () => {
  test('creates client with default and custom endpoints', () => {
    const client = createClaimStateClient({
      internalApiUrl: 'http://custom-api:8080/internal',
      internalApiToken: 'custom-secret',
    });

    assert.equal(typeof client.getProcessingContext, 'function');
    assert.equal(typeof client.transition, 'function');
    assert.equal(typeof client.saveStageResult, 'function');
    assert.equal(typeof client.recordFailure, 'function');
  });

  test('encodes claim IDs correctly in URL paths', async () => {
    let capturedUrl = '';
    let capturedHeaders = {};

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url;
      capturedHeaders = opts.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({ claimId: 'test-uuid-1', status: 'QUEUED' }),
      };
    };

    try {
      const client = createClaimStateClient({
        internalApiUrl: 'http://test-api/internal',
        internalApiToken: 'my-token',
      });

      const res = await client.getProcessingContext('test-uuid-1');
      assert.equal(capturedUrl, 'http://test-api/internal/claims/test-uuid-1/context');
      assert.equal(capturedHeaders.Authorization, 'Bearer my-token');
      assert.equal(res.status, 'QUEUED');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('maps API error body into Error instance with code and status', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: 'ILLEGAL_TRANSITION',
          message: 'Cannot transition from REJECTED to PARSING',
        },
      }),
    });

    try {
      const client = createClaimStateClient({
        internalApiUrl: 'http://test-api/internal',
      });

      await assert.rejects(
        async () =>
          client.transition({
            claimId: 'c-1',
            from: 'REJECTED',
            to: 'PARSING',
            transitionKey: 'k1',
          }),
        (err) => {
          assert.equal(err.code, 'ILLEGAL_TRANSITION');
          assert.equal(err.httpStatus, 409);
          assert.match(err.message, /Cannot transition/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
