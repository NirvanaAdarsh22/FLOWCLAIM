/**
 * @file frontend/src/services/mocks/admin.handlers.js
 * Mock Service Worker (MSW) handlers for admin endpoints.
 */

export const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@flowclaim.internal',
    name: 'Root Administrator',
    role: 'SYSTEM_ADMIN',
    active: true,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'finance@flowclaim.internal',
    name: 'Finance Lead',
    role: 'FINANCE_ADMIN',
    active: true,
    createdAt: '2026-10-05T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'manager@flowclaim.internal',
    name: 'Engineering Manager',
    role: 'MANAGER',
    active: true,
    createdAt: '2026-10-10T00:00:00Z',
  },
  {
    id: 'user-4',
    email: 'employee@flowclaim.internal',
    name: 'Developer Employee',
    role: 'EMPLOYEE',
    active: true,
    createdAt: '2026-10-15T00:00:00Z',
  },
];

export const mockProcessingStats = {
  queue: {
    waiting: 2,
    active: 1,
    failed: 0,
    delayed: 0,
    completed: 48,
  },
  claimsByStatus: {
    DRAFT: 3,
    UPLOADING: 1,
    SUBMITTED: 2,
    QUEUED: 2,
    SCREENING: 1,
    PARSING: 0,
    POLICY_CHECK: 0,
    ANOMALY_CHECK: 0,
    FINANCIAL_CHECK: 0,
    POSSIBLE_DUPLICATE: 2,
    NEEDS_REVIEW: 4,
    APPROVED: 35,
    REJECTED: 3,
    PROCESSING_FAILED: 0,
  },
  recentFailures: [],
};

export const mockHealth = {
  status: 'ok',
  checks: {
    mongo: true,
    postgres: true,
    redis: true,
    s3: true,
  },
  checkedAt: '2026-11-16T12:00:00Z',
};

export const adminHandlers = [
  {
    path: '/api/admin/users',
    method: 'GET',
    handler: () => ({ items: mockUsers, page: 1, pageSize: 20, total: mockUsers.length }),
  },
  {
    path: '/api/admin/stats/processing',
    method: 'GET',
    handler: () => mockProcessingStats,
  },
  {
    path: '/api/admin/health',
    method: 'GET',
    handler: () => mockHealth,
  },
];
