import type { PropPanelWidgetProps } from '@pdfme/common';
import type { StyledQrCodeSchema, GradientColorStop } from '../../types.js';
import { getNestedValue } from '../utils.js';
import {
  DEFAULT_GRADIENT_START_OFFSET,
  DEFAULT_GRADIENT_END_OFFSET,
  DEFAULT_NEW_COLOR_STOP_OFFSET,
  GRADIENT_SLIDER_HEIGHT,
  COLOR_SWATCH_SIZE,
  TRIANGLE_BORDER_SIZE,
  TRIANGLE_HEIGHT,
  DELETE_BUTTON_SIZE,
} from '../../constants.js';

export const createGradientSliderWidget = (parentPath: string) => {
  return (props: PropPanelWidgetProps) => {
    const { rootElement, changeSchemas, activeSchema, options } = props;
    const schema = activeSchema as StyledQrCodeSchema;

    rootElement.style.width = '100%';

    const parentObj = getNestedValue(schema, parentPath.split('.')) || {};
    const gradient = parentObj?.gradient as
      | { colorStops?: GradientColorStop[]; type?: string; rotation?: number }
      | undefined;

    if (!gradient || gradient.type === 'none') {
      return; // Don't render if no gradient
    }

    const currentColorStops: GradientColorStop[] = gradient.colorStops || [
      { offset: DEFAULT_GRADIENT_START_OFFSET, color: '#1890ff' },
      { offset: DEFAULT_GRADIENT_END_OFFSET, color: '#000000' },
    ];

    const updateColorStops = (newColorStops: GradientColorStop[]) => {
      const currentParentObj = getNestedValue(schema, parentPath.split('.')) || {};
      const updatedParent = {
        ...currentParentObj,
        gradient: {
          ...gradient,
          colorStops: newColorStops,
        },
      };
      changeSchemas([{ key: parentPath, value: updatedParent, schemaId: activeSchema.id }]);
    };

    const updateRotation = (rotation: number) => {
      const currentParentObj = getNestedValue(schema, parentPath.split('.')) || {};
      const updatedParent = {
        ...currentParentObj,
        gradient: {
          ...gradient,
          rotation,
        },
      };
      changeSchemas([{ key: parentPath, value: updatedParent, schemaId: activeSchema.id }]);
    };

    const addColorStop = () => {
      const defaultOffset =
        currentColorStops.length > 0
          ? Math.min(
              1,
              Math.max(0, Number(currentColorStops[currentColorStops.length - 1].offset) + DEFAULT_NEW_COLOR_STOP_OFFSET),
            )
          : 0.5;
      const newStopColor =
        currentColorStops.length > 0
          ? currentColorStops[currentColorStops.length - 1].color
          : '#1890ff';
      const newColorStops = [...currentColorStops, { offset: defaultOffset, color: newStopColor }];
      updateColorStops(newColorStops);
    };

    // Main container
    const mainContainer = document.createElement('div');
    mainContainer.style.display = 'flex';
    mainContainer.style.gap = '8px';
    mainContainer.style.width = '100%';
    mainContainer.style.marginTop = '8px';
    mainContainer.style.alignItems = 'flex-end';

    // Slider container (takes remaining space after fixed-width controls)
    const sliderContainer = document.createElement('div');
    sliderContainer.style.flex = '1';
    sliderContainer.style.minWidth = '0';
    sliderContainer.style.position = 'relative';
    sliderContainer.style.paddingTop = '5px';
    sliderContainer.style.marginRight = '10px';

    // Gradient bar
    const gradientBar = document.createElement('div');
    gradientBar.style.width = '100%';
    gradientBar.style.height = `${GRADIENT_SLIDER_HEIGHT}px`;
    gradientBar.style.borderRadius = '4px';
    gradientBar.style.border = '1px solid #ccc';
    gradientBar.style.position = 'relative';
    gradientBar.style.cursor = 'pointer';

    const updateGradientBarBackground = () => {
      const sortedStops = [...currentColorStops].sort((a, b) => a.offset - b.offset);
      const gradientString = sortedStops
        .map((stop) => `${stop.color} ${stop.offset * 100}%`)
        .join(', ');
      gradientBar.style.background = `linear-gradient(to right, ${gradientString})`;
    };

    updateGradientBarBackground();

    // Handles container
    const handlesContainer = document.createElement('div');
    handlesContainer.style.position = 'absolute';
    handlesContainer.style.top = '0';
    handlesContainer.style.left = '0';
    handlesContainer.style.width = '100%';
    handlesContainer.style.height = '100%';

    const renderHandles = () => {
      handlesContainer.innerHTML = '';

      currentColorStops.forEach((stop, index) => {
        const handleWrapper = document.createElement('div');
        handleWrapper.style.position = 'absolute';
        handleWrapper.style.left = `${stop.offset * 100}%`;
        handleWrapper.style.top = '-5px';
        handleWrapper.style.transform = 'translateX(-50%)';
        handleWrapper.style.cursor = 'grab';
        handleWrapper.style.display = 'flex';
        handleWrapper.style.flexDirection = 'column';
        handleWrapper.style.alignItems = 'center';

        // Triangle handle (20% larger)
        const triangle = document.createElement('div');
        triangle.style.width = '0';
        triangle.style.height = '0';
        triangle.style.borderLeft = `${TRIANGLE_BORDER_SIZE}px solid transparent`;
        triangle.style.borderRight = `${TRIANGLE_BORDER_SIZE}px solid transparent`;
        triangle.style.borderTop = `${TRIANGLE_HEIGHT}px solid #666`;
        
        // Accessibility attributes
        triangle.setAttribute('role', 'slider');
        triangle.setAttribute('aria-label', `Color stop at ${(stop.offset * 100).toFixed(0)}%`);
        triangle.setAttribute('aria-valuemin', '0');
        triangle.setAttribute('aria-valuemax', '100');
        triangle.setAttribute('aria-valuenow', String(Math.round(stop.offset * 100)));
        triangle.setAttribute('tabindex', '0');

        // Color swatch
        const swatch = document.createElement('div');
        swatch.style.width = `${COLOR_SWATCH_SIZE}px`;
        swatch.style.height = `${COLOR_SWATCH_SIZE}px`;
        swatch.style.backgroundColor = stop.color;
        swatch.style.border = '2px solid white';
        swatch.style.boxShadow = '0 0 3px rgba(0,0,0,0.3)';
        swatch.style.borderRadius = '50%';
        swatch.style.marginTop = '2px';
        swatch.style.cursor = 'pointer';
        swatch.style.position = 'relative';
        swatch.setAttribute('role', 'button');
        swatch.setAttribute('aria-label', `Change color for stop at ${(stop.offset * 100).toFixed(0)}%`);

        // Delete button (only show if more than 2 color stops)
        if (currentColorStops.length > 2) {
          const deleteBtn = document.createElement('div');
          deleteBtn.textContent = '×';
          deleteBtn.style.position = 'absolute';
          deleteBtn.style.top = '-6px';
          deleteBtn.style.right = '-6px';
          deleteBtn.style.width = `${DELETE_BUTTON_SIZE}px`;
          deleteBtn.style.height = `${DELETE_BUTTON_SIZE}px`;
          deleteBtn.style.borderRadius = '50%';
          deleteBtn.style.backgroundColor = '#ff4d4f';
          deleteBtn.style.color = 'white';
          deleteBtn.style.fontSize = '12px';
          deleteBtn.style.fontWeight = 'bold';
          deleteBtn.style.display = 'flex';
          deleteBtn.style.alignItems = 'center';
          deleteBtn.style.justifyContent = 'center';
          deleteBtn.style.cursor = 'pointer';
          deleteBtn.style.lineHeight = '1';
          deleteBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
          deleteBtn.title = 'Remove color stop';
          deleteBtn.setAttribute('role', 'button');
          deleteBtn.setAttribute('aria-label', 'Remove this color stop');

          deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.backgroundColor = '#ff7875';
          });

          deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.backgroundColor = '#ff4d4f';
          });

          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // Remove this color stop
            currentColorStops.splice(index, 1);
            updateColorStops([...currentColorStops]);
            renderHandles();
          });

          swatch.appendChild(deleteBtn);
        }

        handleWrapper.appendChild(triangle);
        handleWrapper.appendChild(swatch);

        // Hidden color picker
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = stop.color;
        colorPicker.style.position = 'absolute';
        colorPicker.style.opacity = '0';
        colorPicker.style.width = '1px';
        colorPicker.style.height = '1px';
        colorPicker.style.top = '0';
        colorPicker.style.left = '0';
        colorPicker.style.border = 'none';
        colorPicker.style.padding = '0';

        // Debounced color update
        let colorUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

        colorPicker.addEventListener('input', (event) => {
          const newColor = (event.target as HTMLInputElement).value;
          currentColorStops[index].color = newColor;
          swatch.style.backgroundColor = newColor;
          updateGradientBarBackground();

          // Debounce schema updates
          if (colorUpdateTimeout) clearTimeout(colorUpdateTimeout);
          colorUpdateTimeout = setTimeout(() => {
            updateColorStops([...currentColorStops]);
          }, 300);
        });

        colorPicker.addEventListener('change', () => {
          // Final update when color picker closes
          if (colorUpdateTimeout) {
            clearTimeout(colorUpdateTimeout);
            colorUpdateTimeout = null;
          }
          updateColorStops([...currentColorStops]);
        });

        handleWrapper.appendChild(colorPicker);

        // Drag functionality with proper cleanup
        let isDragging = false;
        let hasDragged = false;

        const handleMouseMove = (e: MouseEvent) => {
          if (isDragging) {
            hasDragged = true;
            const barRect = gradientBar.getBoundingClientRect();
            const newOffset = Math.max(0, Math.min(1, (e.clientX - barRect.left) / barRect.width));
            currentColorStops[index].offset = newOffset;
            handleWrapper.style.left = `${newOffset * 100}%`;
            triangle.setAttribute('aria-valuenow', String(Math.round(newOffset * 100)));
            updateGradientBarBackground();
          }
        };

        const handleMouseUp = () => {
          if (isDragging) {
            isDragging = false;
            handleWrapper.style.cursor = 'grab';
            if (hasDragged) {
              // Sort color stops by offset to maintain proper order
              currentColorStops.sort((a, b) => a.offset - b.offset);
              updateColorStops([...currentColorStops]);
              // Re-render handles to reflect the new sorted order
              renderHandles();
            }
            // Clean up event listeners to prevent memory leaks
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          }
        };

        triangle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          isDragging = true;
          hasDragged = false;
          handleWrapper.style.cursor = 'grabbing';
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        });

        // Keyboard navigation for accessibility
        triangle.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const delta = (e.shiftKey ? 0.1 : 0.01) * (e.key === 'ArrowLeft' ? -1 : 1);
            const newOffset = Math.max(0, Math.min(1, stop.offset + delta));
            currentColorStops[index].offset = newOffset;
            handleWrapper.style.left = `${newOffset * 100}%`;
            triangle.setAttribute('aria-valuenow', String(Math.round(newOffset * 100)));
            updateGradientBarBackground();
            updateColorStops([...currentColorStops]);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            colorPicker.click();
          }
        });

        // Color picker trigger - only on swatch click
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          colorPicker.click();
        });

        handlesContainer.appendChild(handleWrapper);
      });
    };

    renderHandles();

    sliderContainer.appendChild(gradientBar);
    sliderContainer.appendChild(handlesContainer);

    // Add Color button (fixed width)
    const addButtonContainer = document.createElement('div');
    addButtonContainer.style.flexShrink = '0';
    addButtonContainer.style.display = 'flex';
    addButtonContainer.style.alignItems = 'flex-start';

    const addButton = document.createElement('button');
    addButton.textContent = '+ Color';
    const buttonPrimaryColor = (options?.theme?.token?.colorPrimary as string) || '#1890ff';
    addButton.style.width = '80px';
    addButton.style.padding = '4px';
    addButton.style.backgroundColor = buttonPrimaryColor;
    addButton.style.color = 'white';
    addButton.style.border = 'none';
    addButton.style.borderRadius = '4px';
    addButton.style.cursor = 'pointer';
    addButton.style.whiteSpace = 'nowrap';
    addButton.style.fontSize = '14px';
    addButton.setAttribute('aria-label', 'Add a new color stop to gradient');

    addButton.addEventListener('click', () => {
      addColorStop();
      setTimeout(renderHandles, 0);
    });

    addButtonContainer.appendChild(addButton);

    // Rotation container (fixed width)
    const rotationContainer = document.createElement('div');
    rotationContainer.style.flexShrink = '0';
    rotationContainer.style.width = '90px';
    rotationContainer.style.display = 'flex';
    rotationContainer.style.flexDirection = 'column';
    rotationContainer.style.gap = '4px';

    const rotationLabel = document.createElement('label');
    rotationLabel.textContent = 'Rotation';
    rotationLabel.style.fontSize = '12px';
    rotationLabel.style.color = '#666';

    const rotationInput = document.createElement('input');
    rotationInput.type = 'number';
    rotationInput.value = String(gradient?.rotation || 0);
    rotationInput.step = '1';
    rotationInput.placeholder = '0';
    rotationInput.style.width = '100%';
    rotationInput.style.padding = '4px 11px';
    rotationInput.style.border = '1px solid #ccc';
    rotationInput.style.borderRadius = '4px';
    rotationInput.style.fontSize = '14px';
    rotationInput.setAttribute('aria-label', 'Gradient rotation in degrees');

    rotationInput.addEventListener('change', () => {
      updateRotation(parseFloat(rotationInput.value) || 0);
    });

    rotationContainer.appendChild(rotationLabel);
    rotationContainer.appendChild(rotationInput);

    mainContainer.appendChild(sliderContainer);
    mainContainer.appendChild(addButtonContainer);
    mainContainer.appendChild(rotationContainer);

    rootElement.appendChild(mainContainer);
  };
};

