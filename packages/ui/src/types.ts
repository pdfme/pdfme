import type {
  UIRenderProps,
  SchemaForUI,
  Size,
  Schema,
  ChangeSchemas,
  PropPanel,
} from '@pdfme/common';

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
