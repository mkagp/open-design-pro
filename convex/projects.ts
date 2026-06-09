import { v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';
import { requireOrgMember } from './auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireOrgMember(ctx);
    return await ctx.db
      .query('projects')
      .withIndex('by_org_updated', (q) => q.eq('orgId', auth.orgId))
      .order('desc')
      .filter((q) => q.eq(q.field('archivedAt'), undefined))
      .collect();
  },
});

export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.orgId) return null;
    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    designSystemId: v.optional(v.id('designSystems')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const now = Date.now();
    const projectId = await ctx.db.insert('projects', {
      orgId: auth.orgId,
      ownerUserId: auth.userId,
      name: args.name.trim() || 'Untitled project',
      designSystemId: args.designSystemId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('conversations', {
      orgId: auth.orgId,
      projectId,
      title: 'Project chat',
      createdAt: now,
      updatedAt: now,
    });
    return projectId;
  },
});

export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    designSystemId: v.optional(v.union(v.id('designSystems'), v.null())),
    metadata: v.optional(v.any()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.orgId) throw new Error('Project not found.');
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name.trim() || project.name;
    if (args.designSystemId !== undefined) patch.designSystemId = args.designSystemId ?? undefined;
    if (args.metadata !== undefined) patch.metadata = args.metadata;
    if (args.archived !== undefined) patch.archivedAt = args.archived ? Date.now() : undefined;
    await ctx.db.patch(args.projectId, patch);
    return args.projectId;
  },
});

export const getProjectForAction = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});
