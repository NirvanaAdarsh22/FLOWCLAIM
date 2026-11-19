import { Router } from "express";
import { checkDatabaseHealth } from "../controllers/healthController.js";
import authRoutes from "../modules/auth/auth.routes.js";
import claimRoutes from "../modules/claims/claim.routes.js";
import receiptRoutes from "../modules/receipts/receipt.routes.js";
import protectedRoutes from "./protected.routes.js";

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
router.use("/", protectedRoutes);

export default router;
