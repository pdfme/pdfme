import type { ChangeEvent } from 'react';
import type * as CSS from 'csstype';
import type { ImageSchema } from './types';
import { UIRenderProps, ZOOM } from '@pdfme/common';
import { addAlphaToHex, isEditable } from '../renderUtils.js';

const fullSize = { width: '100%', height: '100%' };

const readFile = (input: File | FileList | null): Promise<string | ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result);
      }
    };

    fileReader.onerror = (e) => {
      reject(new Error('[@pdfme/schemas] File reading failed'));
    };

    let file: File | null = null;
    if (input instanceof FileList && input.length > 0) {
      file = input[0];
    } else if (input instanceof File) {
      file = input;
    }

    if (file) {
      fileReader.readAsDataURL(file);
    } else {
      reject(new Error('[@pdfme/schemas] No files provided'));
    }
  });

export const uiRender = async (arg: UIRenderProps<ImageSchema>) => {
  const { value, rootElement, mode, onChange, stopEditing, tabIndex, placeholder, schema, theme } =
    arg;
  const editable = isEditable(mode);

  const size = { width: schema.width * ZOOM, height: schema.height * ZOOM };

  const container = document.createElement('div');
  const containerStyle: CSS.Properties = {
    ...fullSize,
    backgroundImage: value ? 'none' : `url(${placeholder})`,
    backgroundSize: `${size.width}px ${size.height}px`,
    opacity: schema.opacity,
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
};
