import type { PDFImage } from '@pdfme/pdf-lib';
import type { GeneratorOptions, Schema, UIOptions, SchemaForUI, Size } from '@pdfme/common';
import type { PDFPage, PDFDocument, } from '@pdfme/pdf-lib';
import type { WidgetProps as _PropPanelWidgetProps, Schema as _PropPanelSchema } from 'form-render';

export interface PDFRenderProps {
    value: string;
    schema: Schema;
    pdfLib: typeof import('@pdfme/pdf-lib');
    pdfDoc: PDFDocument;
    page: PDFPage;
    options: GeneratorOptions;

    _cache: Map<string, PDFImage>;
}

export type UIRenderProps = {
    mode: 'viewer' | 'form';
    stopEditing?: () => void;
    schema: SchemaForUI;
    value: string;
    onChange?: (value: string) => void;
    rootElement: HTMLDivElement,
    options: UIOptions;
    tabIndex?: number;
    placeholder?: string;
}

export type PropPanelSchema = _PropPanelSchema;

export type PropPanelWidgetGlobalProps = {
    activeSchema: SchemaForUI;
    activeElements: HTMLElement[];
    changeSchemas: (objs: { key: string; value: any; schemaId: string }[]) => void;
    schemas: SchemaForUI[];
    pageSize: Size;
    options: UIOptions;
}

export type PropPanelWidgetProps = _PropPanelWidgetProps & {
    addons: {
        globalProps: PropPanelWidgetGlobalProps
    }
};