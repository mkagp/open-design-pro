import type { DesignSystem, Project } from '@open-design/contracts';

export interface ComposeHostedDesignPromptInput {
  project: Pick<Project, 'name' | 'metadata'>;
  designSystem?: Pick<DesignSystem, 'name' | 'description' | 'tokens' | 'guidelines'> | null;
  userPrompt: string;
  priorMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function boundedJson(value: unknown, maxCharacters = 10_000): string {
  const serialized = JSON.stringify(value, null, 2) ?? 'null';
  if (serialized.length <= maxCharacters) return serialized;
  return `${serialized.slice(0, maxCharacters)}\n[Truncated ${serialized.length - maxCharacters} characters]`;
}

export function composeHostedDesignPrompt(input: ComposeHostedDesignPromptInput): string {
  const sections: string[] = [
    'You are an expert digital designer generating production-ready HTML artifacts for a business team.',
    'Return a complete, self-contained HTML document when creating or revising an artifact.',
    'Prioritize landing pages, emails, ad assets, and prototype-style HTML outputs.',
    'Do not mention internal model settings, provider settings, or implementation instructions inside the artifact.',
    `Project: ${input.project.name}`,
  ];

  if (input.project.metadata?.brief) sections.push(`Project brief: ${input.project.metadata.brief}`);
  if (input.project.metadata?.audience) sections.push(`Audience: ${input.project.metadata.audience}`);

  if (input.designSystem) {
    sections.push(`Design system: ${input.designSystem.name}`);
    if (input.designSystem.description) sections.push(`Brand description: ${input.designSystem.description}`);
    if (input.designSystem.guidelines) sections.push(`Guidelines:\n${input.designSystem.guidelines}`);
    if (input.designSystem.tokens) sections.push(`Design tokens:\n${boundedJson(input.designSystem.tokens)}`);
  }

  const recent = (input.priorMessages ?? []).slice(-8);
  if (recent.length > 0) {
    sections.push([
      'Recent conversation:',
      ...recent.map((message) => `${message.role.toUpperCase()}: ${message.content}`),
    ].join('\n'));
  }

  sections.push(`User request:\n${input.userPrompt}`);
  return sections.join('\n\n');
}
