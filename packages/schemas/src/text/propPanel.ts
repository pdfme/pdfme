import {
    PropPanel,
    PropPanelWidgetProps,
    PropPanelSchema,
    getFallbackFontName,
    DEFAULT_FONT_NAME,
    DEFAULT_FONT_SIZE,
    DEFAULT_ALIGNMENT,
    DEFAULT_VERTICAL_ALIGNMENT,
    DEFAULT_CHARACTER_SPACING,
    DEFAULT_LINE_HEIGHT,
} from '@pdfme/common';

const inputStyle = `
-webkit-font-smoothing: antialiased;
--ant-display: flex;
box-sizing: border-box;
margin: 0;
padding: 5px 11px;
color: rgba(0, 0, 0, 0.88);
line-height: 1.6666666666666667;
list-style: none;
font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji';
position: relative;
display: inline-block;
cursor: pointer;
font-size: 12px;
height: 32px;
width: 100%;
border: 1px solid rgb(217, 217, 217);
border-radius: 5px;`

const textSchema: Record<string, PropPanelSchema> = {
    fontName: { title: 'Font Name', type: 'string', widget: 'FontSelect', span: 8 },
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
        disabled: "{{ Boolean(formData.useDynamicFontSize) }}"
    },
    lineHeight: { title: 'Line Height', type: 'number', widget: 'inputNumber', span: 8 },
    characterSpacing: { title: 'Char Spc', type: 'number', widget: 'inputNumber', span: 8 },
    useDynamicFontSize: { type: 'boolean', widget: 'UseDynamicFontSize' }, // FIXME この値はformの値としてignoreできないのか
    dynamicFontSize: {
        type: 'object', widget: 'card', column: 3,
        properties: {
            min: { title: 'Min', type: 'number', widget: 'inputNumber', disabled: "{{ !Boolean(formData.useDynamicFontSize) }}" },
            max: { title: 'Max', type: 'number', widget: 'inputNumber', disabled: "{{ !Boolean(formData.useDynamicFontSize) }}" },
            fit: {
                title: 'Fit', type: 'string', widget: 'select', disabled: "{{ !Boolean(formData.useDynamicFontSize) }}",
                props: { options: [{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }] },
            }
        }
    },
    fontColor: { title: 'Font Color', type: 'string', widget: 'color', },
    backgroundColor: { title: 'Background', type: 'string', widget: 'color', },
}

const FontSelect = (props: PropPanelWidgetProps & { rootElement: HTMLDivElement }) => {
    const { rootElement, onChange, value, addons: { globalProps: { options } } } = props;
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } }
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font)

    const select = document.createElement('select');
    select.style.cssText = inputStyle;
    select.onmouseenter = () => select.style.border = '1px solid #1890ff';
    select.onmouseleave = () => select.style.border = '1px solid rgb(217, 217, 217)';
    select.onchange = (e: any) => onChange(e.target?.value || "");
    select.innerHTML = fontNames.map((label) =>
        `<option ${value || fallbackFontName === label ? 'selected' : ''} value="${label}">${label}</option>`
    ).join('');
    select.value = value || fallbackFontName;

    rootElement.appendChild(select);
}

const UseDynamicFontSize = (props: PropPanelWidgetProps & { rootElement: HTMLDivElement }) => {
    const { rootElement, onChange, addons } = props;
    const { globalProps: { changeSchemas, activeSchema } } = addons;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    // FIXME
    // @ts-ignore
    checkbox.checked = Boolean(activeSchema?.dynamicFontSize);
    checkbox.onchange = (e: any) => {
        const val = e.target.checked ? { min: 4, max: 72, fit: 'horizontal' } : undefined;
        onChange(e.target.checked);
        changeSchemas([{ key: 'dynamicFontSize', value: val, schemaId: activeSchema.id }]);
    };
    const label = document.createElement('label');
    label.innerText = 'Dynamic Font Size';
    label.style.cssText = 'display: flex; width: 100%;';
    label.appendChild(checkbox);
    rootElement.appendChild(label);
}

export const getPropPanel = (): PropPanel => ({
    schema: textSchema,
    widgets: { FontSelect, UseDynamicFontSize },
    defaultValue: 'Type Something...',
    defaultSchema: { // FIXME add type
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