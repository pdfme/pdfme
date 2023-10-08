import type { PropPanelSchema, PropPanelWidgetProps } from '../types'
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import React from 'react';
import { Select, Checkbox } from 'antd';
import { getFallbackFontName, DEFAULT_FONT_NAME, DEFAULT_FONT_SIZE } from "@pdfme/common"

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
    // FIXME useDynamicFontSizeとdynamicFontSizeはまるっとwidgetを作成すべき
    useDynamicFontSize: {
        type: 'boolean',
        widget: 'DynamicFontSizeCheckbox',
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

// FIXME 
// useDynamicFontSize をoffにしても dynamicFontSize自体が消えないので普通のフォントサイズに戻らない
// ウィジェットを作成してどうにか対処する。
const DynamicFontSizeCheckbox: React.FC<PropPanelWidgetProps> = ({ value, onChange, addons: { globalProps: { activeSchema, changeSchemas } } }) => {
    const _activeSchema = activeSchema as any

    const _onChange = (e: CheckboxChangeEvent) => {
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
        value = checked;
        onChange(e)
    }

    return <Checkbox
        checked={Boolean(_activeSchema.dynamicFontSize)}
        onChange={_onChange}>
        Use Dynamic Font Size
    </Checkbox>;
}

export const textWidgets = { FontSelect, DynamicFontSizeCheckbox }