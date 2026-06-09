import type { Doc } from '../_generated/dataModel';

export async function resolveLanguageModel(input: {
  provider: Doc<'providerSecrets'>;
  modelId: string;
  apiKey: string;
}) {
  if (input.provider.provider === 'anthropic') {
    const mod = await import('@ai-sdk/anthropic');
    const createAnthropic = (mod as unknown as { createAnthropic: (options: { apiKey: string; baseURL?: string }) => (model: string) => unknown }).createAnthropic;
    return createAnthropic({ apiKey: input.apiKey, baseURL: input.provider.baseUrl })(input.modelId);
  }

  if (input.provider.provider === 'google') {
    const mod = await import('@ai-sdk/google');
    const createGoogle = (mod as unknown as {
      createGoogleGenerativeAI?: (options: { apiKey: string; baseURL?: string }) => (model: string) => unknown;
      createGoogle?: (options: { apiKey: string; baseURL?: string }) => (model: string) => unknown;
    }).createGoogleGenerativeAI ?? (mod as unknown as {
      createGoogle: (options: { apiKey: string; baseURL?: string }) => (model: string) => unknown;
    }).createGoogle;
    return createGoogle({ apiKey: input.apiKey, baseURL: input.provider.baseUrl })(input.modelId);
  }

  const mod = await import('@ai-sdk/openai');
  const createOpenAI = (mod as unknown as { createOpenAI: (options: { apiKey: string; baseURL?: string }) => (model: string) => unknown }).createOpenAI;
  return createOpenAI({
    apiKey: input.apiKey,
    baseURL: input.provider.baseUrl || (input.provider.provider === 'vercel-gateway' ? 'https://ai-gateway.vercel.sh/v1' : undefined),
  })(input.modelId);
}
