import mongoose from "mongoose";
import { CLAIM_STATUS, ALL_CLAIM_STATUSES } from "../../constants/claimStatus.js";

const claimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    employeeId: {
      type: String,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ["Travel", "Food", "Accommodation", "Fuel", "Office Supplies", "Other"],
      required: true
    },
    expenseDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    amountMinor: {
      type: Number,
      default: function () {
        return Math.round((this.amount || 0) * 100);
      }
    },
    currency: {
      type: String,
      default: "INR"
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    receiptUrl: {
      type: String,
      default: null
    },
    receiptFingerprint: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ALL_CLAIM_STATUSES,
      default: CLAIM_STATUS.DRAFT
    },
    policyViolations: {
      type: [String],
      default: []
    },
    stageResults: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    transitions: [
      {
        from: String,
        to: String,
        transitionKey: String,
        reason: String,
        actor: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],
    failures: [
      {
        stage: String,
        code: String,
        message: String,
        attempt: Number,
        timestamp: { type: Date, default: Date.now }
      }
    ],
    managerDecision: {
      decision: String,
      notes: String,
      decidedBy: String,
      decidedAt: Date
    },
    ledgerTxId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure amountMinor is set
claimSchema.pre("save", function () {
  if (this.amount != null && !this.amountMinor) {
    this.amountMinor = Math.round(this.amount * 100);
  }
});

const Claim = mongoose.model("Claim", claimSchema);

export default Claim;
