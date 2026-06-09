import type { ArtifactManifest } from '@open-design/contracts';

export interface ParsedHtmlArtifact {
  title: string;
  html: string;
}

const htmlFencePattern = /```(?:html)?\s*([\s\S]*?<\/html>[\s\S]*?)```/i;
const fullHtmlPattern = /<!doctype html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>/i;

export function extractHtmlArtifact(text: string): ParsedHtmlArtifact | null {
  const fenced = text.match(htmlFencePattern)?.[1];
  const raw = fenced ?? text.match(fullHtmlPattern)?.[0];
  if (!raw) return null;

  const html = raw.trim();
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || 'Generated HTML';
  return { title, html };
}

export function createHtmlArtifactManifest(input: {
  title: string;
  entry?: string;
  now?: Date;
}): ArtifactManifest {
  const now = input.now ?? new Date();
  const timestamp = now.getTime();
  return {
    version: 1,
    kind: 'html',
    title: input.title,
    entry: input.entry ?? 'index.html',
    exports: ['html', 'zip'],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function htmlMimeType(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (lowerName.endsWith('.css')) return 'text/css; charset=utf-8';
  if (lowerName.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (lowerName.endsWith('.json')) return 'application/json';
  if (lowerName.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}
