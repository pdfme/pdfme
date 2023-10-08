import type { PropPanelSchema, PropPanelWidgetProps } from '../types'
import React from 'react';
import { Select, Checkbox, Form, InputNumber, Space } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import {
    getFallbackFontName,
    DEFAULT_FONT_NAME,
    DEFAULT_FONT_SIZE,
    DEFAULT_ALIGNMENT,
    DEFAULT_VERTICAL_ALIGNMENT,
    DEFAULT_CHARACTER_SPACING,
    DEFAULT_LINE_HEIGHT,
} from '@pdfme/common';

const textSchema: Record<string, PropPanelSchema> = {
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
        disabled: "{{ Boolean(formData.dynamicFontSize) }}"
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
    dynamicFontSize: {
        type: 'object', widget: 'DynamicFontSize', column: 3,
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
                        { label: 'Horizontal', value: 'horizontal' },
                        { label: 'Vertical', value: 'vertical' }
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

const DynamicFontSize: React.FC<PropPanelWidgetProps> = ({ addons }) => {
    const value = addons.getValueByPath('dynamicFontSize')

    const { globalProps: { activeSchema, changeSchemas } } = addons
    const _activeSchema = activeSchema as any

    const onChange = (e: CheckboxChangeEvent) => {
        const checked = e.target.checked
        changeSchemas([
            {
                key: 'dynamicFontSize',
                value: checked ? {
                    min: _activeSchema.fontSize || DEFAULT_FONT_SIZE,
                    max: _activeSchema.fontSize || DEFAULT_FONT_SIZE,
                    fit: 'horizontal'
                } : undefined,
                schemaId: activeSchema.id,
            },
        ]);
    }

    // FIXME ここから 
    const onChange2 = () => { }
    const onChange3 = () => { }
    const onChange4 = () => { }

    return <>
        <Form.Item>
            <Checkbox checked={Boolean(value)} onChange={onChange}> Dynamic Font Size</Checkbox>
        </Form.Item >
        <Space>
            {/* レイアウトもちょっといい感じにする */}
            <Form.Item label="Min">
                <InputNumber min={1} max={10} defaultValue={3} onChange={onChange2} />
            </Form.Item >
            <Form.Item label="Max">
                <InputNumber min={1} max={10} defaultValue={3} onChange={onChange3} />
            </Form.Item >
            <Form.Item label="Fit">
                <Select
                    onChange={onChange4}
                    options={[
                        { label: 'Horizontal', value: 'horizontal' },
                        { label: 'Vertical', value: 'vertical' }
                    ]}
                />
            </Form.Item >
        </Space>
    </>
}


export const getTextPropPanel = () => ({
    schema: textSchema,
    widgets: { FontSelect, DynamicFontSize },
    defaultValue: 'Text',
    defaultSchema: {
        width: 40,
        height: 10,
        alignment: DEFAULT_ALIGNMENT,
        verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        characterSpacing: DEFAULT_CHARACTER_SPACING,
        dynamicFontSize: { min: 8, max: 32, fit: 'horizontal' },
        fontColor: '#000000',
        backgroundColor: ''
    }
})