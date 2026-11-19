import mongoose from "mongoose";
import { CLAIM_STATUS } from "../../constants/claimStatus.js";

const claimSchema = new mongoose.Schema(
  {
    claimId: {
      type: String,
      required: true,
      unique: true
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
    status: {
      type: String,
      enum: Object.values(CLAIM_STATUS),
      default: CLAIM_STATUS.DRAFT
    },
    policyViolations: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Claim = mongoose.model("Claim", claimSchema);

export default Claim;
