/**
 * @sih26033/shared
 *
 * Shared types, constants, and utilities used across
 * the frontend (apps/web) and backend (apps/api) workspaces.
 *
 * This package will grow to include:
 * - User role enums
 * - API response/request types
 * - Validation schemas (shared Zod schemas)
 * - Constants (crop categories, units, etc.)
 */

// ─── User Roles ──────────────────────────────────────────────
export const USER_ROLES = {
  FARMER: "FARMER",
  BUYER: "BUYER",
  FPO: "FPO",
  ADMIN: "ADMIN",
  LOGISTICS: "LOGISTICS",
  WAREHOUSE: "WAREHOUSE",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// ─── API Response Envelope ───────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ─── Placeholder ─────────────────────────────────────────────
// Additional shared types will be added as features are built.
