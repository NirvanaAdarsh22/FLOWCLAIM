
import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/profile", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Access granted! You are authenticated.",
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

router.get(
  "/finance/dashboard",
  authMiddleware,
  roleMiddleware("finance_manager", "admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome to Finance Dashboard"
    });
  }
);

export default router;
