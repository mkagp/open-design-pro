export type ProviderKind =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openai-compatible'
  | 'vercel-gateway';

export type ModelUseCase = 'idea' | 'draft' | 'final' | 'code' | 'image';
export type CostTier = 'low' | 'medium' | 'high';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
export type RunEventKind = 'text_delta' | 'artifact_delta' | 'artifact_complete' | 'status' | 'error' | 'usage';
export type ArtifactKind = 'html';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ProjectMetadata {
  kind?: 'landing-page' | 'email' | 'ad' | 'prototype' | 'other';
  brief?: string;
  audience?: string;
  platformTargets?: string[];
}

export interface Project {
  id: string;
  orgId: string;
  ownerUserId: string;
  name: string;
  designSystemId?: string;
  metadata?: ProjectMetadata;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

export interface DesignSystem {
  id: string;
  orgId: string;
  name: string;
  description: string;
  tokens?: Record<string, JsonValue>;
  guidelines: string;
  assets?: Array<{ label: string; url: string }>;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  orgId: string;
  projectId: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  orgId: string;
  projectId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  modelProfileId?: string;
  artifactIds: string[];
  createdAt: number;
}

export interface ModelProfile {
  id: string;
  orgId: string;
  providerSecretId: string;
  modelId: string;
  label: string;
  useCase: ModelUseCase;
  costTier: CostTier;
  enabled: boolean;
  isDefaultForUseCase: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MaskedProviderSecret {
  id: string;
  orgId: string;
  provider: ProviderKind;
  label: string;
  baseUrl?: string;
  apiKeyTail: string;
  rotatedAt: number;
  disabledAt?: number;
}

export interface ArtifactManifest {
  version: 1;
  kind: ArtifactKind;
  title: string;
  entry: string;
  exports: Array<'html' | 'zip' | 'pdf'>;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, JsonValue>;
}

export interface RunEvent {
  id: string;
  orgId: string;
  runId: string;
  sequence: number;
  kind: RunEventKind;
  payload: Record<string, JsonValue>;
  createdAt: number;
}
