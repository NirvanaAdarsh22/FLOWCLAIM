/**
 * Standard API response helper functions for FlowClaim.
 */

export const successResponse = (res, { status = 200, message = "Success", data = null }) => {
  return res.status(status).json({
    success: true,
    message,
    ...(data !== null ? { data } : {})
  });
};

export const errorResponse = (res, { status = 500, message = "Internal server error", errors = [] }) => {
  return res.status(status).json({
    success: false,
    message,
    ...(errors.length > 0 ? { errors } : {})
  });
};

export default {
  successResponse,
  errorResponse
};
