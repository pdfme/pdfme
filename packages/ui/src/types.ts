
import type { Schema, SchemaForUI, Size, PropPanelSchema } from '@pdfme/common';
import type { UIRenderProps } from '@pdfme/schemas';

interface RenderBaseProps {
    schema: SchemaForUI;
    mode: 'viewer' | 'form';
    tabIndex?: number;
    placeholder?: string;
    stopEditing?: () => void;

}

export type RendererProps = RenderBaseProps & {
    onChange: (value: string) => void;
    outline: string;
    onChangeHoveringSchemaId?: (id: string | null) => void;
}

export interface Renderer {
    [key: string]: {
        render: (arg: UIRenderProps) => Promise<void>;
    } | undefined;
}

export type ChangeSchemas = (objs: { key: string; value: any; schemaId: string }[]) => void;


type PartOf<T> = {
    [K in keyof T]?: T[K];
};

export interface PropPanel {
    [key: string]: {
        schema: Record<string, PropPanelSchema>;
        widgets?: Record<string, any>,
        defaultValue: string;
        defaultSchema: PartOf<Schema>;
    } | undefined;
}

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