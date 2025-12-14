import type { PropPanelWidgetProps } from '@pdfme/common';
import type { StyledQrCodeSchema } from '../../types.js';
import { MAX_QR_CONTENT_LENGTH } from '../../constants.js';

export const createQRContentWidget = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema } = props;
  const schema = activeSchema as StyledQrCodeSchema;

  rootElement.style.width = '100%';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = schema.content || '';
  input.placeholder = 'Enter QR code content (URL, text, etc.)';
  input.style.width = '100%';
  input.style.padding = '6.25px 11px';
  input.style.border = '1px solid #ccc';
  input.style.borderRadius = '4px';
  input.style.fontSize = '14px';

  const updateContent = () => {
    const newValue = input.value.trim();
    
    // Validation
    if (newValue.length > MAX_QR_CONTENT_LENGTH) {
      input.setCustomValidity(`QR content too long (max ${MAX_QR_CONTENT_LENGTH} characters)`);
      input.reportValidity();
      return;
    }
    
    input.setCustomValidity('');
    
    if (newValue !== schema.content) {
      changeSchemas([{ key: 'content', value: newValue, schemaId: activeSchema.id }]);
    }
  };

  // Update on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateContent();
      input.blur();
    }
  });

  // Update on blur (lose focus)
  input.addEventListener('blur', () => {
    updateContent();
  });

  rootElement.appendChild(input);
};

