import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import roleMiddleware from "../../middleware/roleMiddleware.js";
import {
  createClaim,
  getMyClaims,
  getClaimById,
  submitClaim,
  getManagerClaims,
  managerDecision
} from "./claim.controller.js";

const router = Router();

// All claims routes require authentication
router.use(authMiddleware);

router.post("/", createClaim);
router.get("/my", getMyClaims);
router.get("/manager", roleMiddleware("manager", "admin"), getManagerClaims);
router.post("/:id/decision", roleMiddleware("manager", "admin"), managerDecision);
router.get("/:id", getClaimById);
router.post("/:id/submit", submitClaim);

export default router;
