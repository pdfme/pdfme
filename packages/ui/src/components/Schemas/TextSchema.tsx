import React, { useContext, forwardRef, Ref, useState, useEffect } from 'react';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  DEFAULT_PT_TO_PX_RATIO,
  TextSchema,
  calculateDynamicFontSize
} from '@pdfme/common';
import { SchemaUIProps } from './SchemaUI';
import { ZOOM } from '../../constants';
import { FontContext } from '../../contexts';
import * as fontkit from 'fontkit';


type Props = SchemaUIProps & { schema: TextSchema };

const TextSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange }: Props,
  ref: Ref<HTMLTextAreaElement>
) => {
  const font = useContext(FontContext);

  const [dynamicFontSize, setDynamicFontSize] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (schema.dynamicFontSize && schema.data) {
      calculateDynamicFontSize({ textSchema: schema, font, input: schema.data }).then(setDynamicFontSize)
    } else {
      setDynamicFontSize(undefined);
    }
  }, [schema.data, schema.width, schema.fontName, schema.dynamicFontSize, schema.dynamicFontSize?.max, schema.dynamicFontSize?.min, schema.characterSpacing, font]);

  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    padding: 0,
    height: schema.height * ZOOM,
    width: schema.width * ZOOM,
    resize: 'none',
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    fontSize: `${dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    whiteSpace: 'pre-line',
    wordBreak: 'break-word',
    backgroundColor:
      schema.data && schema.backgroundColor ? schema.backgroundColor : 'rgb(242 244 255 / 75%)',
    border: 'none',
  };

  const schemaFontSize = dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE;
  let fontAlignmentValue = 0;

  if (schema.fontName) {
    const currentFont = fontkit.create(
      Buffer.from(font[schema.fontName].data as ArrayBuffer)
    );

    // Ascent and descent values obtained from Fontkit in font units
    const ascentInFontUnits = currentFont.ascent;
    const descentInFontUnits = currentFont.descent;
    const fontSizeInPx = schemaFontSize * DEFAULT_PT_TO_PX_RATIO;

    // Get the scaling factor for the font
    const scalingFactor = currentFont.unitsPerEm;

    // Convert ascent and descent to px values
    const ascentInPixels = (ascentInFontUnits / scalingFactor) * fontSizeInPx;
    const descentInPixels = (descentInFontUnits / scalingFactor) * fontSizeInPx;

    // Calculate the single line height in px
    const singleLineHeight = ((ascentInPixels + Math.abs(descentInPixels)) / fontSizeInPx);

   // Calculate the top margin/padding in px
   fontAlignmentValue = ((singleLineHeight * fontSizeInPx) - fontSizeInPx) / 2;
  }

  return editable ? (
    <textarea
      ref={ref}
      placeholder={placeholder}
      tabIndex={tabIndex}
      style={{
        ...style,
        height: fontAlignmentValue < 0 ? `${schema.height * ZOOM + Math.abs(fontAlignmentValue)}px` : `${schema.height * ZOOM}px`, 
        marginTop: fontAlignmentValue < 0 ? `${fontAlignmentValue}px` : '0',
        paddingTop: fontAlignmentValue >= 0 ? `${fontAlignmentValue}px` : '0',
      }}
      onChange={(e) => onChange(e.target.value)}
      value={schema.data}
    ></textarea>
  ) : (
    <div style={style}>
      <div style={{ 
         marginTop: fontAlignmentValue < 0 ? `${fontAlignmentValue}px` : '0',
         paddingTop: fontAlignmentValue >= 0 ? `${fontAlignmentValue}px` : '0',
       }}>
        {/*  Set the letterSpacing of the last character to 0. */}
        {schema.data.split('').map((l, i) => (
          <span
            key={i}
            style={{
              letterSpacing: String(schema.data).length === i + 1 ? 0 : 'inherit',
            }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

export default forwardRef<HTMLTextAreaElement, Props>(TextSchemaUI);
