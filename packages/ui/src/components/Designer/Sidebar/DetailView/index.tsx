import FormRender, { useForm } from 'form-render';
import React, { useContext, useEffect } from 'react';
import { SchemaForUI } from '@pdfme/common';
import type { SidebarProps, PropPanelSchema, PropPanelWidgetGlobalProps } from '../../../../types';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { I18nContext, PropPanelRegistry, OptionsContext } from '../../../../contexts';
import { RULER_HEIGHT } from '../../../../constants';
import Divider from '../../../Divider';
import AlignWidget from './AlignWidget';

const DetailView = (
  props: Pick<SidebarProps, 'size' | 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { size, activeSchema, changeSchemas, deselectSchema } = props;
  const form = useForm();

  const i18n = useContext(I18nContext);
  const propPanelRegistry = useContext(PropPanelRegistry);
  const options = useContext(OptionsContext);

  const globalProps: PropPanelWidgetGlobalProps = { ...props, options }

  const activePropPanelRegistry = propPanelRegistry[activeSchema.type]

  const height = size.height - RULER_HEIGHT - RULER_HEIGHT / 2 - 145;

  if (!activePropPanelRegistry?.schema) {
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
      position: {
        type: 'object', widget: 'card', column: 2,
        properties: { x: { title: 'X', type: 'number', widget: 'inputNumber' }, y: { title: 'Y', type: 'number', widget: 'inputNumber' } }
      },
      width: { title: 'Width', type: 'number', widget: 'inputNumber' },
      height: { title: 'Height', type: 'number', widget: 'inputNumber' },
      ...(Object.keys(activePropPanelRegistry?.schema || {}).length === 0 ? {} : { '--': { type: 'void', widget: 'Divider', cellSpan: 2 } }),
      ...activePropPanelRegistry?.schema
    }
  };

  const propPanelWidgets = {
    AlignWidget,
    Divider,
    ...activePropPanelRegistry?.widgets
  }

  useEffect(() => {
    form.setValues({ ...activeSchema });
  }, [activeSchema]);

  const handleWatch = (newSchema: any) => {
    const changes = [];
    for (const key in newSchema) {
      if (['id', 'key', 'data'].includes(key)) continue;
      if (newSchema[key] !== (activeSchema as any)[key]) {
        changes.push({ key, value: newSchema[key], schemaId: activeSchema.id });
      }
    }
    if (changes.length) {
      changeSchemas(changes);
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
      <div style={{ height, overflowY: 'auto' }}>
        <FormRender
          globalProps={globalProps}
          form={form}
          schema={propPanelSchema}
          widgets={propPanelWidgets}
          watch={{ '#': handleWatch }}
          locale='en-US'
        />
      </div>
    </div>
  );
};

export default DetailView;
