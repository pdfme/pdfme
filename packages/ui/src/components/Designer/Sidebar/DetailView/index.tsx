import FormRender, { useForm } from 'form-render';
import React, { useContext, useEffect, useState } from 'react';
import type { SchemaForUI, PropPanelWidgetProps, PropPanelSchema } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { I18nContext, PluginsRegistry, OptionsContext } from '../../../../contexts';
import { RULER_HEIGHT } from '../../../../constants';
import Divider from '../../../Divider';
import AlignWidget from './AlignWidget';
import WidgetRenderer from './WidgetRenderer';

const DetailView = (
  props: Pick<
    SidebarProps,
    'size' | 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'
  > & {
    activeSchema: SchemaForUI;
  }
) => {
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
      Divider,
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
        title: 'Type',
        type: 'string',
        widget: 'select',
        props: {
          options: Object.entries(pluginsRegistry).map(([label, value]) => ({
            label,
            value: value?.propPanel.defaultSchema.type,
          })),
        },
      },
      key: { title: 'Name', type: 'string', widget: 'input' },
      '-': { type: 'void', widget: 'Divider', cellSpan: 2 },
      align: { title: 'Align', type: 'void', widget: 'AlignWidget', cellSpan: 2 },
      position: {
        type: 'object',
        widget: 'card',
        properties: {
          x: { title: 'X', type: 'number', widget: 'inputNumber' },
          y: { title: 'Y', type: 'number', widget: 'inputNumber' },
        },
      },
      width: { title: 'Width', type: 'number', widget: 'inputNumber', span: 8 },
      height: { title: 'Height', type: 'number', widget: 'inputNumber', span: 8 },
      rotate: {
        title: 'Rotate',
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
    const apps = activePropPanelSchema({ ...props, options }) || {};
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
        <span
          style={{
            position: 'absolute',
            top: '0.85rem',
            zIndex: 100,
            border: 'none',
            borderRadius: 2,
            padding: '0.5rem',
            cursor: 'pointer',
            background: '#eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 30,
            maxHeight: 30,
          }}
          onClick={deselectSchema}
        >
          <Bars3Icon width={15} height={15} />
        </span>
        <span style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('editField')}
        </span>
      </div>
      <Divider />
      <div
        style={{
          height: size.height - RULER_HEIGHT - RULER_HEIGHT / 2 - 145,
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

export default DetailView;
