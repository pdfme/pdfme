import React, { useContext, useEffect, useRef } from 'react';
import { SchemaForUI, isBarcodeSchema, isTextSchema } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { I18nContext, PropPanelRegistry, OptionsContext } from '../../../../contexts';
import Divider from '../../../Divider';
import PositionAndSizeEditor from './PositionAndSizeEditor';
import TypeAndKeyEditor from './TypeAndKeyEditor';
import TextPropEditor from './TextPropEditor';
import BarcodePropEditor from './BarCodePropEditor';

const DetailView = (
  props: Pick<SidebarProps, 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { activeSchema, deselectSchema, changeSchemas } = props;
  const i18n = useContext(I18nContext);
  const propPanelRegistry = useContext(PropPanelRegistry);
  const options = useContext(OptionsContext);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && activeSchema.type) {
      const schemaType = activeSchema.type as string;
      const propPanel = propPanelRegistry[schemaType];
      if (!propPanel) {
        console.error(`PropPanel for type ${activeSchema.type} not found`);
        return;
      }

      ref.current.innerHTML = '';

      propPanel.render({
        rootElement: ref.current,
        schema: activeSchema,
        changeSchemas,
        options,
      });
    }
    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [JSON.stringify(activeSchema), options]);


  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <span
          style={{ position: 'absolute', width: 20, padding: '5px', cursor: 'pointer' }}
          onClick={deselectSchema}
        >
          <Bars3Icon />
        </span>
        <span style={{ textAlign: 'center', width: '100%', fontWeight: 'bold' }}>
          {i18n('editField')}
        </span>
      </div>
      <Divider />
      <div style={{ fontSize: '0.9rem' }}>
        <TypeAndKeyEditor {...props} />
        <Divider />
        <PositionAndSizeEditor {...props} />
        <Divider />
        {/* PropPanel */}
        <div style={{ height: '100%', width: '100%' }} ref={ref} />
        {isBarcodeSchema(activeSchema) && (
          <BarcodePropEditor {...props} />
        )}
        {isTextSchema(activeSchema) && (
          <TextPropEditor {...props} />
        )}
      </div>
    </div>
  );
};

export default DetailView;
