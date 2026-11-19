# FlowClaim Verification Workflow

Overview of the 8-stage expense verification pipeline.

---

## 1. State Machine Transitions

```
[Draft] ──> [Submitted] ──> [Pending Manager Approval] ──> [Pending Finance Review] ──> [Approved] ──> [Paid]
                  │                    │                              │
                  ▼                    ▼                              ▼
             [Flagged]            [Rejected]                     [Rejected]
```

---

## 2. Pipeline Verification Stages

1. **Stage 1: Receipt Upload**: Storage reference and metadata generated.
2. **Stage 2: Perceptual Duplicate Check**: dHash 64-bit similarity and Bloom filter screening.
3. **Stage 3: AI/ML Extraction**: Multimodal structured line-item extraction.
4. **Stage 4: Mathematical Consistency**: Subtotal, tax tolerance, and total reconciliation.
5. **Stage 5: Deterministic Policy DAG**: Rule evaluation (receipt requirements, daily caps, stale limits).
6. **Stage 6: Anomaly Detection**: KD-Tree nearest-neighbor scoring against historical expense vectors.
7. **Stage 7: Approval Chain**: Manager and Finance role sign-offs.
8. **Stage 8: Financial Commitment**: Idempotent transactional ledger entry and settlement.
