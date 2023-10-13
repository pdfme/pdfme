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