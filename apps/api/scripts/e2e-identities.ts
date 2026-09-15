export const E2E_AUTHOR = {
  id: '00000000-0000-4000-8000-000000000101',
  email: 'e2e-author@1billiontech.com',
  role: 'User',
} as const;

export const E2E_REVIEWER = {
  id: '00000000-0000-4000-8000-000000000102',
  email: 'e2e-reviewer@1billiontech.com',
  role: 'Reviewer',
} as const;

// The Admin decides approvals, and article_reviews.reviewer_id / created_by are
// foreign keys to neon_auth.user — so this identity must be a real seeded row.
export const E2E_ADMIN = {
  id: '00000000-0000-4000-8000-000000000103',
  email: 'e2e-admin@1billiontech.com',
  role: 'Admin',
} as const;
