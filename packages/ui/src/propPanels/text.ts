// FIXME IMPL
// - FontName
// - Horizontal Align
// - Vertical Align
// - FontSize(pt)
// - LineHeight(em)
// - CharacterSpacing(pt)
// - Use dynamic font size
//     - FontSize Min(pt)
//     - FontSize Max(pt)
//     - Fit
// - FontColor
// - Background

export const textSchema = {
    fontname: {
        title: 'Font Name',
        type: 'string',
        widget: 'select', // FIXME -  widgetを作成し、それを使う
        props: {
            options: [
                { label: 'Arial', value: 'Arial' },
                { label: 'Helvetica', value: 'Helvetica' },
                { label: 'Times New Roman', value: 'TimesNewRoman' }
            ]
        },
        span: 8,
    },
    horizontalAlign: {
        title: 'H-Align',
        className: 'pdfme-test',
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
    verticalAlign: {
        title: 'V-Align',
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
        span: 8
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
    useDynamicFontSize: {
        title: 'Use Dynamic Font Size',
        type: 'boolean',
        widget: 'checkbox',
        cellSpan: 2,
    },
    fontSizeMin: {
        title: 'Size Min',
        type: 'number',
        widget: 'inputNumber',
        span: 8,
    },
    fontSizeMax: {
        title: 'Size Max',
        type: 'number',
        widget: 'inputNumber',
        span: 8,
    },
    fit: {
        title: 'Fit',
        type: 'string',
        widget: 'select',
        props: {
            options: [
                { label: 'Fit1', value: 'Fit1' },
                { label: 'Fit2', value: 'Fit2' },
                { label: 'Fit3', value: 'Fit3' }
            ]
        },
        span: 8,
    }
}
export const textWidgets = []