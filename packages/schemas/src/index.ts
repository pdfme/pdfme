import { schema as textSchema } from './text'
import { schema as imageSchema } from './image'
import { schema as barcodesSchema } from './barcodes'
import { PDFRenderProps, UIRenderProps, PropPanelSchema, PropPanelWidgetGlobalProps, PropPanelWidgetProps } from './types'
export const text = textSchema;
export const image = imageSchema;
export const barcodes = barcodesSchema;

export type {
    PDFRenderProps,
    UIRenderProps,
    PropPanelSchema,
    PropPanelWidgetGlobalProps,
    PropPanelWidgetProps,
}