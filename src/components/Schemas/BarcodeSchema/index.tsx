import React, { forwardRef, Ref } from 'react';
import * as styles from './index.module.scss';
import { zoom, barcodeExampleImageObj } from '../../../libs/constants';
import { validateBarcodeInput } from '../../../libs/utils';
import { SchemaUIProp, TemplateSchema } from '../../../libs/type';

const SampleBarcode = ({ schema }: { schema: TemplateSchema }) => (
  <img
    className={styles.barcodeImage}
    style={{ width: schema.width * zoom, height: schema.height * zoom }}
    src={barcodeExampleImageObj[schema.type]}
  />
);

const ErrorBarcode = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <p
      style={{
        color: 'white',
        background: 'red',
        padding: '0.25rem',
        fontSize: '12pt',
        fontWeight: 'bold',
        borderRadius: 3,
      }}
    >
      ERROR
    </p>
  </div>
);

const ErrorOrSampleBarcode = ({ schema, value }: { schema: TemplateSchema; value: string }) =>
  validateBarcodeInput(schema.type, value) ? <SampleBarcode schema={schema} /> : <ErrorBarcode />;

const BarcodeSchema = (
  { schema, editable, placeholder, tabIndex, onChange }: SchemaUIProp,
  ref: Ref<HTMLInputElement>
) => {
  const value = schema.data;

  return (
    <div className={styles.barcodeWrapper}>
      <input
        ref={ref}
        disabled={!editable}
        tabIndex={tabIndex}
        placeholder={placeholder}
        className={`${styles.placeholderGray}`}
        style={{
          textAlign: 'center',
          position: 'absolute',
          zIndex: 2,
          fontSize: 'inherit',
          height: Number(schema.height) * zoom,
          width: (Number(schema.width) + (schema.characterSpacing || 0) * 0.75) * zoom,
          background: editable || value ? 'rgba(255, 255, 255, 0.8)' : 'none',
          border: 'none',
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <ErrorOrSampleBarcode value={value} schema={schema} />
      ) : (
        <SampleBarcode schema={schema} />
      )}
    </div>
  );
};

export default forwardRef<HTMLInputElement, SchemaUIProp>(BarcodeSchema);
