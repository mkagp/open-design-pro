import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';

export const getProviderSecretForAction = internalQuery({
  args: { providerSecretId: v.id('providerSecrets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerSecretId);
  },
});

export const getArtifactForAction = internalQuery({
  args: { artifactId: v.id('artifacts') },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) return null;
    const files = await ctx.db
      .query('artifactFiles')
      .withIndex('by_artifact', (q) => q.eq('artifactId', args.artifactId))
      .collect();
    return { artifact, files };
  },
});

export const loadRunContext = internalQuery({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const project = await ctx.db.get(run.projectId);
    const conversation = await ctx.db.get(run.conversationId);
    const modelProfile = await ctx.db.get(run.modelProfileId);
    const provider = await ctx.db.get(run.providerId);
    const designSystem = project?.designSystemId ? await ctx.db.get(project.designSystemId) : null;
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation_created', (q) => q.eq('conversationId', run.conversationId))
      .collect();
    return { run, project, conversation, modelProfile, provider, designSystem, messages };
  },
});
