/**
 * @fileoverview GeminiClientPort implementation for Google Gemini multimodal API and mock offline testing.
 * Follows Master Development Document v1.1 (§6.2).
 * Plain JavaScript ESM only.
 */

export class GeminiUnavailableError extends Error {
  /**
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(message, cause) {
    super(message);
    this.name = 'GeminiUnavailableError';
    this.code = 'MODEL_UNAVAILABLE';
    this.retryable = true;
    this.cause = cause;
  }
}

/**
 * Mock Gemini client for deterministic offline testing.
 */
export class MockGeminiClient {
  /**
   * @param {object} [options]
   * @param {string | ((req: any) => string)} [options.defaultFileResponse]
   * @param {string | ((req: any) => string)} [options.defaultTextResponse]
   * @param {boolean} [options.simulateUnavailable]
   */
  constructor(options = {}) {
    this.defaultFileResponse = options.defaultFileResponse || JSON.stringify({
      merchant: 'Fresh Supplies Pvt Ltd',
      transactionDate: '2026-11-01',
      currency: 'INR',
      subtotalMinor: 450000,
      taxMinor: 50000,
      totalMinor: 500000,
      lineItems: [
        { description: 'Printer paper ream', quantity: 5, amountMinor: 500000 },
      ],
      fieldConfidence: { merchant: 0.98, totalMinor: 0.99, transactionDate: 0.95 },
    });
    this.defaultTextResponse = options.defaultTextResponse || 'The expense violates policy rule: Amount exceeds maximum threshold for category.';
    this.simulateUnavailable = Boolean(options.simulateUnavailable);
    this.calls = [];
  }

  /**
   * @param {{ model: string, systemInstruction?: string, prompt: string, file: { bytes: Uint8Array, mimeType: string }, responseJsonSchema?: any }} req
   * @returns {Promise<{ text: string }>}
   */
  async generateFromFile(req) {
    this.calls.push({ type: 'generateFromFile', ...req });
    if (this.simulateUnavailable) {
      throw new GeminiUnavailableError('Gemini API is temporarily unavailable (503 Service Unavailable)');
    }

    const text =
      typeof this.defaultFileResponse === 'function'
        ? this.defaultFileResponse(req)
        : this.defaultFileResponse;

    return { text };
  }

  /**
   * @param {{ model: string, systemInstruction?: string, prompt: string }} req
   * @returns {Promise<{ text: string }>}
   */
  async generateText(req) {
    this.calls.push({ type: 'generateText', ...req });
    if (this.simulateUnavailable) {
      throw new GeminiUnavailableError('Gemini API rate limit exceeded (429 Too Many Requests)');
    }

    const text =
      typeof this.defaultTextResponse === 'function'
        ? this.defaultTextResponse(req)
        : this.defaultTextResponse;

    return { text };
  }
}

/**
 * Real Gemini API client calling Google Gemini REST API v1beta.
 */
export class GoogleGeminiClient {
  /**
   * @param {{ apiKey?: string, baseUrl?: string }} [config]
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Converts Uint8Array to base64 string.
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  #toBase64(bytes) {
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * @param {{ model: string, systemInstruction?: string, prompt: string, file: { bytes: Uint8Array, mimeType: string }, responseJsonSchema?: any }} req
   * @returns {Promise<{ text: string }>}
   */
  async generateFromFile(req) {
    if (!this.apiKey) {
      throw new GeminiUnavailableError('GEMINI_API_KEY is not configured');
    }

    const modelId = req.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`;

    const parts = [
      { text: req.prompt },
      {
        inlineData: {
          mimeType: req.file.mimeType,
          data: this.#toBase64(req.file.bytes),
        },
      },
    ];

    const body = {
      contents: [{ parts }],
    };

    if (req.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: req.systemInstruction }],
      };
    }

    if (req.responseJsonSchema) {
      body.generationConfig = {
        responseMimeType: 'application/json',
        responseSchema: req.responseJsonSchema,
      };
    }

    return this.#executeRequest(url, body);
  }

  /**
   * @param {{ model: string, systemInstruction?: string, prompt: string }} req
   * @returns {Promise<{ text: string }>}
   */
  async generateText(req) {
    if (!this.apiKey) {
      throw new GeminiUnavailableError('GEMINI_API_KEY is not configured');
    }

    const modelId = req.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const url = `${this.baseUrl}/models/${modelId}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [{ parts: [{ text: req.prompt }] }],
    };

    if (req.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: req.systemInstruction }],
      };
    }

    return this.#executeRequest(url, body);
  }

  /**
   * @param {string} url
   * @param {any} body
   * @returns {Promise<{ text: string }>}
   */
  async #executeRequest(url, body) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      throw new GeminiUnavailableError(`Network connection to Gemini API failed: ${networkErr.message}`, networkErr);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (response.status === 429 || response.status >= 500) {
        throw new GeminiUnavailableError(
          `Gemini API returned retryable HTTP ${response.status}: ${errText}`
        );
      }
      throw new Error(`Gemini API returned error HTTP ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const candidate = json.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error('Gemini API returned empty candidate text');
    }

    return { text: textPart };
  }
}
