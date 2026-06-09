import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireOrgMember } from './auth';

const asset = v.object({ label: v.string(), url: v.string() });

export const list = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireOrgMember(ctx);
    return await ctx.db
      .query('designSystems')
      .withIndex('by_org_updated', (q) => q.eq('orgId', auth.orgId))
      .order('desc')
      .collect();
  },
});

export const get = query({
  args: { designSystemId: v.id('designSystems') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const designSystem = await ctx.db.get(args.designSystemId);
    if (!designSystem || designSystem.orgId !== auth.orgId) return null;
    return designSystem;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    guidelines: v.string(),
    tokens: v.optional(v.any()),
    assets: v.optional(v.array(asset)),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const now = Date.now();
    return await ctx.db.insert('designSystems', {
      orgId: auth.orgId,
      name: args.name.trim() || 'Untitled design system',
      description: args.description,
      guidelines: args.guidelines,
      tokens: args.tokens,
      assets: args.assets,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    designSystemId: v.id('designSystems'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    guidelines: v.optional(v.string()),
    tokens: v.optional(v.any()),
    assets: v.optional(v.array(asset)),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const designSystem = await ctx.db.get(args.designSystemId);
    if (!designSystem || designSystem.orgId !== auth.orgId) throw new Error('Design system not found.');
    await ctx.db.patch(args.designSystemId, {
      ...(args.name !== undefined ? { name: args.name.trim() || designSystem.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.guidelines !== undefined ? { guidelines: args.guidelines } : {}),
      ...(args.tokens !== undefined ? { tokens: args.tokens } : {}),
      ...(args.assets !== undefined ? { assets: args.assets } : {}),
      updatedAt: Date.now(),
    });
    return args.designSystemId;
  },
});
