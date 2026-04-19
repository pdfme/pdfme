import type { GenerateProps, Plugins, Schema, Template } from '@pdfme/common';
import { cloneDeep } from '@pdfme/common';
import { checkbox, radioGroup, text } from '@pdfme/schemas';
import { acroCheckboxPlugin, acroRadioGroupPlugin, acroTextPlugin } from './acroForm.js';
import generate from './generate.js';

export type GenerateFormProps = Omit<GenerateProps, 'inputs'> & {
  inputs?: GenerateProps['inputs'];
};

const ACRO_TEXT_TYPE = 'acroText';
const ACRO_CHECKBOX_TYPE = 'acroCheckbox';
const ACRO_RADIO_GROUP_TYPE = 'acroRadioGroup';
const TEXT_TYPE = 'text';
const CHECKBOX_TYPE = 'checkbox';
const RADIO_GROUP_TYPE = 'radioGroup';

const hasPluginForType = (plugins: Plugins, type: string) =>
  Object.values(plugins).some((plugin) => plugin.propPanel.defaultSchema.type === type);

const withAcroFormPlugins = (plugins: Plugins = {}) => {
  const mergedPlugins = { ...plugins };

  if (!hasPluginForType(mergedPlugins, TEXT_TYPE)) {
    mergedPlugins.Text = text;
  }

  if (!hasPluginForType(mergedPlugins, CHECKBOX_TYPE)) {
    mergedPlugins.Checkbox = checkbox;
  }

  if (!hasPluginForType(mergedPlugins, RADIO_GROUP_TYPE)) {
    mergedPlugins.RadioGroup = radioGroup;
  }

  if (!hasPluginForType(mergedPlugins, ACRO_TEXT_TYPE)) {
    mergedPlugins.AcroText = acroTextPlugin;
  }

  if (!hasPluginForType(mergedPlugins, ACRO_CHECKBOX_TYPE)) {
    mergedPlugins.AcroCheckbox = acroCheckboxPlugin;
  }

  if (!hasPluginForType(mergedPlugins, ACRO_RADIO_GROUP_TYPE)) {
    mergedPlugins.AcroRadioGroup = acroRadioGroupPlugin;
  }

  return mergedPlugins;
};

const toAcroFormSchema = (schema: Schema, pageIndex: number): Schema => {
  if (schema.readOnly) {
    return schema;
  }

  const formSchema = schema.required ? { ...schema, required: false } : schema;

  if (schema.type === TEXT_TYPE) {
    return { ...formSchema, type: ACRO_TEXT_TYPE, __acroRequired: schema.required };
  }
  if (schema.type === CHECKBOX_TYPE) {
    return { ...formSchema, type: ACRO_CHECKBOX_TYPE, __acroRequired: schema.required };
  }
  if (schema.type === RADIO_GROUP_TYPE) {
    return {
      ...formSchema,
      type: ACRO_RADIO_GROUP_TYPE,
      __acroPageIndex: pageIndex,
      __acroRequired: schema.required,
    };
  }

  return formSchema;
};

const getAcroFormTemplate = (template: Template): Template => {
  const clonedTemplate = cloneDeep(template);
  clonedTemplate.schemas = clonedTemplate.schemas.map((page, pageIndex) =>
    page.map((schema) => toAcroFormSchema(schema, pageIndex)),
  );
  return clonedTemplate;
};

const normalizeInputs = (inputs?: GenerateProps['inputs']) =>
  inputs && inputs.length > 0 ? inputs : [{}];

const generateForm = async (props: GenerateFormProps): Promise<Uint8Array<ArrayBuffer>> => {
  return generate({
    ...props,
    inputs: normalizeInputs(props.inputs),
    template: getAcroFormTemplate(props.template),
    plugins: withAcroFormPlugins(props.plugins),
  });
};

export default generateForm;
