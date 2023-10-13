import { z } from 'zod';
import type { Font as FontKitFont } from 'fontkit';
import type { WidgetProps as _PropPanelWidgetProps, Schema as _PropPanelSchema } from 'form-render';
import {
  Lang,
  Size,
  BarcodeSchemaType,
  SchemaType,
  Schema,
  SchemaInputs,
  SchemaForUI,
  Font,
  BasePdf,
  Template,
  CommonProps,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  PreviewReactProps,
  DesignerProps,
  DesignerReactProps,
} from './schema.js';

export type FontWidthCalcValues = {
  font: FontKitFont;
  fontSize: number;
  characterSpacing: number;
  boxWidthInPt: number;
};

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

export type Lang = z.infer<typeof Lang>;
export type Size = z.infer<typeof Size>;
export type SchemaType = z.infer<typeof SchemaType>;
export type BarCodeType = z.infer<typeof BarcodeSchemaType>;
export type Schema = z.infer<typeof Schema>;
export type SchemaInputs = z.infer<typeof SchemaInputs>;
export type SchemaForUI = z.infer<typeof SchemaForUI>;
export type Font = z.infer<typeof Font>;
export type BasePdf = z.infer<typeof BasePdf>;
export type Template = z.infer<typeof Template>;
export type CommonProps = z.infer<typeof CommonProps>;
export type GeneratorOptions = z.infer<typeof GeneratorOptions>;
export type GenerateProps = z.infer<typeof GenerateProps>;
export type UIOptions = z.infer<typeof UIOptions>;
export type UIProps = z.infer<typeof UIProps>;
export type PreviewProps = z.infer<typeof PreviewProps>;
export type PreviewReactProps = z.infer<typeof PreviewReactProps>;
export type DesignerProps = z.infer<typeof DesignerProps>;
export type DesignerReactProps = z.infer<typeof DesignerReactProps>;
