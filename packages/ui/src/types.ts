
import type { UIOptions, Schema, } from '@pdfme/common';
import { SchemaForUI } from '@pdfme/common';

export interface SchemaUIProps {
    schema: SchemaForUI;
    editable: boolean;
    onChange: (value: string) => void;
    stopEditing: () => void;
    tabIndex?: number;
    placeholder?: string;
}

export interface RenderProps {
    value: string;
    schema: Schema;
    rootElement: HTMLDivElement,

    editing?: boolean;
    onChange?: (value: string) => void;
    stopEditing?: () => void;

    tabIndex?: number;
    placeholder?: string;

    options: UIOptions;

}

export interface Renderer {
    [key: string]: { render: (arg: RenderProps) => Promise<void> } | undefined;
}