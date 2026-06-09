"use node";

import { KMSClient, DecryptCommand, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
import { v } from 'convex/values';
import { action, internalAction } from './_generated/server';
import { requireOrgAdmin } from './auth';
import { internal } from './_generated/api';
import { providerKind } from './schema';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const internalApi = internal as any;

function kmsClient() {
  return new KMSClient({ region: process.env.AWS_REGION });
}

function requireKmsKeyArn(): string {
  const arn = process.env.AWS_KMS_KEY_ARN;
  if (!arn) throw new Error('AWS_KMS_KEY_ARN is not configured.');
  return arn;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function encryptWithDataKey(apiKey: string) {
  const response = await kmsClient().send(new GenerateDataKeyCommand({
    KeyId: requireKmsKeyArn(),
    KeySpec: 'AES_256',
  }));
  if (!response.Plaintext || !response.CiphertextBlob) throw new Error('KMS did not return a data key.');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', asArrayBuffer(response.Plaintext), 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asArrayBuffer(iv) }, key, encoder.encode(apiKey)));
  response.Plaintext.fill(0);

  return {
    encryptedApiKey: JSON.stringify({ v: 1, alg: 'AES-GCM', iv: toBase64(iv), ciphertext: toBase64(encrypted) }),
    encryptedDataKey: toBase64(response.CiphertextBlob),
  };
}

async function decryptStoredApiKey(input: { encryptedApiKey: string; encryptedDataKey: string }): Promise<string> {
  const parsed = JSON.parse(input.encryptedApiKey) as { v: number; iv: string; ciphertext: string };
  const response = await kmsClient().send(new DecryptCommand({
    CiphertextBlob: fromBase64(input.encryptedDataKey),
  }));
  if (!response.Plaintext) throw new Error('KMS did not decrypt the data key.');
  const key = await crypto.subtle.importKey('raw', asArrayBuffer(response.Plaintext), 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(fromBase64(parsed.iv)) },
    key,
    asArrayBuffer(fromBase64(parsed.ciphertext)),
  );
  response.Plaintext.fill(0);
  return decoder.decode(plaintext);
}

export const upsert = action({
  args: {
    id: v.optional(v.id('providerSecrets')),
    provider: providerKind,
    label: v.string(),
    baseUrl: v.optional(v.string()),
    apiKey: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const auth = await requireOrgAdmin(ctx);
    const apiKey = args.apiKey.trim();
    if (!apiKey) throw new Error('API key is required.');
    const encrypted = await encryptWithDataKey(apiKey);
    return await ctx.runMutation(internalApi.providerSecrets.saveEncrypted, {
      ...args,
      ...encrypted,
      apiKeyTail: apiKey.slice(-4),
      orgId: auth.orgId,
      actorUserId: auth.userId,
    });
  },
});

export const testConnection = action({
  args: { id: v.id('providerSecrets') },
  handler: async (ctx, args): Promise<{ ok: boolean; apiKeyTail: string; provider: string }> => {
    const auth = await requireOrgAdmin(ctx);
    const provider = await ctx.runQuery(internalApi.ai.queries.getProviderSecretForAction, { providerSecretId: args.id });
    if (!provider || provider.orgId !== auth.orgId) throw new Error('Provider not found.');
    const apiKey = await decryptStoredApiKey(provider);
    return { ok: Boolean(apiKey), apiKeyTail: apiKey.slice(-4), provider: provider.provider };
  },
});

export const decryptForAction = internalAction({
  args: { providerSecretId: v.id('providerSecrets') },
  handler: async (ctx, args): Promise<string> => {
    const provider = await ctx.runQuery(internalApi.ai.queries.getProviderSecretForAction, {
      providerSecretId: args.providerSecretId,
    });
    if (!provider || provider.disabledAt) throw new Error('Provider not found.');
    return await decryptStoredApiKey(provider);
  },
});
