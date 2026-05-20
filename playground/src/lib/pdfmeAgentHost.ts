export const PDFME_AGENT_HOST_READY_EVENT = 'pdfme-agent-host-ready';
export const PDFME_AGENT_HOST_DESTROYED_EVENT = 'pdfme-agent-host-destroyed';

export type PdfmeAgentWorkspaceContext = {
  templateName?: string | null;
  templatePath?: string | null;
  workspaceRootName?: string | null;
};

export type PdfmeAgentHost = {
  getCurrentTemplate?: () => unknown | null;
  getCurrentTemplateTitle?: () => string | null;
  getWorkspaceContext?: () => PdfmeAgentWorkspaceContext;
  navigateToGeneratedTemplate?: (input: { sessionId: string; templateName: string }) => void;
  refreshTemplate?: () => Promise<void> | void;
};

declare global {
  interface Window {
    pdfmeAgent?: {
      isEnabled?: () => boolean;
      setEnabled?: (enabled: boolean) => void;
      start?: (host?: PdfmeAgentHost) => void;
      stop?: () => void;
      version?: string;
    };
    pdfmeAgentHost?: PdfmeAgentHost;
  }
}
