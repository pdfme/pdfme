import type { UIRenderProps, SchemaForUI, Size, PropPanel, Schema } from '@pdfme/common';

export type RendererProps = Omit<
  UIRenderProps<Schema>,
  'value' | 'onChange' | 'rootElement' | 'options'
> & {
  onChange: (value: string) => void;
  outline: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
};

export type Render = (arg: UIRenderProps<Schema>) => Promise<void>;

export interface Renderer {
  [key: string]: Render | undefined;
}

export interface PropPanelObject {
  [key: string]: PropPanel<Schema> | undefined;
}

export type ChangeSchemas = (objs: { key: string; value: any; schemaId: string }[]) => void;

export type SidebarProps = {
  height: number;
  hoveringSchemaId: string | null;
  onChangeHoveringSchemaId: (id: string | null) => void;
  size: Size;
  pageSize: Size;
  activeElements: HTMLElement[];
  schemas: SchemaForUI[];
  onSortEnd: (sortedSchemas: SchemaForUI[]) => void;
  onEdit: (id: string) => void;
  onEditEnd: () => void;
  changeSchemas: ChangeSchemas;
  addSchema: () => void;
  deselectSchema: () => void;
};
