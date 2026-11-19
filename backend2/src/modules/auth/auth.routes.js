
import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword
} from "./auth.controller.js";
import {
  authRateLimiter,
  passwordResetRateLimiter
} from "../../middleware/rateLimiter.js";

const router = Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);

router.post("/forgot-password", passwordResetRateLimiter, forgotPassword);
router.post("/reset-password/:token", passwordResetRateLimiter, resetPassword);

export default router;
