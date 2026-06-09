'use client';

import { FormEvent, useMemo, useState } from 'react';
import { RedirectToSignIn, SignedIn, SignedOut, UserButton, useAuth } from '@clerk/nextjs';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Button } from '@open-design/components';
import { suggestedModelProfiles, modelUseCaseLabel } from '@open-design/model-registry';
import { api } from '../../../../convex/_generated/api';
import styles from './AppShell.module.css';

const convexApi = api as any;

type Id = string;

export function AppShell() {
  return (
    <>
      <SignedOut>
        <AuthGate />
      </SignedOut>
      <SignedIn>
        <Workspace />
      </SignedIn>
    </>
  );
}

function AuthGate() {
  return <RedirectToSignIn />;
}

function Workspace() {
  const { orgId, orgRole } = useAuth();
  const isAdmin = orgRole === 'org:admin';
  const projects = useQuery(convexApi.projects.list) ?? [];
  const designSystems = useQuery(convexApi.designSystems.list) ?? [];
  const modelProfiles = useQuery(convexApi.modelProfiles.listEnabled) ?? [];
  const providers = useQuery(convexApi.providerSecrets.listMasked) ?? [];
  const createProject = useMutation(convexApi.projects.create);
  const createDesignSystem = useMutation(convexApi.designSystems.create);
  const [activeProjectId, setActiveProjectId] = useState<Id | null>(null);
  const activeProject = useMemo(
    () => projects.find((project: any) => project._id === activeProjectId) ?? projects[0] ?? null,
    [activeProjectId, projects],
  );

  const [projectName, setProjectName] = useState('');
  const [designSystemName, setDesignSystemName] = useState('');
  const [designSystemDescription, setDesignSystemDescription] = useState('');
  const [designSystemGuidelines, setDesignSystemGuidelines] = useState('');

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    const id = await createProject({
      name: projectName || 'Untitled project',
      designSystemId: designSystems[0]?._id,
      metadata: { kind: 'landing-page' },
    });
    setProjectName('');
    setActiveProjectId(id as string);
  }

  async function handleCreateDesignSystem(event: FormEvent) {
    event.preventDefault();
    await createDesignSystem({
      name: designSystemName || 'Untitled design system',
      description: designSystemDescription,
      guidelines: designSystemGuidelines,
    });
    setDesignSystemName('');
    setDesignSystemDescription('');
    setDesignSystemGuidelines('');
  }

  if (!orgId) {
    return (
      <main className={styles.gate}>
        <section className={styles.gatePanel}>
          <h1>Organization access required</h1>
          <p className={styles.muted}>Select or join your company organization in Clerk.</p>
          <UserButton />
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark} />
          <span>Open Design</span>
        </div>
        <div className={styles.topActions}>
          <span className={styles.muted}>{isAdmin ? 'Admin' : 'Member'}</span>
          <UserButton />
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Projects</h2>
            <form className={styles.form} onSubmit={handleCreateProject}>
              <input
                className={styles.input}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Project name"
              />
              <Button className="primary" type="submit">Create</Button>
            </form>
          </section>
          <section className={styles.section}>
            <div className={styles.stack}>
              {projects.map((project: any) => (
                <button
                  key={project._id}
                  className={`${styles.projectButton} ${activeProject?._id === project._id ? styles.active : ''}`}
                  onClick={() => setActiveProjectId(project._id)}
                  type="button"
                >
                  <strong>{project.name}</strong>
                  <span className={styles.muted}>{new Date(project.updatedAt).toLocaleString()}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className={styles.main}>
          {activeProject ? (
            <ProjectWorkspace
              project={activeProject}
              conversationsApi={convexApi.conversations}
              runsApi={convexApi.runs}
              artifactsApi={convexApi.artifacts}
              s3Api={convexApi.s3}
              modelProfiles={modelProfiles}
            />
          ) : (
            <div className={styles.message}>Create a project to start generating.</div>
          )}
        </section>

        <aside className={styles.inspector}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Design Systems</h2>
            <form className={styles.form} onSubmit={handleCreateDesignSystem}>
              <input
                className={styles.input}
                value={designSystemName}
                onChange={(event) => setDesignSystemName(event.target.value)}
                placeholder="Name"
              />
              <input
                className={styles.input}
                value={designSystemDescription}
                onChange={(event) => setDesignSystemDescription(event.target.value)}
                placeholder="Description"
              />
              <textarea
                className={styles.textarea}
                value={designSystemGuidelines}
                onChange={(event) => setDesignSystemGuidelines(event.target.value)}
                placeholder="Guidelines"
              />
              <Button type="submit">Save design system</Button>
            </form>
            <div className={styles.stack}>
              {designSystems.map((system: any) => (
                <div className={styles.item} key={system._id}>
                  <strong>{system.name}</strong>
                  <span className={styles.muted}>{system.description}</span>
                </div>
              ))}
            </div>
          </section>

          {isAdmin ? (
            <AdminSettings providers={providers} />
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function ProjectWorkspace({
  project,
  conversationsApi,
  runsApi,
  artifactsApi,
  s3Api,
  modelProfiles,
}: {
  project: any;
  conversationsApi: any;
  runsApi: any;
  artifactsApi: any;
  s3Api: any;
  modelProfiles: any[];
}) {
  const conversations = useQuery(conversationsApi.list, { projectId: project._id }) ?? [];
  const conversation = conversations[0];
  const messages = useQuery(
    conversationsApi.messages,
    conversation ? { conversationId: conversation._id } : 'skip',
  ) ?? [];
  const artifacts = useQuery(artifactsApi.list, { projectId: project._id }) ?? [];
  const startRun = useMutation(runsApi.start);
  const createDownloadUrl = useAction(s3Api.createDownloadUrl);
  const [prompt, setPrompt] = useState('');
  const [modelProfileId, setModelProfileId] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function submitPrompt(event: FormEvent) {
    event.preventDefault();
    if (!conversation) return;
    setError('');
    try {
      await startRun({
        projectId: project._id,
        conversationId: conversation._id,
        message: prompt,
        modelProfileId: modelProfileId || undefined,
      });
      setPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed.');
    }
  }

  async function previewArtifact(artifact: any) {
    const detail = await createDownloadUrl({ s3Key: artifact.entryFile?.s3Key ?? artifact.s3Key });
    setPreviewUrl(detail.url);
  }

  return (
    <div className={styles.chat}>
      <div className={styles.workspaceHeader}>
        <div>
          <h1 className={styles.workspaceTitle}>{project.name}</h1>
          <p className={styles.muted}>Generated HTML workspace</p>
        </div>
        <select
          className={styles.select}
          value={modelProfileId}
          onChange={(event) => setModelProfileId(event.target.value)}
        >
          <option value="">Default final model</option>
          {modelProfiles.map((profile) => (
            <option value={profile._id} key={profile._id}>
              {profile.label} · {modelUseCaseLabel(profile.useCase)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.messages}>
        {messages.map((message: any) => (
          <div className={styles.message} key={message._id}>
            <div className={styles.messageRole}>{message.role}</div>
            {message.content || (message.role === 'assistant' ? 'Generating...' : '')}
          </div>
        ))}
      </div>

      <form className={styles.composer} onSubmit={submitPrompt}>
        <textarea
          className={styles.textarea}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Generate a landing page, email, ad asset, or HTML prototype"
        />
        <div className={styles.row}>
          <span className={error ? styles.error : styles.muted}>{error || `${artifacts.length} artifacts`}</span>
          <Button className="primary" disabled={!prompt.trim() || !conversation} type="submit">Run</Button>
        </div>
      </form>

      <section className={styles.stack}>
        <h2 className={styles.sectionTitle}>Artifacts</h2>
        {artifacts.map((artifact: any) => (
          <div className={styles.item} key={artifact._id}>
            <div className={styles.row}>
              <strong>{artifact.title}</strong>
              <Button type="button" onClick={() => previewArtifact(artifact)}>Preview</Button>
            </div>
          </div>
        ))}
        {previewUrl ? <iframe className={styles.previewFrame} src={previewUrl} sandbox="allow-scripts allow-forms" /> : null}
      </section>
    </div>
  );
}

function AdminSettings({ providers }: { providers: any[] }) {
  const upsertProvider = useAction(convexApi.providerSecretActions.upsert);
  const upsertModel = useMutation(convexApi.modelProfiles.upsert);
  const [provider, setProvider] = useState('anthropic');
  const [label, setLabel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [providerSecretId, setProviderSecretId] = useState('');
  const [modelId, setModelId] = useState('');
  const [modelLabel, setModelLabel] = useState('');
  const [useCase, setUseCase] = useState('final');
  const [costTier, setCostTier] = useState('medium');

  async function saveProvider(event: FormEvent) {
    event.preventDefault();
    const id = await upsertProvider({
      provider,
      label: label || provider,
      baseUrl: baseUrl || undefined,
      apiKey,
    });
    setProviderSecretId(id as string);
    setApiKey('');
  }

  async function saveModel(event: FormEvent) {
    event.preventDefault();
    await upsertModel({
      providerSecretId,
      modelId,
      label: modelLabel || modelId,
      useCase,
      costTier,
      enabled: true,
      isDefaultForUseCase: true,
    });
    setModelId('');
    setModelLabel('');
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>AI Providers</h2>
      <form className={styles.form} onSubmit={saveProvider}>
        <select className={styles.select} value={provider} onChange={(event) => setProvider(event.target.value)}>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="google">Google Gemini</option>
          <option value="openai-compatible">OpenAI-compatible</option>
          <option value="vercel-gateway">Vercel AI Gateway</option>
        </select>
        <input className={styles.input} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" />
        <input className={styles.input} value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="Base URL" />
        <input className={styles.input} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="API key" type="password" />
        <Button type="submit">Save provider</Button>
      </form>

      <div className={styles.stack}>
        {providers.map((entry) => (
          <button
            className={styles.projectButton}
            key={entry._id}
            onClick={() => setProviderSecretId(entry._id)}
            type="button"
          >
            <strong>{entry.label}</strong>
            <span className={styles.muted}>{entry.provider} · ending {entry.apiKeyTail}</span>
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={saveModel}>
        <select className={styles.select} value={providerSecretId} onChange={(event) => setProviderSecretId(event.target.value)}>
          <option value="">Provider</option>
          {providers.map((entry) => <option key={entry._id} value={entry._id}>{entry.label}</option>)}
        </select>
        <input className={styles.input} value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder="Model ID" />
        <input className={styles.input} value={modelLabel} onChange={(event) => setModelLabel(event.target.value)} placeholder="Model label" />
        <select className={styles.select} value={useCase} onChange={(event) => setUseCase(event.target.value)}>
          <option value="idea">Idea</option>
          <option value="draft">Draft</option>
          <option value="final">Final</option>
          <option value="code">Code</option>
          <option value="image">Image</option>
        </select>
        <select className={styles.select} value={costTier} onChange={(event) => setCostTier(event.target.value)}>
          <option value="low">Low cost</option>
          <option value="medium">Medium cost</option>
          <option value="high">High cost</option>
        </select>
        <Button disabled={!providerSecretId || !modelId} type="submit">Save model</Button>
      </form>

      <div className={styles.stack}>
        {suggestedModelProfiles.map((profile) => (
          <div className={styles.item} key={`${profile.provider}:${profile.modelId}`}>
            <strong>{profile.label}</strong>
            <span className={styles.muted}>{profile.provider} · {profile.modelId}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
