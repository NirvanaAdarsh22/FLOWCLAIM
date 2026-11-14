const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "All expenses fetched sucessfully",
        expenses : []
    });
});

router.get("/:id",(req, res) => {
    res.status(200)    .json({
        success: true,
        message: "Expense details fetched sucessfully",
        expenseId : req.params.id
    });
});

router.post("/",(req,res) => {
    res.status(201).json({
        success : true,
        message : "Expense created successfully",
        expense : req.body
    });
});

module.exports = router;