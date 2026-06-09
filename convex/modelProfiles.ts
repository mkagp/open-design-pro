import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireOrgAdmin, requireOrgMember } from './auth';
import { costTier, modelUseCase } from './schema';
import { writeAuditEvent } from './audit';

export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireOrgMember(ctx);
    return await ctx.db
      .query('modelProfiles')
      .filter((q) => q.and(q.eq(q.field('orgId'), auth.orgId), q.eq(q.field('enabled'), true)))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id('modelProfiles')),
    providerSecretId: v.id('providerSecrets'),
    modelId: v.string(),
    label: v.string(),
    useCase: modelUseCase,
    costTier,
    enabled: v.boolean(),
    isDefaultForUseCase: v.boolean(),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgAdmin(ctx);
    const provider = await ctx.db.get(args.providerSecretId);
    if (!provider || provider.orgId !== auth.orgId) throw new Error('Provider not found.');
    const now = Date.now();

    if (args.isDefaultForUseCase) {
      const existing = await ctx.db
        .query('modelProfiles')
        .filter((q) => q.and(q.eq(q.field('orgId'), auth.orgId), q.eq(q.field('useCase'), args.useCase)))
        .collect();
      await Promise.all(existing.map((profile) => ctx.db.patch(profile._id, { isDefaultForUseCase: false })));
    }

    if (args.id) {
      const current = await ctx.db.get(args.id);
      if (!current || current.orgId !== auth.orgId) throw new Error('Model profile not found.');
      await ctx.db.patch(args.id, {
        providerSecretId: args.providerSecretId,
        modelId: args.modelId,
        label: args.label,
        useCase: args.useCase,
        costTier: args.costTier,
        enabled: args.enabled,
        isDefaultForUseCase: args.isDefaultForUseCase,
        updatedAt: now,
      });
      await writeAuditEvent(ctx, {
        orgId: auth.orgId,
        actorUserId: auth.userId,
        action: 'model_profile.update',
        targetType: 'modelProfile',
        targetId: args.id,
      });
      return args.id;
    }

    const id = await ctx.db.insert('modelProfiles', {
      orgId: auth.orgId,
      providerSecretId: args.providerSecretId,
      modelId: args.modelId,
      label: args.label,
      useCase: args.useCase,
      costTier: args.costTier,
      enabled: args.enabled,
      isDefaultForUseCase: args.isDefaultForUseCase,
      createdAt: now,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      orgId: auth.orgId,
      actorUserId: auth.userId,
      action: 'model_profile.create',
      targetType: 'modelProfile',
      targetId: id,
    });
    return id;
  },
});
