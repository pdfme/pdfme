import type { PropPanelWidgetProps } from '@pdfme/common';
import type { StyledQrCodeSchema } from '../../types.js';
import { readFile } from '../../../utils.js';
import { MAX_IMAGE_SIZE_MB } from '../../constants.js';

export const createImageSourceWidget = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema } = props;
  const schema = activeSchema as StyledQrCodeSchema;

  rootElement.style.width = '100%';

  // Track current mode locally to avoid triggering re-renders when switching modes
  let currentImageSourceType = schema.imageOptions?.imageSourceType || 'upload';

  const updateImageSourceType = (type: 'url' | 'upload') => {
    currentImageSourceType = type;

    // Only update schema if there was an existing image (to clear it)
    if (schema.imageOptions?.image) {
      const updatedImageOptions = {
        ...(schema.imageOptions || {}),
        imageSourceType: type,
        image: undefined, // Clear image when switching types
      };
      changeSchemas([
        { key: 'imageOptions', value: updatedImageOptions, schemaId: activeSchema.id },
      ]);
    }
  };

  const updateImage = (image: string) => {
    const currentImageOptions = schema.imageOptions || {};
    const updatedImageOptions = {
      ...currentImageOptions,
      image,
      imageSourceType: currentImageSourceType, // Save the current mode with the image
      // Set default margin of 5 if not already set and image is being added
      margin:
        currentImageOptions.margin !== undefined
          ? currentImageOptions.margin
          : image
            ? 5
            : undefined,
    };
    changeSchemas([{ key: 'imageOptions', value: updatedImageOptions, schemaId: activeSchema.id }]);
  };

  // Radio buttons container
  const radioContainer = document.createElement('div');
  radioContainer.style.marginBottom = '10px';

  const radioWrapper = document.createElement('div');
  radioWrapper.style.display = 'flex';
  radioWrapper.style.gap = '20px';

  const createRadioOption = (value: 'url' | 'upload', label: string) => {
    const radioLabel = document.createElement('label');
    radioLabel.style.display = 'flex';
    radioLabel.style.alignItems = 'center';
    radioLabel.style.gap = '5px';
    radioLabel.style.cursor = 'pointer';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `imageSource_${String(schema.id)}`;
    radio.value = value;
    radio.checked = currentImageSourceType === value;
    radio.style.cursor = 'pointer';

    radio.addEventListener('change', () => {
      updateImageSourceType(value);
      updateInputContainer();
    });

    const text = document.createElement('span');
    text.textContent = label;

    radioLabel.appendChild(radio);
    radioLabel.appendChild(text);

    return radioLabel;
  };

  radioWrapper.appendChild(createRadioOption('upload', 'Upload'));
  radioWrapper.appendChild(createRadioOption('url', 'URL'));
  radioContainer.appendChild(radioWrapper);

  // Create both input containers upfront
  const urlContainer = document.createElement('div');
  urlContainer.style.width = '100%';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'Enter image URL';
  urlInput.style.width = '100%';
  urlInput.style.padding = '6.25px 11px';
  urlInput.style.border = '1px solid #ccc';
  urlInput.style.borderRadius = '4px';

  urlInput.addEventListener('change', (e) => {
    updateImage((e.target as HTMLInputElement).value);
  });

  urlContainer.appendChild(urlInput);

  const uploadContainer = document.createElement('div');
  uploadContainer.style.width = '100%';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg, image/png, image/gif, image/svg+xml';
  fileInput.style.width = '100%';
  fileInput.style.padding = '6.25px 11px';
  fileInput.style.border = '1px solid #ccc';
  fileInput.style.borderRadius = '4px';
  fileInput.style.cursor = 'pointer';

  const previewContainer = document.createElement('div');
  previewContainer.style.width = '100%';

  fileInput.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    readFile(input.files)
      .then((result) => {
        // Add size check
        const resultStr = result as string;
        const sizeInMB = (resultStr.length * 3) / 4 / (1024 * 1024); // Rough estimate for base64
        
        if (sizeInMB > MAX_IMAGE_SIZE_MB) {
          alert(`Image too large. Please use an image under ${MAX_IMAGE_SIZE_MB}MB.`);
          fileInput.value = '';
          return;
        }
        
        updateImage(resultStr);
        updatePreview(resultStr);
      })
      .catch((error) => {
        console.error('Error reading file:', error);
        alert('Failed to read image file. Please try a different file.');
        fileInput.value = '';
      });
  });

  uploadContainer.appendChild(fileInput);
  uploadContainer.appendChild(previewContainer);

  const updatePreview = (currentImage: string) => {
    previewContainer.innerHTML = '';

    if (currentImage && currentImage.startsWith('data:image')) {
      // Wrapper for image with relative positioning
      const imageWrapper = document.createElement('div');
      imageWrapper.style.position = 'relative';
      imageWrapper.style.display = 'inline-block';
      imageWrapper.style.marginTop = '10px';
      imageWrapper.style.width = '100%';

      const preview = document.createElement('img');
      preview.src = currentImage;
      preview.style.maxWidth = '100%';
      preview.style.maxHeight = '100px';
      preview.style.border = '1px solid #ccc';
      preview.style.borderRadius = '4px';
      preview.style.display = 'block';
      preview.alt = 'QR code logo preview';

      // Red X button in top-right corner
      const clearButton = document.createElement('button');
      clearButton.textContent = '×';
      clearButton.style.position = 'absolute';
      clearButton.style.top = '5px';
      clearButton.style.right = '5px';
      clearButton.style.width = '24px';
      clearButton.style.height = '24px';
      clearButton.style.padding = '0';
      clearButton.style.border = 'none';
      clearButton.style.borderRadius = '50%';
      clearButton.style.backgroundColor = '#ff4d4f';
      clearButton.style.color = 'white';
      clearButton.style.fontSize = '18px';
      clearButton.style.lineHeight = '1';
      clearButton.style.cursor = 'pointer';
      clearButton.style.display = 'flex';
      clearButton.style.alignItems = 'center';
      clearButton.style.justifyContent = 'center';
      clearButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      clearButton.title = 'Remove image';
      clearButton.setAttribute('aria-label', 'Remove image');

      clearButton.addEventListener('click', () => {
        updateImage('');
        updatePreview('');
        fileInput.value = ''; // Clear the file input
      });

      clearButton.addEventListener('mouseenter', () => {
        clearButton.style.backgroundColor = '#ff7875';
      });

      clearButton.addEventListener('mouseleave', () => {
        clearButton.style.backgroundColor = '#ff4d4f';
      });

      imageWrapper.appendChild(preview);
      imageWrapper.appendChild(clearButton);
      previewContainer.appendChild(imageWrapper);
    }
  };

  const updateInputContainer = () => {
    const schema = activeSchema as StyledQrCodeSchema;
    const currentImage = schema.imageOptions?.image || '';

    // Update values
    urlInput.value = currentImage;

    // Toggle visibility instead of rebuilding DOM
    if (currentImageSourceType === 'url') {
      urlContainer.style.display = 'block';
      uploadContainer.style.display = 'none';
    } else {
      urlContainer.style.display = 'none';
      uploadContainer.style.display = 'block';
      updatePreview(currentImage);
    }
  };

  rootElement.appendChild(radioContainer);
  rootElement.appendChild(urlContainer);
  rootElement.appendChild(uploadContainer);

  updateInputContainer();
};

