/**
 * Queue configuration and job contract definitions for background workers.
 */

export const QUEUES = {
  RECEIPT_PROCESSING: "receipt-processing",
  AUDIT_LOGGING: "audit-logging",
  EMAIL_NOTIFICATION: "email-notification"
};

export const createReceiptJobPayload = ({ claimId, employeeId, receiptUrl }) => ({
  claimId,
  employeeId,
  receiptUrl,
  timestamp: new Date().toISOString()
});

export default {
  QUEUES,
  createReceiptJobPayload
};
