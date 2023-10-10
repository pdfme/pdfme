import React from 'react';
import { Select, Checkbox, Form, InputNumber, Col, Row } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
// import type { WidgetProps, Schema as PropPanelSchema } from 'form-render';
import {
    getFallbackFontName,
    DEFAULT_FONT_NAME,
    DEFAULT_FONT_SIZE,
    DEFAULT_ALIGNMENT,
    DEFAULT_VERTICAL_ALIGNMENT,
    DEFAULT_CHARACTER_SPACING,
    DEFAULT_LINE_HEIGHT,
} from '@pdfme/common';
import { PropPanelWidgetGlobalProps } from "../types"

// type PropPanelWidgetProps = WidgetProps & {
type PropPanelWidgetProps = any & {
    addons: {
        globalProps: PropPanelWidgetGlobalProps
    }
};

// const textSchema: Record<string, PropPanelSchema> = {
const textSchema: Record<string, any> = {
    fontName: { title: 'Font Name', type: 'string', widget: 'FontSelect', span: 8 },
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
    lineHeight: { title: 'Line Height', type: 'number', widget: 'inputNumber', span: 8 },
    characterSpacing: { title: 'Char Spc', type: 'number', widget: 'inputNumber', span: 8 },
    dynamicFontSize: { type: 'object', widget: 'DynamicFontSize', cellSpan: 2 },
    fontColor: { title: 'Font Color', type: 'string', widget: 'color', },
    backgroundColor: { title: 'Background', type: 'string', widget: 'color', },
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
    const value = addons.getValueByPath('dynamicFontSize') as { min: number, max: number, fit: 'horizontal' | 'vertical' } | undefined

    const { globalProps: { activeSchema, changeSchemas } } = addons

    const onChangeCheck = (e: CheckboxChangeEvent) => {
        const checked = e.target.checked
        const value = checked ? { min: 8, max: 36, fit: 'horizontal' } : undefined
        changeSchemas([{ key: 'dynamicFontSize', value, schemaId: activeSchema.id, }]);
    }

    const onChangeSize = (type: 'min' | 'max', value: number) => {
        changeSchemas([{ key: `dynamicFontSize.${type}`, value, schemaId: activeSchema.id }]);
    }
    const onChangeFit = (value: 'horizontal' | 'vertical') => {
        changeSchemas([{ key: `dynamicFontSize.fit`, value, schemaId: activeSchema.id }]);
    }

    return <Row>
        <Col span={24}>
            <Form.Item>
                <Checkbox checked={Boolean(value)} onChange={onChangeCheck}> Dynamic Font Size</Checkbox>
            </Form.Item>
        </Col>
        {Boolean(value) && <>
            <Col span={8}>
                <Form.Item label="Min">
                    <InputNumber
                        value={value?.min}
                        onChange={(value: number | null) => value && onChangeSize('min', value)} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item label="Max">
                    <InputNumber
                        value={value?.max}
                        onChange={(value: number | null) => value && onChangeSize('max', value)} />
                </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item label="Fit">
                    <Select
                        value={value?.fit}
                        onChange={onChangeFit}
                        options={[{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }]}
                    />
                </Form.Item>
            </Col>
        </>}
    </Row>
}


// FIXME ここから textのpropPanelのレンダリングで下記のエラーが出る
// https://reactjs.org/docs/error-decoder.html?invariant=321
export const getPropPanel = () => ({
    schema: textSchema,
    widgets: { FontSelect, DynamicFontSize },
    defaultValue: 'Type Something...',
    defaultSchema: {
        width: 45,
        height: 10,
        alignment: DEFAULT_ALIGNMENT,
        verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        characterSpacing: DEFAULT_CHARACTER_SPACING,
        dynamicFontSize: undefined,
        fontColor: '#000000',
        backgroundColor: ''
    }
})