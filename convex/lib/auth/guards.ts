/**
 * Reusable guard utilities for common authorization patterns
 */

import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { requireOrgAccess, requireOrgAdmin } from "./permissions";
import { NotFoundError } from "../utils/errors";

/**
 * Guard for project access - verifies user has access to project's organization
 */
export async function guardProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">
): Promise<{ userId: Id<"users">; project: any }> {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const userId = await requireOrgAccess(ctx, project.orgId);
  return { userId, project };
}

/**
 * Guard for prompt access - verifies user has access to prompt's project's organization
 */
export async function guardPromptAccess(
  ctx: QueryCtx | MutationCtx,
  promptId: Id<"prompts">
): Promise<{ userId: Id<"users">; prompt: any; project: any }> {
  const prompt = await ctx.db.get(promptId);
  if (!prompt) {
    throw new NotFoundError("Prompt");
  }

  const { project, userId } = await guardProjectAccess(ctx, prompt.projectId);
  
  return { userId, prompt, project };
}

/**
 * Guard for prompt version access
 */
export async function guardPromptVersionAccess(
  ctx: QueryCtx | MutationCtx,
  versionId: Id<"promptVersions">
): Promise<{ userId: Id<"users">; version: any; prompt: any }> {
  const version = await ctx.db.get(versionId);
  if (!version) {
    throw new NotFoundError("Prompt version");
  }

  const { prompt, userId } = await guardPromptAccess(ctx, version.promptId);
  
  return { userId, version, prompt };
}

/**
 * Guard for organization resource access (admin only)
 * Use this for resources that have orgId property
 */
export async function guardOrgResourceAdmin(
  ctx: QueryCtx | MutationCtx,
  resourceId: Id<any>,
  resourceName: string = "Resource"
): Promise<{ userId: Id<"users">; resource: any }> {
  const resource = await ctx.db.get(resourceId as any);
  if (!resource) {
    throw new NotFoundError(resourceName);
  }

  // Ensure resource has orgId
  if (!("orgId" in resource)) {
    throw new Error(`${resourceName} does not have orgId property`);
  }

  const userId = await requireOrgAdmin(ctx, resource.orgId as Id<"organizations">);
  return { userId, resource };
}

