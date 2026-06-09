import type { MutationCtx } from './_generated/server';

export async function writeAuditEvent(
  ctx: MutationCtx,
  input: {
    orgId: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert('auditEvents', {
    ...input,
    createdAt: Date.now(),
  });
}
