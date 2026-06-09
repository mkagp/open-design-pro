import type { QueryCtx, MutationCtx, ActionCtx } from './_generated/server';

type Ctx = QueryCtx | MutationCtx | ActionCtx;

export interface AuthContext {
  orgId: string;
  userId: string;
  role: string;
}

function identityValue(identity: object, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = (identity as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export async function requireOrgMember(ctx: Ctx): Promise<AuthContext> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Authentication required.');

  const configuredOrg = process.env.CLERK_REQUIRED_ORG_ID?.trim();
  const orgId = identityValue(identity, ['org_id', 'orgId', 'organization_id', 'organizationId']) ?? configuredOrg;
  if (!orgId) throw new Error('Clerk organization membership required.');
  if (configuredOrg && orgId !== configuredOrg) throw new Error('This organization is not allowed.');

  const userId = identity.subject;
  const role = identityValue(identity, ['org_role', 'orgRole', 'organization_role', 'organizationRole']) ?? 'org:member';
  return { orgId, userId, role };
}

export async function requireOrgAdmin(ctx: Ctx): Promise<AuthContext> {
  const auth = await requireOrgMember(ctx);
  const configuredAdmins = (process.env.CLERK_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (auth.role === 'org:admin' || configuredAdmins.includes(auth.userId)) return auth;
  throw new Error('Admin access required.');
}
