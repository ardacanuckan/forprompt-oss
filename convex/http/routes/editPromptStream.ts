/**
 * Streaming HTTP endpoint for prompt editing with Claude extended thinking
 * Provides real-time thinking and content streaming via SSE
 */

import { httpAction } from "../../_generated/server";
import { getEditTaskPrompt } from "../../domains/promptOrchestrator/models/instructions/tasks/edit.task";
import {
  checkHttpRateLimit,
  createRateLimitResponse,
  extractRateLimitIdentifier,
} from "../rateLimitHelper";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_THINKING_MODEL = "anthropic/claude-sonnet-4.5";

// Models that support extended thinking
const THINKING_MODELS = ["anthropic/claude-sonnet-4.5"];

/**
 * POST /api/edit-prompt/stream
 * Stream AI-powered prompt editing with extended thinking
 *
 * Rate Limit: 30 requests per minute (ai_operation)
 */
export const editPromptStream = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Check rate limit for AI operations (uses IP-based identification)
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "ai_operation", rateLimitId);
  if (!rateLimitResult.allowed) {
    const response = createRateLimitResponse(rateLimitResult);
    // Add CORS headers
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  try {
    const { currentPrompt, instruction, selection, conversationHistory, model } = await request.json();

    // Use provided model or default to thinking model
    const selectedModel = model || DEFAULT_THINKING_MODEL;
    const supportsThinking = THINKING_MODELS.includes(selectedModel);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "X-RateLimit-Limit": String(rateLimitResult.headers["X-RateLimit-Limit"] || 30),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    // Build user message - keep it concise
    const userMessage = selection?.trim()
      ? `<prompt>\n${currentPrompt}\n</prompt>\n\n<selection>\n${selection}\n</selection>\n\n<instruction>\n${instruction}\n</instruction>`
      : `<prompt>\n${currentPrompt}\n</prompt>\n\n<instruction>\n${instruction}\n</instruction>`;

    // Get the edit task prompt from local ForPrompt files
    const systemPrompt = getEditTaskPrompt();

    // Build messages array with conversation history for multi-turn interviews
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if present (for interview follow-ups)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    // Build request body - only include reasoning for models that support it
    const requestBody: Record<string, unknown> = {
      model: selectedModel,
      max_tokens: 16000,
      stream: true,
      messages,
    };

    // Add extended thinking for supported models
    if (supportsThinking) {
      requestBody.reasoning = {
        max_tokens: 8000,
      };
    }

    // Make streaming request to OpenRouter
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://forprompt.dev",
        "X-Title": "ForPrompt",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenRouter API error: ${errorText}` }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            ...rateLimitResult.headers,
          },
        }
      );
    }

    // Create a TransformStream to process SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;

                  if (delta) {
                    // Check for reasoning/thinking content (prefer reasoning_details over reasoning)
                    let hasReasoning = false;
                    const reasoningDetails = delta.reasoning_details;
                    if (reasoningDetails && Array.isArray(reasoningDetails)) {
                      for (const detail of reasoningDetails) {
                        if (detail.text) {
                          hasReasoning = true;
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ type: "thinking", content: detail.text })}\n\n`
                            )
                          );
                        }
                      }
                    }

                    // Only use reasoning field if reasoning_details wasn't present
                    if (!hasReasoning && delta.reasoning) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "thinking", content: delta.reasoning })}\n\n`
                        )
                      );
                    }

                    // Check for regular content
                    if (delta.content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`
                        )
                      );
                    }
                  }
                } catch {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        ...rateLimitResult.headers,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unknown error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          ...rateLimitResult.headers,
        },
      }
    );
  }
});
