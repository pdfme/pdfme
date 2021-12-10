import React, { forwardRef, ChangeEvent, useContext, Ref } from 'react';
import * as styles from './index.module.scss';
import { zoom, imageExample } from '../../../libs/constants';
import { readFiles } from '../../../libs/utils';
import { SchemaUIProp } from '../../../libs/type';
import { I18nContext } from '../../../libs/i18n';

const FilledImage = ({
  editable,
  tabIndex,
  schema,
  onChange,
}: Omit<SchemaUIProp, 'placeholder'>) => (
  <div style={{ margin: '0 auto' }}>
    {editable && (
      <button tabIndex={tabIndex} className={styles.dltBtn} onClick={() => onChange('')}>
        x
      </button>
    )}
    <img
      style={{ width: schema.width * zoom, height: schema.height * zoom, borderRadius: 0 }}
      src={schema.data}
    />
  </div>
);

const BlankImage = (props: SchemaUIProp & { ref: Ref<HTMLInputElement> }) => {
  const { editable, placeholder, tabIndex, schema, onChange, ref } = props;
  const i18n = useContext(I18nContext);

  return editable ? (
    <label
      className={styles.imageLabel}
      style={{
        height: Number(schema.height) * zoom,
        width: (Number(schema.width) + (schema.characterSpacing || 0) * 0.75) * zoom,
      }}
    >
      <input
        ref={ref}
        tabIndex={tabIndex}
        style={{ display: 'none' }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const { files } = event.target;
          readFiles(files, 'dataURL').then((result) => onChange(result as string));
        }}
        type="file"
        accept="image/jpeg, image/png"
      />
      <span style={{ zIndex: 1 }}>{i18n('select')}</span>
    </label>
  ) : (
    <div
      style={{
        position: 'absolute',
        opacity: 0.5,
        top: 0,
        left: 0,
        width: schema.width * zoom,
        height: schema.height * zoom,
        backgroundImage: `url(${placeholder || imageExample})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    ></div>
  );
};

const ImageSchema = (props: SchemaUIProp, ref: Ref<HTMLInputElement>) =>
  props.schema.data ? <FilledImage {...props} /> : <BlankImage {...props} ref={ref} />;

export default forwardRef<HTMLInputElement, SchemaUIProp>(ImageSchema);
