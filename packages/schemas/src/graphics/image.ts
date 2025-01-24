import type { ChangeEvent } from 'react';
import type { PDFImage } from '@pdfme/pdf-lib';
import type { Plugin } from '@pdfme/common';
import type { PDFRenderProps, Schema } from '@pdfme/common';
import type * as CSS from 'csstype';
import { UIRenderProps, px2mm } from '@pdfme/common';
import { Image } from 'lucide';
import {
  convertForPdfLayoutProps,
  addAlphaToHex,
  isEditable,
  readFile,
  createSvgStr,
} from '../utils.js';
import { DEFAULT_OPACITY } from '../constants.js';
import { getImageDimension } from './imagehelper.js';

const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
const fullSize = { width: '100%', height: '100%' };
const defaultValue =
  'data:image/png;base64,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';

export interface ImageSchema extends Schema {}

const imageSchema: Plugin<ImageSchema> = {
  pdf: async (arg: PDFRenderProps<ImageSchema>) => {
    const { value, schema, pdfDoc, page, _cache } = arg;
    if (!value) return;

    const inputImageCacheKey = getCacheKey(schema, value);
    let image = _cache.get(inputImageCacheKey) as PDFImage;
    if (!image) {
      const isPng = value.startsWith('data:image/png;');
      image = await (isPng ? pdfDoc.embedPng(value) : pdfDoc.embedJpg(value));
      _cache.set(inputImageCacheKey, image);
    }

    const _schema = { ...schema, position: { ...schema.position } };
    const dimension = getImageDimension(value);
    const imageWidth = px2mm(dimension.width);
    const imageHeight = px2mm(dimension.height);
    const boxWidth = _schema.width;
    const boxHeight = _schema.height;

    const imageRatio = imageWidth / imageHeight;
    const boxRatio = boxWidth / boxHeight;

    if (imageRatio > boxRatio) {
      _schema.width = boxWidth;
      _schema.height = boxWidth / imageRatio;
      _schema.position.y += (boxHeight - _schema.height) / 2;
    } else {
      _schema.width = boxHeight * imageRatio;
      _schema.height = boxHeight;
      _schema.position.x += (boxWidth - _schema.width) / 2;
    }

    const pageHeight = page.getHeight();
    const lProps = convertForPdfLayoutProps({ schema: _schema, pageHeight });
    const { width, height, rotate, position, opacity } = lProps;
    const { x, y } = position;

    const drawOptions = { x, y, rotate, width, height, opacity };
    page.drawImage(image, drawOptions);
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
      theme,
      schema,
    } = arg;
    const editable = isEditable(mode, schema);
    const isDefault = value === defaultValue;

    const container = document.createElement('div');
    const backgroundStyle = placeholder ? `url(${placeholder})` : 'none';
    const containerStyle: CSS.Properties = {
      ...fullSize,
      backgroundImage: value ? 'none' : backgroundStyle,
      backgroundSize: `contain`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
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
      const imgStyle: CSS.Properties = {
        height: '100%',
        width: '100%',
        borderRadius: 0,
        objectFit: 'contain',
      };
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
        onChange && onChange({ key: 'content', value: '' });
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
      const inputStyle: CSS.Properties = {
        ...fullSize,
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '180px',
        height: '30px',
        marginLeft: '-90px',
        marginTop: '-15px',
      };
      Object.assign(input.style, inputStyle);
      input.tabIndex = tabIndex || 0;
      input.type = 'file';
      input.accept = 'image/jpeg, image/png';
      input.addEventListener('change', (event: Event) => {
        const changeEvent = event as unknown as ChangeEvent<HTMLInputElement>;
        readFile(changeEvent.target.files)
          .then((result) => {
            onChange && onChange({ key: 'content', value: result as string });
          })
          .catch((error) => {
            console.error('Error reading file:', error);
          });
      });
      input.addEventListener('blur', () => stopEditing && stopEditing());
      label.appendChild(input);
    }
  },
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'image',
      content: defaultValue,
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
      // If the value of "rotate" is set to undefined or not set at all, rotation will be disabled in the UI.
      // Check this document: https://pdfme.com//docs/custom-schemas#learning-how-to-create-from-pdfmeschemas-code
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  icon: createSvgStr(Image),
};

export default imageSchema;
