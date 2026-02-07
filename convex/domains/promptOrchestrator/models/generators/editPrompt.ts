/**
 * Edit prompt action - AI-powered prompt editing via chat
 * Uses Claude 4.5 with extended thinking for better reasoning
 * Supports both full prompt editing and fragment-based editing
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { parseJSONResponse } from "../../../../lib/ai";
import { chatWithThinkingTracking } from "../../../../lib/aiTracked";
import { getEditTaskPrompt } from "../instructions/tasks/edit.task";
import type { EditPromptResult } from "../utils/types";

/**
 * Edit a prompt using Claude 4.5 with extended thinking.
 * Returns the edited prompt along with the AI's reasoning process.
 */
export const editPrompt = action({
  args: {
    currentPrompt: v.string(),
    instruction: v.string(),
    selection: v.optional(v.string()),
    // Optional org context for usage tracking
    orgId: v.optional(v.id("organizations")),
    projectId: v.optional(v.id("projects")),
    promptId: v.optional(v.id("prompts")),
    versionId: v.optional(v.id("promptVersions")),
  },
  handler: async (ctx, args): Promise<EditPromptResult> => {
    // Build user message based on whether selection exists
    let userMessage = "";

    if (args.selection && args.selection.trim().length > 0) {
      userMessage = `<current_prompt>
${args.currentPrompt}
</current_prompt>

<selected_text>
${args.selection}
</selected_text>

<edit_instruction>
${args.instruction}
</edit_instruction>

Analyze the instruction and determine the appropriate edit scope (fragment or global). Apply the edit following prompt engineering best practices.`;
    } else {
      userMessage = `<current_prompt>
${args.currentPrompt}
</current_prompt>

<edit_instruction>
${args.instruction}
</edit_instruction>

Apply this edit to the entire prompt (global scope). Follow prompt engineering best practices to maintain quality and effectiveness.`;
    }

    try {
      // Get the edit task prompt from local ForPrompt files
      const editTaskPrompt = getEditTaskPrompt();

      // Use Claude 4.5 with extended thinking and usage tracking
      let content: string;
      let thinking: string | undefined;
      if (args.orgId) {
        const result = await chatWithThinkingTracking(
          {
            ctx,
            orgId: args.orgId,
            projectId: args.projectId,
            promptId: args.promptId,
            versionId: args.versionId,
          },
          "editPrompt",
          {
            systemPrompt: editTaskPrompt,
            userMessage,
            budgetTokens: 8000,
            maxTokens: 16000,
          }
        );
        content = result.content;
        thinking = result.thinking;
      } else {
        const ai = await import("../../../../lib/ai");
        const result = await ai.chatWithThinking({
          systemPrompt: editTaskPrompt,
          userMessage,
          budgetTokens: 8000,
          maxTokens: 16000,
        });
        content = result.content;
        thinking = result.thinking;
      }

      // Parse JSON response
      const parsed = parseJSONResponse<{
        type?: string;
        editedPrompt?: string | { systemPrompt?: string; prompt?: string };
        explanation?: string;
      }>(content);

      if (!parsed) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Could not extract valid JSON from AI response.");
      }

      let newContent: string = args.currentPrompt;
      const rawEditedPrompt = parsed.editedPrompt;

      // Handle case where AI incorrectly nests editedPrompt as an object
      if (typeof rawEditedPrompt === 'object' && rawEditedPrompt !== null) {
        if ('systemPrompt' in rawEditedPrompt && rawEditedPrompt.systemPrompt) {
          newContent = rawEditedPrompt.systemPrompt;
        } else if ('prompt' in rawEditedPrompt && rawEditedPrompt.prompt) {
          newContent = rawEditedPrompt.prompt;
        } else {
          console.warn("Unexpected object structure in editedPrompt:", rawEditedPrompt);
        }
      } else if (typeof rawEditedPrompt === 'string') {
        newContent = rawEditedPrompt;
      }

      const explanation = parsed.explanation || "Edit applied.";
      const editType = parsed.type || ((args.selection && args.selection.length > 0) ? "fragment" : "global");

      // Handle fragment replacement
      if (editType === "fragment" && args.selection) {
        if (args.currentPrompt.includes(args.selection)) {
          newContent = args.currentPrompt.replace(args.selection, newContent);
        } else {
          console.warn("Fragment edit selection mismatch");
          return {
            editedPrompt: args.currentPrompt,
            explanation: "Could not apply fragment edit (selection mismatch).",
            thinking,
          };
        }
      }

      return {
        editedPrompt: newContent,
        explanation,
        thinking,
      };
    } catch (error) {
      console.error("AI Edit Error:", error);

      return {
        editedPrompt: args.currentPrompt,
        explanation: `Failed to process edit: ${(error as Error).message || "Unknown error"}. Try rephrasing your instruction.`,
        isError: true,
      };
    }
  },
});
