import { useForm } from 'form-render';
import React, { useRef, useContext, useState, useEffect } from 'react';
import type {
  Dict,
  ChangeSchemaItem,
  SchemaForUI,
  PropPanelWidgetProps,
  PropPanelSchema,
  Schema,
} from '@pdfme/common';
import type { SidebarProps } from '../../../../types.js';
import { Menu } from 'lucide-react';
import { I18nContext, PluginsRegistry, OptionsContext } from '../../../../contexts.js';
import { getSidebarContentHeight, debounce } from '../../../../helper.js';
import { theme, Typography, Button, Divider } from 'antd';
import AlignWidget from './AlignWidget.js';
import WidgetRenderer from './WidgetRenderer.js';
import ButtonGroupWidget from './ButtonGroupWidget.js';
import { InternalNamePath, ValidateErrorEntity } from 'rc-field-form/es/interface.js';

// Import FormRender as a default import
import FormRenderComponent from 'form-render';

const { Text } = Typography;

type DetailViewProps = Pick<
  SidebarProps,
  | 'size'
  | 'schemas'
  | 'schemasList'
  | 'pageSize'
  | 'changeSchemas'
  | 'activeElements'
  | 'deselectSchema'
> & {
  activeSchema: SchemaForUI;
};

const DetailView = (props: DetailViewProps) => {
  const { token } = theme.useToken();

  const { size, schemasList, changeSchemas, deselectSchema, activeSchema } = props;
  const form = useForm();

  const i18n = useContext(I18nContext);
  const pluginsRegistry = useContext(PluginsRegistry);
  const options = useContext(OptionsContext);

  // Define a type-safe i18n function that accepts string keys
  const typedI18n = (key: string): string => {
    // Use a type assertion to handle the union type constraint
    return typeof i18n === 'function' ? i18n(key as keyof Dict) : key;
  };

  const [widgets, setWidgets] = useState<{
    [key: string]: (props: PropPanelWidgetProps) => React.JSX.Element;
  }>({});

  useEffect(() => {
    const newWidgets: typeof widgets = {
      AlignWidget: (p) => <AlignWidget {...p} {...props} options={options} />,
      Divider: () => (
        <Divider style={{ marginTop: token.marginXS, marginBottom: token.marginXS }} />
      ),
      ButtonGroup: (p) => <ButtonGroupWidget {...p} {...props} options={options} />,
    };
    for (const plugin of Object.values(pluginsRegistry)) {
      const widgets = plugin?.propPanel.widgets || {};
      Object.entries(widgets).forEach(([widgetKey, widgetValue]) => {
        newWidgets[widgetKey] = (p) => (
          <WidgetRenderer
            {...p}
            {...props}
            options={options}
            theme={token}
            i18n={typedI18n}
            widget={widgetValue}
          />
        );
      });
    }
    setWidgets(newWidgets);
  }, [activeSchema, pluginsRegistry, JSON.stringify(options)]);

  useEffect(() => {
    // Create a type-safe copy of the schema with editable property
    const values: Record<string, unknown> = { ...activeSchema };
    // Safely access and set properties
    const readOnly = typeof values.readOnly === 'boolean' ? values.readOnly : false;
    values.editable = !readOnly;
    form.setValues(values);
  }, [activeSchema, form]);

  useEffect(() => form.resetFields(), [activeSchema.id]);

  useEffect(() => {
    uniqueSchemaName.current = (value: string): boolean => {
      for (const page of schemasList) {
        for (const s of Object.values(page)) {
          if (s.name === value && s.id !== activeSchema.id) {
            return false;
          }
        }
      }
      return true;
    };
  }, [schemasList, activeSchema]);

  // Reference to a function that validates schema name uniqueness
  const uniqueSchemaName = useRef(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_unused: string): boolean => true,
  );

  // Use proper type for validator function parameter
  const validateUniqueSchemaName = (_: unknown, value: string): boolean =>
    uniqueSchemaName.current(value);

  // Use explicit type for debounce function that matches the expected signature
  const handleWatch = debounce(function (...args: unknown[]) {
    const formSchema = args[0] as Record<string, unknown>;
    const formAndSchemaValuesDiffer = (formValue: unknown, schemaValue: unknown): boolean => {
      if (typeof formValue === 'object' && formValue !== null) {
        return JSON.stringify(formValue) !== JSON.stringify(schemaValue);
      }
      return formValue !== schemaValue;
    };

    let changes: ChangeSchemaItem[] = [];
    for (const key in formSchema) {
      if (['id', 'content'].includes(key)) continue;

      let value = formSchema[key];
      if (formAndSchemaValuesDiffer(value, (activeSchema as Record<string, unknown>)[key])) {
        // FIXME memo: https://github.com/pdfme/pdfme/pull/367#issuecomment-1857468274
        if (value === null && ['rotate', 'opacity'].includes(key)) {
          value = undefined;
        }

        if (key === 'editable') {
          const readOnlyValue = !value;
          changes.push({ key: 'readOnly', value: readOnlyValue, schemaId: activeSchema.id });
          if (readOnlyValue) {
            changes.push({ key: 'required', value: false, schemaId: activeSchema.id });
          }
          continue;
        }

        changes.push({ key, value, schemaId: activeSchema.id });
      }
    }

    if (changes.length) {
      // Only commit these schema changes if they have passed form validation
      form
        .validateFields()
        .then(() => changeSchemas(changes))
        .catch((reason: ValidateErrorEntity) => {
          if (reason.errorFields.length) {
            changes = changes.filter(
              (change: ChangeSchemaItem) =>
                !reason.errorFields.find((field: { name: InternalNamePath; errors: string[] }) =>
                  field.name.includes(change.key),
                ),
            );
          }
          if (changes.length) {
            changeSchemas(changes);
          }
        });
    }
  }, 100);

  // Find the active plugin with proper type safety
  const activePlugin = Object.values(pluginsRegistry).find((plugin) => {
    if (!plugin || typeof plugin !== 'object') return false;
    if (!plugin.propPanel || typeof plugin.propPanel !== 'object') return false;
    if (!plugin.propPanel.defaultSchema || typeof plugin.propPanel.defaultSchema !== 'object')
      return false;

    const defaultSchema = plugin.propPanel.defaultSchema as Record<string, unknown>;
    return (
      'type' in defaultSchema &&
      typeof defaultSchema.type === 'string' &&
      defaultSchema.type === activeSchema.type
    );
  });

  // Safely access the propPanel schema
  const activePropPanelSchema = activePlugin?.propPanel?.schema;
  if (!activePropPanelSchema) {
    console.error(`[@pdfme/ui] No propPanel.schema for ${activeSchema.type}.
Check this document: https://pdfme.com/docs/custom-schemas`);
  }

  // Create type-safe options for the type dropdown
  // Create a type-safe options array for the dropdown
  const typeOptions: Array<{ label: string; value: string | undefined }> = [];

  // Safely populate the options array
  Object.entries(pluginsRegistry).forEach(([label, value]) => {
    // Skip invalid plugins
    if (!value || typeof value !== 'object') {
      typeOptions.push({ label, value: undefined });
      return;
    }

    if (!('propPanel' in value) || !value.propPanel || typeof value.propPanel !== 'object') {
      typeOptions.push({ label, value: undefined });
      return;
    }

    if (
      !('defaultSchema' in value.propPanel) ||
      !value.propPanel.defaultSchema ||
      typeof value.propPanel.defaultSchema !== 'object'
    ) {
      typeOptions.push({ label, value: undefined });
      return;
    }

    // Safely extract the type
    const defaultSchema = value.propPanel.defaultSchema as Record<string, unknown>;
    let schemaType: string | undefined = undefined;

    if ('type' in defaultSchema && typeof defaultSchema.type === 'string') {
      schemaType = defaultSchema.type;
    }

    typeOptions.push({ label, value: schemaType });
  });
  // Create a safe empty schema as fallback
  const emptySchema: Record<string, unknown> = {};

  // Safely access the default schema with proper null checking
  const defaultSchema: Record<string, unknown> = activePlugin?.propPanel?.defaultSchema
    ? // Create a safe copy of the schema
      (() => {
        // First check if the defaultSchema is an object
        if (
          typeof activePlugin.propPanel.defaultSchema !== 'object' ||
          activePlugin.propPanel.defaultSchema === null
        ) {
          return emptySchema;
        }

        // Create a safe copy
        const result: Record<string, unknown> = {};

        // Only copy properties that exist on the object
        for (const key in activePlugin.propPanel.defaultSchema) {
          if (Object.prototype.hasOwnProperty.call(activePlugin.propPanel.defaultSchema, key)) {
            result[key] = (activePlugin.propPanel.defaultSchema as Record<string, unknown>)[key];
          }
        }

        return result;
      })()
    : emptySchema;

  // Create a type-safe schema object
  const propPanelSchema: PropPanelSchema = {
    type: 'object',
    column: 2,
    properties: {
      type: {
        title: typedI18n('type'),
        type: 'string',
        widget: 'select',
        props: { options: typeOptions },
        required: true,
        span: 12,
      },
      name: {
        title: typedI18n('fieldName'),
        type: 'string',
        required: true,
        span: 12,
        rules: [
          {
            validator: validateUniqueSchemaName,
            message: typedI18n('validation.uniqueName'),
          },
        ],
        props: { autoComplete: 'off' },
      },
      editable: {
        title: typedI18n('editable'),
        type: 'boolean',
        span: 8,
        hidden: typeof defaultSchema.readOnly !== 'undefined',
      },
      required: {
        title: typedI18n('required'),
        type: 'boolean',
        span: 16,
        hidden: '{{!formData.editable}}',
      },
      '-': { type: 'void', widget: 'Divider' },
      align: { title: typedI18n('align'), type: 'void', widget: 'AlignWidget' },
      position: {
        type: 'object',
        widget: 'card',
        properties: {
          x: { title: 'X', type: 'number', widget: 'inputNumber', required: true, span: 8, min: 0 },
          y: { title: 'Y', type: 'number', widget: 'inputNumber', required: true, span: 8, min: 0 },
        },
      },
      width: {
        title: typedI18n('width'),
        type: 'number',
        widget: 'inputNumber',
        required: true,
        span: 6,
        props: { min: 0 },
      },
      height: {
        title: typedI18n('height'),
        type: 'number',
        widget: 'inputNumber',
        required: true,
        span: 6,
        props: { min: 0 },
      },
      rotate: {
        title: typedI18n('rotate'),
        type: 'number',
        widget: 'inputNumber',
        disabled: typeof defaultSchema.rotate === 'undefined',
        max: 360,
        props: { min: 0 },
        span: 6,
      },
      opacity: {
        title: typedI18n('opacity'),
        type: 'number',
        widget: 'inputNumber',
        disabled: typeof defaultSchema.opacity === 'undefined',
        props: { step: 0.1, min: 0, max: 1 },
        span: 6,
      },
    },
  };

  // Create a safe copy of the properties
  const safeProperties = { ...propPanelSchema.properties };

  if (typeof activePropPanelSchema === 'function') {
    // Create a new object without the schemasList property
    const { size, schemas, pageSize, changeSchemas, activeElements, deselectSchema, activeSchema } =
      props;
    const propPanelProps = {
      size,
      schemas,
      pageSize,
      changeSchemas,
      activeElements,
      deselectSchema,
      activeSchema,
    };

    // Use the typedI18n function to avoid type issues
    const functionResult = activePropPanelSchema({
      ...propPanelProps,
      options,
      theme: token,
      i18n: typedI18n,
    });

    // Safely handle the result
    const apps = functionResult && typeof functionResult === 'object' ? functionResult : {};

    // Create a divider if needed
    const dividerObj =
      Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider' } };

    // Assign properties safely - use type assertion to satisfy TypeScript
    propPanelSchema.properties = {
      ...safeProperties,
      ...(dividerObj as Record<string, Partial<Schema>>),
      ...(apps as Record<string, Partial<Schema>>),
    };
  } else {
    // Handle non-function case
    const apps =
      activePropPanelSchema && typeof activePropPanelSchema === 'object'
        ? activePropPanelSchema
        : {};

    // Create a divider if needed
    const dividerObj =
      Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider' } };

    // Assign properties safely - use type assertion to satisfy TypeScript
    propPanelSchema.properties = {
      ...safeProperties,
      ...(dividerObj as Record<string, Partial<Schema>>),
      ...(apps as Record<string, Partial<Schema>>),
    };
  }

  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <Button
          style={{
            position: 'absolute',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={deselectSchema}
          icon={<Menu strokeWidth={1.5} size={20} />}
        />
        <Text strong style={{ textAlign: 'center', width: '100%' }}>
          {typedI18n('editField')}
        </Text>
      </div>
      <Divider style={{ marginTop: token.marginXS, marginBottom: token.marginXS }} />
      <div
        style={{
          height: getSidebarContentHeight(size.height),
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <FormRenderComponent
          form={form}
          schema={propPanelSchema}
          widgets={widgets}
          watch={{ '#': handleWatch }}
          locale="en-US"
        />
      </div>
    </div>
  );
};

const propsAreUnchanged = (prevProps: DetailViewProps, nextProps: DetailViewProps) => {
  return JSON.stringify(prevProps.activeSchema) == JSON.stringify(nextProps.activeSchema);
};

export default React.memo(DetailView, propsAreUnchanged);
