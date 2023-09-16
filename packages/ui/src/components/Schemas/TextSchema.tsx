// TODO packages/ui/src/renders/text.ts
import React, { useContext, forwardRef, Ref, useState, useEffect } from 'react';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_ALIGNMENT,
  VERTICAL_ALIGN_TOP,
  VERTICAL_ALIGN_MIDDLE,
  VERTICAL_ALIGN_BOTTOM,
  DEFAULT_VERTICAL_ALIGNMENT,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_CHARACTER_SPACING,
  DEFAULT_FONT_COLOR,
  TextSchema,
  calculateDynamicFontSize,
  getFontKitFont,
  getBrowserVerticalFontAdjustments,
} from '@pdfme/common';
import { SchemaUIProps } from "../../types"
import { ZOOM } from '../../constants';
import { FontContext } from '../../contexts';

const mapVerticalAlignToFlex = (verticalAlignmentValue: string | undefined) => {
  switch (verticalAlignmentValue) {
    case VERTICAL_ALIGN_TOP:
      return 'flex-start';
    case VERTICAL_ALIGN_MIDDLE:
      return 'center';
    case VERTICAL_ALIGN_BOTTOM:
      return 'flex-end';
  }
  return 'flex-start';
};

type Props = SchemaUIProps & { schema: TextSchema };

const TextSchemaUI = (
  { schema, editable, placeholder, tabIndex, onChange, stopEditing }: Props,
  ref: Ref<HTMLTextAreaElement>
) => {
  const font = useContext(FontContext);
  const [dynamicFontSize, setDynamicFontSize] = useState<number | undefined>(undefined);
  const [topAdjustment, setTopAdjustment] = useState<number>(0);
  const [bottomAdjustment, setBottomAdjustment] = useState<number>(0);

  useEffect(() => {
    if (schema.dynamicFontSize && schema.data) {
      calculateDynamicFontSize({
        textSchema: schema,
        font,
        input: schema.data,
        startingFontSize: dynamicFontSize,
      }).then(setDynamicFontSize);
    } else {
      setDynamicFontSize(undefined);
    }
  }, [
    schema.data,
    schema.width,
    schema.height,
    schema.dynamicFontSize?.min,
    schema.dynamicFontSize?.max,
    schema.dynamicFontSize?.fit,
    schema.characterSpacing,
    schema.lineHeight,
    font
  ]);

  useEffect(() => {
    getFontKitFont(schema, font).then(fontKitFont => {
      // Depending on vertical alignment, we need to move the top or bottom of the font to keep
      // it within it's defined box and align it with the generated pdf.
      const { topAdj, bottomAdj } = getBrowserVerticalFontAdjustments(
        fontKitFont,
        dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE,
        schema.lineHeight ?? DEFAULT_LINE_HEIGHT,
        schema.verticalAlignment ?? DEFAULT_VERTICAL_ALIGNMENT
      );
      setTopAdjustment(topAdj);
      setBottomAdjustment(bottomAdj);
    });

    if (ref && 'current' in ref) {
      const textarea = ref.current;

      if (textarea) {
        // Textareas cannot be vertically aligned, so we need to adjust the height of the textarea
        // to exactly fit the height of it's content, whilst aligned within it's container.
        // This gives the appearance of being vertically aligned.
        textarea.style.height = 'auto'; // Reset the height to auto to ensure we get the correct height.
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }
  }, [
    schema.data,
    schema.width,
    schema.height,
    schema.fontName,
    schema.fontSize,
    schema.dynamicFontSize?.max,
    schema.dynamicFontSize?.min,
    schema.dynamicFontSize?.fit,
    schema.characterSpacing,
    schema.lineHeight,
    schema.verticalAlignment,
    font,
    dynamicFontSize,
    editable,
  ]);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    padding: 0,
    height: schema.height * ZOOM,
    width: schema.width * ZOOM,
    resize: 'none',
    backgroundColor: schema.data && schema.backgroundColor ? schema.backgroundColor : 'rgb(242 244 255 / 75%)',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: mapVerticalAlignToFlex(schema.verticalAlignment),
  };

  const textareaStyle: React.CSSProperties = {
    padding: 0,
    resize: 'none',
    border: 'none',
    outline: 'none',
    paddingTop: topAdjustment,
    background: 'none',
  };

  const fontStyles: React.CSSProperties = {
    fontFamily: schema.fontName ? `'${schema.fontName}'` : 'inherit',
    color: schema.fontColor ? schema.fontColor : DEFAULT_FONT_COLOR,
    fontSize: `${dynamicFontSize ?? schema.fontSize ?? DEFAULT_FONT_SIZE}pt`,
    letterSpacing: `${schema.characterSpacing ?? DEFAULT_CHARACTER_SPACING}pt`,
    lineHeight: `${schema.lineHeight ?? DEFAULT_LINE_HEIGHT}em`,
    textAlign: schema.alignment ?? DEFAULT_ALIGNMENT,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return editable ? (
    <div style={containerStyle}>
      <textarea
        ref={ref}
        rows={1}
        placeholder={placeholder}
        tabIndex={tabIndex}
        style={{ ...textareaStyle, ...fontStyles }}
        onChange={(e) => onChange(e.target.value)}
        onBlur={stopEditing}
        value={schema.data}
      ></textarea>
    </div>
  ) : (
    <div style={containerStyle}>
      <div
        style={{
          ...fontStyles,
          marginBottom: bottomAdjustment,
          paddingTop: topAdjustment,
        }}
      >
        {/*  Set the letterSpacing of the last character to 0. */}
        {schema.data.split('').map((l: string, i: number) => (
          <span key={i} style={{ letterSpacing: String(schema.data).length === i + 1 ? 0 : 'inherit' }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

export default forwardRef<HTMLTextAreaElement, Props>(TextSchemaUI);
