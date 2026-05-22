export const PDFME_AGENT_HOST_READY_EVENT = 'pdfme-agent-host-ready';
export const PDFME_AGENT_HOST_DESTROYED_EVENT = 'pdfme-agent-host-destroyed';

export type PdfmeAgentTemplateContext = {
  templateName?: string | null;
};

export type PdfmeAgentTemplateUpdate = {
  baseTemplate?: unknown | null;
  template: unknown;
};

export type PdfmeAgentHost = {
  applyTemplateUpdate?: (input: PdfmeAgentTemplateUpdate) => Promise<void> | void;
  getCurrentTemplate?: () => unknown | null;
  getCurrentTemplateTitle?: () => string | null;
  getTemplateContext?: () => PdfmeAgentTemplateContext;
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
