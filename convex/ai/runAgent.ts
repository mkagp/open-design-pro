"use node";

import { createHash } from 'node:crypto';
import { streamText } from 'ai';
import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { extractHtmlArtifact, createHtmlArtifactManifest } from '@open-design/artifacts';
import { composeHostedDesignPrompt } from '@open-design/prompts';
import { buildS3Key, putS3Object } from '../s3';
import { resolveLanguageModel } from './providers';
import type { Id } from '../_generated/dataModel';

export const runAgent = internalAction({
  args: { runId: v.id('runs') },
  handler: async (ctx, args) => {
    const loaded = await ctx.runQuery(internal.ai.queries.loadRunContext, { runId: args.runId });
    if (!loaded?.run || !loaded.project || !loaded.conversation || !loaded.modelProfile || !loaded.provider) {
      await ctx.runMutation(internal.runs.finish, {
        runId: args.runId,
        status: 'failed',
        content: '',
        error: 'Run context could not be loaded.',
      });
      return;
    }

    await ctx.runMutation(internal.runs.markRunning, { runId: args.runId });
    await ctx.runMutation(internal.runs.appendEvent, {
      runId: args.runId,
      kind: 'status',
      payload: { status: 'running' },
    });

    let fullText = '';
    const artifactIds: Id<'artifacts'>[] = [];

    try {
      const latestUser = [...loaded.messages].reverse().find((message) => message.role === 'user');
      const apiKey = await ctx.runAction(internal.providerSecretActions.decryptForAction, {
        providerSecretId: loaded.provider._id,
      });
      const model = await resolveLanguageModel({
        provider: loaded.provider,
        modelId: loaded.modelProfile.modelId,
        apiKey,
      });

      const prompt = composeHostedDesignPrompt({
        project: {
          name: loaded.project.name,
          metadata: loaded.project.metadata as never,
        },
        designSystem: loaded.designSystem
          ? {
            name: loaded.designSystem.name,
            description: loaded.designSystem.description,
            guidelines: loaded.designSystem.guidelines,
            tokens: loaded.designSystem.tokens as never,
          }
          : null,
        userPrompt: latestUser?.content ?? '',
        priorMessages: loaded.messages
          .filter((message: any) => message._id !== latestUser?._id)
          .map((message: any) => ({ role: message.role, content: message.content })),
      });

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 120_000);
      try {
        const result = streamText({ model: model as never, prompt, abortSignal: abortController.signal });
        for await (const delta of result.textStream) {
          fullText += delta;
          await ctx.runMutation(internal.runs.appendEvent, {
            runId: args.runId,
            kind: 'text_delta',
            payload: { text: delta },
          });
        }
      } finally {
        clearTimeout(timeout);
      }

      const artifact = extractHtmlArtifact(fullText);
      if (artifact) {
        const manifest = createHtmlArtifactManifest({ title: artifact.title });
        const sha256 = createHash('sha256').update(artifact.html).digest('hex');
        const artifactKey = `${args.runId}`;
        const s3Key = buildS3Key({
          orgId: loaded.run.orgId,
          projectId: loaded.run.projectId,
          category: 'artifacts',
          itemId: artifactKey,
          fileName: 'index.html',
        });
        await putS3Object({
          key: s3Key,
          body: artifact.html,
          contentType: 'text/html; charset=utf-8',
        });
        const artifactId = await ctx.runMutation(internal.artifacts.registerGeneratedHtml, {
          orgId: loaded.run.orgId,
          projectId: loaded.run.projectId,
          conversationId: loaded.run.conversationId,
          runId: args.runId,
          title: artifact.title,
          manifest,
          s3Key,
          html: artifact.html,
          sha256,
        });
        artifactIds.push(artifactId);
        await ctx.runMutation(internal.runs.appendEvent, {
          runId: args.runId,
          kind: 'artifact_complete',
          payload: { artifactId, title: artifact.title },
        });
      }

      await ctx.runMutation(internal.runs.finish, {
        runId: args.runId,
        status: 'succeeded',
        content: fullText,
        artifactIds,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI run failed.';
      await ctx.runMutation(internal.runs.appendEvent, {
        runId: args.runId,
        kind: 'error',
        payload: { message },
      });
      await ctx.runMutation(internal.runs.finish, {
        runId: args.runId,
        status: 'failed',
        content: fullText,
        artifactIds,
        error: message,
      });
    }
  },
});
