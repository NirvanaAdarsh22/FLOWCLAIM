/**
 * S3-compatible object storage interface for FlowClaim receipt uploads.
 * Provides signed upload URL generation for client direct-to-storage uploads.
 */

export const generateUploadCredentials = async (fileName, contentType = "image/jpeg") => {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `receipts/${timestamp}_${sanitized}`;

  return {
    fileKey,
    uploadUrl: `/api/receipts/upload/${encodeURIComponent(fileKey)}`,
    contentType
  };
};

export default {
  generateUploadCredentials
};
