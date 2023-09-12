import React, { forwardRef, Ref, useEffect, useState } from 'react';
import {
  validateBarcodeInput,
  BarCodeType,
  BarcodeSchema,
  createBarCode,
} from '@pdfme/common';
import { ZOOM } from '../../constants';
import { blobToDataURL } from '../../helper';
import { SchemaUIProps } from './SchemaUI';

const SampleBarcode = ({ schema, imageSrc }: { schema: BarcodeSchema; imageSrc: string }) => (
  <img
    style={{
      width: schema.width * ZOOM,
      height: schema.height * ZOOM,
      position: 'absolute',
      borderRadius: 0,
      opacity: 0.5,
    }}
    src={imageSrc}
  />
);

const ErrorBarcode = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <span
      style={{
        color: 'white',
        background: 'red',
        padding: '0.25rem',
        fontSize: '12pt',
        fontWeight: 'bold',
        borderRadius: 2,
      }}
    >
      ERROR
    </span>
  </div>
);

const BarcodePreview = (props: { schema: BarcodeSchema; value: string }) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isBarcodeValid, setIsBarcodeValid] = useState<boolean>(true);

  const { schema, value } = props;

  useEffect(() => {
    createBarCode(
      Object.assign(schema, { type: schema.type as BarCodeType, input: value })
    ).then((imageBuf) =>
      new Blob([new Uint8Array(imageBuf)], { type: 'image/png' }))
      .then(blobToDataURL)
      .then((dataUrl) => {
        setImageSrc(dataUrl);
        setIsBarcodeValid(true);
      }).catch(() => {
        setIsBarcodeValid(false);
      })

  }, [schema.type, schema.height, schema.width, schema.barcolor, schema.backgroundcolor, value, isBarcodeValid]);

  return validateBarcodeInput(schema.type as BarCodeType, value) && isBarcodeValid ? (
    <SampleBarcode schema={schema} imageSrc={imageSrc} />
  ) : (
    <ErrorBarcode />
  );
};

type Props = SchemaUIProps & { schema: BarcodeSchema };

const BarcodeSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange, onStopEditing }: Props,
  ref: Ref<HTMLInputElement>
) => {
  const value = schema.data;

  const style: React.CSSProperties = {
    textAlign: 'center',
    position: 'absolute',
    zIndex: 2,
    fontSize: '1rem',
    color: '#000',
    height: Number(schema.height) * ZOOM,
    width: Number(schema.width) * ZOOM,
    backgroundColor: editable || value ? 'rgb(242 244 255 / 75%)' : 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Open Sans', sans-serif",
      }}
    >
      {editable ? (
        <input
          ref={ref}
          tabIndex={tabIndex}
          placeholder={placeholder}
          style={style}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onStopEditing}
        />
      ) : (
        <div style={style}>
          <span>{value}</span>
        </div>
      )}
      <BarcodePreview value={value} schema={schema} />
    </div>
  );
};

export default forwardRef<HTMLInputElement, Props>(BarcodeSchemaUI);
