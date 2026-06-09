import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { requireOrgMember } from './auth';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.orgId) return [];
    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();
    return await Promise.all(artifacts.map(async (artifact) => ({
      ...artifact,
      entryFile: artifact.entryFileId ? await ctx.db.get(artifact.entryFileId) : null,
    })));
  },
});

export const get = query({
  args: { artifactId: v.id('artifacts') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.orgId !== auth.orgId) return null;
    const files = await ctx.db
      .query('artifactFiles')
      .withIndex('by_artifact', (q) => q.eq('artifactId', args.artifactId))
      .collect();
    return { artifact, files };
  },
});

export const registerExport = mutation({
  args: {
    artifactId: v.id('artifacts'),
    s3Key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    sha256: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact || artifact.orgId !== auth.orgId) throw new Error('Artifact not found.');
    return await ctx.db.insert('artifactFiles', {
      orgId: auth.orgId,
      artifactId: args.artifactId,
      s3Key: args.s3Key,
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      sha256: args.sha256,
      createdAt: Date.now(),
    });
  },
});

export const registerGeneratedHtml = internalMutation({
  args: {
    orgId: v.string(),
    projectId: v.id('projects'),
    conversationId: v.id('conversations'),
    runId: v.id('runs'),
    title: v.string(),
    manifest: v.any(),
    s3Key: v.string(),
    html: v.string(),
    sha256: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const artifactId = await ctx.db.insert('artifacts', {
      orgId: args.orgId,
      projectId: args.projectId,
      conversationId: args.conversationId,
      runId: args.runId,
      title: args.title,
      kind: 'html',
      manifest: args.manifest,
      createdAt: now,
      updatedAt: now,
    });
    const fileId = await ctx.db.insert('artifactFiles', {
      orgId: args.orgId,
      artifactId,
      s3Key: args.s3Key,
      fileName: 'index.html',
      mimeType: 'text/html; charset=utf-8',
      size: new TextEncoder().encode(args.html).byteLength,
      sha256: args.sha256,
      createdAt: now,
    });
    await ctx.db.patch(artifactId, { entryFileId: fileId });
    return artifactId;
  },
});

export const registerExportInternal = internalMutation({
  args: {
    orgId: v.string(),
    artifactId: v.id('artifacts'),
    s3Key: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    sha256: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('artifactFiles', {
      orgId: args.orgId,
      artifactId: args.artifactId,
      s3Key: args.s3Key,
      fileName: args.fileName,
      mimeType: args.mimeType,
      size: args.size,
      sha256: args.sha256,
      createdAt: Date.now(),
    });
  },
});

export const getFileByS3KeyForAction = internalQuery({
  args: { s3Key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('artifactFiles')
      .filter((q) => q.eq(q.field('s3Key'), args.s3Key))
      .first();
  },
});
