import React, { useContext } from 'react';
import {
  SchemaForUI,
  getFallbackFontName,
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_VERTICAL_ALIGNMENT,
  DYNAMIC_FIT_VERTICAL,
  DYNAMIC_FIT_HORIZONTAL,
  DEFAULT_DYNAMIC_FIT,
} from '@pdfme/common';
import { FontContext } from '../../../../contexts';
import { SidebarProps } from '..';
import ColorInputSet from './FormComponents/ColorInputSet';

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
  step?: number;
  minNumber?: number;
  maxNumber?: number;
  disabled?: boolean;
  style?: object;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { label, step, value, width, minNumber, maxNumber, disabled, style, onChange } = props;
  const formattedLabel = label.replace(/\s/g, '');

  return (
    <div style={{ width }}>
      <label htmlFor={`input-${formattedLabel}`}>{label}</label>
      <input
        id={`input-${formattedLabel}`}
        name={`input-${formattedLabel}`}
        style={{ ...inputStyle, ...style }}
        onChange={onChange}
        value={isNaN(value) ? '' : value}
        type="number"
        step={step ?? 1}
        disabled={disabled}
        {...(minNumber && { min: minNumber })}
        {...(maxNumber && { max: maxNumber })}
      />
    </div>
  );
};

const SelectSet = (props: {
  label: string;
  value: string;
  options: string[];
  width?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) => {
  const { label, value, options, width, onChange } = props;
  const formattedLabel = label.replace(/\s/g, '');

  return (
    <div style={{ width: width ?? '45%' }}>
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
  const fieldId = 'input-' + label.replace(/\s/g, '');

  return (
    <label
      htmlFor={fieldId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        width: `${width}`,
      }}
    >
      <input id={fieldId} type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
};

const TextPropEditor = (
  props: Pick<SidebarProps, 'changeSchemas'> & { activeSchema: SchemaForUI }
) => {
  const { changeSchemas, activeSchema } = props;
  const alignments = ['left', 'center', 'right'];
  const verticalAlignments = [VERTICAL_ALIGN_TOP, VERTICAL_ALIGN_MIDDLE, VERTICAL_ALIGN_BOTTOM];
  const dynamicFits = [DYNAMIC_FIT_HORIZONTAL, DYNAMIC_FIT_VERTICAL];
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
          label={'Horizontal Align'}
          value={activeSchema.alignment ?? 'left'}
          options={alignments}
          onChange={(e) =>
            changeSchemas([{ key: 'alignment', value: e.target.value, schemaId: activeSchema.id }])
          }
        />

        <SelectSet
          label={'Vertical Align'}
          value={activeSchema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT}
          options={verticalAlignments}
          onChange={(e) => {
            changeSchemas([{ key: 'verticalAlignment', value: e.target.value, schemaId: activeSchema.id }]);
          }}
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
          value={activeSchema.dynamicFontSize ? NaN : (activeSchema.fontSize ?? DEFAULT_FONT_SIZE)}
          style={activeSchema.dynamicFontSize ? { background: '#ccc', cursor: 'not-allowed' } : {}}
          disabled={!!activeSchema.dynamicFontSize}
          onChange={(e) => {
            changeSchemas([{ key: 'fontSize', value: Number(e.target.value), schemaId: activeSchema.id }])
          }}
        />
        <NumberInputSet
          width="30%"
          label={'LineHeight(em)'}
          step={0.1}
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
          step={0.1}
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
              width="30%"
              label={'FontSize Min(pt)'}
              value={activeSchema.dynamicFontSize.min ?? Number(activeSchema.fontSize)}
              minNumber={0}
              style={
                activeSchema.dynamicFontSize &&
                activeSchema.dynamicFontSize.max < activeSchema.dynamicFontSize.min
                  ? { background: 'rgb(200 0 0 / 30%)' }
                  : {}
              }
              onChange={(e) => {
                changeSchemas([{ key: 'dynamicFontSize.min', value: Number(e.target.value), schemaId: activeSchema.id }])
              }}
            />

            <NumberInputSet
              width="30%"
              label={'FontSize Max(pt)'}
              value={activeSchema.dynamicFontSize.max ?? Number(activeSchema.fontSize)}
              minNumber={0}
              style={
                activeSchema.dynamicFontSize &&
                activeSchema.dynamicFontSize.max < activeSchema.dynamicFontSize.min
                  ? { background: 'rgb(200 0 0 / 30%)' }
                  : {}
              }
              onChange={(e) => {
                changeSchemas([{ key: 'dynamicFontSize.max', value: Number(e.target.value), schemaId: activeSchema.id }])
              }}
            />

            <SelectSet
              width="40%"
              label={'Fit'}
              value={activeSchema.dynamicFontSize.fit ?? DEFAULT_DYNAMIC_FIT}
              options={dynamicFits}
              onChange={(e) => {
                changeSchemas([{ key: 'dynamicFontSize.fit', value: e.target.value, schemaId: activeSchema.id }])
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
