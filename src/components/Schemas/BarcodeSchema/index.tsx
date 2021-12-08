import { forwardRef } from 'react';
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

const BarcodeError = () => (
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

const BarcodeSchema = forwardRef<HTMLInputElement, SchemaUIProp>(
  ({ schema, editable, placeholder, tabIndex, onChange }, ref) => {
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
            height: +schema.height * zoom,
            width: (+schema.width + (schema.characterSpacing || 0) * 0.75) * zoom,
            background: editable || value ? 'rgba(255, 255, 255, 0.8)' : 'none',
            border: 'none',
          }}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        {value ? (
          validateBarcodeInput(schema.type, value) ? (
            <SampleBarcode schema={schema} />
          ) : (
            <BarcodeError />
          )
        ) : (
          <SampleBarcode schema={schema} />
        )}
      </div>
    );
  }
);

export default BarcodeSchema;
