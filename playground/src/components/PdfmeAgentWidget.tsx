import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Send,
  Server,
  X,
} from 'lucide-react';
import {
  clearStoredPairingToken,
  createPdfmeAgentBridgeClient,
  type AgentSession,
  type AgentSessionMessage,
  type BridgeHealth,
  type BridgeSessionEvent,
  type ChangedFile,
  type SkillSummary,
} from '../lib/pdfmeAgentBridge';
import { isPdfmeAgentEnabled } from '../lib/pdfmeAgentFeature';
import PlaygroundButton from './PlaygroundButton';

type PdfmeAgentWidgetProps = {
  onRefreshTemplate?: () => Promise<void> | void;
  templateName?: string | null;
  templatePath?: string | null;
  workspaceRootName?: string | null;
};

type WidgetLog = {
  id: string;
  text: string;
};

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

const statusLabel = (health: BridgeHealth | null, session: AgentSession | null) => {
  if (!health) return 'Checking';
  if (health.requiresPairing && !health.paired) return 'Pairing';
  if (session) return session.status.replace(/_/g, ' ');
  return 'Ready';
};

export default function PdfmeAgentWidget({
  onRefreshTemplate,
  templateName,
  templatePath,
  workspaceRootName,
}: PdfmeAgentWidgetProps) {
  const enabled = isPdfmeAgentEnabled();
  const client = useMemo(() => createPdfmeAgentBridgeClient(), []);
  const [available, setAvailable] = useState(false);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<WidgetLog[]>([]);
  const [messages, setMessages] = useState<AgentSessionMessage[]>([]);
  const [pairingToken, setPairingToken] = useState('');
  const [session, setSession] = useState<AgentSession | null>(null);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [working, setWorking] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const appendLog = useCallback((text: string) => {
    setLogs((currentLogs) => [
      ...currentLogs.slice(-24),
      { id: `${Date.now()}:${currentLogs.length}`, text },
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
        const message = getEventMessage(bridgeEvent);
        if (message) {
          setMessages((currentMessages) => addUniqueMessages(currentMessages, [message]));
        }
      };

      eventSource.addEventListener('session.created', onBridgeEvent);
      eventSource.addEventListener('session.status', onBridgeEvent);
      eventSource.addEventListener('user.message', onBridgeEvent);
      eventSource.addEventListener('agent.message', onBridgeEvent);
      eventSource.addEventListener('error', () => {
        appendLog('event stream disconnected');
      });
    },
    [appendLog, client],
  );

  const ensureSession = useCallback(async () => {
    if (session) return session;

    const workspace = await client.registerWorkspace({
      label: workspaceRootName ?? templateName ?? 'Playground workspace',
      metadata: { source: 'playground-designer-poc' },
      rootName: workspaceRootName ?? undefined,
      selectedTemplateName: templateName ?? undefined,
      templatePath: templatePath ?? undefined,
    });
    const nextSession = await client.createSession({
      mode: 'designer-review',
      templateName: templateName ?? undefined,
      title: templateName ? `Review ${templateName}` : 'Designer review',
      workspaceId: workspace.id,
    });

    setSession(nextSession);
    setMessages(nextSession.messages);
    appendLog(`registered ${workspace.label}`);
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
    setMessages([]);
    setChangedFiles([]);
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
      const nextSession = await client.sendMessage(activeSession.id, message);
      setSession(nextSession);
      setMessages((currentMessages) => addUniqueMessages(currentMessages, nextSession.messages));
      setChangedFiles(await client.getChangedFiles(activeSession.id));
    } catch (error) {
      appendLog(error instanceof Error ? error.message : 'message failed');
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

  if (!enabled || !available || !health) return null;

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

  const requiresPairing = health.requiresPairing && !health.paired;

  return (
    <aside className="fixed bottom-4 right-4 z-40 flex max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-lg border border-gray-200 bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-4 shrink-0 text-green-600" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900">pdfme Agent</h2>
            <p className="truncate text-xs capitalize text-gray-500">
              {statusLabel(health, session)}
              {skills.length > 0 ? ` · ${skills.length} skills` : ''}
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

      {requiresPairing ? (
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

            {(logs.length > 0 || changedFiles.length > 0) && (
              <details className="rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-600">
                <summary className="cursor-pointer font-medium text-gray-700">Details</summary>
                {changedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
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
