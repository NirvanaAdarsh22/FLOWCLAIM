const express = require("express");
const roleMiddleware = require("../middleware/roleMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protected profile route
router.get("/profile", authMiddleware, (req, res) => {

    res.status(200).json({
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
        res.status(200).json({
            success: true,
            message: "Welcome to Finance Dashboard"
        });
    }
);

module.exports = router;