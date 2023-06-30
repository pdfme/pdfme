import React, { useContext } from 'react';
import {
  SchemaForUI,
  getFallbackFontName,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
} from '@pdfme/common';
import { FontContext } from '../../../../contexts';
import { SidebarProps } from '..';
import { XMarkIcon } from '@heroicons/react/24/outline';

const inputStyle = {
  width: '90%',
  color: '#333',
  background: 'none',
  borderRadius: 2,
  border: '1px solid #767676',
};
const selectStyle = inputStyle;

const NumberInputSet = (props: {
  width: string;
  label: string;
  value: number;
  minNumber?: number;
  maxNumber?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { label, value, width, minNumber, maxNumber, onChange } = props;
  const formattedLabel = label.replace(/\s/g, '');

  return (
    <div style={{ width }}>
      <label htmlFor={`input-${formattedLabel}`}>{label}</label>
      <input
        id={`input-${formattedLabel}`}
        name={`input-${formattedLabel}`}
        style={inputStyle}
        onChange={onChange}
        value={value}
        type="number"
        {...(minNumber && { min: minNumber })}
        {...(maxNumber && { max: maxNumber })}
      />
    </div>
  );
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
    <div style={{ width: '45%' }}>
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

const SelectSet = (props: {
  label: string;
  value: string;
  options: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  const { label, value, options, onChange } = props;
  const formattedLabel = label.replace(/\s/g, '');

  return (
    <div style={{ width: '45%' }}>
      <label htmlFor={`select-${formattedLabel}`}>{label}:</label>
      <select
        id={`select-${formattedLabel}`}
        name={`select-${formattedLabel}`}
        style={selectStyle}
        onChange={onChange}
        value={value}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
};

const CheckboxSet = (props: {
  width: string;
  label: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  checked: boolean | undefined;
}) => {
  const { width, label, onChange, checked } = props;

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        width: `${width}`,
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
};

const TextPropEditor = (
  props: Pick<SidebarProps, 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const { changeSchemas, activeSchema } = props;
  const alignments = ['left', 'center', 'right'];
  const font = useContext(FontContext);
  const fallbackFontName = getFallbackFontName(font);

  if (activeSchema.type !== 'text') return <></>;

  return (
    <section style={{ fontSize: '0.7rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.25rem',
        }}
      >
        <SelectSet
          label={'FontName'}
          value={activeSchema.fontName ?? fallbackFontName}
          options={Object.keys(font)}
          onChange={(e) => {
            changeSchemas([{ key: 'fontName', value: e.target.value, schemaId: activeSchema.id }]);
          }}
        />

        <SelectSet
          label={'Alignment'}
          value={activeSchema.alignment ?? 'left'}
          options={alignments}
          onChange={(e) =>
            changeSchemas([{ key: 'alignment', value: e.target.value, schemaId: activeSchema.id }])
          }
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.25rem',
        }}
      >
        <NumberInputSet
          width="30%"
          label={'FontSize(pt)'}
          value={activeSchema.fontSize ?? DEFAULT_FONT_SIZE}
          onChange={(e) => {
            const currentFontSize = Number(e.target.value);
            const dynamincFontSizeMinAdjust = activeSchema.dynamicFontSize && activeSchema.dynamicFontSize.min > currentFontSize;

            changeSchemas([
              { key: 'fontSize', value: currentFontSize, schemaId: activeSchema.id },
              ...(dynamincFontSizeMinAdjust
                ? [{
                      key: 'dynamicFontSize.min',
                      value: currentFontSize,
                      schemaId: activeSchema.id,
                    }]
                : []),
            ]);
          }}
        />
        <NumberInputSet
          width="30%"
          label={'LineHeight(em)'}
          value={activeSchema.lineHeight ?? DEFAULT_LINE_HEIGHT}
          onChange={(e) =>
            changeSchemas([
              { key: 'lineHeight', value: Number(e.target.value), schemaId: activeSchema.id },
            ])
          }
        />

        <NumberInputSet
          width="40%"
          label={'CharacterSpacing(pt)'}
          value={activeSchema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}
          onChange={async (e) => {
            const currentCharacterSpacing = Number(e.target.value);
            changeSchemas([
              { key: 'characterSpacing', value: currentCharacterSpacing, schemaId: activeSchema.id, },
            ]);
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '0.25rem',
        }}
      >
        <CheckboxSet
          width="100%"
          label="Use dynamic font size"
          checked={Boolean(activeSchema.dynamicFontSize)}
          onChange={(e) => {
            changeSchemas([
              {
                key: 'dynamicFontSize', value: e.target.checked ? {
                  min: activeSchema.fontSize || DEFAULT_FONT_SIZE,
                  max: activeSchema.fontSize || DEFAULT_FONT_SIZE,
                } : undefined, schemaId: activeSchema.id,
              },
            ]);
          }}
        />

        {activeSchema.dynamicFontSize && (
          <>
            <NumberInputSet
              width="45%"
              label={'FontSize Min(pt)'}
              value={activeSchema.dynamicFontSize.min ?? Number(activeSchema.fontSize)}
              minNumber={0}
              maxNumber={activeSchema.fontSize}
              onChange={(e) => {
                changeSchemas([{ key: 'dynamicFontSize.min', value: Number(e.target.value), schemaId: activeSchema.id }])

              }}
            />

            <NumberInputSet
              width="45%"
              label={'FontSize Max(pt)'}
              value={activeSchema.dynamicFontSize.max ?? Number(activeSchema.fontSize)}
              minNumber={activeSchema.fontSize}
              onChange={(e) => {
                changeSchemas([{ key: 'dynamicFontSize.max', value: Number(e.target.value), schemaId: activeSchema.id }])
              }}
            />
          </>
        )}
      </div>
      <div
        style={{
          marginBottom: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ColorInputSet
          label={'FontColor'}
          value={activeSchema.fontColor ?? '#000000'}
          onChange={(e) =>
            changeSchemas([{ key: 'fontColor', value: e.target.value, schemaId: activeSchema.id }])
          }
          onClear={() =>
            changeSchemas([
              { key: 'fontColor', value: DEFAULT_FONT_COLOR, schemaId: activeSchema.id },
            ])
          }
        />

        <ColorInputSet
          label={'Background'}
          value={activeSchema.backgroundColor ?? '#ffffff'}
          onChange={(e) =>
            changeSchemas([
              { key: 'backgroundColor', value: e.target.value, schemaId: activeSchema.id },
            ])
          }
          onClear={() =>
            changeSchemas([{ key: 'backgroundColor', value: '', schemaId: activeSchema.id }])
          }
        />
      </div>
    </section>
  );
};

export default TextPropEditor;
