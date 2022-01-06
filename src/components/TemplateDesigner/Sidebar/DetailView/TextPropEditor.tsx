import React, { useContext } from 'react';
import * as styles from '../index.module.scss';
import { I18nContext, FontContext } from '../../../../libs/contexts';
import { SidebarProps } from '../';
import { getFallbackFontName } from '../../../../libs/helper';

const NumberInputSet = (props: {
  label: string;
  value: number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { label, value, onChange } = props;

  return (
    <div style={{ width: '33%' }}>
      <label>{label}:</label>
      <input style={{ width: '100%' }} onChange={onChange} value={value} type="number" />
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
    <div style={{ width: '50%' }}>
      <label>{label}:</label>
      <div style={{ display: 'flex' }}>
        <input onChange={onChange} value={value} type="color" style={{ width: '100%' }} />
        <button onClick={onClear}>X</button>
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
    <div style={{ width: '50%' }}>
      <label>{label}:</label>
      <select style={{ width: '100%' }} onChange={onChange} value={value}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
};

const TextPropEditor = (props: Pick<SidebarProps, 'changeSchemas' | 'activeSchema'>) => {
  const { changeSchemas, activeSchema } = props;
  const alignments = ['left', 'center', 'right'];
  const i18n = useContext(I18nContext);
  const font = useContext(FontContext);
  const fallbackFontName = getFallbackFontName(font);

  if (activeSchema.type !== 'text') return <></>;

  return (
    <>
      <p style={{ marginBottom: 0 }}>{i18n('style')}</p>

      <div className={styles.flx}>
        <SelectSet
          label={'FontName'}
          value={activeSchema.fontName || fallbackFontName}
          options={Object.keys(font)}
          onChange={(e) => {
            changeSchemas([{ key: 'fontName', value: e.target.value, schemaId: activeSchema.id }]);
          }}
        />

        <SelectSet
          label={'Alignment'}
          value={activeSchema.alignment || 'left'}
          options={alignments}
          onChange={(e) =>
            changeSchemas([{ key: 'alignment', value: e.target.value, schemaId: activeSchema.id }])
          }
        />
      </div>
      <div className={styles.flx}>
        <NumberInputSet
          label={'FontSize(pt)'}
          value={activeSchema.fontSize}
          onChange={(e) =>
            changeSchemas([
              { key: 'fontSize', value: Number(e.target.value), schemaId: activeSchema.id },
            ])
          }
        />
        <NumberInputSet
          label={'LineHeight(em)'}
          value={activeSchema.lineHeight}
          onChange={(e) =>
            changeSchemas([
              { key: 'lineHeight', value: Number(e.target.value), schemaId: activeSchema.id },
            ])
          }
        />

        <NumberInputSet
          label={'CharacterSpacing(pt)'}
          value={activeSchema.characterSpacing}
          onChange={(e) =>
            changeSchemas([
              { key: 'characterSpacing', value: Number(e.target.value), schemaId: activeSchema.id },
            ])
          }
        />
      </div>
      <div className={styles.flx} style={{ marginBottom: '0.25rem' }}>
        <ColorInputSet
          label={'FontColor'}
          value={activeSchema.fontColor || '#000000'}
          onChange={(e) =>
            changeSchemas([{ key: 'fontColor', value: e.target.value, schemaId: activeSchema.id }])
          }
          onClear={() =>
            changeSchemas([{ key: 'fontColor', value: '', schemaId: activeSchema.id }])
          }
        />

        <ColorInputSet
          label={'Background'}
          value={activeSchema.backgroundColor || '#ffffff'}
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
    </>
  );
};

export default TextPropEditor;
