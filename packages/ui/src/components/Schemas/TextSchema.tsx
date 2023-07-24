import React, { useContext, forwardRef, Ref, useState, useEffect } from 'react';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  TextSchema,
  calculateDynamicFontSize,
  substitutePlaceholdersInContent,
  getFontKitFont,
  getFontAlignmentValue,
} from '@pdfme/common';
import { SchemaUIProps } from './SchemaUI';
import { ZOOM } from '../../constants';
import { FontContext } from '../../contexts';

type Props = SchemaUIProps & { schema: TextSchema };

const TextSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange }: Props,
  ref: Ref<HTMLTextAreaElement>
) => {
  const font = useContext(FontContext);
  const [dynamicFontSize, setDynamicFontSize] = useState<number | undefined>(undefined);
  const [fontAlignmentValue, setFontAlignmentValue] = useState<number>(0);


  const content = editable ? String(schema.content) : substitutePlaceholdersInContent(schema.key, schema.content, schema.data);

  useEffect(() => {
    if (schema.dynamicFontSize && content) {
      calculateDynamicFontSize({ textSchema: schema, font, input: content }).then(setDynamicFontSize)
    } else {
      setDynamicFontSize(undefined);
    }
    getFontKitFont(schema, font).then(fontKitFont => {
      const fav = getFontAlignmentValue(fontKitFont, dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE);
      setFontAlignmentValue(fav);
    });
  }, [content, schema.width, schema.fontName, schema.fontSize, schema.dynamicFontSize, schema.dynamicFontSize?.max, schema.dynamicFontSize?.min, schema.characterSpacing, font]);


  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    padding: 0,
    height: fontAlignmentValue < 0 ? schema.height * ZOOM + Math.abs(fontAlignmentValue) : schema.height * ZOOM,
    width: schema.width * ZOOM,
    resize: 'none',
    marginTop: fontAlignmentValue < 0 ? fontAlignmentValue : 0,
    paddingTop: fontAlignmentValue >= 0 ? fontAlignmentValue : 0,
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    fontSize: `${dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    whiteSpace: 'pre-line',
    wordBreak: 'break-word',
    backgroundColor:
      content && schema.backgroundColor ? schema.backgroundColor : 'rgb(242 244 255 / 75%)',
    border: 'none',
  };

  return editable ? (
    <textarea
      ref={ref}
      placeholder={placeholder}
      tabIndex={tabIndex}
      style={style}
      onChange={(e) => onChange(e.target.value)}
      value={content}
    ></textarea>
  ) : (
    <div style={{ ...style, height: schema.height * ZOOM, marginTop: 0, paddingTop: 0 }}>
      <div style={{ marginTop: style.marginTop, paddingTop: style.paddingTop }}>
        {/*  Set the letterSpacing of the last character to 0. */}
        {content.split('').map((l, i) => (
          <span key={i} style={{ letterSpacing: String(content).length === i + 1 ? 0 : 'inherit', }} >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

export default forwardRef<HTMLTextAreaElement, Props>(TextSchemaUI);
