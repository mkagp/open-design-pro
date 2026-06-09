/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_providers from "../ai/providers.js";
import type * as ai_queries from "../ai/queries.js";
import type * as ai_runAgent from "../ai/runAgent.js";
import type * as artifactActions from "../artifactActions.js";
import type * as artifacts from "../artifacts.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as designSystems from "../designSystems.js";
import type * as modelProfiles from "../modelProfiles.js";
import type * as projects from "../projects.js";
import type * as providerSecretActions from "../providerSecretActions.js";
import type * as providerSecrets from "../providerSecrets.js";
import type * as runs from "../runs.js";
import type * as s3 from "../s3.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/providers": typeof ai_providers;
  "ai/queries": typeof ai_queries;
  "ai/runAgent": typeof ai_runAgent;
  artifactActions: typeof artifactActions;
  artifacts: typeof artifacts;
  audit: typeof audit;
  auth: typeof auth;
  conversations: typeof conversations;
  designSystems: typeof designSystems;
  modelProfiles: typeof modelProfiles;
  projects: typeof projects;
  providerSecretActions: typeof providerSecretActions;
  providerSecrets: typeof providerSecrets;
  runs: typeof runs;
  s3: typeof s3;
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
