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
    if (value && editable) {
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
    if (!value && editable) {
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
    defaultValue:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAu4AAALuAQMAAADL0wGJAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAGUExURbzAw+rv8fKruy0AAAPoSURBVHja7dwxbtwwEEBRCkKwRQodYftcYk+ROkcJz5NTsEuZK/AIKlIQAUEnke0VqQ0pA5zxWvFnZcD2s0CNuENxPOZBc0QDDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD/+P8bkxvnTzzjTG0M2b5rh08rHNT518aPOnTt63+aGTd23edPJ2h//ax+/oO6Gzx6c78+cuPu7x01vmwx5/6uLnO/PjO+b/rGifvtWH3VnT9vmh/e3eqx/bc9d79af2YwEPDw8P/6r8r1GVt5VcUoZPtXxGhp9rGYEM72vbEBne1hJ5Gb6ayIvwqZppi/CxmgqL8KGaTIrwc3WDfATeV/ffIryr7r+PwNvq/vsIfH17D5/qbw/gb/mLKp/OqnycFPj14yqcJPm4vfp5VJ0cP6jyzqjy9rr2q/Dr4qzBp3V5E1wxp/V3rl8LXn32qF6fAY31Psv2NXi/5lQaH+Vuzak0eLsmPRppVPa3FPiU3QiFFDZmD4FCAh6yxV+Bn7O9isLmx2d/TGHr5rI7obDxtFkcKWyb89M2+U1/sX7Kv7Io8gaxFy5l2D/faRk++3x6PgsalV52+fwUW4j/+eGhDPuneyH/otHmp9jyfHHMLM6n4phZnI/FObA4H4qDWnF+Lo46xXlflG+I864o3xDnbVG+Ic6X9RXSfCrrK6T5WBZASPOhrFCQ5ufyjF+a92XdkjTvyrolad6WdUvS/KawSI7/sQn7JfDl+O+bsF8CX44fN2FvHnNnIT4Nm7BfAl+ON5uwXwJfjA/LCuk2BXvCvN0U7InxflmAtxV1gvx0U2N3luPtdZOlwj/FoR5vbuq85Pi48F6LD0scOk3+sq1cleP9ohlNfkpq/N9pGaMuH7T4ZVqGWYt/nBavyxstftblfaVIWJU/y72yODCfzJH5oMvPh+adLm+PzCdzZD5U/61ClT9Lnvyo8e7QvFHlE3ydj0zOu5ucickhcpgcJofJedUVk8j5b/nGgIeHh4d/I3x/RwLlhgfNH3DavSwGXf7YjT76uqCEQ/P37p9z7uKVmwspd17S7hul3PXK6fbsmnvWhO6GZlMnn3ri8gXN5GzHnX0B35ydj91814CHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl+d/A9cKjmiL040TAAAAAElFTkSuQmCC',
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
