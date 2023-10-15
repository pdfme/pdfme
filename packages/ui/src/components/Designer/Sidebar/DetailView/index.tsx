import FormRender, { useForm, } from 'form-render';
import React, { useContext, useEffect, useState } from 'react';
import type { SchemaForUI, PropPanelWidgetProps, PropPanelSchema } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { I18nContext, PropPanelRegistry, OptionsContext } from '../../../../contexts';
import { RULER_HEIGHT } from '../../../../constants';
import Divider from '../../../Divider';
import AlignWidget from './AlignWidget';
import WidgetRenderer from './WidgetRenderer';

const DetailView = (
  props: Pick<SidebarProps, 'size' | 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { size, changeSchemas, deselectSchema, activeSchema, activeElements } = props;
  const form = useForm();

  const i18n = useContext(I18nContext);
  const propPanelRegistry = useContext(PropPanelRegistry);
  const options = useContext(OptionsContext);

  const [widgets, setWidgets] = useState<{ [key: string]: (props: PropPanelWidgetProps) => React.JSX.Element; }>({})

  useEffect(() => {
    const newWidgets: typeof widgets = {
      AlignWidget: (p) => <AlignWidget {...p} {...props} options={options} />,
      Divider
    };
    for (const propPanel of Object.values(propPanelRegistry)) {
      const widgets = propPanel?.widgets || {}
      Object.entries(widgets).forEach(([widgetKey, widgetValue]) => {
        newWidgets[widgetKey] = (p) => <WidgetRenderer {...p} {...props} options={options} widget={widgetValue} />;
      })
    }
    setWidgets(newWidgets);
  }, [activeSchema, activeElements, propPanelRegistry]);

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
  }

  const activePropPanelRegistry = propPanelRegistry[activeSchema.type]
  const activePropPanelSchema = activePropPanelRegistry?.propPanelSchema
  if (!activePropPanelSchema) {
    console.error(`No prop panel schema for ${activeSchema.type}`);
  }

  const propPanelSchema: PropPanelSchema = {
    type: 'object',
    column: 2,
    properties: {
      type: { title: 'Type', type: 'string', widget: 'select', props: { options: Object.keys(propPanelRegistry).map((label) => ({ label, value: label })) }, },
      key: { title: 'Name', type: 'string', widget: 'input', },
      '-': { type: 'void', widget: 'Divider', cellSpan: 2 },
      align: { title: 'Align', type: 'void', widget: 'AlignWidget', cellSpan: 2 },
      position: { type: 'object', widget: 'card', column: 2, properties: { x: { title: 'X', type: 'number', widget: 'inputNumber' }, y: { title: 'Y', type: 'number', widget: 'inputNumber' } } },
      width: { title: 'Width', type: 'number', widget: 'inputNumber' },
      height: { title: 'Height', type: 'number', widget: 'inputNumber' },
    }
  }

  if (typeof activePropPanelSchema === 'function') {
    const apps = activePropPanelSchema({ ...props, options }) || {};
    propPanelSchema.properties = {
      ...propPanelSchema.properties,
      ...(Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider', cellSpan: 2 } }),
      ...apps
    }
  } else {
    const apps = activePropPanelSchema || {};
    propPanelSchema.properties = {
      ...propPanelSchema.properties,
      ...(Object.keys(apps).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider', cellSpan: 2 } }),
      ...apps
    }
  }

  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <span
          style={{ position: 'absolute', zIndex: 100, border: 'none', borderRadius: 2, padding: '0.5rem', cursor: 'pointer', background: '#eee', width: 14, height: 14 }}
          onClick={deselectSchema}
        >
          <Bars3Icon width={15} height={15} />
        </span>
        <span style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('editField')}
        </span>
      </div>
      <Divider />
      <div style={{ height: size.height - RULER_HEIGHT - RULER_HEIGHT / 2 - 145, overflowY: 'auto', overflowX: 'hidden' }}>
        <FormRender
          form={form}
          schema={propPanelSchema}
          widgets={widgets}
          watch={{ '#': handleWatch }}
          locale='en-US'
        />
      </div>
    </div>
  );
};

export default DetailView;
