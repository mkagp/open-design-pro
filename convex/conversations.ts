import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireOrgMember } from './auth';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.orgId) return [];
    return await ctx.db
      .query('conversations')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: { projectId: v.id('projects'), title: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.orgId) throw new Error('Project not found.');
    const now = Date.now();
    return await ctx.db.insert('conversations', {
      orgId: auth.orgId,
      projectId: args.projectId,
      title: args.title ?? 'Project chat',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const messages = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.orgId !== auth.orgId) return [];
    return await ctx.db
      .query('messages')
      .withIndex('by_conversation_created', (q) => q.eq('conversationId', args.conversationId))
      .collect();
  },
});
