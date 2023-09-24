import React, { CSSProperties, useContext } from 'react';
import {
  SchemaForUI,
  DEFAULT_FONT_COLOR,
  DEFAULT_BARCODE_BG_COLOR,
  DEFAULT_BARCODE_COLOR,
} from '@pdfme/common';
import type { SidebarProps } from '../../../../types';
import { I18nContext } from '../../../../contexts';
import ColorInputSet from './FormComponents/ColorInputSet';

// TODO Replace React to VanillaJS
const BarcodePropEditor = (
  props: Pick<SidebarProps, 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const i18n = useContext(I18nContext);
  const { changeSchemas, activeSchema } = props;

  if (activeSchema.type === 'text' || activeSchema.type === 'image') return <></>;

  const barcodeHasText = activeSchema.type !== 'qrcode' && activeSchema.type !== 'gs1datamatrix';
  const colorInputStyles: CSSProperties = {
    width: barcodeHasText ? '30%' : '45%',
    marginBottom: '10px',
  };

  return (
    <section style={{ fontSize: '0.7rem' }}>
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <ColorInputSet
          label={i18n('barColor')}
          value={activeSchema.barcolor ?? DEFAULT_BARCODE_COLOR}
          onChange={(e) => {
            changeSchemas([{ key: 'barcolor', value: e.target.value, schemaId: activeSchema.id }]);
          }}
          onClear={() =>
            changeSchemas([
              { key: 'barcolor', value: DEFAULT_FONT_COLOR, schemaId: activeSchema.id },
            ])
          }
          extraStyle={colorInputStyles}
        />

        <ColorInputSet
          label={i18n('bgColor')}
          value={activeSchema.backgroundcolor ?? DEFAULT_BARCODE_BG_COLOR}
          onChange={(e) => {
            changeSchemas([{ key: 'backgroundcolor', value: e.target.value, schemaId: activeSchema.id }])
          }}
          onClear={() => {
            changeSchemas([{ key: 'backgroundcolor', value: '', schemaId: activeSchema.id }])
          }}
          extraStyle={colorInputStyles}
        />

        {barcodeHasText && (
          <ColorInputSet
            label={i18n('textColor')}
            value={activeSchema.textcolor ?? DEFAULT_FONT_COLOR}
            onChange={(e) => {
              changeSchemas([{ key: 'textcolor', value: e.target.value, schemaId: activeSchema.id }])
            }}
            onClear={() => {
              changeSchemas([{ key: 'textcolor', value: '', schemaId: activeSchema.id }])
            }}
            extraStyle={colorInputStyles}
          />
        )}
      </div>
    </section>
  );
};

export default BarcodePropEditor;
