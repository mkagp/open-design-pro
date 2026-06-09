import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireOrgMember } from './auth';
import { runEventKind, runStatus } from './schema';

export const get = query({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || run.orgId !== auth.orgId) return null;
    return run;
  },
});

export const events = query({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || run.orgId !== auth.orgId) return [];
    return await ctx.db
      .query('runEvents')
      .withIndex('by_run_sequence', (q) => q.eq('runId', args.runId))
      .collect();
  },
});

export const start = mutation({
  args: {
    projectId: v.id('projects'),
    conversationId: v.id('conversations'),
    message: v.string(),
    modelProfileId: v.optional(v.id('modelProfiles')),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.orgId) throw new Error('Project not found.');
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.orgId !== auth.orgId || conversation.projectId !== args.projectId) {
      throw new Error('Conversation not found.');
    }

    const modelProfile = args.modelProfileId
      ? await ctx.db.get(args.modelProfileId)
      : await ctx.db
        .query('modelProfiles')
        .filter((q) => q.and(q.eq(q.field('enabled'), true), q.eq(q.field('isDefaultForUseCase'), true)))
        .first();
    if (!modelProfile || modelProfile.orgId !== auth.orgId || !modelProfile.enabled) {
      throw new Error('Select an enabled model before starting a run.');
    }

    const provider = await ctx.db.get(modelProfile.providerSecretId);
    if (!provider || provider.orgId !== auth.orgId || provider.disabledAt) throw new Error('Model provider is unavailable.');

    const now = Date.now();
    await ctx.db.insert('messages', {
      orgId: auth.orgId,
      projectId: args.projectId,
      conversationId: args.conversationId,
      role: 'user',
      content: args.message,
      modelProfileId: modelProfile._id,
      artifactIds: [],
      createdAt: now,
    });
    const assistantMessageId = await ctx.db.insert('messages', {
      orgId: auth.orgId,
      projectId: args.projectId,
      conversationId: args.conversationId,
      role: 'assistant',
      content: '',
      modelProfileId: modelProfile._id,
      artifactIds: [],
      createdAt: now + 1,
    });
    const runId = await ctx.db.insert('runs', {
      orgId: auth.orgId,
      projectId: args.projectId,
      conversationId: args.conversationId,
      assistantMessageId,
      status: 'queued',
      modelProfileId: modelProfile._id,
      providerId: provider._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.ai.runAgent.runAgent, { runId });
    return { runId, assistantMessageId };
  },
});

export const cancel = mutation({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run || run.orgId !== auth.orgId) throw new Error('Run not found.');
    if (run.status === 'succeeded' || run.status === 'failed') return args.runId;
    await ctx.db.patch(args.runId, {
      status: 'canceled',
      updatedAt: Date.now(),
      completedAt: Date.now(),
    });
    return args.runId;
  },
});

export const markRunning = internalMutation({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { status: 'running', updatedAt: Date.now() });
  },
});

export const appendEvent = internalMutation({
  args: {
    runId: v.id('runs'),
    kind: runEventKind,
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('Run not found.');
    const prior = await ctx.db
      .query('runEvents')
      .withIndex('by_run_sequence', (q) => q.eq('runId', args.runId))
      .collect();
    return await ctx.db.insert('runEvents', {
      orgId: run.orgId,
      runId: args.runId,
      sequence: prior.length,
      kind: args.kind,
      payload: args.payload,
      createdAt: Date.now(),
    });
  },
});

export const finish = internalMutation({
  args: {
    runId: v.id('runs'),
    status: runStatus,
    content: v.string(),
    artifactIds: v.optional(v.array(v.id('artifacts'))),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('Run not found.');
    const now = Date.now();
    await ctx.db.patch(run.assistantMessageId, {
      content: args.content,
      artifactIds: args.artifactIds ?? [],
    });
    await ctx.db.patch(args.runId, {
      status: args.status,
      error: args.error,
      updatedAt: now,
      completedAt: now,
    });
    await ctx.db.patch(run.conversationId, { updatedAt: now });
    await ctx.db.patch(run.projectId, { updatedAt: now });
  },
});
