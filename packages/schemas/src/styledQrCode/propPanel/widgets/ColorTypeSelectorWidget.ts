import type { PropPanelWidgetProps } from '@pdfme/common';
import type { StyledQrCodeSchema, GradientColorStop } from '../../types.js';
import { getNestedValue } from '../utils.js';
import {
  DEFAULT_GRADIENT_START_OFFSET,
  DEFAULT_GRADIENT_END_OFFSET,
} from '../../constants.js';

export const createColorTypeSelectorWidget = (parentPath: string, defaultColor: string) => {
  return (props: PropPanelWidgetProps) => {
    const { rootElement, changeSchemas, activeSchema, options } = props;
    const schema = activeSchema as StyledQrCodeSchema;

    rootElement.style.width = '100%';

    const parentObj = getNestedValue(schema, parentPath.split('.')) || {};
    const gradient = parentObj?.gradient as
      | { colorStops?: GradientColorStop[]; type?: string; rotation?: number }
      | undefined;

    const isBackground = parentPath === 'backgroundOptions';
    const isTransparent =
      isBackground && (parentObj?.color === null || parentObj?.color === undefined);
    const currentColorType = isTransparent
      ? 'transparent'
      : gradient?.type && gradient.type !== 'none'
        ? gradient.type
        : 'solid';
    const currentColor = isTransparent ? null : (parentObj?.color as string) || defaultColor;

    // Track locally to avoid re-renders
    let localColorType = currentColorType;

    const updateToColorType = (colorType: 'solid' | 'linear' | 'radial' | 'transparent') => {
      localColorType = colorType;
      const currentParentObj = getNestedValue(schema, parentPath.split('.')) || {};

      if (colorType === 'transparent') {
        // Set color to null for transparent
        const updatedParent = {
          ...currentParentObj,
          color: null,
          gradient: undefined,
        };
        changeSchemas([{ key: parentPath, value: updatedParent, schemaId: activeSchema.id }]);
      } else if (colorType === 'solid') {
        // Set solid color, remove gradient
        const updatedParent = {
          ...currentParentObj,
          color: currentColor || defaultColor,
          gradient: undefined,
        };
        changeSchemas([{ key: parentPath, value: updatedParent, schemaId: activeSchema.id }]);
      } else {
        // Set gradient type
        const themePrimaryColor = (options?.theme?.token?.colorPrimary as string) || '#1890ff';
        const defaultGradientStops: GradientColorStop[] = [
          { offset: DEFAULT_GRADIENT_START_OFFSET, color: themePrimaryColor },
          { offset: DEFAULT_GRADIENT_END_OFFSET, color: '#000000' },
        ];
        const updatedParent = {
          ...currentParentObj,
          gradient: {
            type: colorType,
            colorStops: defaultGradientStops,
            rotation: 0,
          },
        };
        changeSchemas([{ key: parentPath, value: updatedParent, schemaId: activeSchema.id }]);
      }
    };

    const updateSolidColor = (color: string) => {
      const currentParentObj = getNestedValue(schema, parentPath.split('.')) || {};
      const updatedParent = {
        ...currentParentObj,
        color,
      };
      changeSchemas([{ key: parentPath, value: updatedParent, schemaId: activeSchema.id }]);
    };

    // Container
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.alignItems = 'center';

    // Dropdown
    const colorTypeSelect = document.createElement('select');
    colorTypeSelect.style.flex = '1';
    colorTypeSelect.style.minWidth = '80px';
    colorTypeSelect.style.padding = '6.25px 11px';
    colorTypeSelect.style.border = '1px solid #ccc';
    colorTypeSelect.style.borderRadius = '4px';

    const colorTypeOptions = isBackground
      ? ['Transparent', 'Solid', 'Linear Gradient', 'Radial Gradient']
      : ['Solid', 'Linear Gradient', 'Radial Gradient'];

    colorTypeOptions.forEach((label) => {
      const option = document.createElement('option');
      if (label === 'Transparent') {
        option.value = 'transparent';
      } else if (label === 'Solid') {
        option.value = 'solid';
      } else if (label === 'Linear Gradient') {
        option.value = 'linear';
      } else {
        option.value = 'radial';
      }
      option.textContent = label;
      if (option.value === currentColorType) {
        option.selected = true;
      }
      colorTypeSelect.appendChild(option);
    });

    colorTypeSelect.addEventListener('change', (e) => {
      const newType = (e.target as HTMLSelectElement).value as
        | 'solid'
        | 'linear'
        | 'radial'
        | 'transparent';
      updateToColorType(newType);
    });

    // Solid color picker
    const solidColorInput = document.createElement('input');
    solidColorInput.type = 'color';
    solidColorInput.value = currentColor || defaultColor;
    solidColorInput.style.minWidth = '80px';
    solidColorInput.style.height = '34px';
    solidColorInput.style.border = '1px solid #ccc';
    solidColorInput.style.borderRadius = '4px';
    solidColorInput.style.cursor = 'pointer';
    solidColorInput.style.padding = '2px';
    solidColorInput.style.display = localColorType === 'solid' ? 'block' : 'none';

    solidColorInput.addEventListener('input', (e) => {
      const newColor = (e.target as HTMLInputElement).value;
      updateSolidColor(newColor);
    });

    container.appendChild(colorTypeSelect);
    container.appendChild(solidColorInput);
    rootElement.appendChild(container);
  };
};

