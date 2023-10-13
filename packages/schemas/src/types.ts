import type { PDFImage, PDFPage, PDFDocument } from '@pdfme/pdf-lib';
import type { GeneratorOptions, Schema, UIOptions, SchemaForUI } from '@pdfme/common';

export interface PDFRenderProps {
    value: string;
    schema: Schema;
    pdfLib: typeof import('@pdfme/pdf-lib');
    pdfDoc: PDFDocument;
    page: PDFPage;
    options: GeneratorOptions;

    _cache: Map<string, PDFImage>;
}

export type BaseUIRenderProps = {
    schema: SchemaForUI;
    mode: 'viewer' | 'form';
    tabIndex?: number;
    placeholder?: string;
    stopEditing?: () => void;
}

export type UIRenderProps = BaseUIRenderProps & {
    value: string;
    onChange?: (value: string) => void;
    rootElement: HTMLDivElement,
    options: UIOptions;
}