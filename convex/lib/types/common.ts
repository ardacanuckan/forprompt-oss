/**
 * Shared types and interfaces
 */

import { Id } from "../../_generated/dataModel";

/**
 * User role types
 */
export type UserRole = "org:admin" | "org:member";

/**
 * Invitation status types
 */
export type InvitationStatus = "pending" | "accepted" | "revoked";

/**
 * Integration types
 */
export type IntegrationType = "slack" | "discord" | "webhook" | "custom";

/**
 * API service types
 */
export type ApiService = "openrouter" | "anthropic" | "openai" | "custom";

/**
 * User info for display
 */
export interface UserInfo {
  _id: Id<"users">;
  firstName?: string;
  lastName?: string;
  email: string;
  imageUrl?: string;
}

/**
 * Period bounds for date ranges
 */
export interface PeriodBounds {
  start: number;
  end: number;
}

/**
 * Success response
 */
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  cursor?: string;
}

