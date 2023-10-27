import type {
  DesignerProps,
  PreviewProps,
  UIRenderProps,
  SchemaForUI,
  Template,
  Size,
  Schema,
  ChangeSchemas,
  PropPanel,
} from '@pdfme/common';

export type RendererProps = Omit<
  UIRenderProps<Schema>,
  'value' | 'schema' | 'onChange' | 'rootElement' | 'options'
> & {
  schema: SchemaForUI;
  onChange: (value: string) => void;
  outline: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
};

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
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
};

export type UIRender = (arg: UIRenderProps<Schema>) => Promise<void>;

export interface UIRenderer {
  [key: string]: UIRender | undefined;
}

export interface PropPanelObject {
  [key: string]: PropPanel<Schema> | undefined;
}

export type DesignerReactProps = Omit<DesignerProps, 'domContainer'> & {
  onSaveTemplate: (t: Template) => void;
  size: Size;
};

export type PreviewReactProps = Omit<PreviewProps, 'domContainer'> & {
  onChangeInput?: (args: { index: number; value: string; key: string }) => void;
  size: Size;
};
