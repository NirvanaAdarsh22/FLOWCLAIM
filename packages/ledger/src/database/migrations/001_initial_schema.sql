-- FlowClaim Financial Ledger Schema v1.1
-- Compliant with Shared Integration Contract §6.5 & Database Ownership §7

-- 1. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
  budget_id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  period VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  limit_minor BIGINT NOT NULL CHECK (limit_minor >= 0),
  spent_minor BIGINT NOT NULL DEFAULT 0 CHECK (spent_minor >= 0 AND spent_minor <= limit_minor),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_budget_employee_period UNIQUE (employee_id, period)
);

CREATE INDEX IF NOT EXISTS idx_budgets_lookup ON budgets (employee_id, period);

-- 2. Append-Only Financial Ledger Entries Table
CREATE TABLE IF NOT EXISTS ledger_entries (
  entry_id VARCHAR(64) PRIMARY KEY,
  claim_id VARCHAR(64) NOT NULL,
  employee_id VARCHAR(64) NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  category VARCHAR(32) NOT NULL,
  balance_before_minor BIGINT NOT NULL,
  balance_after_minor BIGINT NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  policy_version JSONB,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_claim_id ON ledger_entries (claim_id);
CREATE INDEX IF NOT EXISTS idx_ledger_employee_id ON ledger_entries (employee_id);
CREATE INDEX IF NOT EXISTS idx_ledger_idempotency ON ledger_entries (idempotency_key);

-- 3. Append-Only Financial Audit Events Table
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(64) PRIMARY KEY,
  claim_id VARCHAR(64),
  actor VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  detail JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_claim_id ON audit_events (claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events (at DESC);
