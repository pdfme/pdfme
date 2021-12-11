import React, { forwardRef, Ref } from 'react';
import * as styles from './index.module.scss';
import { zoom } from '../../../libs/constants';
import { SchemaUIProp } from '../../../libs/type';

const TextSchema = (
  { schema, editable, placeholder, tabIndex, onChange }: SchemaUIProp,
  ref: Ref<HTMLTextAreaElement>
) => (
  <textarea
    ref={ref}
    disabled={!editable}
    placeholder={placeholder}
    tabIndex={tabIndex}
    className={`${styles.placeholderGray} `}
    style={{
      resize: 'none',
      fontFamily: 'inherit',
      height: schema.height * zoom,
      width: (schema.width + (schema.characterSpacing || 0) * 0.75) * zoom, // 横幅を伸ばす1ポイントは0.75ピクセル
      textAlign: schema.alignment,
      fontSize: `${schema.fontSize}pt`,
      letterSpacing: `${schema.characterSpacing}pt`,
      fontFeatureSettings: `"palt"`,
      lineHeight: `${schema.lineHeight}em`,
      whiteSpace: 'pre-line',
      wordBreak: 'break-all',
      background: 'transparent',
      border: 'none',
      color: schema.fontColor || '#000',
    }}
    onChange={(e) => onChange(e.target.value)}
    value={schema.data}
  ></textarea>
);

export default forwardRef<HTMLTextAreaElement, SchemaUIProp>(TextSchema);
