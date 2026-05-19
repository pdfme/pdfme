import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Send,
  Server,
  Upload,
  X,
} from 'lucide-react';
import {
  clearStoredPairingToken,
  createPdfmeAgentBridgeClient,
  type AgentArtifact,
  type AgentSession,
  type AgentSessionMessage,
  type AgentSessionStatus,
  type BridgeHealth,
  type BridgeSessionEvent,
  type ChangedFile,
  type SkillSummary,
  type TemplateValidationResult,
  type WorkspaceSummary,
} from '../lib/pdfmeAgentBridge';
import { PDFME_AGENT_FEATURE_EVENT, isPdfmeAgentEnabled } from '../lib/pdfmeAgentFeature';
import PlaygroundButton from './PlaygroundButton';

type PdfmeAgentWidgetProps = {
  getCurrentTemplate?: () => unknown | null;
  getCurrentTemplateTitle?: () => string | null;
  onRefreshTemplate?: () => Promise<void> | void;
  templateName?: string | null;
  templatePath?: string | null;
  workspaceRootName?: string | null;
};

type WidgetLog = {
  id: string;
  text: string;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });

const addUniqueMessages = (
  currentMessages: AgentSessionMessage[],
  nextMessages: AgentSessionMessage[],
) => {
  const existingIds = new Set(currentMessages.map((message) => message.id));
  return [
    ...currentMessages,
    ...nextMessages.filter((message) => !existingIds.has(message.id)),
  ];
};

const getEventMessage = (event: BridgeSessionEvent): AgentSessionMessage | null => {
  if (
    typeof event.data !== 'object' ||
    event.data === null ||
    !('message' in event.data) ||
    typeof event.data.message !== 'object' ||
    event.data.message === null
  ) {
    return null;
  }

  return event.data.message as AgentSessionMessage;
};

const getEventLogMessage = (event: BridgeSessionEvent): string | null => {
  if (
    event.type !== 'agent.log' ||
    typeof event.data !== 'object' ||
    event.data === null ||
    !('message' in event.data) ||
    typeof event.data.message !== 'string'
  ) {
    return null;
  }

  return event.data.message;
};

const getEventStatus = (event: BridgeSessionEvent): AgentSessionStatus | null => {
  if (
    event.type !== 'session.status' ||
    typeof event.data !== 'object' ||
    event.data === null ||
    !('status' in event.data) ||
    typeof event.data.status !== 'string'
  ) {
    return null;
  }

  return event.data.status as AgentSessionStatus;
};

const getEventChangedFiles = (event: BridgeSessionEvent): ChangedFile[] | null => {
  if (
    event.type !== 'changed-files.updated' ||
    typeof event.data !== 'object' ||
    event.data === null ||
    !('changedFiles' in event.data) ||
    !Array.isArray(event.data.changedFiles)
  ) {
    return null;
  }

  return event.data.changedFiles as ChangedFile[];
};

const getEventArtifacts = (event: BridgeSessionEvent): AgentArtifact[] | null => {
  if (
    event.type !== 'artifacts.updated' ||
    typeof event.data !== 'object' ||
    event.data === null ||
    !('artifacts' in event.data) ||
    !Array.isArray(event.data.artifacts)
  ) {
    return null;
  }

  return event.data.artifacts as AgentArtifact[];
};

const getEventValidation = (event: BridgeSessionEvent): TemplateValidationResult | null => {
  if (
    event.type !== 'validation.result' ||
    typeof event.data !== 'object' ||
    event.data === null ||
    !('checks' in event.data) ||
    !Array.isArray(event.data.checks)
  ) {
    return null;
  }

  return event.data as TemplateValidationResult;
};

const statusLabel = (health: BridgeHealth | null, session: AgentSession | null) => {
  if (!health) return 'Checking';
  if (health.requiresPairing && !health.paired) return 'Pairing';
  if (session) return session.status.replace(/_/g, ' ');
  return 'Ready';
};

const getSessionIdFromUrl = () =>
  typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('agentSession');

const REVIEW_CURRENT_TEMPLATE_MESSAGE =
  'Review the current pdfme template. This is a read-only review request; do not edit files.';

export default function PdfmeAgentWidget({
  getCurrentTemplate,
  getCurrentTemplateTitle,
  onRefreshTemplate,
  templateName,
  templatePath,
  workspaceRootName,
}: PdfmeAgentWidgetProps) {
  const client = useMemo(() => createPdfmeAgentBridgeClient(), []);
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [available, setAvailable] = useState(false);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [enabled, setEnabled] = useState(isPdfmeAgentEnabled);
  const [expanded, setExpanded] = useState(true);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<WidgetLog[]>([]);
  const [messages, setMessages] = useState<AgentSessionMessage[]>([]);
  const [pairingToken, setPairingToken] = useState('');
  const [session, setSession] = useState<AgentSession | null>(null);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState<TemplateValidationResult | null>(null);
  const [working, setWorking] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logCounterRef = useRef(0);
  const workspaceRef = useRef<WorkspaceSummary | null>(null);

  useEffect(() => {
    const syncEnabled = () => setEnabled(isPdfmeAgentEnabled());
    syncEnabled();
    window.addEventListener(PDFME_AGENT_FEATURE_EVENT, syncEnabled);
    window.addEventListener('storage', syncEnabled);
    return () => {
      window.removeEventListener(PDFME_AGENT_FEATURE_EVENT, syncEnabled);
      window.removeEventListener('storage', syncEnabled);
    };
  }, []);

  const appendLog = useCallback((text: string) => {
    logCounterRef.current += 1;
    const id = `${Date.now()}:${logCounterRef.current}`;
    setLogs((currentLogs) => [
      ...currentLogs.slice(-24),
      { id, text },
    ]);
  }, []);

  const refreshHealth = useCallback(async () => {
    if (!enabled) return;

    try {
      const nextHealth = await client.health();
      setHealth(nextHealth);
      setAvailable(nextHealth.ok);
    } catch {
      setAvailable(false);
      setHealth(null);
    }
  }, [client, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    void refreshHealth();
    const intervalId = window.setInterval(() => void refreshHealth(), 5000);
    return () => window.clearInterval(intervalId);
  }, [enabled, refreshHealth]);

  useEffect(() => {
    if (!enabled || !available || !health || (health.requiresPairing && !health.paired)) return;

    void client
      .listSkills()
      .then(setSkills)
      .catch(() => setSkills([]));
  }, [available, client, enabled, health]);

  useEffect(
    () => () => {
      eventSourceRef.current?.close();
    },
    [],
  );

  const connectEvents = useCallback(
    (sessionId: string) => {
      eventSourceRef.current?.close();
      const eventSource = client.streamEvents(sessionId);
      eventSourceRef.current = eventSource;

      const onBridgeEvent = (event: MessageEvent) => {
        const bridgeEvent = JSON.parse(event.data) as BridgeSessionEvent;
        appendLog(bridgeEvent.type);
        const eventStatus = getEventStatus(bridgeEvent);
        if (eventStatus) {
          setSession((currentSession) =>
            currentSession
              ? {
                  ...currentSession,
                  status: eventStatus,
                  updatedAt: bridgeEvent.createdAt,
                }
              : currentSession,
          );
          setWorking(eventStatus === 'running');
        }
        const logMessage = getEventLogMessage(bridgeEvent);
        if (logMessage) appendLog(logMessage);
        const eventArtifacts = getEventArtifacts(bridgeEvent);
        if (eventArtifacts) setArtifacts(eventArtifacts);
        const eventChangedFiles = getEventChangedFiles(bridgeEvent);
        if (eventChangedFiles) setChangedFiles(eventChangedFiles);
        const eventValidation = getEventValidation(bridgeEvent);
        if (eventValidation) setValidation(eventValidation);
        const message = getEventMessage(bridgeEvent);
        if (message) {
          setMessages((currentMessages) => addUniqueMessages(currentMessages, [message]));
        }
      };

      eventSource.addEventListener('session.created', onBridgeEvent);
      eventSource.addEventListener('session.status', onBridgeEvent);
      eventSource.addEventListener('user.message', onBridgeEvent);
      eventSource.addEventListener('agent.message', onBridgeEvent);
      eventSource.addEventListener('agent.log', onBridgeEvent);
      eventSource.addEventListener('artifacts.updated', onBridgeEvent);
      eventSource.addEventListener('changed-files.updated', onBridgeEvent);
      eventSource.addEventListener('validation.result', onBridgeEvent);
      eventSource.addEventListener('error', () => {
        appendLog('event stream disconnected');
      });
    },
    [appendLog, client],
  );

  useEffect(() => {
    if (!enabled || !available || !health || (health.requiresPairing && !health.paired) || session) {
      return;
    }

    const sessionId = getSessionIdFromUrl();
    if (!sessionId) return;

    void (async () => {
      try {
        const nextSession = await client.getSession(sessionId);
        setSession(nextSession);
        setMessages(nextSession.messages);
        setChangedFiles(await client.getChangedFiles(sessionId));
        setArtifacts(await client.getArtifacts(sessionId));
        connectEvents(sessionId);
        appendLog(`resumed ${sessionId}`);
      } catch (error) {
        appendLog(error instanceof Error ? error.message : 'session resume failed');
      }
    })();
  }, [appendLog, available, client, connectEvents, enabled, health, session]);

  const ensureSession = useCallback(async () => {
    if (session) return session;

    const workspace = await client.registerWorkspace({
      label: workspaceRootName ?? templateName ?? 'Playground workspace',
      metadata: { source: 'playground-designer-poc' },
      rootName: workspaceRootName ?? undefined,
      selectedTemplateName: templateName ?? undefined,
      templatePath: templatePath ?? undefined,
    });
    workspaceRef.current = workspace;
    setWorkspace(workspace);
    const nextSession = await client.createSession({
      mode: 'designer-review',
      templateName: templateName ?? undefined,
      title: templateName ? `Review ${templateName}` : 'Designer review',
      workspaceId: workspace.id,
    });

    setSession(nextSession);
    setMessages(nextSession.messages);
    appendLog(
      workspace.status === 'mapped'
        ? `registered ${workspace.label} at ${workspace.rootPath}`
        : `registered ${workspace.label}; workspace root is not mapped`,
    );
    for (const diagnostic of workspace.diagnostics) appendLog(diagnostic);
    connectEvents(nextSession.id);
    return nextSession;
  }, [
    appendLog,
    client,
    connectEvents,
    session,
    templateName,
    templatePath,
    workspaceRootName,
  ]);

  const onPair = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pairingToken.trim()) return;

    setSubmitting(true);
    try {
      await client.pair(pairingToken.trim());
      appendLog('paired with local bridge');
      setPairingToken('');
      await refreshHealth();
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'pairing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPairing = async () => {
    clearStoredPairingToken();
    setSession(null);
    setArtifacts([]);
    setMessages([]);
    setChangedFiles([]);
    setValidation(null);
    workspaceRef.current = null;
    setWorkspace(null);
    eventSourceRef.current?.close();
    appendLog('pairing token cleared');
    await refreshHealth();
  };

  const onSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    setWorking(true);
    setInput('');
    try {
      const activeSession = await ensureSession();
      const currentTemplate = getCurrentTemplate?.() ?? null;
      const activeTemplateName =
        templateName ??
        workspaceRef.current?.selectedTemplateName ??
        activeSession.templateName ??
        null;
      if (!activeTemplateName) {
        throw new Error('Open a mounted template before asking the agent to edit it');
      }

      appendLog('requested template edit');
      const nextSession = await client.sendMessage(activeSession.id, message, {
        action: 'edit-template',
        ...(currentTemplate ? { currentTemplate } : {}),
        templateName: activeTemplateName,
        title: getCurrentTemplateTitle?.() ?? activeSession.title,
      });
      setSession(nextSession);
      setMessages((currentMessages) => addUniqueMessages(currentMessages, nextSession.messages));
      setChangedFiles(await client.getChangedFiles(activeSession.id));
      setArtifacts(await client.getArtifacts(activeSession.id));
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'message failed');
    } finally {
      setWorking(false);
    }
  };

  const onReviewCurrentTemplate = async () => {
    setWorking(true);
    try {
      const activeSession = await ensureSession();
      const currentTemplate = getCurrentTemplate?.() ?? null;
      const activeTemplateName =
        templateName ??
        workspaceRef.current?.selectedTemplateName ??
        activeSession.templateName ??
        null;
      if (!currentTemplate && !activeTemplateName) {
        throw new Error('No current template is available to review');
      }

      appendLog('requested current template review');
      const nextSession = await client.sendMessage(
        activeSession.id,
        REVIEW_CURRENT_TEMPLATE_MESSAGE,
        {
          action: 'review-current-template',
          ...(currentTemplate ? { currentTemplate } : {}),
          templateName: activeTemplateName ?? 'current-designer-template',
          title: getCurrentTemplateTitle?.() ?? activeSession.title,
        },
      );
      setSession(nextSession);
      setMessages((currentMessages) => addUniqueMessages(currentMessages, nextSession.messages));
      setChangedFiles(await client.getChangedFiles(activeSession.id));
      setArtifacts(await client.getArtifacts(activeSession.id));
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'review failed');
    } finally {
      setWorking(false);
    }
  };

  const onRefresh = async () => {
    setWorking(true);
    try {
      await onRefreshTemplate?.();
      appendLog('template refreshed');
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'refresh failed');
    } finally {
      setWorking(false);
    }
  };

  const onCreateFromPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setWorking(true);
    try {
      const activeSession = await ensureSession();
      const activeWorkspace = workspaceRef.current;
      if (!activeWorkspace) throw new Error('Workspace is not registered');

      const title =
        window.prompt('Template title', file.name.replace(/\.pdf$/i, '')) ??
        file.name.replace(/\.pdf$/i, '');
      if (!title.trim()) return;

      const result = await client.createTemplateFromPdf({
        dataUrl: await readFileAsDataUrl(file),
        fileName: file.name,
        sessionId: activeSession.id,
        title,
        workspaceId: activeWorkspace.id,
      });
      setValidation(result.validation);
      setArtifacts(result.template.artifacts);
      setChangedFiles(
        result.template.files.map((path) => ({
          path,
          status: 'created',
        })),
      );
      appendLog(
        `created ${result.template.path} (${result.template.pageCount} pages, ${result.template.detectionSource}, ${result.template.acroFormFieldCount + result.template.visualFieldCount} fields)`,
      );
      const nextUrl = new URL('/designer', window.location.origin);
      nextUrl.searchParams.set('workspace', result.template.name);
      nextUrl.searchParams.set('agentSession', activeSession.id);
      window.location.href = `${nextUrl.pathname}${nextUrl.search}`;
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'PDF template creation failed');
    } finally {
      setWorking(false);
    }
  };

  const onValidate = async () => {
    setWorking(true);
    try {
      const activeSession = await ensureSession();
      const activeWorkspace = workspaceRef.current;
      const activeTemplateName =
        templateName ??
        workspaceRef.current?.selectedTemplateName ??
        activeSession.templateName ??
        null;
      const nextValidation =
        activeWorkspace && activeTemplateName
          ? await client.validateTemplate(activeWorkspace.id, activeTemplateName)
          : await client.validateCurrentTemplate({
              template: getCurrentTemplate?.() ?? null,
              templateName: activeTemplateName ?? 'current-designer-template',
              title: getCurrentTemplateTitle?.() ?? activeSession.title,
            });
      setValidation(nextValidation);
      appendLog(nextValidation.summary);
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'validation failed');
    } finally {
      setWorking(false);
    }
  };

  if (!enabled) return null;

  const bridgeUnavailable = !available || !health;

  if (!expanded) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-lg transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
        onClick={() => setExpanded(true)}
      >
        <Bot className="size-4 text-green-600" />
        pdfme Agent
        <ChevronUp className="size-4 text-gray-500" />
      </button>
    );
  }

  const requiresPairing = Boolean(health?.requiresPairing && !health.paired);
  const codexReviewAvailable = health?.agentAdapter === 'codex';
  const adapterLabel = health?.agentAdapter ?? 'unknown adapter';

  return (
    <aside className="fixed bottom-4 right-4 z-40 flex max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-4 shrink-0 text-green-600" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900">pdfme Agent</h2>
            <p className="truncate text-xs capitalize text-gray-500">
              {bridgeUnavailable ? 'Bridge unavailable' : statusLabel(health, session)}
              {skills.length > 0 ? ` · ${skills.length} skills` : ''}
              {health ? ` · ${adapterLabel}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setExpanded(false)}
            aria-label="Collapse pdfme Agent"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            onClick={onResetPairing}
            aria-label="Reset pdfme Agent pairing"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {bridgeUnavailable ? (
        <div className="space-y-3 p-3">
          <div className="rounded border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-xs text-yellow-900">
            Local bridge is unavailable.
          </div>
        </div>
      ) : requiresPairing ? (
        <form className="space-y-3 p-3" onSubmit={onPair}>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <KeyRound className="size-4 text-gray-500" />
            Pair local bridge
          </div>
          <input
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            value={pairingToken}
            onChange={(event) => setPairingToken(event.target.value)}
            placeholder="Pairing token"
            type="password"
          />
          <PlaygroundButton disabled={submitting} fullWidth type="submit" variant="primary">
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Pair
          </PlaygroundButton>
        </form>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {workspaceRootName && (
              <div className="flex items-start gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
                <Server className="mt-0.5 size-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  {workspaceRootName}
                  {templatePath ? ` / ${templatePath}` : ''}
                </span>
              </div>
            )}
            {workspace && workspace.status === 'unmapped' && (
              <div className="rounded border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-xs text-yellow-900">
                Workspace root is not mapped in the bridge.
              </div>
            )}
            {!codexReviewAvailable && (
              <div className="rounded border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-xs text-yellow-900">
                Codex review is not active in the bridge.
              </div>
            )}

            <div className="space-y-2">
              {messages.length === 0 ? (
                <p className="rounded border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
                  Ask for a review or a template change.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'ml-8 bg-green-50 text-green-950'
                        : 'mr-8 bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>
                ))
              )}
            </div>

            {validation && (
              <div
                className={`rounded border px-2 py-1.5 text-xs ${
                  validation.ok
                    ? 'border-green-200 bg-green-50 text-green-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                <div className="font-medium">{validation.summary}</div>
                <div className="mt-1 space-y-0.5">
                  {validation.checks.map((check) => (
                    <div key={check.id} className="truncate">
                      {check.status}: {check.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(artifacts.length > 0 || logs.length > 0 || changedFiles.length > 0) && (
              <details className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-600">
                <summary className="cursor-pointer font-medium text-gray-700">Details</summary>
                {artifacts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {artifacts.map((artifact) => (
                      <div key={`${artifact.kind}:${artifact.path}`} className="truncate">
                        artifact: {artifact.label} · {artifact.path}
                      </div>
                    ))}
                  </div>
                )}
                {changedFiles.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                    {changedFiles.map((file) => (
                      <div key={`${file.status}:${file.path}`} className="truncate">
                        {file.status}: {file.path}
                      </div>
                    ))}
                  </div>
                )}
                {logs.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                    {logs.map((log) => (
                      <div key={log.id} className="truncate">
                        {log.text}
                      </div>
                    ))}
                  </div>
                )}
              </details>
            )}
          </div>

          <div className="border-t border-gray-200 p-3">
            {onRefreshTemplate && (
              <PlaygroundButton
                className="mb-2"
                disabled={working}
                fullWidth
                onClick={() => void onRefresh()}
                variant="secondary"
              >
                <RefreshCw className="size-4" />
                Refresh template
              </PlaygroundButton>
            )}
            <PlaygroundButton
              className="mb-2"
              disabled={working || !codexReviewAvailable}
              fullWidth
              onClick={() => void onReviewCurrentTemplate()}
              variant="primary"
            >
              {working ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Bot className="size-4" />
              )}
              Review current template
            </PlaygroundButton>
            <PlaygroundButton
              className="mb-2"
              disabled={working}
              fullWidth
              onClick={() => void onValidate()}
              variant="secondary"
            >
              Validate template
            </PlaygroundButton>
            <label
              aria-disabled={working}
              className={`mb-2 inline-flex w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 transition ${
                working ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
              }`}
            >
              <Upload className="size-4" />
              Create from PDF
              <input
                disabled={working}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => void onCreateFromPdf(event)}
              />
            </label>
            <form className="flex gap-2" onSubmit={onSendMessage}>
              <input
                className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                disabled={working}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Message"
              />
              <PlaygroundButton disabled={working || !input.trim()} type="submit" variant="primary">
                {working ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              </PlaygroundButton>
            </form>
          </div>
        </>
      )}
    </aside>
  );
}
