import {
    DEFAULT_FONT_NAME,
    PropPanel,
    PropPanelWidgetProps,
    PropPanelSchema,
    getFallbackFontName,
} from '@pdfme/common';
import type { TextSchema } from './types';
import {
    DEFAULT_FONT_SIZE,
    DEFAULT_ALIGNMENT,
    DEFAULT_VERTICAL_ALIGNMENT,
    DEFAULT_CHARACTER_SPACING,
    DEFAULT_LINE_HEIGHT,
} from './constants'


const UseDynamicFontSize = (props: PropPanelWidgetProps) => {
    const { rootElement, changeSchemas, activeSchema } = props;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean((activeSchema as any)?.dynamicFontSize);
    checkbox.onchange = (e: any) => {
        const val = e.target.checked ? { min: 4, max: 72, fit: 'horizontal' } : undefined;
        changeSchemas([{ key: 'dynamicFontSize', value: val, schemaId: activeSchema.id }]);
    };
    const label = document.createElement('label');
    label.innerText = 'Dynamic Font Size';
    label.style.cssText = 'display: flex; width: 100%;';
    label.appendChild(checkbox);
    rootElement.appendChild(label);
}

export const propPanel: PropPanel<TextSchema> = ({
    propPanelSchema: ({ options, activeSchema }) => {
        const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } }
        const fontNames = Object.keys(font);
        const fallbackFontName = getFallbackFontName(font)

        const enableDynamicFont = Boolean((activeSchema as any)?.dynamicFontSize);

        // FIXME valueはconstantsから使う
        const textSchema: Record<string, PropPanelSchema> = {
            fontName: {
                title: 'Font Name',
                type: 'string',
                widget: 'select',
                default: fallbackFontName,
                props: { options: fontNames.map((name) => ({ label: name, value: name })) },
                span: 8
            },
            alignment: {
                title: 'Text Align',
                type: 'string',
                widget: 'select',
                props: { options: [{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }] },
                span: 8,
            },
            verticalAlignment: {
                title: 'Vertical Align',
                type: 'string',
                widget: 'select',
                props: { options: [{ label: 'Top', value: 'top' }, { label: 'Middle', value: 'middle' }, { label: 'Bottom', value: 'bottom' }] },
                span: 8,
            },
            fontSize: {
                title: 'Font Size',
                type: 'number',
                widget: 'inputNumber',
                span: 8,
                disabled: enableDynamicFont
            },
            lineHeight: { title: 'Line Height', type: 'number', widget: 'inputNumber', span: 8 },
            characterSpacing: { title: 'Char Spc', type: 'number', widget: 'inputNumber', span: 8 },
            useDynamicFontSize: { type: 'boolean', widget: 'UseDynamicFontSize', bind: false },
            dynamicFontSize: {
                type: 'object', widget: 'card', column: 3,
                properties: {
                    min: { title: 'Min', type: 'number', widget: 'inputNumber', hidden: !enableDynamicFont },
                    max: { title: 'Max', type: 'number', widget: 'inputNumber', hidden: !enableDynamicFont },
                    fit: {
                        title: 'Fit', type: 'string', widget: 'select', hidden: !enableDynamicFont,
                        props: { options: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }] },
                    }
                }
            },
            fontColor: { title: 'Font Color', type: 'string', widget: 'color', },
            backgroundColor: { title: 'Background', type: 'string', widget: 'color', },
        }

        return textSchema;
    },
    widgets: { UseDynamicFontSize },
    defaultValue: 'Type Something...',
    defaultSchema: {
        type: 'text',
        position: { x: 0, y: 0 },
        width: 45,
        height: 10,
        alignment: DEFAULT_ALIGNMENT,
        verticalAlignment: DEFAULT_VERTICAL_ALIGNMENT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        characterSpacing: DEFAULT_CHARACTER_SPACING,
        dynamicFontSize: undefined,
        fontColor: '#000000',
        fontName: undefined,
        backgroundColor: '',
    }
})