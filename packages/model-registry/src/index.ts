import type { CostTier, ModelUseCase, ProviderKind } from '@open-design/contracts';

export interface SuggestedModelProfile {
  provider: ProviderKind;
  modelId: string;
  label: string;
  useCase: ModelUseCase;
  costTier: CostTier;
}

export const suggestedModelProfiles: SuggestedModelProfile[] = [
  { provider: 'anthropic', modelId: 'claude-sonnet-4-5', label: 'Claude Sonnet', useCase: 'final', costTier: 'high' },
  { provider: 'openai', modelId: 'gpt-4.1-mini', label: 'GPT Mini', useCase: 'idea', costTier: 'low' },
  { provider: 'google', modelId: 'gemini-2.5-flash', label: 'Gemini Flash', useCase: 'draft', costTier: 'medium' },
  { provider: 'openai-compatible', modelId: 'moonshotai/kimi-k2', label: 'Kimi K2', useCase: 'idea', costTier: 'low' },
  { provider: 'openai-compatible', modelId: 'minimax/minimax-m1', label: 'Minimax', useCase: 'draft', costTier: 'low' },
];

export function modelUseCaseLabel(useCase: ModelUseCase): string {
  return {
    idea: 'Idea generation',
    draft: 'Draft generation',
    final: 'Final creation',
    code: 'Code-heavy HTML',
    image: 'Image generation',
  }[useCase];
}
