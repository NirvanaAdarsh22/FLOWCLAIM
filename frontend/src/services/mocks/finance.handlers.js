/**
 * @file frontend/src/services/mocks/finance.handlers.js
 * Mock Service Worker (MSW) handlers for finance endpoints.
 */

export const mockBudgets = [
  {
    budgetId: 'b-001',
    employeeId: 'emp-101',
    employeeName: 'Alice Smith',
    period: '2026-11',
    limitMinor: 1000000, // ₹10,000.00
    spentMinor: 250000,  // ₹2,500.00
    updatedAt: '2026-11-10T08:30:00Z',
  },
  {
    budgetId: 'b-002',
    employeeId: 'emp-102',
    employeeName: 'Bob Jones',
    period: '2026-11',
    limitMinor: 500000,  // ₹5,000.00
    spentMinor: 480000,  // ₹4,800.00
    updatedAt: '2026-11-12T14:15:00Z',
  },
];

export const mockLedgerEntries = [
  {
    entryId: 'led-1',
    claimId: 'claim-101',
    employeeId: 'emp-101',
    amountMinor: 250000,
    currency: 'INR',
    category: 'MEALS',
    balanceBeforeMinor: 1000000,
    balanceAfterMinor: 750000,
    createdAt: '2026-11-10T12:00:00Z',
  },
];

export const mockAuditEvents = [
  {
    id: 'audit-1',
    claimId: 'claim-101',
    actor: 'SYSTEM',
    action: 'LEDGER_COMMITTED',
    detail: { amountMinor: 250000, budgetId: 'b-001' },
    at: '2026-11-10T12:00:00Z',
  },
];

export const financeHandlers = [
  {
    path: '/api/finance/budgets',
    method: 'GET',
    handler: () => ({ items: mockBudgets, page: 1, pageSize: 20, total: mockBudgets.length }),
  },
  {
    path: '/api/finance/ledger',
    method: 'GET',
    handler: () => ({ items: mockLedgerEntries, page: 1, pageSize: 20, total: mockLedgerEntries.length }),
  },
  {
    path: '/api/finance/audit',
    method: 'GET',
    handler: () => ({ items: mockAuditEvents, page: 1, pageSize: 20, total: mockAuditEvents.length }),
  },
];
