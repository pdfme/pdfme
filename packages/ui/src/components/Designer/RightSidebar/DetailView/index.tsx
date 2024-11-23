import FormRender, { useForm } from 'form-render';
import React, { useRef, useContext, useState, useEffect } from 'react';
import type { ChangeSchemaItem, Dict, SchemaForUI, PropPanelWidgetProps, PropPanelSchema } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { Menu } from 'lucide-react';
import { I18nContext, PluginsRegistry, OptionsContext } from '../../../../contexts';
import { getSidebarContentHeight, debounce } from '../../../../helper';
import { theme, Typography, Button, Divider } from 'antd';
import AlignWidget from './AlignWidget';
import WidgetRenderer from './WidgetRenderer';
import ButtonGroupWidget from './ButtonGroupWidget';
import { InternalNamePath, ValidateErrorEntity } from "rc-field-form/es/interface";

const { Text } = Typography;

type DetailViewProps = Pick<SidebarProps,
  'size' | 'schemas' | 'schemasList' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'
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
            i18n={i18n as (key: keyof Dict | string) => string}
            widget={widgetValue}
          />
        );
      });
    }
    setWidgets(newWidgets);
  }, [activeSchema, pluginsRegistry, JSON.stringify(options)]);

  useEffect(() => {
    const values: any = { ...activeSchema };
    values.editable = !(values.readOnly)
    form.setValues(values);
  }, [activeSchema, form]);

  useEffect(() => form.resetFields(), [activeSchema.id])

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

  const uniqueSchemaName = useRef((value: string): boolean => true);

  const validateUniqueSchemaName = (_: any, value: string): boolean => uniqueSchemaName.current(value)

  const handleWatch = debounce((formSchema: any) => {
    const formAndSchemaValuesDiffer = (formValue: any, schemaValue: any): boolean => {
      if (typeof formValue === 'object') {
        return JSON.stringify(formValue) !== JSON.stringify(schemaValue);
      }
      return formValue !== schemaValue;
    }

    let changes: ChangeSchemaItem[] = [];
    for (const key in formSchema) {
      if (['id', 'content'].includes(key)) continue;

      let value = formSchema[key];
      if (formAndSchemaValuesDiffer(value, (activeSchema as any)[key])) {
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
      form.validateFields()
        .then(() => changeSchemas(changes))
        .catch((reason: ValidateErrorEntity) => {
          if (reason.errorFields.length) {
            changes = changes.filter((change: ChangeSchemaItem) => !reason.errorFields.find((field: {
              name: InternalNamePath;
              errors: string[];
            }) => field.name.includes(change.key)
            ));
          }
          if (changes.length) {
            changeSchemas(changes);
          }
        });
    }
  }, 100);

  const activePlugin = Object.values(pluginsRegistry).find(
    (plugin) => plugin?.propPanel.defaultSchema.type === activeSchema.type
  )!;

  const activePropPanelSchema = activePlugin?.propPanel.schema;
  if (!activePropPanelSchema) {
    console.error(`[@pdfme/ui] No propPanel.schema for ${activeSchema.type}.
Check this document: https://pdfme.com/docs/custom-schemas`);
  }

  const typeOptions = Object.entries(pluginsRegistry).map(([label, value]) => ({
    label,
    value: value?.propPanel.defaultSchema.type,
  }));
  const defaultSchema = activePlugin.propPanel.defaultSchema;

  const propPanelSchema: PropPanelSchema = {
    type: 'object',
    column: 2,
    properties: {
      type: {
        title: i18n('type'),
        type: 'string',
        widget: 'select',
        props: { options: typeOptions },
        required: true,
        span: 12,
      },
      name: {
        title: i18n('fieldName'),
        type: 'string',
        required: true,
        span: 12,
        rules: [{
          validator: validateUniqueSchemaName,
          message: i18n('validation.uniqueName'),
        }],
        props: { autoComplete: "off" }
      },
      editable: { title: i18n('editable'), type: 'boolean', span: 8, hidden: defaultSchema?.readOnly !== undefined },
      required: { title: i18n('required'), type: 'boolean', span: 16, hidden: "{{!formData.editable}}" },
      '-': { type: 'void', widget: 'Divider' },
      align: { title: i18n('align'), type: 'void', widget: 'AlignWidget' },
      position: {
        type: 'object',
        widget: 'card',
        properties: {
          x: { title: 'X', type: 'number', widget: 'inputNumber', required: true, span: 8, min: 0 },
          y: { title: 'Y', type: 'number', widget: 'inputNumber', required: true, span: 8, min: 0 },
        }
      },
      width: {
        title: i18n('width'),
        type: 'number',
        widget: 'inputNumber',
        required: true,
        span: 6,
        props: { min: 0 },
      },
      height: {
        title: i18n('height'),
        type: 'number',
        widget: 'inputNumber',
        required: true,
        span: 6,
        props: { min: 0 },
      },
      rotate: {
        title: i18n('rotate'),
        type: 'number',
        widget: 'inputNumber',
        disabled: defaultSchema?.rotate === undefined,
        max: 360,
        props: { min: 0 },
        span: 6,
      },
      opacity: {
        title: i18n('opacity'),
        type: 'number',
        widget: 'inputNumber',
        disabled: defaultSchema?.opacity === undefined,
        props: { step: 0.1, min: 0, max: 1 },
        span: 6,
      },
    },
  };

  if (typeof activePropPanelSchema === 'function') {
    const { schemasList: _, ...propPanelProps } = props;

    const apps =
      activePropPanelSchema({
        ...propPanelProps,
        options,
        theme: token,
        i18n: i18n as (key: keyof Dict | string) => string,
      }) || {};
    propPanelSchema.properties = {
      ...propPanelSchema.properties,
      ...(Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider' } }),
      ...apps,
    };
  } else {
    const apps = activePropPanelSchema || {};
    propPanelSchema.properties = {
      ...propPanelSchema.properties,
      ...(Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider' } }),
      ...apps,
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
          {i18n('editField')}
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
        <FormRender
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
