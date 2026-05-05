import type { Plugin, Schema } from '@pdfme/common';
import { ZOOM } from '@pdfme/common';
import image from './image.js';

export type SignatureSchema = Schema;

const createLoadErrorBadge = (message: string) => {
  const badge = document.createElement('div');
  badge.setAttribute('role', 'alert');
  badge.textContent = message;
  badge.style.position = 'absolute';
  badge.style.left = '4px';
  badge.style.right = '4px';
  badge.style.bottom = '4px';
  badge.style.zIndex = '2';
  badge.style.padding = '4px 6px';
  badge.style.borderRadius = '4px';
  badge.style.background = 'rgba(176, 0, 32, 0.92)';
  badge.style.color = '#ffffff';
  badge.style.fontSize = '11px';
  badge.style.lineHeight = '1.25';
  badge.style.pointerEvents = 'none';
  return badge;
};

const getEffectiveScale = (element: HTMLElement | null) => {
  let scale = 1;
  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    const transform = style.transform;
    if (transform && transform !== 'none') {
      const localScale = parseFloat(transform.match(/matrix\((.+)\)/)?.[1].split(', ')[3] || '1');
      scale *= localScale;
    }
    element = element.parentElement;
  }
  return scale;
};

const signature: Plugin<SignatureSchema> = {
  ui: async (arg) => {
    const { schema, value, onChange, rootElement, mode, i18n } = arg;
    const { default: SignaturePad } = await import('signature_pad');

    const canvas = document.createElement('canvas');
    canvas.width = schema.width * ZOOM;
    canvas.height = schema.height * ZOOM;

    const context = canvas.getContext('2d');
    if (context) {
      const resetScale = 1 / getEffectiveScale(rootElement);
      context.scale(resetScale, resetScale);

      const signaturePad = new SignaturePad(canvas);
      const loadErrorMessage =
        i18n('signature.invalidData') || 'Saved signature could not be loaded.';
      let loadErrorBadge: HTMLDivElement | null = null;
      const clearLoadError = () => {
        loadErrorBadge?.remove();
        loadErrorBadge = null;
      };
      const showLoadError = () => {
        if (loadErrorBadge) {
          return;
        }
        loadErrorBadge = createLoadErrorBadge(loadErrorMessage);
        rootElement.appendChild(loadErrorBadge);
      };
      const handleEndStroke = () => {
        clearLoadError();
        const data = signaturePad.toDataURL('image/png');
        if (onChange && data) {
          onChange({ key: 'content', value: data });
        }
      };

      try {
        if (value) {
          signaturePad.fromDataURL(value, { ratio: resetScale });
        } else {
          signaturePad.clear();
        }
      } catch (error) {
        signaturePad.clear();
        showLoadError();
        console.error('[@pdfme/schemas] Failed to restore saved signature data.', error);
      }

      if (mode === 'viewer' || (mode === 'form' && schema.readOnly)) {
        signaturePad.off();
      } else {
        signaturePad.on();
        const clearButton = document.createElement('button');
        const handleClear = () => {
          clearLoadError();
          if (onChange) {
            onChange({ key: 'content', value: '' });
          }
        };
        const cleanup = () => {
          clearLoadError();
          signaturePad.off();
          signaturePad.removeEventListener('endStroke', handleEndStroke);
          clearButton.removeEventListener('click', handleClear);
          clearButton.remove();
          rootElement.removeEventListener('beforeRemove', cleanup);
        };

        rootElement.addEventListener('beforeRemove', cleanup);
        clearButton.type = 'button';
        clearButton.style.position = 'absolute';
        clearButton.style.zIndex = '1';
        clearButton.textContent = i18n('signature.clear') || 'x';
        clearButton.addEventListener('click', handleClear);
        rootElement.appendChild(clearButton);
        signaturePad.addEventListener('endStroke', handleEndStroke);
      }
    }

    rootElement.appendChild(canvas);
  },
  pdf: image.pdf,
  propPanel: {
    schema: {},
    defaultSchema: {
      name: '',
      type: 'signature',
      content: '',
      position: { x: 0, y: 0 },
      width: 62.5,
      height: 37.5,
    },
  },
};

export default signature;
