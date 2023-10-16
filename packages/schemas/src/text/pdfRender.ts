import {
    Font,
    VERTICAL_ALIGN_TOP,
    VERTICAL_ALIGN_MIDDLE,
    VERTICAL_ALIGN_BOTTOM,
    calculateDynamicFontSize,
    heightOfFontAtSize,
    getFontDescentInPt,
    getFontKitFont,
    getSplittedLines,
    widthOfTextAtSize,
    FontWidthCalcValues,
    getDefaultFont,
    getFallbackFontName,
} from '@pdfme/common';
import type { PDFRenderProps } from "../types"
import type { TextSchema } from './types';
import { embedAndGetFontObj } from '../pdfUtils'
import {
    hex2RgbColor,
    calcX,
    calcY,
    renderBackgroundColor,
    convertSchemaDimensionsToPt
} from '../renderUtils'

const getFontProp = async ({ value, font, schema }: { value: string, font: Font, schema: TextSchema }) => {
    const fontSize = schema.dynamicFontSize ? await calculateDynamicFontSize({ textSchema: schema, font, value }) : schema.fontSize;
    const color = hex2RgbColor(schema.fontColor);
    return { ...schema, fontSize, color, };
};

export const pdfRender = async (arg: PDFRenderProps<TextSchema>) => {
    const { value, pdfDoc, pdfLib, page, options, schema } = arg;


    const { font = getDefaultFont() } = options;

    const [pdfFontObj, fontKitFont, fontProp] = await Promise.all([
        embedAndGetFontObj({ pdfDoc, font }),
        getFontKitFont(schema, font),
        getFontProp({ value, font, schema })
    ])

    const { fontSize, color, alignment, verticalAlignment, lineHeight, characterSpacing } = fontProp;

    const fontName = (schema.fontName ? schema.fontName : getFallbackFontName(font)) as keyof typeof pdfFontObj;
    const pdfFontValue = pdfFontObj[fontName];

    const pageHeight = page.getHeight();
    renderBackgroundColor({ schema, page, pageHeight });

    const { width, height, rotate } = convertSchemaDimensionsToPt(schema);

    page.pushOperators(pdfLib.setCharacterSpacing(characterSpacing));

    const firstLineTextHeight = heightOfFontAtSize(fontKitFont, fontSize);
    const descent = getFontDescentInPt(fontKitFont, fontSize);
    const halfLineHeightAdjustment = lineHeight === 0 ? 0 : ((lineHeight - 1) * fontSize) / 2;

    const fontWidthCalcValues: FontWidthCalcValues = {
        font: fontKitFont,
        fontSize,
        characterSpacing,
        boxWidthInPt: width,
    };

    let lines: string[] = [];
    value.split(/\r|\n|\r\n/g).forEach((line) => {
        lines = lines.concat(getSplittedLines(line, fontWidthCalcValues));
    });

    // Text lines are rendered from the bottom upwards, we need to adjust the position down
    let yOffset = 0;
    if (verticalAlignment === VERTICAL_ALIGN_TOP) {
        yOffset = firstLineTextHeight + halfLineHeightAdjustment;
    } else {
        const otherLinesHeight = lineHeight * fontSize * (lines.length - 1);

        if (verticalAlignment === VERTICAL_ALIGN_BOTTOM) {
            yOffset = height - otherLinesHeight + descent - halfLineHeightAdjustment;
        } else if (verticalAlignment === VERTICAL_ALIGN_MIDDLE) {
            yOffset = (height - otherLinesHeight - firstLineTextHeight + descent) / 2 + firstLineTextHeight;
        }
    }

    lines.forEach((line, rowIndex) => {
        const textWidth = widthOfTextAtSize(line, fontKitFont, fontSize, characterSpacing);
        const rowYOffset = lineHeight * fontSize * rowIndex;

        page.drawText(line, {
            x: calcX(schema.position.x, alignment, width, textWidth),
            y: calcY(schema.position.y, pageHeight, yOffset) - rowYOffset,
            rotate,
            size: fontSize,
            color,
            lineHeight: lineHeight * fontSize,
            maxWidth: width,
            font: pdfFontValue,
            wordBreaks: [''],
        });
    });
};
