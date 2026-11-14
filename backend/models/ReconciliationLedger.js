
const mongoose = require("mongoose");

const reconciliationLedgerSchema = new mongoose.Schema(
    {
        batchId: {
            type: String,
            required: true
        },

        claimId: {
            type: String,
            default: null
        },

        remittanceId: {
            type: String,
            default: null
        },

        employeeId: {
            type: String,
            default: null
        },

        employeeName: {
            type: String,
            default: null
        },

        category: {
            type: String,
            default: null
        },

        merchantName: {
            type: String,
            default: null
        },

        claimedAmount: {
            type: Number,
            default: 0
        },

        expectedAmount: {
            type: Number,
            default: 0
        },

        paidAmount: {
            type: Number,
            default: 0
        },

        variance: {
            type: Number,
            default: 0
        },

        discrepancyType: {
            type: String,
            enum: [
                "Exact Match",
                "Underpayment",
                "Overpayment",
                "Unmatched Claim",
                "Unmatched Remittance"
            ],
            required: true
        },

        settlementStatus: {
            type: String,
            enum: [
                "Matched",
                "Discrepancy",
                "Unsettled"
            ],
            default: "Unsettled"
        }
    },
    {
        timestamps: true
    }
);

const ReconciliationLedger = mongoose.model(
    "ReconciliationLedger",
    reconciliationLedgerSchema
);

module.exports = ReconciliationLedger;
