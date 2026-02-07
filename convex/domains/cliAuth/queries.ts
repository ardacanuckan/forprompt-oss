/**
 * CLI Queries
 */

import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { decrypt } from "../../lib/utils/encryption";

/**
 * Get project info by API key (for SDK/CLI)
 */
export const getProjectByApiKey = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const allKeys = await ctx.db.query("projectApiKeys").collect();

    for (const key of allKeys) {
      const decrypted = decrypt(key.keyValue);
      if (decrypted === args.apiKey) {
        const project = await ctx.db.get(key.projectId);
        if (!project) continue;

        const org = await ctx.db.get(project.orgId);

        return {
          projectId: project._id,
          projectName: project.name,
          projectSlug: project.slug,
          orgId: project.orgId,
          orgName: org?.name,
        };
      }
    }

    return null;
  },
});
