import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Claim from "./claim.model.js";
import { createClaimSchema } from "./claim.validator.js";
import { validateClaimPolicy } from "../policies/policy.service.js";
import { CLAIM_STATUS } from "../../constants/claimStatus.js";
import { enqueueClaim, enqueueManagerApproval } from "../../integrations/bullmq/queue.js";
import { computeDHash, hammingDistance } from "../../../../packages/fraud-engine/src/index.js";

/**
 * Helper to compute dHash for a local receipt file if available.
 */
const tryComputeFileFingerprint = async (receiptUrl) => {
  if (!receiptUrl) return null;
  try {
    let filePath = null;
    if (receiptUrl.startsWith("/uploads/")) {
      filePath = path.join(process.cwd(), receiptUrl);
    } else if (receiptUrl.includes("/uploads/")) {
      const idx = receiptUrl.indexOf("/uploads/");
      filePath = path.join(process.cwd(), receiptUrl.slice(idx));
    }
    if (filePath && fs.existsSync(filePath)) {
      const bytes = fs.readFileSync(filePath);
      return computeDHash(bytes);
    }
  } catch (err) {
    console.warn("Could not compute dHash for receipt:", err.message);
  }
  return null;
};

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
    const amountMinor = Math.round(validation.data.amount * 100);

    // Try computing dHash if receipt file was uploaded
    let receiptFingerprint = validation.data.receiptFingerprint || null;
    if (!receiptFingerprint && validation.data.receiptUrl) {
      receiptFingerprint = await tryComputeFileFingerprint(validation.data.receiptUrl);
    }

    const newClaim = new Claim({
      claimId,
      employeeId: req.user.employeeId,
      ...validation.data,
      amountMinor,
      receiptFingerprint,
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
    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).lean();

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    // Enforce ownership: employees can only view their own claims (managers & admins can view all)
    if (
      req.user.role === "employee" &&
      claim.employeeId !== req.user.employeeId
    ) {
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
    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

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

    if (
      claim.status !== CLAIM_STATUS.DRAFT &&
      claim.status !== CLAIM_STATUS.NEEDS_CORRECTION &&
      claim.status !== "Draft" &&
      claim.status !== "Needs Correction"
    ) {
      return res.status(400).json({
        success: false,
        message: `Claim cannot be submitted from status '${claim.status}'`
      });
    }

    // 1. Ensure receipt fingerprint is generated
    if (!claim.receiptFingerprint && claim.receiptUrl) {
      claim.receiptFingerprint = await tryComputeFileFingerprint(claim.receiptUrl);
    }

    // 2. Deterministic policy check
    const policyResult = validateClaimPolicy({
      amount: claim.amount,
      category: claim.category,
      expenseDate: claim.expenseDate,
      receiptUrl: claim.receiptUrl
    });
    claim.policyViolations = policyResult.violations;

    // 3. Fraud / Duplicate Check against prior claims in DB
    const priorClaims = await Claim.find({
      claimId: { $ne: claim.claimId },
      status: { $in: [CLAIM_STATUS.APPROVED, CLAIM_STATUS.QUEUED, CLAIM_STATUS.SUBMITTED, CLAIM_STATUS.POSSIBLE_DUPLICATE, CLAIM_STATUS.NEEDS_REVIEW, "Approved", "Submitted"] }
    }).lean();

    let duplicateDetected = false;
    let duplicateReason = "";

    for (const prior of priorClaims) {
      // Check 1: Image Perceptual Hash match (Hamming distance <= 5)
      if (claim.receiptFingerprint && prior.receiptFingerprint) {
        try {
          const dist = hammingDistance(claim.receiptFingerprint, prior.receiptFingerprint);
          if (dist <= 5) {
            duplicateDetected = true;
            duplicateReason = `Duplicate receipt image detected (Hamming distance ${dist} matches claim ${prior.claimId})`;
            break;
          }
        } catch {}
      }

      // Check 2: Same employee, same category, same amount, and same expense date
      const isSameAmount = Math.abs((claim.amountMinor || claim.amount * 100) - (prior.amountMinor || prior.amount * 100)) < 1;
      const isSameDate = new Date(claim.expenseDate).toDateString() === new Date(prior.expenseDate).toDateString();
      if (prior.employeeId === claim.employeeId && prior.category === claim.category && isSameAmount && isSameDate) {
        duplicateDetected = true;
        duplicateReason = `Duplicate expense details detected (Same date, amount, category matches claim ${prior.claimId})`;
        break;
      }
    }

    // 4. Initial status determination
    const fromStatus = claim.status;
    let nextStatus = CLAIM_STATUS.QUEUED;

    if (duplicateDetected) {
      nextStatus = CLAIM_STATUS.POSSIBLE_DUPLICATE;
    } else if (!policyResult.isCompliant || claim.amount > 15000) {
      nextStatus = CLAIM_STATUS.NEEDS_REVIEW;
    }

    claim.status = nextStatus;
    claim.transitions.push({
      from: fromStatus,
      to: nextStatus,
      transitionKey: `claim:${claim.claimId}:transition:${fromStatus}-${nextStatus}`,
      reason: duplicateDetected ? duplicateReason : "Claim submitted for verification",
      actor: req.user.employeeId,
      timestamp: new Date()
    });

    await claim.save();

    // 5. Enqueue claim to BullMQ background worker
    try {
      await enqueueClaim(claim.claimId);
    } catch (queueErr) {
      console.warn("Could not enqueue to BullMQ:", queueErr.message);
    }

    // If clean and auto-approved threshold (< 15000 and compliant) and not duplicate
    if (!duplicateDetected && policyResult.isCompliant && claim.amount <= 15000) {
      // Transition to APPROVED and allocate ledger entry
      claim.status = CLAIM_STATUS.APPROVED;
      claim.ledgerTxId = `TX-${Date.now()}-${claim.claimId}`;
      claim.transitions.push({
        from: CLAIM_STATUS.QUEUED,
        to: CLAIM_STATUS.APPROVED,
        transitionKey: `claim:${claim.claimId}:transition:QUEUED-APPROVED:auto`,
        reason: "Claim verified and auto-approved under policy threshold",
        actor: "SYSTEM",
        timestamp: new Date()
      });
      await claim.save();
    }

    return res.status(200).json({
      success: true,
      message: duplicateDetected
        ? "Warning: Possible duplicate claim detected. Flagged for manager review."
        : claim.status === CLAIM_STATUS.APPROVED
        ? "Claim verified and approved."
        : "Claim submitted and placed in verification queue.",
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

/**
 * Manager Claims - List claims requiring manager review
 */
export const getManagerClaims = async (req, res) => {
  try {
    const claims = await Claim.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      claims
    });
  } catch (error) {
    console.error("Get manager claims error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch manager claims"
    });
  }
};

/**
 * Manager Decision - Approve or Reject claim
 */
export const managerDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!action || !["APPROVE", "REJECT"].includes(action.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'APPROVE' or 'REJECT'"
      });
    }

    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    const normalizedAction = action.toUpperCase();
    const fromStatus = claim.status;
    const toStatus = normalizedAction === "APPROVE" ? CLAIM_STATUS.APPROVED : CLAIM_STATUS.REJECTED;

    claim.status = toStatus;
    claim.managerDecision = {
      decision: normalizedAction,
      notes: notes || `Manager ${normalizedAction === "APPROVE" ? "approved" : "rejected"} claim`,
      decidedBy: req.user.employeeId,
      decidedAt: new Date()
    };

    if (normalizedAction === "APPROVE" && !claim.ledgerTxId) {
      claim.ledgerTxId = `TX-${Date.now()}-${claim.claimId}`;
    }

    claim.transitions.push({
      from: fromStatus,
      to: toStatus,
      transitionKey: `claim:${claim.claimId}:transition:${fromStatus}-${toStatus}:manager`,
      reason: notes || `Manager decision: ${normalizedAction}`,
      actor: req.user.employeeId,
      timestamp: new Date()
    });

    await claim.save();

    // Enqueue manager approval job to BullMQ for asynchronous reconciliation
    try {
      await enqueueManagerApproval({
        claimId: claim.claimId,
        managerId: req.user.employeeId,
        action: normalizedAction,
        reason: notes
      });
    } catch {}

    return res.status(200).json({
      success: true,
      message: `Claim successfully ${normalizedAction === "APPROVE" ? "approved" : "rejected"}.`,
      claim
    });
  } catch (error) {
    console.error("Manager decision error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to record manager decision"
    });
  }
};
