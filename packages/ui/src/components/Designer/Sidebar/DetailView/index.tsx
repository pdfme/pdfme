import React, { useContext } from 'react';
import { SchemaForUI } from '@pdfme/common';
import { I18nContext } from '../../../../contexts';
import Divider from '../../../Divider';
import { SidebarProps } from '../index';
import TextPropEditor from './TextPropEditor';
import ExampleInputEditor from './ExampleInputEditor';
import PositionAndSizeEditor from './PositionAndSizeEditor';
import TypeAndKeyEditor from './TypeAndKeyEditor';

const DetailView = (
  props: Pick<SidebarProps, 'schemas' | 'pageSize' | 'changeSchemas' | 'activeElements'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { activeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <div>
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
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
        {activeSchema.type === 'text' && (
          <>
            <TextPropEditor {...props} />
            <Divider />
          </>
        )}
        <ExampleInputEditor {...props} />
      </div>
    </div>
  );
};

export default DetailView;
