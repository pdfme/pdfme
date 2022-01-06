import React, { forwardRef, Ref } from 'react';
import * as styles from './index.module.scss';
import { ZOOM } from '../../../libs/constants';
import { validateBarcodeInput } from '../../../libs/barcode';
import { BarCodeType, barcodeSchemaTypes, BarcodeTemplateSchema } from '../../../libs/type';
import { SchemaUIProps } from '../SchemaUI';
import ean8 from '../../../assets/barcodeExamples/ean8.png';
import ean13 from '../../../assets/barcodeExamples/ean13.png';
import code39 from '../../../assets/barcodeExamples/code39.png';
import code128 from '../../../assets/barcodeExamples/code128.png';
import nw7 from '../../../assets/barcodeExamples/nw7.png';
import itf14 from '../../../assets/barcodeExamples/itf14.png';
import japanpost from '../../../assets/barcodeExamples/japanpost.png';
import qrcode from '../../../assets/barcodeExamples/qrcode.png';
import upca from '../../../assets/barcodeExamples/upca.png';
import upce from '../../../assets/barcodeExamples/upce.png';

type Props = SchemaUIProps & { schema: BarcodeTemplateSchema };

const barcodeTypes = barcodeSchemaTypes.map((t) => t as string);

const barcodeExampleImageObj: { [key: string]: string } = {
  qrcode,
  japanpost,
  ean13,
  ean8,
  code39,
  code128,
  nw7,
  itf14,
  upca,
  upce,
};

const SampleBarcode = ({ schema }: { schema: BarcodeTemplateSchema }) => (
  <img
    className={styles.barcodeImage}
    style={{ width: schema.width * ZOOM, height: schema.height * ZOOM }}
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

const ErrorOrSampleBarcode = ({
  schema,
  value,
}: {
  schema: BarcodeTemplateSchema;
  value: string;
}) =>
  barcodeTypes.includes(schema.type) && validateBarcodeInput(schema.type as BarCodeType, value) ? (
    <SampleBarcode schema={schema} />
  ) : (
    <ErrorBarcode />
  );

const BarcodeSchema = (
  { schema, editable, placeholder, tabIndex, onChange }: Props,
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
          height: Number(schema.height) * ZOOM,
          width: Number(schema.width) * ZOOM,
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

export default forwardRef<HTMLInputElement, Props>(BarcodeSchema);
