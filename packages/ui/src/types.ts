
import type { Schema as FormSchema } from 'form-render';
import type { UIOptions, SchemaForUI, Size } from '@pdfme/common';

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

export type RenderProps = RenderBaseProps & {
    onChange?: (value: string) => void;
    value: string;
    rootElement: HTMLDivElement,
    options: UIOptions;
}

export interface Renderer {
    [key: string]: {
        render: (arg: RenderProps) => Promise<void>;
        defaultValue: string;
        defaultSize: Size;
    } | undefined;
}

export type ChangeSchemas = (objs: { key: string; value: string | number | undefined; schemaId: string }[]) => void;

export type PropPanelSchema = FormSchema;

export interface PropPanel {
    [key: string]: {
        schema?: PropPanelSchema;
        widgets?: Record<string, any>,
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