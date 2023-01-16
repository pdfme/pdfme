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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { label, value, width, onChange } = props;

  return (
    <div style={{ width }}>
      <label>{label}</label>
      <input style={inputStyle} onChange={onChange} value={value} type="number" />
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

  return (
    <div style={{ width: '45%' }}>
      <label>{label}</label>
      <div style={{ display: 'flex' }}>
        <input onChange={onChange} value={value || '#ffffff'} type="color" style={inputStyle} />
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

  return (
    <div style={{ width: '45%' }}>
      <label>{label}:</label>
      <select style={selectStyle} onChange={onChange} value={value}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
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
    <div style={{ fontSize: '0.7rem' }}>
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
          onChange={(e) =>
            changeSchemas([
              { key: 'fontSize', value: Number(e.target.value), schemaId: activeSchema.id },
            ])
          }
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
          onChange={(e) =>
            changeSchemas([
              { key: 'characterSpacing', value: Number(e.target.value), schemaId: activeSchema.id },
            ])
          }
        />
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
    </div>
  );
};

export default TextPropEditor;
