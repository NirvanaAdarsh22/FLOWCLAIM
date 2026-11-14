
const mongoose = require("mongoose");

const remittanceSchema = new mongoose.Schema(
    {
        remittanceId: {
            type: String,
            required: true,
            unique: true
        },

        claimId: {
            type: String,
            required: true
        },

        employeeId: {
            type: String,
            required: true
        },

        approvedAmount: {
            type: Number,
            required: true,
            min: 0
        },

        paidAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        currency: {
            type: String,
            default: "INR"
        },

        paymentDate: {
            type: Date,
            default: null
        },

        paymentMethod: {
            type: String,
            enum: ["Bank Transfer", "UPI", "Cash", "Other"],
            default: "Bank Transfer"
        },

        transactionReference: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["Pending", "Processing", "Paid", "Failed"],
            default: "Pending"
        }
    },
    {
        timestamps: true
    }
);

const Remittance = mongoose.model(
    "Remittance",
    remittanceSchema
);

module.exports = Remittance;
