import type { PDFImage } from '@pdfme/pdf-lib';
import type { GeneratorOptions, Schema, UIOptions, SchemaForUI, Size } from '@pdfme/common';
import type { PDFPage, PDFDocument, } from '@pdfme/pdf-lib';

// FIXME exportしてUIで使う
export type UIRenderProps = {
    schema: SchemaForUI;
    mode: 'viewer' | 'form';
    tabIndex?: number;
    placeholder?: string;
    stopEditing?: () => void;
    // -----
    onChange?: (value: string) => void;
    value: string;
    rootElement: HTMLDivElement,
    options: UIOptions;
}

// FIXME exportしてgeneratorで使う
export interface PDFRenderProps {
    value: string;
    schema: Schema;
    pdfDoc: PDFDocument;
    page: PDFPage;
    options: GeneratorOptions;

    _cache: Map<string, PDFImage>;
}


// FIXME exportしてUIで使う
export type PropPanelWidgetGlobalProps = {
    activeSchema: SchemaForUI;
    activeElements: HTMLElement[];
    changeSchemas: (objs: { key: string; value: any; schemaId: string }[]) => void;
    schemas: SchemaForUI[];
    pageSize: Size;
    options: UIOptions;
}
