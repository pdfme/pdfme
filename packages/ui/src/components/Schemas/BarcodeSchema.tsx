import React, { forwardRef, Ref, useEffect, useState } from 'react';
import { validateBarcodeInput, BarCodeType, BarcodeSchema, } from '@pdfme/common';
import { ZOOM } from '../../constants';
import { SchemaUIProps } from './SchemaUI';
import bwipjs from 'bwip-js';

const SampleBarcode = ({ schema, imageSrc }: { schema: BarcodeSchema, imageSrc: string }) => (
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
  const { type, height, width, barcolor, backgroundcolor, textcolor } = schema;

  if (value.length === 0) {
    return null;
  }

  useEffect(() => {
    let canvas = document.createElement('canvas');
    const barcodeType = type === 'nw7' ? 'rationalizedCodabar' : type;

    try {
      bwipjs.toCanvas(canvas, {
        bcid: barcodeType,
        scale: 1,
        text: value,
        includetext: true,
        textxalign: 'center',
        height,
        width,
        barcolor: barcolor ? barcolor.replace('#', '') : '000000',
        backgroundcolor: backgroundcolor ? backgroundcolor.replace('#', '') : 'ffffff',
        textcolor: textcolor? textcolor.replace('#', '') : '000000',
      });

      setIsBarcodeValid(true);
      setImageSrc(canvas.toDataURL('image/png'));
    } catch (error) {
      console.error(error);
      setIsBarcodeValid(false);
      return;
    }
  }, [type, height, width, barcolor, backgroundcolor, value, isBarcodeValid]);

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
