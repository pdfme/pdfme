import type { PDFImage, PDFPage, PDFDocument } from '@pdfme/pdf-lib';
import type { PropPanel, GeneratorOptions, Schema, UIOptions, SchemaForUI } from '@pdfme/common';

export interface PDFRenderProps<T extends Schema> {
    value: string;
    schema: T;
    pdfLib: typeof import('@pdfme/pdf-lib');
    pdfDoc: PDFDocument;
    page: PDFPage;
    options: GeneratorOptions;

    _cache: Map<string, PDFImage>;
}

export type BaseUIRenderProps<T extends Schema> = {
    schema: SchemaForUI & T;
    mode: 'viewer' | 'form';
    tabIndex?: number;
    placeholder?: string;
    stopEditing?: () => void;
}

export type UIRenderProps<T extends Schema> = BaseUIRenderProps<T> & {
    value: string;
    onChange?: (value: string) => void;
    rootElement: HTMLDivElement,
    options: UIOptions;
}

export type Plugin<T extends Schema> = {  // FIXME commonに移動
    pdf: (arg: PDFRenderProps<T>) => Promise<void>;
    ui: (arg: UIRenderProps<T>) => Promise<void>;
    propPanel: PropPanel<T>;
}