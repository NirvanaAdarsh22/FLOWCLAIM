import { Router } from "express";
import { checkDatabaseHealth } from "../controllers/healthController.js";
import authRoutes from "../modules/auth/auth.routes.js";
import claimRoutes from "../modules/claims/claim.routes.js";
import receiptRoutes from "../modules/receipts/receipt.routes.js";
import protectedRoutes from "./protected.routes.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { getManagerClaims, managerDecision } from "../modules/claims/claim.controller.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FlowClaim API is working"
  });
});

router.get("/health", checkDatabaseHealth);

router.use("/auth", authRoutes);
router.use("/claims", claimRoutes);
router.use("/receipts", receiptRoutes);

// Manager specific direct routes
router.get("/manager/claims", authMiddleware, roleMiddleware("manager", "admin"), getManagerClaims);
router.post("/manager/claims/:id/decision", authMiddleware, roleMiddleware("manager", "admin"), managerDecision);

router.use("/", protectedRoutes);

export default router;
