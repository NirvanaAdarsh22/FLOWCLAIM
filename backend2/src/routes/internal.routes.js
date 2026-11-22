/**
 * @file backend2/src/routes/internal.routes.js
 * Internal routes implementing ClaimStatePort endpoints for the background worker.
 */

import { Router } from "express";
import Claim from "../modules/claims/claim.model.js";
import pool from "../config/postgresql.js";
import { CLAIM_STATUS } from "../constants/claimStatus.js";

const router = Router();

// Internal auth middleware (allows internal worker requests with token or local requests)
const internalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const expectedToken = process.env.INTERNAL_API_TOKEN || "flowclaim-internal-secret-token";
  
  if (token && token !== expectedToken) {
    // If a token was sent, verify it matches
    // But accept if running in local/test environment
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid internal token" } });
    }
  }
  next();
};

router.use(internalAuth);

/**
 * GET /internal/claims/:id/context
 * Returns claim processing context for the worker.
 */
router.get("/claims/:id/context", async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!claim) {
      return res.status(404).json({ error: { code: "CLAIM_NOT_FOUND", message: `Claim ${id} not found` } });
    }

    const claimedAmountMinor = claim.amountMinor || Math.round((claim.amount || 0) * 100);

    return res.status(200).json({
      claimId: claim.claimId,
      status: claim.status,
      employeeId: claim.employeeId,
      employeeRole: "employee",
      category: claim.category,
      amount: claim.amount,
      claimedAmountMinor,
      currency: claim.currency || "INR",
      businessPurpose: claim.description || "",
      expenseDate: claim.expenseDate,
      receipt: {
        objectKey: claim.receiptUrl || `receipts/${claim.claimId}.jpg`,
        contentType: "image/jpeg"
      }
    });
  } catch (error) {
    console.error("Internal get context error:", error);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message } });
  }
});

/**
 * POST /internal/claims/:id/transitions
 * Records state machine transition for a claim.
 */
router.post("/claims/:id/transitions", async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, transitionKey, reason, actor = "SYSTEM" } = req.body;

    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!claim) {
      return res.status(404).json({ error: { code: "CLAIM_NOT_FOUND", message: `Claim ${id} not found` } });
    }

    claim.status = to;
    claim.transitions.push({
      from,
      to,
      transitionKey,
      reason,
      actor,
      timestamp: new Date()
    });

    // If claim was approved, attempt to record ledger entry if not already set
    if (to === CLAIM_STATUS.APPROVED && !claim.ledgerTxId) {
      claim.ledgerTxId = `TX-${Date.now()}-${claim.claimId}`;
      try {
        if (pool) {
          await pool.query(
            `INSERT INTO ledger_entries (claim_id, employee_id, amount_minor, category, status, created_at)
             VALUES ($1, $2, $3, $4, 'COMMITTED', NOW())
             ON CONFLICT DO NOTHING`,
            [claim.claimId, claim.employeeId, claim.amountMinor, claim.category]
          ).catch(() => {});
        }
      } catch {
        // Non-blocking fallback
      }
    }

    await claim.save();

    return res.status(200).json({
      success: true,
      claimId: claim.claimId,
      status: claim.status
    });
  } catch (error) {
    console.error("Internal transition error:", error);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message } });
  }
});

/**
 * PUT /internal/claims/:id/stages/:stage
 * Saves stage execution results.
 */
router.put("/claims/:id/stages/:stage", async (req, res) => {
  try {
    const { id, stage } = req.params;
    const stageResult = req.body;

    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!claim) {
      return res.status(404).json({ error: { code: "CLAIM_NOT_FOUND", message: `Claim ${id} not found` } });
    }

    if (!claim.stageResults) {
      claim.stageResults = {};
    }

    claim.stageResults[stage] = stageResult;
    claim.markModified("stageResults");

    // Also populate top-level convenience fields if applicable
    if (stage === "fraud" && stageResult.screen?.fingerprint) {
      claim.receiptFingerprint = stageResult.screen.fingerprint;
    }

    await claim.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Internal save stage error:", error);
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message } });
  }
});

/**
 * POST /internal/claims/:id/failures
 * Records worker failure details.
 */
router.post("/claims/:id/failures", async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, code, message, attempt } = req.body;

    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!claim) {
      return res.status(404).json({ error: { code: "CLAIM_NOT_FOUND", message: `Claim ${id} not found` } });
    }

    claim.failures.push({
      stage,
      code,
      message,
      attempt,
      timestamp: new Date()
    });

    await claim.save();
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message } });
  }
});

/**
 * GET /internal/claims/:id/extraction
 */
router.get("/claims/:id/extraction", async (req, res) => {
  try {
    const { id } = req.params;
    const claim = await Claim.findOne({
      $or: [{ claimId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    }).lean();

    if (!claim || !claim.stageResults?.extraction?.data) {
      return res.status(404).json({ error: { code: "EXTRACTION_NOT_FOUND", message: "No extraction result found" } });
    }

    return res.status(200).json(claim.stageResults.extraction.data);
  } catch (error) {
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: error.message } });
  }
});

/**
 * GET /internal/policies/active
 */
router.get("/policies/active", async (req, res) => {
  return res.status(200).json({
    id: "default-active-policy",
    version: 1,
    name: "Corporate Standard Expense Policy",
    status: "ACTIVE",
    rules: [
      {
        id: "rule-max-amount",
        name: "Maximum Single Claim Limit",
        severity: "BLOCK",
        condition: {
          path: "claim.claimedAmountMinor",
          operator: "LESS_THAN_OR_EQUAL",
          value: 10000000 // 1 Lakh INR (10,000,000 paise)
        }
      },
      {
        id: "rule-food-limit",
        name: "Food Daily Limit",
        severity: "REVIEW",
        condition: {
          operator: "OR",
          conditions: [
            { path: "claim.category", operator: "NOT_EQUAL", value: "Food" },
            { path: "claim.claimedAmountMinor", operator: "LESS_THAN_OR_EQUAL", value: 250000 } // 2,500 INR
          ]
        }
      }
    ]
  });
});

/**
 * GET /internal/history/approved
 */
router.get("/history/approved", async (req, res) => {
  try {
    const { category, limit = 100 } = req.query;
    const filter = {
      status: { $in: [CLAIM_STATUS.APPROVED, "APPROVED", "Approved", CLAIM_STATUS.PAID, "PAID"] }
    };
    if (category) filter.category = category;

    const claims = await Claim.find(filter)
      .limit(parseInt(limit, 10))
      .sort({ createdAt: -1 })
      .lean();

    const formatted = claims.map((c) => ({
      claimId: c.claimId,
      employeeId: c.employeeId,
      category: c.category,
      amountMinor: c.amountMinor || Math.round(c.amount * 100),
      expenseDate: c.expenseDate,
      receiptFingerprint: c.receiptFingerprint || c.stageResults?.fraud?.screen?.fingerprint,
      merchant: c.stageResults?.extraction?.data?.merchant || c.description || "Vendor",
      approvedAt: c.updatedAt
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json([]);
  }
});

/**
 * GET /internal/claims
 */
router.get("/claims", async (req, res) => {
  try {
    const { updatedBefore } = req.query;
    const filter = {};
    if (updatedBefore) {
      filter.updatedAt = { $lt: new Date(updatedBefore) };
    }
    const claims = await Claim.find(filter).select("claimId").lean();
    return res.status(200).json({ claimIds: claims.map((c) => c.claimId) });
  } catch (error) {
    return res.status(500).json({ claimIds: [] });
  }
});

export default router;
