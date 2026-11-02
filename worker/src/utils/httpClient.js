/**
 * @file worker/src/utils/httpClient.js
 * HTTP client utility with exponential backoff retry and correlation ID tracking.
 */

/**
 * Executes an HTTP fetch with automatic exponential retry on transient failures.
 *
 * @param {string} url
 * @param {RequestInit & { maxRetries?: number, timeoutMs?: number, correlationId?: string }} options
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const timeoutMs = options.timeoutMs ?? 10000;
  const correlationId = options.correlationId || crypto.randomUUID();

  let attempt = 0;
  let delay = 500;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = {
        'x-correlation-id': correlationId,
        ...(options.headers || {}),
      };

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Retry only on 502, 503, 504 server errors
      if (res.status >= 502 && res.status <= 504 && attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timer);

      const isTransient =
        err.name === 'AbortError' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNREFUSED';

      if (isTransient && attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      throw err;
    }
  }
}
