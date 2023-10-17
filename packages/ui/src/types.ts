import type { UIRenderProps, SchemaForUI, Size, PropPanel } from '@pdfme/common';

// FIXME anyをなくす
export type RendererProps = Omit<UIRenderProps<any>, 'value' | 'onChange' | 'rootElement' | 'options'> & {
    onChange: (value: string) => void;
    outline: string;
    onChangeHoveringSchemaId?: (id: string | null) => void;
}

export interface Renderer {
    [key: string]: {
        render: (arg: UIRenderProps<any>) => Promise<void>;
    } | undefined;
}

export interface PropPanelObject {
    [key: string]: PropPanel<any> | undefined;
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