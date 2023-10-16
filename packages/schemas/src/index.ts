import textSchema from './text'
import imageSchema from './image'
import barcodesSchemaObj from './barcodes'
import { PDFRenderProps, BaseUIRenderProps, UIRenderProps } from './types'
export const text = textSchema;
export const image = imageSchema;
export const barcodes = barcodesSchemaObj;

export type {
    PDFRenderProps,
    UIRenderProps,
    BaseUIRenderProps,
}