import React from 'react';
import { PropPanelSchema, PropPanelWidgetProps } from '../types'

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
        disabled: "{{ formData.useDynamicFontSizeSwitch }}"
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
    useDynamicFontSizeSwitch: {
        title: 'Use Dynamic Font Size',
        type: 'boolean',
        widget: 'checkbox',
        cellSpan: 2,
    },
    useDynamicFontSize: {
        type: 'object', widget: 'card', column: 3, hidden: "{{ !formData.useDynamicFontSizeSwitch }}",
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

// FIXME ここから FontSelectを作成する
const FontSelect: React.FC<PropPanelWidgetProps> = ({ addons: { globalProps } }) => {
    return <div>FontSelect</div>
}

export const textWidgets = { FontSelect }