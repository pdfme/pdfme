import FormRender, { useForm } from 'form-render';
import React, { useContext } from 'react';
import { SchemaForUI } from '@pdfme/common';
import type { SidebarProps, PropPanelSchema } from '../../../../types';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { I18nContext, PropPanelRegistry, OptionsContext } from '../../../../contexts';
import Divider from '../../../Divider';

const propPanelSchema: PropPanelSchema = {
  type: 'object',
  column: 2,
  properties: {
    type: {
      title: 'Type',
      type: 'string',
      widget: 'select',
      props: {
        options: [
          { label: 'Option1', value: 'Option1' },
          { label: 'Option2', value: 'Option2' },
          { label: 'Option3', value: 'Option3' }
        ]
      },
    },
    name: {
      title: 'Name',
      type: 'string',
      widget: 'input',
    },
    align: {  // FIXME ウィジェットを作成する
      title: 'Align',
      type: 'string',
      widget: 'button',
      cellSpan: 2,
    },
    position: {
      type: 'object',
      widget: 'card',
      column: 2,
      properties: {
        x: {
          title: 'X',
          type: 'number',
          widget: 'inputNumber',
        },
        y: {
          title: 'Y',
          type: 'number',
          widget: 'inputNumber',
        },
      }
    },
    width: {
      title: 'Width',
      type: 'number',
      widget: 'inputNumber',
    },
    height: {
      title: 'Height',
      type: 'number',
      widget: 'inputNumber',
    },
  }
};

const DetailView = (
  props: Pick<SidebarProps, 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { activeSchema, deselectSchema, changeSchemas } = props;
  const form = useForm();

  const i18n = useContext(I18nContext);
  const propPanelRegistry = useContext(PropPanelRegistry);
  const options = useContext(OptionsContext);

  // FIXME propPanelSchema に propPanelRegistry で登録されたスキーマをマージする

  // FIXME ここでフォームに値を設定する
  form.setValues({
    type: 'Option2',
    name: 'Name',
    align: 'Align',
    position: { x: 0, y: 0 },
    width: 0,
    height: 0,
    fontname: 'Arial',
    horizontalAlign: 'left',
    verticalAlign: 'top',
    fontSize: 0,
    lineHeight: 0,
    characterSpacing: 0,
    useDynamicFontSize: false,
    fontSizeMin: 0,
    fontSizeMax: 0,
    fit: 'Fit1'
  });


  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute',
            zIndex: 100,
            border: 'none',
            borderRadius: 2,
            padding: '0.5rem',
            cursor: 'pointer',
            background: '#eee',
            width: 14,
            height: 14,
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
      <div style={{ fontSize: '0.9rem' }}>
        <FormRender
          globalProps={options}
          form={form}
          schema={propPanelSchema}
          watch={{
            '#': (allValues) => {
              // FIXME 値の変更をchangeSchemasで伝える
              console.log('watch all:', allValues);
            }
          }}
          locale='en-US'
        />
      </div>
    </div>
  );
};

export default DetailView;
