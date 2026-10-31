/**
 * @file worker/src/config/index.js
 * Centralized environment configuration for the background worker.
 */

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  internalApiUrl: (process.env.INTERNAL_API_URL || 'http://localhost:5000/internal').replace(/\/$/, ''),
  internalApiToken: process.env.INTERNAL_API_TOKEN || 'flowclaim-internal-secret-token',
  postgresUrl: process.env.POSTGRES_URL || 'postgres://flowclaim:flowclaim@localhost:5432/flowclaim',

  // S3 / MinIO Configuration
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'flowclaim-receipts',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || true,
  },

  // Gemini AI Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },

  // Worker tuning
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    hammingThreshold: parseInt(process.env.HAMMING_THRESHOLD || '5', 10),
  },
});
