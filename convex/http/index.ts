/**
 * HTTP router composition
 */

import { httpRouter } from "convex/server";

import { deploy, validateApiKey } from "./routes/cliAuth";
import { editPromptStream } from "./routes/editPromptStream";
import { getLog, getLogs, logSpan } from "./routes/logs";
import { handlePolarWebhook } from "./routes/polarWebhook";
import { getPromptByKey } from "./routes/prompts";
import {
  createPrompt,
  createVersion,
  deletePrompt,
  updatePrompt,
} from "./routes/promptsWrite";
import { syncPrompts } from "./routes/sync";
import { pushMemory, syncMemory } from "./routes/understand/memory";
import {
  createPolicy,
  deletePolicy,
  getPolicy,
  listPolicies,
  updatePolicy,
} from "./routes/understand/policies";
import {
  createViolation,
  listViolations,
  updateViolationStatus,
} from "./routes/understand/violations";
import { handleClerkWebhook } from "./routes/webhooks";
import {
  deleteWebhook,
  listWebhooks,
  registerWebhook,
} from "./routes/webhooksApi";

const http = httpRouter();

// Prompt API routes
http.route({
  path: "/api/prompts",
  method: "GET",
  handler: getPromptByKey,
});

http.route({
  path: "/api/prompts",
  method: "POST",
  handler: createPrompt,
});

http.route({
  path: "/api/prompts",
  method: "PUT",
  handler: updatePrompt,
});

http.route({
  path: "/api/prompts",
  method: "DELETE",
  handler: deletePrompt,
});

http.route({
  path: "/api/prompts/versions",
  method: "POST",
  handler: createVersion,
});

// Sync route
http.route({
  path: "/api/sync",
  method: "GET",
  handler: syncPrompts,
});

// Webhook management routes
http.route({
  path: "/api/webhooks",
  method: "POST",
  handler: registerWebhook,
});

http.route({
  path: "/api/webhooks",
  method: "GET",
  handler: listWebhooks,
});

http.route({
  path: "/api/webhooks/{id}",
  method: "DELETE",
  handler: deleteWebhook,
});

// Clerk webhook routes
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: handleClerkWebhook,
});

// Polar webhook routes
http.route({
  path: "/polar-webhook",
  method: "POST",
  handler: handlePolarWebhook,
});

// CLI routes
http.route({
  path: "/api/cli/deploy",
  method: "GET",
  handler: deploy,
});

http.route({
  path: "/api/cli/validate",
  method: "GET",
  handler: validateApiKey,
});

// Logging routes
http.route({
  path: "/api/log",
  method: "POST",
  handler: logSpan,
});

http.route({
  path: "/api/logs",
  method: "GET",
  handler: getLogs,
});

http.route({
  path: "/api/logs/{traceId}",
  method: "GET",
  handler: getLog,
});

// AI Edit streaming route
http.route({
  path: "/api/edit-prompt/stream",
  method: "POST",
  handler: editPromptStream,
});

http.route({
  path: "/api/edit-prompt/stream",
  method: "OPTIONS",
  handler: editPromptStream,
});

// Understand API routes
http.route({
  path: "/api/understand/policies",
  method: "GET",
  handler: listPolicies,
});

http.route({
  path: "/api/understand/policies",
  method: "POST",
  handler: createPolicy,
});

http.route({
  path: "/api/understand/policies/{id}",
  method: "GET",
  handler: getPolicy,
});

http.route({
  path: "/api/understand/policies/{id}",
  method: "PUT",
  handler: updatePolicy,
});

http.route({
  path: "/api/understand/policies/{id}",
  method: "DELETE",
  handler: deletePolicy,
});

http.route({
  path: "/api/understand/violations",
  method: "GET",
  handler: listViolations,
});

http.route({
  path: "/api/understand/violations",
  method: "POST",
  handler: createViolation,
});

http.route({
  path: "/api/understand/violations/{id}",
  method: "PATCH",
  handler: updateViolationStatus,
});

http.route({
  path: "/api/understand/memory/sync",
  method: "GET",
  handler: syncMemory,
});

http.route({
  path: "/api/understand/memory",
  method: "POST",
  handler: pushMemory,
});

export default http;
