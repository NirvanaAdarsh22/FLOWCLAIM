import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import {
  createClaim,
  getMyClaims,
  getClaimById,
  submitClaim
} from "./claim.controller.js";

const router = Router();

// All claims routes require authentication
router.use(authMiddleware);

router.post("/", createClaim);
router.get("/my", getMyClaims);
router.get("/:id", getClaimById);
router.post("/:id/submit", submitClaim);

export default router;
