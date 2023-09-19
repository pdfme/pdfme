import type { ChangeEvent } from 'react';
import type * as CSS from 'csstype';
import { ImageSchema } from '@pdfme/common';
import type { RenderProps } from "../types"
import { ZOOM } from '../constants';
import { readFiles } from '../helper';

export const renderImage = async (arg: RenderProps) => {
    const {
        value,
        rootElement,
        editing,
        onChange,
        stopEditing,
        tabIndex,
        placeholder,
    } = arg;
    const schema = arg.schema as ImageSchema;

    const size = { width: schema.width * ZOOM, height: schema.height * ZOOM };

    const container = document.createElement('div');
    const containerStyle: CSS.Properties = {
        width: size.width + 'px',
        height: size.height + 'px',
        opacity: value ? 1 : 0.5,
        backgroundImage: value ? 'none' : `url(${placeholder})`,
        backgroundSize: `${size.width}px ${size.height}px`,
    }
    Object.assign(container.style, containerStyle);
    container.addEventListener('click', (e) => {
        if (editing) {
            e.stopPropagation();
        }
    });
    rootElement.appendChild(container);

    // image tag
    if (value) {
        const img = document.createElement('img');
        const imgStyle: CSS.Properties = {
            width: size.width + 'px',
            height: size.height + 'px',
            borderRadius: 0,
        }
        Object.assign(img.style, imgStyle);
        img.src = value;
        container.appendChild(img);
    }

    // remove button
    if (value && editing) {
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
        }
        Object.assign(button.style, buttonStyle);
        button.addEventListener('click', () => {
            onChange && onChange('');
        });
        container.appendChild(button);
    }

    // file input
    const label = document.createElement('label');
    const labelStyle: CSS.Properties = {
        display: editing ? 'flex' : 'none',
        position: 'absolute',
        top: '50%',
        width: '100%',
        cursor: 'pointer',
    }
    Object.assign(label.style, labelStyle);
    container.appendChild(label);


    const input = document.createElement('input');
    input.tabIndex = tabIndex || 0;
    input.type = 'file';
    input.accept = 'image/jpeg, image/png';
    input.addEventListener('change', (event: Event) => {
        const changeEvent = event as unknown as ChangeEvent<HTMLInputElement>;
        readFiles(changeEvent.target.files, 'dataURL').then((result) => onChange && onChange(result as string))
    });
    input.addEventListener('blur', () => stopEditing && stopEditing());
    label.appendChild(input);
}