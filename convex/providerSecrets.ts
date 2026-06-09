import { v } from 'convex/values';
import { internalMutation, query, mutation } from './_generated/server';
import { requireOrgAdmin, requireOrgMember } from './auth';
import { providerKind } from './schema';
import { writeAuditEvent } from './audit';

export const listMasked = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireOrgMember(ctx);
    const rows = await ctx.db
      .query('providerSecrets')
      .filter((q) => q.eq(q.field('orgId'), auth.orgId))
      .collect();
    return rows.map(({ encryptedApiKey: _encryptedApiKey, encryptedDataKey: _encryptedDataKey, ...safe }) => safe);
  },
});

export const saveEncrypted = internalMutation({
  args: {
    id: v.optional(v.id('providerSecrets')),
    orgId: v.string(),
    actorUserId: v.string(),
    provider: providerKind,
    label: v.string(),
    baseUrl: v.optional(v.string()),
    encryptedApiKey: v.string(),
    encryptedDataKey: v.string(),
    apiKeyTail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.orgId !== args.orgId) throw new Error('Provider not found.');
      await ctx.db.patch(args.id, {
        provider: args.provider,
        label: args.label,
        baseUrl: args.baseUrl,
        encryptedApiKey: args.encryptedApiKey,
        encryptedDataKey: args.encryptedDataKey,
        apiKeyTail: args.apiKeyTail,
        updatedBy: args.actorUserId,
        rotatedAt: now,
        disabledAt: undefined,
      });
      await writeAuditEvent(ctx, {
        orgId: args.orgId,
        actorUserId: args.actorUserId,
        action: 'provider_secret.update',
        targetType: 'providerSecret',
        targetId: args.id,
        metadata: { provider: args.provider },
      });
      return args.id;
    }
    const id = await ctx.db.insert('providerSecrets', {
      orgId: args.orgId,
      provider: args.provider,
      label: args.label,
      baseUrl: args.baseUrl,
      encryptedApiKey: args.encryptedApiKey,
      encryptedDataKey: args.encryptedDataKey,
      apiKeyTail: args.apiKeyTail,
      createdBy: args.actorUserId,
      updatedBy: args.actorUserId,
      rotatedAt: now,
    });
    await writeAuditEvent(ctx, {
      orgId: args.orgId,
      actorUserId: args.actorUserId,
      action: 'provider_secret.create',
      targetType: 'providerSecret',
      targetId: id,
      metadata: { provider: args.provider },
    });
    return id;
  },
});

export const disable = mutation({
  args: { id: v.id('providerSecrets') },
  handler: async (ctx, args) => {
    const auth = await requireOrgAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.orgId !== auth.orgId) throw new Error('Provider not found.');
    await ctx.db.patch(args.id, { disabledAt: Date.now(), updatedBy: auth.userId });
    await writeAuditEvent(ctx, {
      orgId: auth.orgId,
      actorUserId: auth.userId,
      action: 'provider_secret.disable',
      targetType: 'providerSecret',
      targetId: args.id,
    });
    return args.id;
  },
});
