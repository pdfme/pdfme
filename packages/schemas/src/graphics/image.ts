import type { ChangeEvent } from 'react';
import type { Plugin } from '@pdfme/common';
import type { PDFRenderProps, Schema } from '@pdfme/common';
import type * as CSS from 'csstype';
import { UIRenderProps, ZOOM } from '@pdfme/common';
import { convertForPdfLayoutProps, addAlphaToHex, isEditable } from '../pdfRenderUtils.js';
import { readFile } from '../uiRenderUtils.js';
import { DEFAULT_OPACITY } from '../constants.js';

const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
const fullSize = { width: '100%', height: '100%' };
const defaultValue =
  'data:image/png;base64,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';

interface ImageSchema extends Schema {}

const schema: Plugin<ImageSchema> = {
  pdf: async (arg: PDFRenderProps<ImageSchema>) => {
    const { value, schema, pdfDoc, page, _cache } = arg;
    if (!value || !value.startsWith('data:image/')) return;

    const inputImageCacheKey = getCacheKey(schema, value);
    let image = _cache.get(inputImageCacheKey);
    if (!image) {
      const isPng = value.startsWith('data:image/png;');
      image = await (isPng ? pdfDoc.embedPng(value) : pdfDoc.embedJpg(value));
      _cache.set(inputImageCacheKey, image);
    }

    const pageHeight = page.getHeight();
    const {
      width,
      height,
      rotate,
      position: { x, y },
      opacity,
    } = convertForPdfLayoutProps({ schema, pageHeight });

    page.drawImage(image, { x, y, rotate, width, height, opacity });
  },
  ui: (arg: UIRenderProps<ImageSchema>) => {
    const {
      value,
      rootElement,
      mode,
      onChange,
      stopEditing,
      tabIndex,
      placeholder,
      schema,
      theme,
    } = arg;
    const editable = isEditable(mode);
    const isDefault = value === defaultValue;

    const size = { width: schema.width * ZOOM, height: schema.height * ZOOM };

    const container = document.createElement('div');
    const backgroundStyle = placeholder ? `url(${placeholder})` : 'none';
    const containerStyle: CSS.Properties = {
      ...fullSize,
      backgroundImage: value ? 'none' : backgroundStyle,
      backgroundSize: `${size.width}px ${size.height}px`,
    };
    Object.assign(container.style, containerStyle);
    container.addEventListener('click', (e) => {
      if (editable) {
        e.stopPropagation();
      }
    });
    rootElement.appendChild(container);

    // image tag
    if (value) {
      const img = document.createElement('img');
      const imgStyle: CSS.Properties = { height: '100%', width: '100%', borderRadius: 0 };
      Object.assign(img.style, imgStyle);
      img.src = value;
      container.appendChild(img);
    }

    // remove button
    if (value && !isDefault && editable) {
      const button = document.createElement('button');
      button.textContent = 'x';
      const buttonStyle: CSS.Properties = {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#333',
        background: '#f2f2f2',
        borderRadius: '2px',
        border: '1px solid #767676',
        cursor: 'pointer',
        height: '24px',
        width: '24px',
      };
      Object.assign(button.style, buttonStyle);
      button.addEventListener('click', () => {
        onChange && onChange('');
      });
      container.appendChild(button);
    }

    // file input
    if ((!value || isDefault) && editable) {
      const label = document.createElement('label');
      const labelStyle: CSS.Properties = {
        ...fullSize,
        display: editable ? 'flex' : 'none',
        position: 'absolute',
        top: 0,
        backgroundColor: editable || value ? addAlphaToHex(theme.colorPrimaryBg, 30) : 'none',
        cursor: 'pointer',
      };
      Object.assign(label.style, labelStyle);
      container.appendChild(label);
      const input = document.createElement('input');
      const inputStyle: CSS.Properties = { ...fullSize, position: 'absolute', top: '50%' };
      Object.assign(input.style, inputStyle);
      input.tabIndex = tabIndex || 0;
      input.type = 'file';
      input.accept = 'image/jpeg, image/png';
      input.addEventListener('change', (event: Event) => {
        const changeEvent = event as unknown as ChangeEvent<HTMLInputElement>;
        readFile(changeEvent.target.files).then((result) => onChange && onChange(result as string));
      });
      input.addEventListener('blur', () => stopEditing && stopEditing());
      label.appendChild(input);
    }
  },
  propPanel: {
    schema: {},
    defaultValue,
    defaultSchema: {
      type: 'image',
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
      // If the value of "rotate" is set to undefined or not set at all, rotation will be disabled in the UI.
      // Check this document: https://pdfme.com//docs/custom-schemas#learning-how-to-create-from-pdfmeschemas-code
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
};
export default schema;
