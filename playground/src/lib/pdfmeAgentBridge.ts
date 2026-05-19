const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4128';
const PAIRING_TOKEN_KEY = 'pdfme-agent.pairing-token';

export type BridgeHealth = {
  bridgeApiVersion: number;
  name: string;
  ok: boolean;
  paired: boolean;
  requiresPairing: boolean;
  version: string;
  workspaceRootCount?: number;
};

export type SkillSummary = {
  description: string;
  id: string;
  title: string;
};

export type WorkspaceSummary = {
  createdAt: string;
  id: string;
  label: string;
  metadata: Record<string, unknown>;
  diagnostics: string[];
  rootPath: string | null;
  rootName: string | null;
  selectedTemplateName: string | null;
  status: 'mapped' | 'unmapped';
  templatePath: string | null;
  updatedAt: string;
  writeScopePath: string | null;
};

export type RegisterWorkspaceInput = {
  label?: string;
  metadata?: Record<string, unknown>;
  rootPath?: string;
  rootName?: string;
  selectedTemplateName?: string;
  templatePath?: string;
};

export type AgentSessionStatus = 'idle' | 'running' | 'waiting_for_user' | 'completed' | 'failed';

export type AgentSessionMessage = {
  content: string;
  createdAt: string;
  id: string;
  role: 'agent' | 'system' | 'user';
};

export type ChangedFile = {
  path: string;
  status: 'created' | 'deleted' | 'modified' | 'unknown';
};

export type AgentArtifact = {
  createdAt: string;
  kind: 'image' | 'json' | 'pdf' | 'text' | 'unknown';
  label: string;
  mimeType: string | null;
  path: string;
  templateName: string | null;
};

export type AgentSession = {
  artifacts: AgentArtifact[];
  changedFiles: ChangedFile[];
  createdAt: string;
  id: string;
  messages: AgentSessionMessage[];
  mode: string;
  status: AgentSessionStatus;
  templateName: string | null;
  title: string;
  updatedAt: string;
  workspaceId: string | null;
};

export type CreateSessionInput = {
  initialMessage?: string;
  mode?: string;
  templateName?: string;
  title?: string;
  workspaceId?: string;
};

export type BridgeSessionEvent = {
  createdAt: string;
  data: unknown;
  id: string;
  sessionId: string;
  type: string;
};

export type ValidationCheck = {
  id: string;
  label: string;
  message: string;
  status: 'error' | 'ok' | 'warning';
};

export type TemplateValidationResult = {
  checks: ValidationCheck[];
  ok: boolean;
  summary: string;
  template?: {
    fieldCount: number;
    pageCount: number;
    sourceKind: string | null;
    templateName: string;
    title: string | null;
  };
};

export type CreatedTemplateSummary = {
  acroFormFieldCount: number;
  artifacts: AgentArtifact[];
  detectionSource: 'acroform' | 'blank' | 'visual';
  files: string[];
  name: string;
  pageCount: number;
  path: string;
  title: string;
  visualFieldCount: number;
};

class BridgeRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BridgeRequestError';
  }
}

const getStoredPairingToken = () =>
  typeof window === 'undefined' ? null : window.localStorage.getItem(PAIRING_TOKEN_KEY);

export const clearStoredPairingToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PAIRING_TOKEN_KEY);
};

const setStoredPairingToken = (token: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PAIRING_TOKEN_KEY, token);
};

const resolveBridgeUrl = () => {
  const configuredUrl = import.meta.env.VITE_PDFME_AGENT_BRIDGE_URL;
  return (configuredUrl || DEFAULT_BRIDGE_URL).replace(/\/+$/, '');
};

export class PdfmeAgentBridgeClient {
  constructor(private readonly baseUrl = resolveBridgeUrl()) {}

  get hasPairingToken() {
    return Boolean(getStoredPairingToken());
  }

  async health() {
    return this.fetchJson<BridgeHealth>('/health');
  }

  async listSkills() {
    const response = await this.fetchJson<{ skills: SkillSummary[] }>('/skills');
    return response.skills;
  }

  async pair(token: string) {
    const response = await this.fetchJson<{ paired: boolean; requiresPairing: boolean }>('/pair', {
      body: JSON.stringify({ token }),
      method: 'POST',
      skipToken: true,
    });
    if (response.paired) setStoredPairingToken(token);
    return response;
  }

  async registerWorkspace(input: RegisterWorkspaceInput) {
    const response = await this.fetchJson<{ workspace: WorkspaceSummary }>('/workspaces', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    return response.workspace;
  }

  async createSession(input: CreateSessionInput) {
    const response = await this.fetchJson<{ session: AgentSession }>('/sessions', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    return response.session;
  }

  async getSession(sessionId: string) {
    const response = await this.fetchJson<{ session: AgentSession }>(
      `/sessions/${encodeURIComponent(sessionId)}`,
    );
    return response.session;
  }

  async sendMessage(sessionId: string, message: string) {
    const response = await this.fetchJson<{ session: AgentSession }>(
      `/sessions/${encodeURIComponent(sessionId)}/messages`,
      {
        body: JSON.stringify({ message }),
        method: 'POST',
      },
    );
    return response.session;
  }

  async getChangedFiles(sessionId: string) {
    const response = await this.fetchJson<{ changedFiles: ChangedFile[] }>(
      `/sessions/${encodeURIComponent(sessionId)}/changed-files`,
    );
    return response.changedFiles;
  }

  async getArtifacts(sessionId: string) {
    const response = await this.fetchJson<{ artifacts: AgentArtifact[] }>(
      `/sessions/${encodeURIComponent(sessionId)}/artifacts`,
    );
    return response.artifacts;
  }

  async validateTemplate(workspaceId: string, templateName?: string | null) {
    const response = await this.fetchJson<{ validation: TemplateValidationResult }>(
      '/templates/validate',
      {
        body: JSON.stringify({ templateName, workspaceId }),
        method: 'POST',
      },
    );
    return response.validation;
  }

  async validateCurrentTemplate(input: {
    template: unknown;
    templateName?: string | null;
    title?: string | null;
  }) {
    const response = await this.fetchJson<{ validation: TemplateValidationResult }>(
      '/templates/validate',
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );
    return response.validation;
  }

  async createTemplateFromPdf(input: {
    dataUrl: string;
    fileName: string;
    sessionId?: string;
    title?: string;
    workspaceId: string;
  }) {
    const response = await this.fetchJson<{
      template: CreatedTemplateSummary;
      validation: TemplateValidationResult;
    }>('/templates/from-pdf', {
      body: JSON.stringify(input),
      method: 'POST',
    });
    return response;
  }

  streamEvents(sessionId: string) {
    const token = getStoredPairingToken();
    const url = new URL(`${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}/events`);
    if (token) url.searchParams.set('token', token);
    return new EventSource(url);
  }

  private async fetchJson<T>(
    path: string,
    init: (RequestInit & { skipToken?: boolean }) = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');

    const token = getStoredPairingToken();
    if (token && !init.skipToken) headers.set('X-Pdfme-Agent-Token', token);

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : `Bridge request failed with ${response.status}`;
      throw new BridgeRequestError(response.status, message);
    }

    return payload as T;
  }
}

export const createPdfmeAgentBridgeClient = () => new PdfmeAgentBridgeClient();
