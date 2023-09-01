import React, { useContext } from 'react';
import { SchemaForUI, DEFAULT_FONT_COLOR } from '@pdfme/common';
import { I18nContext } from '../../../../contexts';
import { SidebarProps } from '..';
import { XMarkIcon } from '@heroicons/react/24/outline';

const inputStyle = {
  width: '90%',
  color: '#333',
  background: 'none',
  borderRadius: 2,
  border: '1px solid #767676',
};

const ColorInputSet = (props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) => {
  const { label, value, onChange, onClear } = props;
  const formattedLabel = label.replace(/\s/g, '');

  return (
    <div style={{ width: '45%', marginBottom: '10px' }}>
      <label htmlFor={`input-${formattedLabel}`}>{label}</label>
      <div style={{ display: 'flex' }}>
        <input
          id={`input-${formattedLabel}`}
          name={`input-${formattedLabel}`}
          onChange={onChange}
          value={value || '#ffffff'}
          type="color"
          style={inputStyle}
        />
        <button
          onClick={onClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            borderRadius: 2,
            border: '1px solid #767676',
            cursor: 'pointer',
          }}
        >
          <XMarkIcon width={10} height={10} />
        </button>
      </div>
    </div>
  );
};

const BarcodePropEditor = (
  props: Pick<SidebarProps, 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const i18n = useContext(I18nContext);
  const { changeSchemas, activeSchema } = props;
  const barcodeHasText = activeSchema.type !== 'qrcode' && activeSchema.type !== 'gs1datamatrix';

  if (activeSchema.type === 'text' || activeSchema.type === 'image') return <></>;

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
          value={activeSchema.barcolor ?? '#000000'}
          onChange={(e) => {
            changeSchemas([{ key: 'barcolor', value: e.target.value, schemaId: activeSchema.id }]);
          }}
          onClear={() =>
            changeSchemas([
              { key: 'barcolor', value: DEFAULT_FONT_COLOR, schemaId: activeSchema.id },
            ])
          }
        />

        <ColorInputSet
          label={i18n('bgColor')}
          value={activeSchema.backgroundcolor ?? '#ffffff'}
          onChange={(e) => {
            changeSchemas([{ key: 'backgroundcolor', value: e.target.value, schemaId: activeSchema.id }])
          }}
          onClear={() => {
            changeSchemas([{ key: 'backgroundcolor', value: '', schemaId: activeSchema.id }])
          }}
        />

        {barcodeHasText && (
          <ColorInputSet
            label={i18n('textColor')}
            value={activeSchema.textcolor ?? '#000000'}
            onChange={(e) => {
              changeSchemas([{ key: 'textcolor', value: e.target.value, schemaId: activeSchema.id }])
            }}
            onClear={() => {
              changeSchemas([{ key: 'textcolor', value: '', schemaId: activeSchema.id }])
            }}
          />
        )}
      </div>
    </section>
  );
};

export default BarcodePropEditor;
