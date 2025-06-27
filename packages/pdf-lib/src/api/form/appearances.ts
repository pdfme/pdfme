import { PDFOperator, PDFWidgetAnnotation } from '../../core';
import PDFFont from '../PDFFont';
import PDFButton from '../form/PDFButton';
import PDFCheckBox from '../form/PDFCheckBox';
import PDFDropdown from '../form/PDFDropdown';
import PDFField from '../form/PDFField';
import PDFOptionList from '../form/PDFOptionList';
import PDFRadioGroup from '../form/PDFRadioGroup';
import PDFSignature from '../form/PDFSignature';
import PDFTextField from '../form/PDFTextField';
import {
  drawCheckBox,
  rotateInPlace,
  drawRadioButton,
  drawButton,
  drawTextField,
  drawOptionList,
} from '../operations';
import {
  rgb,
  componentsToColor,
  setFillingColor,
  grayscale,
  cmyk,
  Color,
} from '../colors';
import { reduceRotation, adjustDimsForRotation } from '../rotations';
import {
  layoutMultilineText,
  layoutCombedText,
  TextPosition,
  layoutSinglelineText,
} from '../text/layout';
import { TextAlignment } from '../text/alignment';
import { setFontAndSize } from '../operators';
import { findLastMatch } from '../../utils';

/*********************** Appearance Provider Types ****************************/

type CheckBoxAppearanceProvider = (
  checkBox: PDFCheckBox,
  widget: PDFWidgetAnnotation,
) => AppearanceOrMapping<{
  on: PDFOperator[];
  off: PDFOperator[];
}>;

type RadioGroupAppearanceProvider = (
  radioGroup: PDFRadioGroup,
  widget: PDFWidgetAnnotation,
) => AppearanceOrMapping<{
  on: PDFOperator[];
  off: PDFOperator[];
}>;

type ButtonAppearanceProvider = (
  button: PDFButton,
  widget: PDFWidgetAnnotation,
  font: PDFFont,
) => AppearanceOrMapping<PDFOperator[]>;

type DropdownAppearanceProvider = (
  dropdown: PDFDropdown,
  widget: PDFWidgetAnnotation,
  font: PDFFont,
) => AppearanceOrMapping<PDFOperator[]>;

type OptionListAppearanceProvider = (
  optionList: PDFOptionList,
  widget: PDFWidgetAnnotation,
  font: PDFFont,
) => AppearanceOrMapping<PDFOperator[]>;

type TextFieldAppearanceProvider = (
  textField: PDFTextField,
  widget: PDFWidgetAnnotation,
  font: PDFFont,
) => AppearanceOrMapping<PDFOperator[]>;

type SignatureAppearanceProvider = (
  signature: PDFSignature,
  widget: PDFWidgetAnnotation,
  font: PDFFont,
) => AppearanceOrMapping<PDFOperator[]>;

/******************* Appearance Provider Utility Types ************************/

export type AppearanceMapping<T> = { normal: T; rollover?: T; down?: T };

type AppearanceOrMapping<T> = T | AppearanceMapping<T>;

// prettier-ignore
export type AppearanceProviderFor<T extends PDFField> = 
  T extends PDFCheckBox   ? CheckBoxAppearanceProvider
: T extends PDFRadioGroup ? RadioGroupAppearanceProvider
: T extends PDFButton     ? ButtonAppearanceProvider
: T extends PDFDropdown   ? DropdownAppearanceProvider
: T extends PDFOptionList ? OptionListAppearanceProvider
: T extends PDFTextField  ? TextFieldAppearanceProvider
: T extends PDFSignature  ? SignatureAppearanceProvider
: never;

/********************* Appearance Provider Functions **************************/

export const normalizeAppearance = <T extends Object>(
  appearance: T | AppearanceMapping<T>,
): AppearanceMapping<T> => {
  if ('normal' in appearance) return appearance;
  return { normal: appearance };
};

// Examples:
//   `/Helv 12 Tf` -> ['/Helv 12 Tf', 'Helv', '12']
//   `/HeBo 8.00 Tf` -> ['/HeBo 8 Tf', 'HeBo', '8.00']
const tfRegex = /\/([^\s]+)\s+(\d+(?:\.\d+)?)\s+Tf/;

const getDefaultFontSize = (field: {
  getDefaultAppearance(): string | undefined;
}) => {
  const da = field.getDefaultAppearance() ?? '';
  const daMatch = findLastMatch(da, tfRegex).match ?? [];
  const defaultFontSize = Number(daMatch[2]);
  return isFinite(defaultFontSize) ? defaultFontSize : undefined;
};

// Examples:
//   `0.3 g` -> ['0.3', 'g']
//   `0.3 1 .3 rg` -> ['0.3', '1', '.3', 'rg']
//   `0.3 1 .3 0 k` -> ['0.3', '1', '.3', '0', 'k']
const colorRegex = /(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)?\s*(\d+(?:\.\d+)?)?\s*(\d+(?:\.\d+)?)?\s+(g|rg|k)/;

const getDefaultColor = (field: {
  getDefaultAppearance(): string | undefined;
}) => {
  const da = field.getDefaultAppearance() ?? '';
  const daMatch = findLastMatch(da, colorRegex).match;

  const [, c1, c2, c3, c4, colorSpace] = daMatch ?? [];

  if (colorSpace === 'g' && c1) {
    return grayscale(Number(c1));
  }
  if (colorSpace === 'rg' && c1 && c2 && c3) {
    return rgb(Number(c1), Number(c2), Number(c3));
  }
  if (colorSpace === 'k' && c1 && c2 && c3 && c4) {
    return cmyk(Number(c1), Number(c2), Number(c3), Number(c4));
  }

  return undefined;
};

const updateDefaultAppearance = (
  field: { setDefaultAppearance(appearance: string): void },
  color: Color,
  font?: PDFFont,
  fontSize: number = 0,
) => {
  const da = [
    setFillingColor(color).toString(),
    setFontAndSize(font?.name ?? 'dummy__noop', fontSize).toString(),
  ].join('\n');
  field.setDefaultAppearance(da);
};

// Common helper for preparing text field widget appearance
const prepareTextFieldWidgetAppearance = <T extends { acroField: any }>(
  field: T,
  widget: PDFWidgetAnnotation,
) => {
  const widgetColor = getDefaultColor(widget);
  const fieldColor = getDefaultColor(field.acroField);
  const widgetFontSize = getDefaultFontSize(widget);
  const fieldFontSize = getDefaultFontSize(field.acroField);

  const rectangle = widget.getRectangle();
  const ap = widget.getAppearanceCharacteristics();
  const bs = widget.getBorderStyle();

  const borderWidth = bs?.getWidth() ?? 0;
  const rotation = reduceRotation(ap?.getRotation());
  const { width, height } = adjustDimsForRotation(rectangle, rotation);
  const rotate = rotateInPlace({ ...rectangle, rotation });

  const black = rgb(0, 0, 0);
  const borderColor = componentsToColor(ap?.getBorderColor());
  const normalBackgroundColor = componentsToColor(ap?.getBackgroundColor());
  const downBackgroundColor = componentsToColor(ap?.getBackgroundColor(), 0.8);

  const textColor = widgetColor ?? fieldColor ?? black;

  return {
    widgetColor,
    fieldColor,
    widgetFontSize,
    fieldFontSize,
    width,
    height,
    borderWidth,
    borderColor,
    textColor,
    rotate,
    normalBackgroundColor,
    downBackgroundColor,
    black,
  };
};

// Common helper to update text field appearance
const updateTextFieldAppearance = <T extends { acroField: any }>(
  field: T,
  widget: PDFWidgetAnnotation,
  appearance: ReturnType<typeof prepareTextFieldWidgetAppearance>,
  font: PDFFont,
  fontSize: number,
) => {
  if (appearance.widgetColor || appearance.widgetFontSize !== undefined) {
    updateDefaultAppearance(widget, appearance.textColor, font, fontSize);
  } else {
    updateDefaultAppearance(field.acroField, appearance.textColor, font, fontSize);
  }
};

// Common helper for preparing widget appearance settings
const prepareToggleWidgetAppearance = <T extends { acroField: any }>(
  field: T,
  widget: PDFWidgetAnnotation,
) => {
  const widgetColor = getDefaultColor(widget);
  const fieldColor = getDefaultColor(field.acroField);

  const rectangle = widget.getRectangle();
  const ap = widget.getAppearanceCharacteristics();
  const bs = widget.getBorderStyle();

  const borderWidth = bs?.getWidth() ?? 0;
  const rotation = reduceRotation(ap?.getRotation());
  const { width, height } = adjustDimsForRotation(rectangle, rotation);

  const rotate = rotateInPlace({ ...rectangle, rotation });

  const black = rgb(0, 0, 0);
  const borderColor = componentsToColor(ap?.getBorderColor()) ?? black;
  const normalBackgroundColor = componentsToColor(ap?.getBackgroundColor());
  const downBackgroundColor = componentsToColor(ap?.getBackgroundColor(), 0.8);

  const textColor = widgetColor ?? fieldColor ?? black;
  if (widgetColor) {
    updateDefaultAppearance(widget, textColor);
  } else {
    updateDefaultAppearance(field.acroField, textColor);
  }

  return {
    width,
    height,
    borderWidth,
    borderColor,
    textColor,
    rotate,
    normalBackgroundColor,
    downBackgroundColor,
  };
};

// Common helper for creating toggle appearance states
const createToggleAppearanceStates = <T extends Record<string, any>>(
  rotate: PDFOperator[],
  drawFunction: (options: T & { color: Color | undefined; filled: boolean }) => PDFOperator[],
  options: T,
  normalBackgroundColor: Color | undefined,
  downBackgroundColor: Color | undefined,
) => {
  return {
    normal: {
      on: [...rotate, ...drawFunction({ ...options, color: normalBackgroundColor, filled: true } as T & { color: Color | undefined; filled: boolean })],
      off: [...rotate, ...drawFunction({ ...options, color: normalBackgroundColor, filled: false } as T & { color: Color | undefined; filled: boolean })],
    },
    down: {
      on: [...rotate, ...drawFunction({ ...options, color: downBackgroundColor, filled: true } as T & { color: Color | undefined; filled: boolean })],
      off: [...rotate, ...drawFunction({ ...options, color: downBackgroundColor, filled: false } as T & { color: Color | undefined; filled: boolean })],
    },
  };
};

export const defaultCheckBoxAppearanceProvider: AppearanceProviderFor<
  PDFCheckBox
> = (checkBox, widget) => {
  const appearance = prepareToggleWidgetAppearance(checkBox, widget);
  
  const options = {
    x: 0 + appearance.borderWidth / 2,
    y: 0 + appearance.borderWidth / 2,
    width: appearance.width - appearance.borderWidth,
    height: appearance.height - appearance.borderWidth,
    thickness: 1.5,
    borderWidth: appearance.borderWidth,
    borderColor: appearance.borderColor,
    markColor: appearance.textColor,
  };

  return createToggleAppearanceStates(
    appearance.rotate,
    drawCheckBox,
    options,
    appearance.normalBackgroundColor,
    appearance.downBackgroundColor,
  );
};

export const defaultRadioGroupAppearanceProvider: AppearanceProviderFor<
  PDFRadioGroup
> = (radioGroup, widget) => {
  const appearance = prepareToggleWidgetAppearance(radioGroup, widget);
  
  const options = {
    x: appearance.width / 2,
    y: appearance.height / 2,
    width: appearance.width - appearance.borderWidth,
    height: appearance.height - appearance.borderWidth,
    borderWidth: appearance.borderWidth,
    borderColor: appearance.borderColor,
    dotColor: appearance.textColor,
  };

  return createToggleAppearanceStates(
    appearance.rotate,
    drawRadioButton,
    options,
    appearance.normalBackgroundColor,
    appearance.downBackgroundColor,
  );
};

export const defaultButtonAppearanceProvider: AppearanceProviderFor<
  PDFButton
> = (button, widget, font) => {
  const appearance = prepareTextFieldWidgetAppearance(button, widget);
  const ap = widget.getAppearanceCharacteristics();
  const captions = ap?.getCaptions();
  const normalText = captions?.normal ?? '';
  const downText = captions?.down ?? normalText ?? '';

  const bounds = {
    x: appearance.borderWidth,
    y: appearance.borderWidth,
    width: appearance.width - appearance.borderWidth * 2,
    height: appearance.height - appearance.borderWidth * 2,
  };
  const normalLayout = layoutSinglelineText(normalText, {
    alignment: TextAlignment.Center,
    fontSize: appearance.widgetFontSize ?? appearance.fieldFontSize,
    font,
    bounds,
  });
  const downLayout = layoutSinglelineText(downText, {
    alignment: TextAlignment.Center,
    fontSize: appearance.widgetFontSize ?? appearance.fieldFontSize,
    font,
    bounds,
  });

  const fontSize = Math.min(normalLayout.fontSize, downLayout.fontSize);
  updateTextFieldAppearance(button, widget, appearance, font, fontSize);

  const options = {
    x: 0 + appearance.borderWidth / 2,
    y: 0 + appearance.borderWidth / 2,
    width: appearance.width - appearance.borderWidth,
    height: appearance.height - appearance.borderWidth,
    borderWidth: appearance.borderWidth,
    borderColor: appearance.borderColor,
    textColor: appearance.textColor,
    font: font.name,
    fontSize,
  };

  return {
    normal: [
      ...appearance.rotate,
      ...drawButton({
        ...options,
        color: appearance.normalBackgroundColor,
        textLines: [normalLayout.line],
      }),
    ],
    down: [
      ...appearance.rotate,
      ...drawButton({
        ...options,
        color: appearance.downBackgroundColor,
        textLines: [downLayout.line],
      }),
    ],
  };
};

export const defaultTextFieldAppearanceProvider: AppearanceProviderFor<
  PDFTextField
> = (textField, widget, font) => {
  const appearance = prepareTextFieldWidgetAppearance(textField, widget);
  const text = textField.getText() ?? '';

  let textLines: TextPosition[];
  let fontSize: number;

  const padding = textField.isCombed() ? 0 : 1;
  const bounds = {
    x: appearance.borderWidth + padding,
    y: appearance.borderWidth + padding,
    width: appearance.width - (appearance.borderWidth + padding) * 2,
    height: appearance.height - (appearance.borderWidth + padding) * 2,
  };
  if (textField.isMultiline()) {
    const layout = layoutMultilineText(text, {
      alignment: textField.getAlignment(),
      fontSize: appearance.widgetFontSize ?? appearance.fieldFontSize,
      font,
      bounds,
    });
    textLines = layout.lines;
    fontSize = layout.fontSize;
  } else if (textField.isCombed()) {
    const layout = layoutCombedText(text, {
      fontSize: appearance.widgetFontSize ?? appearance.fieldFontSize,
      font,
      bounds,
      cellCount: textField.getMaxLength() ?? 0,
    });
    textLines = layout.cells;
    fontSize = layout.fontSize;
  } else {
    const layout = layoutSinglelineText(text, {
      alignment: textField.getAlignment(),
      fontSize: appearance.widgetFontSize ?? appearance.fieldFontSize,
      font,
      bounds,
    });
    textLines = [layout.line];
    fontSize = layout.fontSize;
  }

  updateTextFieldAppearance(textField, widget, appearance, font, fontSize);

  const options = {
    x: 0 + appearance.borderWidth / 2,
    y: 0 + appearance.borderWidth / 2,
    width: appearance.width - appearance.borderWidth,
    height: appearance.height - appearance.borderWidth,
    borderWidth: appearance.borderWidth ?? 0,
    borderColor: appearance.borderColor,
    textColor: appearance.textColor,
    font: font.name,
    fontSize,
    color: appearance.normalBackgroundColor,
    textLines,
    padding,
  };

  return [...appearance.rotate, ...drawTextField(options)];
};

export const defaultDropdownAppearanceProvider: AppearanceProviderFor<
  PDFDropdown
> = (dropdown, widget, font) => {
  const appearance = prepareTextFieldWidgetAppearance(dropdown, widget);
  const text = dropdown.getSelected()[0] ?? '';

  const padding = 1;
  const bounds = {
    x: appearance.borderWidth + padding,
    y: appearance.borderWidth + padding,
    width: appearance.width - (appearance.borderWidth + padding) * 2,
    height: appearance.height - (appearance.borderWidth + padding) * 2,
  };
  const { line, fontSize } = layoutSinglelineText(text, {
    alignment: TextAlignment.Left,
    fontSize: appearance.widgetFontSize ?? appearance.fieldFontSize,
    font,
    bounds,
  });

  updateTextFieldAppearance(dropdown, widget, appearance, font, fontSize);

  const options = {
    x: 0 + appearance.borderWidth / 2,
    y: 0 + appearance.borderWidth / 2,
    width: appearance.width - appearance.borderWidth,
    height: appearance.height - appearance.borderWidth,
    borderWidth: appearance.borderWidth ?? 0,
    borderColor: appearance.borderColor,
    textColor: appearance.textColor,
    font: font.name,
    fontSize,
    color: appearance.normalBackgroundColor,
    textLines: [line],
    padding,
  };

  return [...appearance.rotate, ...drawTextField(options)];
};

export const defaultOptionListAppearanceProvider: AppearanceProviderFor<
  PDFOptionList
> = (optionList, widget, font) => {
  // The `/DA` entry can be at the widget or field level - so we handle both
  const widgetColor = getDefaultColor(widget);
  const fieldColor = getDefaultColor(optionList.acroField);
  const widgetFontSize = getDefaultFontSize(widget);
  const fieldFontSize = getDefaultFontSize(optionList.acroField);

  const rectangle = widget.getRectangle();
  const ap = widget.getAppearanceCharacteristics();
  const bs = widget.getBorderStyle();

  const borderWidth = bs?.getWidth() ?? 0;
  const rotation = reduceRotation(ap?.getRotation());
  const { width, height } = adjustDimsForRotation(rectangle, rotation);

  const rotate = rotateInPlace({ ...rectangle, rotation });

  const black = rgb(0, 0, 0);

  const borderColor = componentsToColor(ap?.getBorderColor());
  const normalBackgroundColor = componentsToColor(ap?.getBackgroundColor());

  const options = optionList.getOptions();
  const selected = optionList.getSelected();

  if (optionList.isSorted()) options.sort();

  let text = '';
  for (let idx = 0, len = options.length; idx < len; idx++) {
    text += options[idx];
    if (idx < len - 1) text += '\n';
  }

  const padding = 1;
  const bounds = {
    x: borderWidth + padding,
    y: borderWidth + padding,
    width: width - (borderWidth + padding) * 2,
    height: height - (borderWidth + padding) * 2,
  };
  const { lines, fontSize, lineHeight } = layoutMultilineText(text, {
    alignment: TextAlignment.Left,
    fontSize: widgetFontSize ?? fieldFontSize,
    font,
    bounds,
  });

  const selectedLines: number[] = [];
  for (let idx = 0, len = lines.length; idx < len; idx++) {
    const line = lines[idx];
    if (selected.includes(line.text)) selectedLines.push(idx);
  }

  const blue = rgb(153 / 255, 193 / 255, 218 / 255);

  // Update font size and color
  const textColor = widgetColor ?? fieldColor ?? black;
  if (widgetColor || widgetFontSize !== undefined) {
    updateDefaultAppearance(widget, textColor, font, fontSize);
  } else {
    updateDefaultAppearance(optionList.acroField, textColor, font, fontSize);
  }

  return [
    ...rotate,
    ...drawOptionList({
      x: 0 + borderWidth / 2,
      y: 0 + borderWidth / 2,
      width: width - borderWidth,
      height: height - borderWidth,
      borderWidth: borderWidth ?? 0,
      borderColor,
      textColor,
      font: font.name,
      fontSize,
      color: normalBackgroundColor,
      textLines: lines,
      lineHeight,
      selectedColor: blue,
      selectedLines,
      padding,
    }),
  ];
};
