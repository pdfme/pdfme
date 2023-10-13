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

const textSchema: Record<string, PropPanelSchema> = {
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

// const DynamicFontSize: React.FC<PropPanelWidgetProps> = ({ addons }) => {
//     const value = addons.getValueByPath('dynamicFontSize') as { min: number, max: number, fit: 'horizontal' | 'vertical' } | undefined

//     const { globalProps: { activeSchema, changeSchemas } } = addons

//     const onChangeCheck = (e: CheckboxChangeEvent) => {
//         const checked = e.target.checked
//         const value = checked ? { min: 8, max: 36, fit: 'horizontal' } : undefined
//         changeSchemas([{ key: 'dynamicFontSize', value, schemaId: activeSchema.id, }]);
//     }

//     const onChangeSize = (type: 'min' | 'max', value: number) => {
//         changeSchemas([{ key: `dynamicFontSize.${type}`, value, schemaId: activeSchema.id }]);
//     }
//     const onChangeFit = (value: 'horizontal' | 'vertical') => {
//         changeSchemas([{ key: `dynamicFontSize.fit`, value, schemaId: activeSchema.id }]);
//     }

//     return <Row>
//         <Col span={24}>
//             <Form.Item>
//                 <Checkbox checked={Boolean(value)} onChange={onChangeCheck}> Dynamic Font Size</Checkbox>
//             </Form.Item>
//         </Col>
//         {Boolean(value) && <>
//             <Col span={8}>
//                 <Form.Item label="Min">
//                     <InputNumber
//                         value={value?.min}
//                         onChange={(value: number | null) => value && onChangeSize('min', value)} />
//                 </Form.Item>
//             </Col>
//             <Col span={8}>
//                 <Form.Item label="Max">
//                     <InputNumber
//                         value={value?.max}
//                         onChange={(value: number | null) => value && onChangeSize('max', value)} />
//                 </Form.Item>
//             </Col>
//             <Col span={8}>
//                 <Form.Item label="Fit">
//                     <Select
//                         value={value?.fit}
//                         onChange={onChangeFit}
//                         options={[{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }]}
//                     />
//                 </Form.Item>
//             </Col>
//         </>}
//     </Row>
// }

const FontSelect = (props: PropPanelWidgetProps & { rootElement: HTMLDivElement }) => {
    const { rootElement, onChange, value, addons: { globalProps: { options } } } = props;
    const font = options.font || { [DEFAULT_FONT_NAME]: { data: '', fallback: true } }
    const fontNames = Object.keys(font);
    const fallbackFontName = getFallbackFontName(font)

    const select = document.createElement('select');
    select.style.cssText = `
    -webkit-font-smoothing: antialiased;
    --ant-display: flex;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
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
    select.onmouseenter = () => select.style.border = '1px solid #1890ff';
    select.onmouseleave = () => select.style.border = '1px solid rgb(217, 217, 217)';
    select.onchange = (e: any) => onChange(e.target?.value || "");
    select.innerHTML = fontNames.map((label) =>
        `<option ${value || fallbackFontName === label ? 'selected' : ''} value="${label}">${label}</option>`
    ).join('');
    select.value = value || fallbackFontName;

    rootElement.appendChild(select);
}

const DynamicFontSize = (props: PropPanelWidgetProps & { rootElement: HTMLDivElement }) => {
    // FIXME ここから DynamicFontSize を実装する
    console.log('DynamicFontSize', props);
}


export const getPropPanel = (): PropPanel => ({
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