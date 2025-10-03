import { z } from 'zod';
import type { PDFPage, PDFDocument } from '@pdfme/pdf-lib';
import type { ThemeConfig, GlobalToken } from 'antd';
import type { WidgetProps as _PropPanelWidgetProps, Schema as _PropPanelSchema } from 'form-render';
import {
  Lang,
  Dict,
  Mode,
  Size,
  Schema,
  Font,
  SchemaForUI,
  BasePdf,
  BlankPdf,
  CustomPdf,
  CommonOptions,
  Template,
  GeneratorOptions,
  GenerateProps,
  UIOptions,
  UIProps,
  PreviewProps,
  DesignerProps,
  ColorType,
  LegacySchemaPageArray,
  SchemaPageArray,
} from './schema.js';

export type PropPanelSchema = _PropPanelSchema;
export type ChangeSchemaItem = {
  key: string;
  value: unknown;
  schemaId: string;
};
export type ChangeSchemas = (objs: ChangeSchemaItem[]) => void;

/**
 * Properties used for PDF rendering.
 * @template T Type of the extended Schema object.
 * @property {string} value The string used for PDF rendering.
 * @property {T} schema Extended Schema object for rendering.
 * @property {BasePdf} basePdf Base PDF object for rendering.
 * @property {typeof import('@pdfme/pdf-lib')} pdfLib The pdf-lib library used for rendering.
 * @property {PDFDocument} pdfDoc PDFDocument object from pdf-lib.
 * @property {PDFPage} page PDFPage object from pdf-lib.
 * @property {GeneratorOptions} options Options object passed from the generator.
 * @property {Map<string | number, unknown>} _cache Cache shared only during the execution of the generate function (useful for caching images, etc. if needed).
 */
export interface PDFRenderProps<T extends Schema> {
  value: string;
  schema: T;
  basePdf: BasePdf;
  pdfLib: typeof import('@pdfme/pdf-lib');
  pdfDoc: PDFDocument;
  page: PDFPage;
  options: GeneratorOptions;

  _cache: Map<string | number, unknown>;
}

/**
 * Type for properties used in UI rendering.
 *
 * @template T - Type of the extended Schema object.
 * @property {T} schema - Extended Schema object for rendering.
 * @property {BasePdf} basePdf Base PDF object for rendering.
 * @property {Mode} mode - String indicating the rendering state. 'designer' is only used when the field is in edit mode in the Designer.
 * @property {number} [tabIndex] - Tab index for Form.
 * @property {string} [placeholder] - Placeholder text for Form.
 * @property {() => void} [stopEditing] - Stops editing mode, can be used when the mode is 'designer'.
 * @property {string} value - The string used for UI rendering.
 * @property {(arg: { key: string; value: unknown } | { key: string; value: unknown }[]) => void} [onChange] - Used to change the value and schema properties. Only applicable when the mode is 'form' or 'designer'.
 * @property {HTMLDivElement} rootElement - The root HTMLDivElement for the UI.
 * @property {UIOptions} options - Options object passed from the Viewer, Form, or Designer.
 * @property {ThemeConfig} theme - An object that merges the 'theme' passed as an options with the default theme.
 * @property {(key: keyof Dict | string) => string} i18n - An object merged based on the options 'lang' and 'labels'.
 * @property {number} scale - The scale of the UI.
 * @property {Map<string | number, unknown>} _cache - Cache shared only during the execution of the render function (useful for caching images, etc. if needed).
 */
export type UIRenderProps<T extends Schema> = {
  schema: T;
  basePdf: BasePdf;
  mode: Mode;
  tabIndex?: number;
  placeholder?: string;
  stopEditing?: () => void;
  value: string;
  onChange?: (arg: { key: string; value: unknown } | { key: string; value: unknown }[]) => void;
  rootElement: HTMLDivElement;
  options: UIOptions;
  theme: GlobalToken;
  i18n: (key: string) => string;
  scale: number;
  _cache: Map<string | number, unknown>;
};

/**
 * Type for properties used in configuring the property panel.
 *
 * @property {HTMLDivElement} rootElement - The root HTML element of the property panel.
 * @property {SchemaForUI} activeSchema - The currently active schema for UI rendering.
 * @property {HTMLElement[]} activeElements - Array of currently active HTML elements in the UI.
 * @property {ChangeSchemas} changeSchemas - Function to change multiple schemas simultaneously.
 * @property {SchemaForUI[]} schemas - Array of schemas for UI rendering.
 * @property {Size} pageSize - The size of the page being edited.
 * @property {UIOptions} options - UI options for the property panel.
 * @property {GlobalToken} theme - The theme configuration used in the UI.
 * @property {(key: keyof Dict | string) => string} i18n - Internationalization dictionary for UI labels and texts.
 */
type PropPanelProps = {
  rootElement: HTMLDivElement;
  activeSchema: SchemaForUI;
  activeElements: HTMLElement[];
  changeSchemas: ChangeSchemas;
  schemas: SchemaForUI[];
  options: UIOptions;
  theme: GlobalToken;
  i18n: (key: string) => string;
};

export type PropPanelWidgetProps = _PropPanelWidgetProps & PropPanelProps;

/**
 * Used for customizing the property panel.
 * @template T - Type of the extended Schema object.
 * @property {Record<string, PropPanelSchema> | ((propPanelProps: Omit<PropPanelProps, 'rootElement'>) => Record<string, PropPanelSchema>)} schema - A function returning a form-render schema object or the schema object itself. When a function, it takes properties passed from the designer as arguments.
 * @property {Record<string, (props: PropPanelWidgetProps) => void>} [widgets] - An object of functions returning form-render widgets. The functions take, as arguments, both form-render's WidgetProps and properties passed from the designer.
 * @property {T} defaultSchema - The default schema set when adding the schema.
 */
export interface PropPanel<T extends Schema> {
  schema:
    | ((propPanelProps: Omit<PropPanelProps, 'rootElement'>) => Record<string, PropPanelSchema>)
    | Record<string, PropPanelSchema>;

  widgets?: Record<string, (props: PropPanelWidgetProps) => void>;
  defaultSchema: T;
}

/**
 * The Plugin interface is used for PDF and UI rendering, as well as defining the property panel.
 * The 'pdf' is used in the generator package, 'ui' is used in the viewer, form, and designer packages, and 'propPanel' is used in the designer package.
 * Objects defined as Plugins using this interface can be used with a consistent interface across all packages.
 * @template T Type of the extended Schema object.
 * @property {function} pdf Function for rendering PDFs.
 * @property {function} ui Function for rendering UI.
 * @property {PropPanel} propPanel Object for defining the property panel.
 * @property {string} [icon] Icon SVG for the plugin.
 * @property {boolean} [uninterruptedEditMode] When editing in the UI, should the field avoid re-rendering while in edit mode?
 */
export type Plugin<T = Schema> = {
  pdf: (arg: PDFRenderProps<T & Schema>) => Promise<void> | void;
  ui: (arg: UIRenderProps<T & Schema>) => Promise<void> | void;
  propPanel: PropPanel<T & Schema>;
  icon?: string;
  uninterruptedEditMode?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Plugins = { [key: string]: Plugin<any> };

export interface PluginRegistry {
  plugins: { [key: string]: Plugin };
  exists(): boolean;
  values(): Plugin[];
  entries(): [string, Plugin][];
  findByType(type: string): Plugin | undefined;
  findWithLabelByType(type: string): [string, Plugin | undefined];
}

export type Lang = z.infer<typeof Lang>;
export type Dict = z.infer<typeof Dict>;
export type Mode = z.infer<typeof Mode>;
export type Size = z.infer<typeof Size>;
export type Schema = z.infer<typeof Schema>;
export type SchemaForUI = z.infer<typeof SchemaForUI>;

/**
 * Represents the Font type definition.
 * @property {Object} [x: string] - Object key is the font name.
 * @property {(string | ArrayBuffer | Uint8Array)} data - The font data.
 * @property {boolean} [fallback] - Please set to true for the fallback font when no font is specified. Only one value within the given Font object needs to be set to true.
 * @property {boolean} [subset] - The default is true (use subset font). So if you don't want to use a subset font, please set it to false.
 */
export type Font = z.infer<typeof Font>;
export type ColorType = z.infer<typeof ColorType>;
export type BasePdf = z.infer<typeof BasePdf>;
export type BlankPdf = z.infer<typeof BlankPdf>;
export type CustomPdf = z.infer<typeof CustomPdf>;
export type Template = z.infer<typeof Template>;
export type CommonOptions = z.infer<typeof CommonOptions>;
export type GeneratorOptions = z.infer<typeof GeneratorOptions>;
export type GenerateProps = z.infer<typeof GenerateProps> & { plugins?: Plugins };
export type UIOptions = z.infer<typeof UIOptions> & { theme?: ThemeConfig };
export type UIProps = z.infer<typeof UIProps> & { plugins?: Plugins };
export type PreviewProps = z.infer<typeof PreviewProps> & { plugins?: Plugins };
export type DesignerProps = z.infer<typeof DesignerProps> & { plugins?: Plugins };
export type SchemaPageArray = z.infer<typeof SchemaPageArray>;
export type LegacySchemaPageArray = z.infer<typeof LegacySchemaPageArray>;
