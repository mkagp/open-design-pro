import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const providerKind = v.union(
  v.literal('anthropic'),
  v.literal('openai'),
  v.literal('google'),
  v.literal('openai-compatible'),
  v.literal('vercel-gateway'),
);

export const modelUseCase = v.union(
  v.literal('idea'),
  v.literal('draft'),
  v.literal('final'),
  v.literal('code'),
  v.literal('image'),
);

export const costTier = v.union(v.literal('low'), v.literal('medium'), v.literal('high'));
export const runStatus = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed'),
  v.literal('canceled'),
);

export const runEventKind = v.union(
  v.literal('text_delta'),
  v.literal('artifact_delta'),
  v.literal('artifact_complete'),
  v.literal('status'),
  v.literal('error'),
  v.literal('usage'),
);

const json = v.any();

export default defineSchema({
  projects: defineTable({
    orgId: v.string(),
    ownerUserId: v.string(),
    name: v.string(),
    designSystemId: v.optional(v.id('designSystems')),
    metadata: v.optional(json),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index('by_org_updated', ['orgId', 'updatedAt'])
    .index('by_org_owner', ['orgId', 'ownerUserId']),

  designSystems: defineTable({
    orgId: v.string(),
    name: v.string(),
    description: v.string(),
    tokens: v.optional(json),
    guidelines: v.string(),
    assets: v.optional(v.array(v.object({ label: v.string(), url: v.string() }))),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_org_updated', ['orgId', 'updatedAt']),

  conversations: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_project_updated', ['projectId', 'updatedAt']),

  messages: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    conversationId: v.id('conversations'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    modelProfileId: v.optional(v.id('modelProfiles')),
    artifactIds: v.array(v.id('artifacts')),
    createdAt: v.number(),
  }).index('by_conversation_created', ['conversationId', 'createdAt']),

  runs: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    conversationId: v.id('conversations'),
    assistantMessageId: v.id('messages'),
    status: runStatus,
    modelProfileId: v.id('modelProfiles'),
    providerId: v.id('providerSecrets'),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_project_updated', ['projectId', 'updatedAt'])
    .index('by_conversation_updated', ['conversationId', 'updatedAt']),

  runEvents: defineTable({
    orgId: v.string(),
    runId: v.id('runs'),
    sequence: v.number(),
    kind: runEventKind,
    payload: json,
    createdAt: v.number(),
  }).index('by_run_sequence', ['runId', 'sequence']),

  artifacts: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    conversationId: v.id('conversations'),
    runId: v.optional(v.id('runs')),
    title: v.string(),
    kind: v.literal('html'),
    manifest: json,
    entryFileId: v.optional(v.id('artifactFiles')),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_project_updated', ['projectId', 'updatedAt']),

  artifactFiles: defineTable({
    orgId: v.string(),
    artifactId: v.id('artifacts'),
    s3Key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    sha256: v.string(),
    createdAt: v.number(),
  }).index('by_artifact', ['artifactId']),

  providerSecrets: defineTable({
    orgId: v.string(),
    provider: providerKind,
    label: v.string(),
    baseUrl: v.optional(v.string()),
    encryptedApiKey: v.string(),
    encryptedDataKey: v.string(),
    apiKeyTail: v.string(),
    createdBy: v.string(),
    updatedBy: v.string(),
    rotatedAt: v.number(),
    disabledAt: v.optional(v.number()),
  }).index('by_org_provider', ['orgId', 'provider']),

  modelProfiles: defineTable({
    orgId: v.string(),
    providerSecretId: v.id('providerSecrets'),
    modelId: v.string(),
    label: v.string(),
    useCase: modelUseCase,
    costTier,
    enabled: v.boolean(),
    isDefaultForUseCase: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_org_use_case', ['orgId', 'useCase']),

  auditEvents: defineTable({
    orgId: v.string(),
    actorUserId: v.string(),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    metadata: v.optional(json),
    createdAt: v.number(),
  }).index('by_org_created', ['orgId', 'createdAt']),
});
