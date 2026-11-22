/**
 * @file worker/src/worker.js
 * Main entry point for the BullMQ background worker daemon.
 */

import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from './config/index.js';
import { QUEUE_NAME, JOB_NAMES } from './queues/claimQueue.js';
import { createClaimStateClient } from './services/claimStateClient.js';
import { createReceiptStorageClient } from './integrations/s3Client.js';
import { createFraudEngine, createMemoryFingerprintStore, createRedisFingerprintStore } from '@flowclaim/fraud-engine';
import { createReceiptAiAdapter } from './services/stageAdapters.js';
import { createProcessClaimProcessor } from './processors/processClaim.js';
import { createCommitManagerApprovalProcessor } from './processors/commitManagerApproval.js';
import { createReconciliationService } from './services/reconciliationService.js';
import * as policyEngine from '../../packages/policy-engine/src/index.js';
import { createAnomalyEngine } from '../../packages/anomaly-engine/src/index.js';

async function bootstrap() {
  console.log(`[FlowClaim Worker] Initializing on queue '${QUEUE_NAME}' (env: ${config.env})...`);

  // 1. Initialize Redis connection
  let redisConnection;
  try {
    redisConnection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  } catch (err) {
    console.warn(`[FlowClaim Worker] Could not connect to Redis at ${config.redisUrl}, running in offline mode.`);
  }

  // 2. Setup FingerprintStore (Redis or in-memory fallback)
  const fingerprintStore = redisConnection
    ? createRedisFingerprintStore(redisConnection)
    : createMemoryFingerprintStore();

  const fraudEngine = createFraudEngine({
    store: fingerprintStore,
    config: { hammingThreshold: config.worker.hammingThreshold },
  });

  // 3. Initialize ports and stage services
  const claimState = createClaimStateClient();
  const storage = createReceiptStorageClient();
  const receiptAi = createReceiptAiAdapter();
  const anomalyEngine = createAnomalyEngine({ config: { k: 5, threshold: 2.5 } });
  const ledger = {
    async commitClaim(input) {
      return { status: 'COMMITTED', ledgerEntryId: `TX-LEDGER-${input.claimId}-${Date.now()}` };
    },
  };

  const processClaimProcessor = createProcessClaimProcessor({
    claimState,
    storage,
    fraudEngine,
    receiptAi,
    policyEngine,
    anomalyEngine,
    ledger,
  });

  const commitManagerApprovalProcessor = createCommitManagerApprovalProcessor({
    claimState,
    ledger,
  });

  const reconciliationService = createReconciliationService({
    claimState,
  });

  // 4. Router function for BullMQ jobs
  async function jobRouter(job) {
    console.log(`[FlowClaim Worker] Executing job '${job.name}' (id: ${job.id})`);
    switch (job.name) {
      case JOB_NAMES.PROCESS_CLAIM:
        return processClaimProcessor(job);
      case JOB_NAMES.COMMIT_MANAGER_APPROVAL:
        return commitManagerApprovalProcessor(job);
      case JOB_NAMES.RECONCILE_LEDGER:
        return reconciliationService.reconcile();
      default:
        throw new Error(`Unknown job type '${job.name}' received by worker`);
    }
  }

  if (!redisConnection) {
    console.log('[FlowClaim Worker] Offline mode initialized successfully.');
    return { close: async () => {} };
  }

  // 5. Initialize BullMQ Worker
  const worker = new Worker(QUEUE_NAME, jobRouter, {
    connection: redisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`[FlowClaim Worker] Job '${job.name}' (id: ${job.id}) COMPLETED.`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[FlowClaim Worker] Job '${job?.name}' (id: ${job?.id}) FAILED:`, err.message);
    if (job?.data?.claimId) {
      try {
        await claimState.recordFailure(job.data.claimId, {
          stage: job.name,
          code: 'WORKER_JOB_FAILED',
          message: err.message,
          attempt: job.attemptsMade || 1,
        });
      } catch {
        // Suppress secondary reporting errors
      }
    }
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`[FlowClaim Worker] Received ${signal}. Shutting down gracefully...`);
    await worker.close();
    if (redisConnection) redisConnection.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log(`[FlowClaim Worker] Listening with concurrency ${config.worker.concurrency}. Ready.`);
  return worker;
}

// Auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith('worker.js')) {
  bootstrap().catch((err) => {
    console.error('[FlowClaim Worker] Fatal error on startup:', err);
    process.exit(1);
  });
}

export { bootstrap };
