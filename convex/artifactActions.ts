"use node";

import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { requireOrgMember } from './auth';
import { internal } from './_generated/api';
import { buildS3Key, getS3Object, putS3Object } from './s3';

function cleanZipSegment(value: string): string {
  const cleaned = value.trim().replace(/[\\/:\0-\x1F\x7F]/g, '_');
  if (!cleaned || cleaned === '.' || cleaned === '..') return 'artifact';
  return cleaned;
}

export const generateZipExport = action({
  args: { artifactId: v.id('artifacts') },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const detail = await ctx.runQuery(internal.ai.queries.getArtifactForAction, { artifactId: args.artifactId });
    if (!detail) throw new Error('Artifact not found.');
    if (detail.artifact.orgId !== auth.orgId) throw new Error('Artifact not found.');
    const zip = new JSZip();
    const folderName = cleanZipSegment(detail.artifact.title);
    for (const file of detail.files) {
      const fileBytes = await getS3Object({ key: file.s3Key });
      zip.file(`${folderName}/${cleanZipSegment(file.fileName)}`, fileBytes);
    }
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const s3Key = buildS3Key({
      orgId: detail.artifact.orgId,
      projectId: detail.artifact.projectId,
      category: 'exports',
      itemId: args.artifactId,
      fileName: 'artifact.zip',
    });
    await putS3Object({ key: s3Key, body: bytes, contentType: 'application/zip' });
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await ctx.runMutation(internal.artifacts.registerExportInternal, {
      orgId: detail.artifact.orgId,
      artifactId: args.artifactId,
      s3Key,
      fileName: 'artifact.zip',
      mimeType: 'application/zip',
      size: bytes.byteLength,
      sha256,
    });
    return { s3Key };
  },
});
