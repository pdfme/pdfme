import { Select } from 'antd';
import React from 'react';
import type { PropPanelSchema, PropPanelWidgetProps } from '../types'
import { getFallbackFontName, DEFAULT_FONT_NAME } from "@pdfme/common"

export const textSchema: Record<string, PropPanelSchema> = {
    fontName: {
        title: 'Font Name',
        type: 'string',
        widget: 'FontSelect',
        span: 8,
    },
    alignment: {
        title: 'Text Align',
        type: 'string',
        widget: 'select',
        props: {
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' }
            ]
        },
        span: 8,
    },
    verticalAlignment: {
        title: 'Vertical Align',
        type: 'string',
        widget: 'select',
        props: {
            options: [
                { label: 'Top', value: 'top' },
                { label: 'Middle', value: 'middle' },
                { label: 'Bottom', value: 'bottom' }
            ]
        },
        span: 8,
    },
    fontSize: {
        title: 'Font Size',
        type: 'number',
        widget: 'inputNumber',
        span: 8,
        disabled: "{{ formData.useDynamicFontSize }}"
    },
    lineHeight: {
        title: 'Line Height',
        type: 'number',
        widget: 'inputNumber',
        span: 8
    },
    characterSpacing: {
        title: 'Char Spc',
        type: 'number',
        widget: 'inputNumber',
        span: 8
    },
    useDynamicFontSize: { // FIXME ここから: useDynamicFontSize をoffにしても dynamicFontSize自体が消えないので普通のフォントサイズに戻らない
        title: 'Use Dynamic Font Size',
        type: 'boolean',
        widget: 'checkbox',
        cellSpan: 2,
    },
    dynamicFontSize: {
        type: 'object', widget: 'card', column: 3, hidden: "{{ !formData.useDynamicFontSize }}",
        properties: {
            min: {
                title: 'Min',
                type: 'number',
                widget: 'inputNumber',
            },
            max: {
                title: 'Max',
                type: 'number',
                widget: 'inputNumber',
            },
            fit: {
                title: 'Fit',
                type: 'string',
                widget: 'select',
                props: {
                    options: [
                        { label: 'Vertical', value: 'vertical' },
                        { label: 'Horizontal', value: 'horizontal' }
                    ]
                },
            },
        }
    },
    fontColor: {
        title: 'Font Color',
        type: 'string',
        widget: 'color',
    },
    backgroundColor: {
        title: 'Background',
        type: 'string',
        widget: 'color',
    },
}

const FontSelect: React.FC<PropPanelWidgetProps> = ({ value, onChange, addons: { globalProps: { options } } }) => {
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '' } }
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font)

    return <Select
        value={value}
        defaultValue={fallbackFontName}
        onChange={onChange}
        options={fontNames.map((label) => ({ label, value: label }))}
    />
}

export const textWidgets = { FontSelect }