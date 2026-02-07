/**
 * Project mutations
 */

import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { requireAuth } from "../../lib/auth/permissions";
import {
  decrypt,
  encrypt,
  generateSecureApiKey,
} from "../../lib/utils/encryption";
import { ConflictError, NotFoundError } from "../../lib/utils/errors";

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check if slug already exists in this org
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) =>
        q.eq("orgId", args.orgId).eq("slug", args.slug),
      )
      .unique();

    if (existing) {
      throw new ConflictError(
        `Project with slug "${args.slug}" already exists in this organization`,
      );
    }

    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      orgId: args.orgId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-generate API key for the project
    const apiKey = generateSecureApiKey();
    await ctx.db.insert("projectApiKeys", {
      projectId,
      keyValue: encrypt(apiKey),
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    return projectId;
  },
});

/**
 * Update a project
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    const existing = await ctx.db.get(projectId);

    if (!existing) {
      throw new NotFoundError("Project");
    }

    // If updating slug, check for conflicts
    if (updates.slug && updates.slug !== existing.slug) {
      const conflict = await ctx.db
        .query("projects")
        .withIndex("by_slug", (q) =>
          q.eq("orgId", existing.orgId).eq("slug", updates.slug!),
        )
        .unique();

      if (conflict) {
        throw new ConflictError(
          `Project with slug "${updates.slug}" already exists in this organization`,
        );
      }
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(projectId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return projectId;
  },
});

/**
 * Delete a project and all its prompts and versions (cascade delete)
 */
export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new NotFoundError("Project");
    }

    // Get all prompts for this project
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Delete all versions and test results for each prompt
    for (const prompt of prompts) {
      const versions = await ctx.db
        .query("promptVersions")
        .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
        .collect();

      for (const version of versions) {
        // Delete test results for this version
        const testResults = await ctx.db
          .query("promptTestResults")
          .withIndex("by_version", (q) => q.eq("versionId", version._id))
          .collect();

        for (const result of testResults) {
          await ctx.db.delete(result._id);
        }

        // Delete the version
        await ctx.db.delete(version._id);
      }

      // Delete the prompt
      await ctx.db.delete(prompt._id);
    }

    // Delete project API key
    const apiKey = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (apiKey) {
      await ctx.db.delete(apiKey._id);
    }

    // Delete the project
    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});

/**
 * Ensure a default project exists for an organization (idempotent)
 *
 * If a default project already exists, returns it with its API key.
 * If not, creates a new project with auto-generated API key.
 *
 * Returns: { projectId, apiKey }
 */
export const ensureDefaultProject = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check if any project already exists for this org
    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existingProject) {
      // Project exists, get its API key
      const apiKeyRecord = await ctx.db
        .query("projectApiKeys")
        .withIndex("by_project", (q) => q.eq("projectId", existingProject._id))
        .first();

      if (!apiKeyRecord) {
        throw new NotFoundError("API key for existing project");
      }

      // Decrypt the API key for return
      const apiKey = decrypt(apiKeyRecord.keyValue);

      return {
        projectId: existingProject._id,
        apiKey,
      };
    }

    // No project exists, create default one
    // Get organization name for project naming
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new NotFoundError("Organization");
    }

    // Generate project name and slug
    const projectName = org.name ? `${org.name} Project` : "My First Project";
    const slug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug already exists (shouldn't happen for first project, but be safe)
    const slugConflict = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("orgId", args.orgId).eq("slug", slug))
      .unique();

    if (slugConflict) {
      throw new ConflictError(
        `Project with slug "${slug}" already exists in this organization`,
      );
    }

    const now = Date.now();

    // Create the project
    const projectId = await ctx.db.insert("projects", {
      orgId: args.orgId,
      name: projectName,
      slug,
      createdAt: now,
      updatedAt: now,
    });

    // Generate API key for the project
    const apiKey = generateSecureApiKey();
    const encryptedKey = await encrypt(apiKey);

    await ctx.db.insert("projectApiKeys", {
      projectId,
      keyValue: encryptedKey,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    return {
      projectId,
      apiKey,
    };
  },
});
