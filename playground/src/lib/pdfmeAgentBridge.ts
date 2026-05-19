const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4128';
const PAIRING_TOKEN_KEY = 'pdfme-agent.pairing-token';

export type BridgeHealth = {
  bridgeApiVersion: number;
  name: string;
  ok: boolean;
  paired: boolean;
  requiresPairing: boolean;
  version: string;
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
  rootName: string | null;
  selectedTemplateName: string | null;
  templatePath: string | null;
  updatedAt: string;
};

export type RegisterWorkspaceInput = {
  label?: string;
  metadata?: Record<string, unknown>;
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

export type AgentSession = {
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

