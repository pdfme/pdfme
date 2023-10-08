
import type { Schema as FormSchema, WidgetProps } from 'form-render';
import type { UIOptions, Schema, SchemaForUI, Size } from '@pdfme/common';

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
    } | undefined;
}

export type ChangeSchemas = (objs: { key: string; value: any; schemaId: string }[]) => void;

export type PropPanelSchema = FormSchema;

export type PropPanelWidgetGlobalProps = {
    activeSchema: SchemaForUI;
    activeElements: HTMLElement[];
    changeSchemas: ChangeSchemas;
    schemas: SchemaForUI[];
    pageSize: Size;
    options: UIOptions;
}

export type PropPanelWidgetProps = WidgetProps & {
    addons: {
        globalProps: PropPanelWidgetGlobalProps
    }
};

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