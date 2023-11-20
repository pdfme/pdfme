import FormRender, { useForm } from 'form-render';
import React, { useContext, useEffect, useState } from 'react';
import type { Dict, SchemaForUI, PropPanelWidgetProps, PropPanelSchema } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { MenuOutlined } from '@ant-design/icons';
import { I18nContext, PluginsRegistry, OptionsContext } from '../../../../contexts';
import { getSidebarContentHeight } from '../../../../helper';
import { theme, Typography, Button, Divider } from 'antd';
import AlignWidget from './AlignWidget';
import WidgetRenderer from './WidgetRenderer';

const { Text } = Typography;

const DetailView = (
  props: Pick<
    SidebarProps,
    'size' | 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'
  > & {
    activeSchema: SchemaForUI;
  }
) => {
  const { token } = theme.useToken();

  const { size, changeSchemas, deselectSchema, activeSchema, activeElements } = props;
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
    };
    for (const plugin of Object.values(pluginsRegistry)) {
      const widgets = plugin?.propPanel.widgets || {};
      Object.entries(widgets).forEach(([widgetKey, widgetValue]) => {
        newWidgets[widgetKey] = (p) => (
          <WidgetRenderer {...p} {...props} options={options} widget={widgetValue} />
        );
      });
    }
    setWidgets(newWidgets);
  }, [activeSchema, activeElements, pluginsRegistry]);

  useEffect(() => {
    form.setValues({ ...activeSchema });
  }, [activeSchema]);

  const handleWatch = (newSchema: any) => {
    const changes = [];
    for (const key in newSchema) {
      if (['id', 'data'].includes(key)) continue;
      if (newSchema[key] !== (activeSchema as any)[key]) {
        changes.push({ key, value: newSchema[key], schemaId: activeSchema.id });
      }
    }
    if (changes.length) {
      changeSchemas(changes);
    }
  };

  const activePlugin = Object.values(pluginsRegistry).find(
    (plugin) => plugin?.propPanel.defaultSchema.type === activeSchema.type
  )!;

  const activePropPanelSchema = activePlugin?.propPanel.schema;
  if (!activePropPanelSchema) {
    console.error(`[@pdfme/ui] No propPanel.schema for ${activeSchema.type}.
Check this document: https://pdfme.com/docs/custom-schemas`);
  }

  const propPanelSchema: PropPanelSchema = {
    type: 'object',
    column: 2,
    properties: {
      type: {
        title: i18n('type'),
        type: 'string',
        widget: 'select',
        props: {
          options: Object.entries(pluginsRegistry).map(([label, value]) => ({
            label,
            value: value?.propPanel.defaultSchema.type,
          })),
        },
      },
      key: { title: i18n('fieldName'), type: 'string', widget: 'input' },
      '-': { type: 'void', widget: 'Divider', cellSpan: 2 },
      align: { title: i18n('align'), type: 'void', widget: 'AlignWidget', cellSpan: 2 },
      position: {
        type: 'object',
        widget: 'card',
        properties: {
          x: { title: 'X', type: 'number', widget: 'inputNumber' },
          y: { title: 'Y', type: 'number', widget: 'inputNumber' },
        },
      },
      width: { title: i18n('width'), type: 'number', widget: 'inputNumber', span: 8 },
      height: { title: i18n('height'), type: 'number', widget: 'inputNumber', span: 8 },
      rotate: {
        title: i18n('rotate'),
        type: 'number',
        widget: 'inputNumber',
        span: 8,
        disabled: activePlugin.propPanel.defaultSchema?.rotate === undefined,
        max: 360,
        min: 0,
      },
    },
  };

  if (typeof activePropPanelSchema === 'function') {
    const apps =
      activePropPanelSchema({
        ...props,
        options,
        theme: token,
        i18n: i18n as (key: keyof Dict | string) => string,
      }) || {};
    propPanelSchema.properties = {
      ...propPanelSchema.properties,
      ...(Object.keys(apps).length === 0
        ? {}
        : { '--': { type: 'void', widget: 'Divider', cellSpan: 2 } }),
      ...apps,
    };
  } else {
    const apps = activePropPanelSchema || {};
    propPanelSchema.properties = {
      ...propPanelSchema.properties,
      ...(Object.keys(apps).length === 0
        ? {}
        : { '--': { type: 'void', widget: 'Divider', cellSpan: 2 } }),
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
          icon={<MenuOutlined />}
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
          borderBottom: `1px solid ${token.colorSplit}`,
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

export default DetailView;
