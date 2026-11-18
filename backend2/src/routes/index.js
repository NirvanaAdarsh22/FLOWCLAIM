import protectedRoutes from "./protected.routes.js";
import { Router } from "express";
import { checkDatabaseHealth } from "../controllers/healthController.js";
import authRoutes from "../modules/auth/auth.routes.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FlowClaim API is working"
  });
});

router.get("/health", checkDatabaseHealth);

router.use("/auth", authRoutes);

router.use("/", protectedRoutes);

export default router;
