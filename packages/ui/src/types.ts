import type { UIRenderProps, SchemaForUI, Size, Schema, ChangeSchemas } from '@pdfme/common';

export type RendererProps = Omit<
  UIRenderProps<Schema>,
  'value' | 'onChange' | 'rootElement' | 'options'
> & {
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
};
