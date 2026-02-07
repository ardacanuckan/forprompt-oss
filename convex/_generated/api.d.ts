/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as domains_apiKeys_mutations from "../domains/apiKeys/mutations.js";
import type * as domains_apiKeys_queries from "../domains/apiKeys/queries.js";
import type * as domains_cliAuth_queries from "../domains/cliAuth/queries.js";
import type * as domains_invitations_internal from "../domains/invitations/internal.js";
import type * as domains_logs_analysis_actions from "../domains/logs/analysis/actions.js";
import type * as domains_logs_analysis_builders_index from "../domains/logs/analysis/builders/index.js";
import type * as domains_logs_analysis_builders_reportBuilder from "../domains/logs/analysis/builders/reportBuilder.js";
import type * as domains_logs_analysis_generators_analyzeConversation from "../domains/logs/analysis/generators/analyzeConversation.js";
import type * as domains_logs_analysis_generators_generateBatchReport from "../domains/logs/analysis/generators/generateBatchReport.js";
import type * as domains_logs_analysis_generators_generateVersionReport from "../domains/logs/analysis/generators/generateVersionReport.js";
import type * as domains_logs_analysis_generators_index from "../domains/logs/analysis/generators/index.js";
import type * as domains_logs_analysis_mutations from "../domains/logs/analysis/mutations.js";
import type * as domains_logs_analysis_queries from "../domains/logs/analysis/queries.js";
import type * as domains_logs_mutations from "../domains/logs/mutations.js";
import type * as domains_logs_queries from "../domains/logs/queries.js";
import type * as domains_organizations_internal from "../domains/organizations/internal.js";
import type * as domains_organizations_members from "../domains/organizations/members.js";
import type * as domains_organizations_queries from "../domains/organizations/queries.js";
import type * as domains_projectApiKeys_mutations from "../domains/projectApiKeys/mutations.js";
import type * as domains_projectApiKeys_queries from "../domains/projectApiKeys/queries.js";
import type * as domains_projects_mutations from "../domains/projects/mutations.js";
import type * as domains_projects_queries from "../domains/projects/queries.js";
import type * as domains_promptOrchestrator_internalMutations from "../domains/promptOrchestrator/internalMutations.js";
import type * as domains_promptOrchestrator_models_actions from "../domains/promptOrchestrator/models/actions.js";
import type * as domains_promptOrchestrator_models_builders_analysisBuilder from "../domains/promptOrchestrator/models/builders/analysisBuilder.js";
import type * as domains_promptOrchestrator_models_builders_enhancementBuilder from "../domains/promptOrchestrator/models/builders/enhancementBuilder.js";
import type * as domains_promptOrchestrator_models_builders_extractionBuilder from "../domains/promptOrchestrator/models/builders/extractionBuilder.js";
import type * as domains_promptOrchestrator_models_builders_generationBuilder from "../domains/promptOrchestrator/models/builders/generationBuilder.js";
import type * as domains_promptOrchestrator_models_builders_index from "../domains/promptOrchestrator/models/builders/index.js";
import type * as domains_promptOrchestrator_models_data_index from "../domains/promptOrchestrator/models/data/index.js";
import type * as domains_promptOrchestrator_models_data_promptInfo from "../domains/promptOrchestrator/models/data/promptInfo.js";
import type * as domains_promptOrchestrator_models_data_requirements from "../domains/promptOrchestrator/models/data/requirements.js";
import type * as domains_promptOrchestrator_models_data_toolsInfo from "../domains/promptOrchestrator/models/data/toolsInfo.js";
import type * as domains_promptOrchestrator_models_generators_analyzePrompt from "../domains/promptOrchestrator/models/generators/analyzePrompt.js";
import type * as domains_promptOrchestrator_models_generators_editPrompt from "../domains/promptOrchestrator/models/generators/editPrompt.js";
import type * as domains_promptOrchestrator_models_generators_enhanceField from "../domains/promptOrchestrator/models/generators/enhanceField.js";
import type * as domains_promptOrchestrator_models_generators_extractInfo from "../domains/promptOrchestrator/models/generators/extractInfo.js";
import type * as domains_promptOrchestrator_models_generators_generatePrompt from "../domains/promptOrchestrator/models/generators/generatePrompt.js";
import type * as domains_promptOrchestrator_models_generators_getEnhancementSuggestions from "../domains/promptOrchestrator/models/generators/getEnhancementSuggestions.js";
import type * as domains_promptOrchestrator_models_generators_index from "../domains/promptOrchestrator/models/generators/index.js";
import type * as domains_promptOrchestrator_models_generators_testPrompt from "../domains/promptOrchestrator/models/generators/testPrompt.js";
import type * as domains_promptOrchestrator_models_instructions_base from "../domains/promptOrchestrator/models/instructions/base.js";
import type * as domains_promptOrchestrator_models_instructions_index from "../domains/promptOrchestrator/models/instructions/index.js";
import type * as domains_promptOrchestrator_models_instructions_tasks_fieldEnhancement from "../domains/promptOrchestrator/models/instructions/tasks/fieldEnhancement.js";
import type * as domains_promptOrchestrator_models_instructions_tasks_index from "../domains/promptOrchestrator/models/instructions/tasks/index.js";
import type * as domains_promptOrchestrator_models_mutations from "../domains/promptOrchestrator/models/mutations.js";
import type * as domains_promptOrchestrator_models_queries from "../domains/promptOrchestrator/models/queries.js";
import type * as domains_promptOrchestrator_models_testing from "../domains/promptOrchestrator/models/testing.js";
import type * as domains_promptOrchestrator_models_utils_index from "../domains/promptOrchestrator/models/utils/index.js";
import type * as domains_promptOrchestrator_models_utils_json from "../domains/promptOrchestrator/models/utils/json.js";
import type * as domains_promptOrchestrator_models_utils_types from "../domains/promptOrchestrator/models/utils/types.js";
import type * as domains_promptOrchestrator_mutations from "../domains/promptOrchestrator/mutations.js";
import type * as domains_promptOrchestrator_queries from "../domains/promptOrchestrator/queries.js";
import type * as domains_subscriptions_internal from "../domains/subscriptions/internal.js";
import type * as domains_subscriptions_mutations from "../domains/subscriptions/mutations.js";
import type * as domains_subscriptions_queries from "../domains/subscriptions/queries.js";
import type * as domains_tools_formatters from "../domains/tools/formatters.js";
import type * as domains_tools_mutations from "../domains/tools/mutations.js";
import type * as domains_tools_queries from "../domains/tools/queries.js";
import type * as domains_understand_analytics_aggregation from "../domains/understand/analytics/aggregation.js";
import type * as domains_understand_analytics_queries from "../domains/understand/analytics/queries.js";
import type * as domains_understand_internal from "../domains/understand/internal.js";
import type * as domains_understand_memory_mutations from "../domains/understand/memory/mutations.js";
import type * as domains_understand_memory_queries from "../domains/understand/memory/queries.js";
import type * as domains_understand_mutations from "../domains/understand/mutations.js";
import type * as domains_understand_queries from "../domains/understand/queries.js";
import type * as domains_understand_violations_mutations from "../domains/understand/violations/mutations.js";
import type * as domains_understand_violations_queries from "../domains/understand/violations/queries.js";
import type * as domains_users_internal from "../domains/users/internal.js";
import type * as domains_users_mutations from "../domains/users/mutations.js";
import type * as domains_users_queries from "../domains/users/queries.js";
import type * as domains_webhooks_delivery from "../domains/webhooks/delivery.js";
import type * as domains_webhooks_mutations from "../domains/webhooks/mutations.js";
import type * as domains_webhooks_queries from "../domains/webhooks/queries.js";
import type * as forprompt_base_prompt_engineer_prompt from "../forprompt/base_prompt_engineer/prompt.js";
import type * as forprompt_field_additional_notes_prompt from "../forprompt/field_additional_notes/prompt.js";
import type * as forprompt_field_constraints_prompt from "../forprompt/field_constraints/prompt.js";
import type * as forprompt_field_expected_behavior_prompt from "../forprompt/field_expected_behavior/prompt.js";
import type * as forprompt_field_input_format_prompt from "../forprompt/field_input_format/prompt.js";
import type * as forprompt_field_output_format_prompt from "../forprompt/field_output_format/prompt.js";
import type * as forprompt_field_purpose_prompt from "../forprompt/field_purpose/prompt.js";
import type * as forprompt_field_tools_notes_prompt from "../forprompt/field_tools_notes/prompt.js";
import type * as forprompt_field_use_cases_prompt from "../forprompt/field_use_cases/prompt.js";
import type * as forprompt_index from "../forprompt/index.js";
import type * as forprompt_report_batch_prompt from "../forprompt/report_batch/prompt.js";
import type * as forprompt_report_conversation_analysis_prompt from "../forprompt/report_conversation_analysis/prompt.js";
import type * as forprompt_report_version_prompt from "../forprompt/report_version/prompt.js";
import type * as forprompt_task_analysis_prompt from "../forprompt/task_analysis/prompt.js";
import type * as forprompt_task_edit_prompt from "../forprompt/task_edit/prompt.js";
import type * as forprompt_task_enhancement_prompt from "../forprompt/task_enhancement/prompt.js";
import type * as forprompt_task_enhancement_suggestions_prompt from "../forprompt/task_enhancement_suggestions/prompt.js";
import type * as forprompt_task_extraction_prompt from "../forprompt/task_extraction/prompt.js";
import type * as forprompt_task_generation_prompt from "../forprompt/task_generation/prompt.js";
import type * as http from "../http.js";
import type * as http_index from "../http/index.js";
import type * as http_rateLimitHelper from "../http/rateLimitHelper.js";
import type * as http_routes_cliAuth from "../http/routes/cliAuth.js";
import type * as http_routes_editPromptStream from "../http/routes/editPromptStream.js";
import type * as http_routes_logs from "../http/routes/logs.js";
import type * as http_routes_polarWebhook from "../http/routes/polarWebhook.js";
import type * as http_routes_prompts from "../http/routes/prompts.js";
import type * as http_routes_promptsWrite from "../http/routes/promptsWrite.js";
import type * as http_routes_sync from "../http/routes/sync.js";
import type * as http_routes_understand_memory from "../http/routes/understand/memory.js";
import type * as http_routes_understand_policies from "../http/routes/understand/policies.js";
import type * as http_routes_understand_violations from "../http/routes/understand/violations.js";
import type * as http_routes_webhooks from "../http/routes/webhooks.js";
import type * as http_routes_webhooksApi from "../http/routes/webhooksApi.js";
import type * as lib_ai from "../lib/ai.js";
import type * as lib_aiTracked from "../lib/aiTracked.js";
import type * as lib_auth_guards from "../lib/auth/guards.js";
import type * as lib_auth_middleware from "../lib/auth/middleware.js";
import type * as lib_auth_permissions from "../lib/auth/permissions.js";
import type * as lib_cors from "../lib/cors.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_subscriptions_limits from "../lib/subscriptions/limits.js";
import type * as lib_types_common from "../lib/types/common.js";
import type * as lib_utils_dates from "../lib/utils/dates.js";
import type * as lib_utils_encryption from "../lib/utils/encryption.js";
import type * as lib_utils_errors from "../lib/utils/errors.js";
import type * as lib_utils_validators from "../lib/utils/validators.js";
import type * as migrations_encryptApiKeys from "../migrations/encryptApiKeys.js";
import type * as sync from "../sync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "domains/apiKeys/mutations": typeof domains_apiKeys_mutations;
  "domains/apiKeys/queries": typeof domains_apiKeys_queries;
  "domains/cliAuth/queries": typeof domains_cliAuth_queries;
  "domains/invitations/internal": typeof domains_invitations_internal;
  "domains/logs/analysis/actions": typeof domains_logs_analysis_actions;
  "domains/logs/analysis/builders/index": typeof domains_logs_analysis_builders_index;
  "domains/logs/analysis/builders/reportBuilder": typeof domains_logs_analysis_builders_reportBuilder;
  "domains/logs/analysis/generators/analyzeConversation": typeof domains_logs_analysis_generators_analyzeConversation;
  "domains/logs/analysis/generators/generateBatchReport": typeof domains_logs_analysis_generators_generateBatchReport;
  "domains/logs/analysis/generators/generateVersionReport": typeof domains_logs_analysis_generators_generateVersionReport;
  "domains/logs/analysis/generators/index": typeof domains_logs_analysis_generators_index;
  "domains/logs/analysis/mutations": typeof domains_logs_analysis_mutations;
  "domains/logs/analysis/queries": typeof domains_logs_analysis_queries;
  "domains/logs/mutations": typeof domains_logs_mutations;
  "domains/logs/queries": typeof domains_logs_queries;
  "domains/organizations/internal": typeof domains_organizations_internal;
  "domains/organizations/members": typeof domains_organizations_members;
  "domains/organizations/queries": typeof domains_organizations_queries;
  "domains/projectApiKeys/mutations": typeof domains_projectApiKeys_mutations;
  "domains/projectApiKeys/queries": typeof domains_projectApiKeys_queries;
  "domains/projects/mutations": typeof domains_projects_mutations;
  "domains/projects/queries": typeof domains_projects_queries;
  "domains/promptOrchestrator/internalMutations": typeof domains_promptOrchestrator_internalMutations;
  "domains/promptOrchestrator/models/actions": typeof domains_promptOrchestrator_models_actions;
  "domains/promptOrchestrator/models/builders/analysisBuilder": typeof domains_promptOrchestrator_models_builders_analysisBuilder;
  "domains/promptOrchestrator/models/builders/enhancementBuilder": typeof domains_promptOrchestrator_models_builders_enhancementBuilder;
  "domains/promptOrchestrator/models/builders/extractionBuilder": typeof domains_promptOrchestrator_models_builders_extractionBuilder;
  "domains/promptOrchestrator/models/builders/generationBuilder": typeof domains_promptOrchestrator_models_builders_generationBuilder;
  "domains/promptOrchestrator/models/builders/index": typeof domains_promptOrchestrator_models_builders_index;
  "domains/promptOrchestrator/models/data/index": typeof domains_promptOrchestrator_models_data_index;
  "domains/promptOrchestrator/models/data/promptInfo": typeof domains_promptOrchestrator_models_data_promptInfo;
  "domains/promptOrchestrator/models/data/requirements": typeof domains_promptOrchestrator_models_data_requirements;
  "domains/promptOrchestrator/models/data/toolsInfo": typeof domains_promptOrchestrator_models_data_toolsInfo;
  "domains/promptOrchestrator/models/generators/analyzePrompt": typeof domains_promptOrchestrator_models_generators_analyzePrompt;
  "domains/promptOrchestrator/models/generators/editPrompt": typeof domains_promptOrchestrator_models_generators_editPrompt;
  "domains/promptOrchestrator/models/generators/enhanceField": typeof domains_promptOrchestrator_models_generators_enhanceField;
  "domains/promptOrchestrator/models/generators/extractInfo": typeof domains_promptOrchestrator_models_generators_extractInfo;
  "domains/promptOrchestrator/models/generators/generatePrompt": typeof domains_promptOrchestrator_models_generators_generatePrompt;
  "domains/promptOrchestrator/models/generators/getEnhancementSuggestions": typeof domains_promptOrchestrator_models_generators_getEnhancementSuggestions;
  "domains/promptOrchestrator/models/generators/index": typeof domains_promptOrchestrator_models_generators_index;
  "domains/promptOrchestrator/models/generators/testPrompt": typeof domains_promptOrchestrator_models_generators_testPrompt;
  "domains/promptOrchestrator/models/instructions/base": typeof domains_promptOrchestrator_models_instructions_base;
  "domains/promptOrchestrator/models/instructions/index": typeof domains_promptOrchestrator_models_instructions_index;
  "domains/promptOrchestrator/models/instructions/tasks/fieldEnhancement": typeof domains_promptOrchestrator_models_instructions_tasks_fieldEnhancement;
  "domains/promptOrchestrator/models/instructions/tasks/index": typeof domains_promptOrchestrator_models_instructions_tasks_index;
  "domains/promptOrchestrator/models/mutations": typeof domains_promptOrchestrator_models_mutations;
  "domains/promptOrchestrator/models/queries": typeof domains_promptOrchestrator_models_queries;
  "domains/promptOrchestrator/models/testing": typeof domains_promptOrchestrator_models_testing;
  "domains/promptOrchestrator/models/utils/index": typeof domains_promptOrchestrator_models_utils_index;
  "domains/promptOrchestrator/models/utils/json": typeof domains_promptOrchestrator_models_utils_json;
  "domains/promptOrchestrator/models/utils/types": typeof domains_promptOrchestrator_models_utils_types;
  "domains/promptOrchestrator/mutations": typeof domains_promptOrchestrator_mutations;
  "domains/promptOrchestrator/queries": typeof domains_promptOrchestrator_queries;
  "domains/subscriptions/internal": typeof domains_subscriptions_internal;
  "domains/subscriptions/mutations": typeof domains_subscriptions_mutations;
  "domains/subscriptions/queries": typeof domains_subscriptions_queries;
  "domains/tools/formatters": typeof domains_tools_formatters;
  "domains/tools/mutations": typeof domains_tools_mutations;
  "domains/tools/queries": typeof domains_tools_queries;
  "domains/understand/analytics/aggregation": typeof domains_understand_analytics_aggregation;
  "domains/understand/analytics/queries": typeof domains_understand_analytics_queries;
  "domains/understand/internal": typeof domains_understand_internal;
  "domains/understand/memory/mutations": typeof domains_understand_memory_mutations;
  "domains/understand/memory/queries": typeof domains_understand_memory_queries;
  "domains/understand/mutations": typeof domains_understand_mutations;
  "domains/understand/queries": typeof domains_understand_queries;
  "domains/understand/violations/mutations": typeof domains_understand_violations_mutations;
  "domains/understand/violations/queries": typeof domains_understand_violations_queries;
  "domains/users/internal": typeof domains_users_internal;
  "domains/users/mutations": typeof domains_users_mutations;
  "domains/users/queries": typeof domains_users_queries;
  "domains/webhooks/delivery": typeof domains_webhooks_delivery;
  "domains/webhooks/mutations": typeof domains_webhooks_mutations;
  "domains/webhooks/queries": typeof domains_webhooks_queries;
  "forprompt/base_prompt_engineer/prompt": typeof forprompt_base_prompt_engineer_prompt;
  "forprompt/field_additional_notes/prompt": typeof forprompt_field_additional_notes_prompt;
  "forprompt/field_constraints/prompt": typeof forprompt_field_constraints_prompt;
  "forprompt/field_expected_behavior/prompt": typeof forprompt_field_expected_behavior_prompt;
  "forprompt/field_input_format/prompt": typeof forprompt_field_input_format_prompt;
  "forprompt/field_output_format/prompt": typeof forprompt_field_output_format_prompt;
  "forprompt/field_purpose/prompt": typeof forprompt_field_purpose_prompt;
  "forprompt/field_tools_notes/prompt": typeof forprompt_field_tools_notes_prompt;
  "forprompt/field_use_cases/prompt": typeof forprompt_field_use_cases_prompt;
  "forprompt/index": typeof forprompt_index;
  "forprompt/report_batch/prompt": typeof forprompt_report_batch_prompt;
  "forprompt/report_conversation_analysis/prompt": typeof forprompt_report_conversation_analysis_prompt;
  "forprompt/report_version/prompt": typeof forprompt_report_version_prompt;
  "forprompt/task_analysis/prompt": typeof forprompt_task_analysis_prompt;
  "forprompt/task_edit/prompt": typeof forprompt_task_edit_prompt;
  "forprompt/task_enhancement/prompt": typeof forprompt_task_enhancement_prompt;
  "forprompt/task_enhancement_suggestions/prompt": typeof forprompt_task_enhancement_suggestions_prompt;
  "forprompt/task_extraction/prompt": typeof forprompt_task_extraction_prompt;
  "forprompt/task_generation/prompt": typeof forprompt_task_generation_prompt;
  http: typeof http;
  "http/index": typeof http_index;
  "http/rateLimitHelper": typeof http_rateLimitHelper;
  "http/routes/cliAuth": typeof http_routes_cliAuth;
  "http/routes/editPromptStream": typeof http_routes_editPromptStream;
  "http/routes/logs": typeof http_routes_logs;
  "http/routes/polarWebhook": typeof http_routes_polarWebhook;
  "http/routes/prompts": typeof http_routes_prompts;
  "http/routes/promptsWrite": typeof http_routes_promptsWrite;
  "http/routes/sync": typeof http_routes_sync;
  "http/routes/understand/memory": typeof http_routes_understand_memory;
  "http/routes/understand/policies": typeof http_routes_understand_policies;
  "http/routes/understand/violations": typeof http_routes_understand_violations;
  "http/routes/webhooks": typeof http_routes_webhooks;
  "http/routes/webhooksApi": typeof http_routes_webhooksApi;
  "lib/ai": typeof lib_ai;
  "lib/aiTracked": typeof lib_aiTracked;
  "lib/auth/guards": typeof lib_auth_guards;
  "lib/auth/middleware": typeof lib_auth_middleware;
  "lib/auth/permissions": typeof lib_auth_permissions;
  "lib/cors": typeof lib_cors;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/subscriptions/limits": typeof lib_subscriptions_limits;
  "lib/types/common": typeof lib_types_common;
  "lib/utils/dates": typeof lib_utils_dates;
  "lib/utils/encryption": typeof lib_utils_encryption;
  "lib/utils/errors": typeof lib_utils_errors;
  "lib/utils/validators": typeof lib_utils_validators;
  "migrations/encryptApiKeys": typeof migrations_encryptApiKeys;
  sync: typeof sync;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
