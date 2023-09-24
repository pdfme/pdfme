import React, { useContext } from 'react';
import { SchemaForUI, isBarcodeSchema, isTextSchema } from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { I18nContext } from '../../../../contexts';
import Divider from '../../../Divider';
import TextPropEditor from './TextPropEditor';
import PositionAndSizeEditor from './PositionAndSizeEditor';
import TypeAndKeyEditor from './TypeAndKeyEditor';
import BarcodePropEditor from './BarCodePropEditor';

const DetailView = (
  props: Pick<SidebarProps, 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements' | 'deselectSchema'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { activeSchema, deselectSchema } = props;
  const i18n = useContext(I18nContext);

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
