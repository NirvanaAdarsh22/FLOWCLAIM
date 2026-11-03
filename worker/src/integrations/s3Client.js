/**
 * @file worker/src/integrations/s3Client.js
 * ReceiptStoragePort implementation for retrieving receipt files from S3 or MinIO.
 */

import { config } from '../config/index.js';

/**
 * Creates an S3 storage client implementing ReceiptStoragePort.
 *
 * @param {object} [customConfig]
 * @returns {import('@flowclaim/shared-types').ReceiptStoragePort}
 */
export function createReceiptStorageClient(customConfig = {}) {
  const s3Config = customConfig.s3 || config.s3;

  return {
    /**
     * Retrieves receipt file bytes and content type by objectKey.
     *
     * @param {string} objectKey
     * @returns {Promise<{ bytes: Uint8Array, contentType: string }>}
     */
    async getObject(objectKey) {
      if (!objectKey) {
        throw new Error('objectKey is required to retrieve receipt object');
      }

      // Check for in-memory or fixture test overrides
      if (customConfig.mockObjects && customConfig.mockObjects[objectKey]) {
        const mock = customConfig.mockObjects[objectKey];
        return {
          bytes: mock.bytes instanceof Uint8Array ? mock.bytes : new Uint8Array(Buffer.from(mock.bytes)),
          contentType: mock.contentType || 'image/jpeg',
        };
      }

      const endpoint = s3Config.endpoint.replace(/\/$/, '');
      const bucket = s3Config.bucket;
      const url = s3Config.forcePathStyle
        ? `${endpoint}/${bucket}/${encodeURIComponent(objectKey)}`
        : `https://${bucket}.${endpoint.replace(/^https?:\/\//, '')}/${encodeURIComponent(objectKey)}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch receipt object '${objectKey}' from S3: HTTP ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'application/octet-stream';

      return {
        bytes: new Uint8Array(arrayBuffer),
        contentType,
      };
    },
  };
}
