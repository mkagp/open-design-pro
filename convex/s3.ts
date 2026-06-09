"use node";

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v } from 'convex/values';
import { action } from './_generated/server';
import { requireOrgMember } from './auth';
import { internal } from './_generated/api';

const internalApi = internal as any;

function s3Client() {
  return new S3Client({ region: process.env.AWS_REGION });
}

function bucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) throw new Error('S3_BUCKET_NAME is not configured.');
  return bucket;
}

function kmsKeyArn(): string | undefined {
  return process.env.AWS_KMS_KEY_ARN || undefined;
}

function cleanSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._=-]/g, '-').replace(/-+/g, '-');
  if (!cleaned || cleaned === '.' || cleaned === '..') throw new Error('Invalid S3 key segment.');
  return cleaned;
}

export function buildS3Key(input: {
  orgId: string;
  projectId: string;
  category: 'artifacts' | 'exports' | 'attachments';
  itemId: string;
  fileName: string;
}): string {
  return [
    'orgs',
    cleanSegment(input.orgId),
    'projects',
    cleanSegment(input.projectId),
    input.category,
    cleanSegment(input.itemId),
    cleanSegment(input.fileName),
  ].join('/');
}

export async function putS3Object(input: {
  key: string;
  body: string | Uint8Array;
  contentType: string;
}) {
  await s3Client().send(new PutObjectCommand({
    Bucket: bucketName(),
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
    ServerSideEncryption: kmsKeyArn() ? 'aws:kms' : undefined,
    SSEKMSKeyId: kmsKeyArn(),
  }));
}

export async function getS3Object(input: { key: string }): Promise<Uint8Array> {
  const response = await s3Client().send(new GetObjectCommand({
    Bucket: bucketName(),
    Key: input.key,
  }));
  const body = response.Body;
  if (!body) throw new Error('S3 object is empty.');
  return await body.transformToByteArray();
}

export const createUploadUrl = action({
  args: {
    projectId: v.id('projects'),
    category: v.union(v.literal('artifacts'), v.literal('exports'), v.literal('attachments')),
    itemId: v.string(),
    fileName: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const project = await ctx.runQuery(internalApi.projects.getProjectForAction, { projectId: args.projectId });
    if (!project || project.orgId !== auth.orgId) throw new Error('Project not found.');
    const key = buildS3Key({
      orgId: auth.orgId,
      projectId: args.projectId,
      category: args.category,
      itemId: args.itemId,
      fileName: args.fileName,
    });
    const url = await getSignedUrl(s3Client(), new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      ContentType: args.contentType,
      ServerSideEncryption: kmsKeyArn() ? 'aws:kms' : undefined,
      SSEKMSKeyId: kmsKeyArn(),
    }), { expiresIn: 300 });
    return { key, url };
  },
});

export const createDownloadUrl = action({
  args: { s3Key: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireOrgMember(ctx);
    const file = await ctx.runQuery(internalApi.artifacts.getFileByS3KeyForAction, { s3Key: args.s3Key });
    if (!file || file.orgId !== auth.orgId) throw new Error('Artifact file not found.');
    const url = await getSignedUrl(s3Client(), new GetObjectCommand({
      Bucket: bucketName(),
      Key: args.s3Key,
    }), { expiresIn: 300 });
    return { url };
  },
});
