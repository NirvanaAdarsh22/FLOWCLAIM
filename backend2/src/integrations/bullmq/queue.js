/**
 * @file backend2/src/integrations/bullmq/queue.js
 * Queue setup and dispatch helper for asynchronous claim processing.
 */

import { Queue } from "bullmq";
import Redis from "ioredis";
import env from "../../config/env.js";

export const QUEUES = {
  CLAIM_PROCESSING: "claim-processing",
  RECEIPT_PROCESSING: "receipt-processing",
  AUDIT_LOGGING: "audit-logging",
  EMAIL_NOTIFICATION: "email-notification"
};

let queueConnection = null;
let claimQueueInstance = null;

export const getClaimQueue = () => {
  if (!claimQueueInstance) {
    try {
      queueConnection = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 3000
      });
      queueConnection.on("error", (err) => {
        // Suppress unhandled Redis connection errors from crashing backend
      });
      claimQueueInstance = new Queue(QUEUES.CLAIM_PROCESSING, {
        connection: queueConnection
      });
    } catch (err) {
      console.warn("[BullMQ] Redis queue initialization warning:", err.message);
    }
  }
  return claimQueueInstance;
};

/**
 * Enqueue a claim for background verification pipeline.
 *
 * @param {string} claimId
 * @param {string} [correlationId]
 * @returns {Promise<any>}
 */
export const enqueueClaim = async (claimId, correlationId = `corr-${Date.now()}`) => {
  try {
    const queue = getClaimQueue();
    if (queue) {
      const job = await queue.add(
        "process-claim",
        { claimId, correlationId },
        { attempts: 3, backoff: { type: "exponential", delay: 1000 } }
      );
      console.log(`[BullMQ] Enqueued claim ${claimId} with job id: ${job.id}`);
      return job;
    }
  } catch (err) {
    console.warn(`[BullMQ] Could not enqueue job to Redis for claim ${claimId}:`, err.message);
  }
  return null;
};

/**
 * Enqueue a manager approval decision job.
 */
export const enqueueManagerApproval = async ({ claimId, managerId, action = "APPROVE", reason = "" }) => {
  try {
    const queue = getClaimQueue();
    if (queue) {
      const job = await queue.add(
        "commit-manager-approval",
        { claimId, managerId, action, reason },
        { attempts: 3, backoff: { type: "exponential", delay: 1000 } }
      );
      console.log(`[BullMQ] Enqueued manager approval for claim ${claimId} with job id: ${job.id}`);
      return job;
    }
  } catch (err) {
    console.warn(`[BullMQ] Could not enqueue manager approval job for claim ${claimId}:`, err.message);
  }
  return null;
};

export default {
  QUEUES,
  getClaimQueue,
  enqueueClaim,
  enqueueManagerApproval
};
