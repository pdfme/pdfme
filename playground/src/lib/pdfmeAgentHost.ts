export const PDFME_AGENT_HOST_READY_EVENT = 'pdfme-agent-host-ready';
export const PDFME_AGENT_HOST_DESTROYED_EVENT = 'pdfme-agent-host-destroyed';

export type PdfmeAgentTemplateContext = {
  editingStaticSchemas?: boolean;
  templateName?: string | null;
};

export type PdfmeAgentSelectedSchema = {
  name: string;
  pageIndex: number;
  schema: unknown;
  schemaId?: string;
  schemaIndex: number;
  type: string;
};

export type PdfmeAgentSelection = {
  bounds?: {
    height: number;
    width: number;
    x: number;
    y: number;
  } | null;
  pageIndex?: number;
  schemas: PdfmeAgentSelectedSchema[];
};

export type PdfmeAgentTemplateUpdate = {
  baseMetadata?: unknown | null;
  baseTemplate?: unknown | null;
  metadata?: unknown | null;
  template: unknown;
};

export type PdfmeAgentHost = {
  applyTemplateUpdate?: (input: PdfmeAgentTemplateUpdate) => Promise<void> | void;
  getCurrentTemplateMetadata?: () => unknown | null;
  getCurrentTemplate?: () => unknown | null;
  getCurrentTemplateTitle?: () => string | null;
  getSelectedSchemas?: () => PdfmeAgentSelectedSchema[];
  getSelection?: () => PdfmeAgentSelection | null;
  getTemplateContext?: () => PdfmeAgentTemplateContext;
  onChangeSelection?: (
    cb: (selection: PdfmeAgentSelection | null) => void,
  ) => (() => void) | void;
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
