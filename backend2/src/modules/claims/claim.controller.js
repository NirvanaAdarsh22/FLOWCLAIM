import { randomBytes } from "node:crypto";
import Claim from "./claim.model.js";
import { createClaimSchema } from "./claim.validator.js";
import { validateClaimPolicy } from "../policies/policy.service.js";
import { CLAIM_STATUS } from "../../constants/claimStatus.js";

export const createClaim = async (req, res) => {
  try {
    const validation = createClaimSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((i) => i.message)
      });
    }

    const claimId = `CLM-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

    const newClaim = new Claim({
      claimId,
      employeeId: req.user.employeeId,
      ...validation.data,
      status: CLAIM_STATUS.DRAFT
    });

    await newClaim.save();

    return res.status(201).json({
      success: true,
      message: "Expense claim created successfully as draft",
      claim: newClaim
    });
  } catch (error) {
    console.error("Create claim error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create claim"
    });
  }
};

export const getMyClaims = async (req, res) => {
  try {
    const claims = await Claim.find({ employeeId: req.user.employeeId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      claims
    });
  } catch (error) {
    console.error("Get claims error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch claims"
    });
  }
};

export const getClaimById = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findOne({ claimId: id }).lean();

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    // Enforce ownership: employees can only view their own claims
    if (req.user.role === "employee" && claim.employeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own claims."
      });
    }

    return res.status(200).json({
      success: true,
      claim
    });
  } catch (error) {
    console.error("Get claim by ID error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch claim details"
    });
  }
};

export const submitClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findOne({ claimId: id });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    if (claim.employeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only submit your own claims."
      });
    }

    if (claim.status !== CLAIM_STATUS.DRAFT && claim.status !== CLAIM_STATUS.NEEDS_CORRECTION) {
      return res.status(400).json({
        success: false,
        message: `Claim cannot be submitted from status '${claim.status}'`
      });
    }

    // Run deterministic policy checks
    const policyResult = validateClaimPolicy({
      amount: claim.amount,
      category: claim.category,
      expenseDate: claim.expenseDate,
      receiptUrl: claim.receiptUrl
    });

    claim.policyViolations = policyResult.violations;
    claim.status = CLAIM_STATUS.PENDING_MANAGER;

    await claim.save();

    return res.status(200).json({
      success: true,
      message: policyResult.isCompliant
        ? "Claim submitted successfully for manager approval."
        : "Claim submitted with policy warnings and flagged for review.",
      claim
    });
  } catch (error) {
    console.error("Submit claim error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to submit claim"
    });
  }
};
