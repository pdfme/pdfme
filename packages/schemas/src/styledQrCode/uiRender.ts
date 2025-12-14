import type * as CSS from 'csstype';
import { UIRenderProps, ZOOM } from '@pdfme/common';
import type { StyledQrCodeSchema } from './types.js';
import { validateQRInput } from './helper.js';
import { addAlphaToHex, isEditable, createErrorElm } from '../utils.js';
import { DEFAULT_STYLED_QR_CODE_ERROR_CORRECTION_LEVEL } from './constants.js';
import { getGradientColorStops } from './gradientUtils.js';

type QRCodeStylingOptions = {
  width: number;
  height: number;
  data: string;
  type: 'svg' | 'canvas';
  qrOptions?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  };
  dotsOptions?: {
    roundSize?: boolean;
    color?: string;
    type?: string;
    gradient?: unknown;
  };
  cornersSquareOptions?: {
    color?: string;
    type?: string;
    gradient?: unknown;
  };
  cornersDotOptions?: {
    color?: string;
    type?: string;
    gradient?: unknown;
  };
  backgroundOptions?: {
    color?: string | null;
    gradient?: unknown;
  };
  image?: string;
  imageOptions?: {
    margin?: number;
  };
};

type QRCodeInstance = {
  append: (container: HTMLElement) => void;
};

type QRCodeStylingConstructor = new (options: QRCodeStylingOptions) => QRCodeInstance;

const fullSize = { width: '100%', height: '100%' };

export const uiRender = async (arg: UIRenderProps<StyledQrCodeSchema>) => {
  const { value, rootElement, mode, onChange, stopEditing, tabIndex, placeholder, schema, theme } =
    arg;

  const container = document.createElement('div');
  const containerStyle: CSS.Properties = {
    ...fullSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Open Sans', sans-serif",
    position: 'relative',
  };
  Object.assign(container.style, containerStyle);
  rootElement.appendChild(container);

  const editable = isEditable(mode, schema);
  if (editable) {
    const input = document.createElement('input');
    const inputStyle: CSS.Properties = {
      width: '100%',
      position: 'absolute',
      textAlign: 'center',
      fontSize: '12pt',
      fontWeight: 'bold',
      color: theme.colorWhite,
      backgroundColor: editable || value ? addAlphaToHex('#000000', 80) : 'none',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      zIndex: 10,
    };
    Object.assign(input.style, inputStyle);
    input.value = value;
    input.placeholder = placeholder || '';
    input.tabIndex = tabIndex || 0;
    input.addEventListener('change', (e: Event) => {
      if (onChange) onChange({ key: 'content', value: (e.target as HTMLInputElement).value });
    });
    input.addEventListener('blur', () => {
      if (stopEditing) stopEditing();
    });
    container.appendChild(input);
    input.setSelectionRange(value.length, value.length);
    if (mode === 'designer') {
      input.focus();
    }
  }

  if (!value) return;

  try {
    if (!validateQRInput(value))
      throw new Error('[@pdfme/schemas/qrcodeStyled] Invalid QR code input');

    const qrCodeStylingModule = (await import('qr-code-styling')) as unknown as {
      default?: QRCodeStylingConstructor;
    } & QRCodeStylingConstructor;
    const QRCodeStyling = qrCodeStylingModule.default || qrCodeStylingModule;

    // The rootElement is already sized correctly by the Renderer
    // It's sized as schema.width * ZOOM and schema.height * ZOOM in pixels
    // Use the actual container dimensions or calculate from schema
    const containerWidth = rootElement.clientWidth || schema.width * ZOOM;
    const containerHeight = rootElement.clientHeight || schema.height * ZOOM;

    const options: QRCodeStylingOptions = {
      width: containerWidth,
      height: containerHeight,
      data: value,
      type: 'svg',
      qrOptions: {
        errorCorrectionLevel:
          schema.qrOptions?.errorCorrectionLevel || DEFAULT_STYLED_QR_CODE_ERROR_CORRECTION_LEVEL,
      },
      dotsOptions: {
        roundSize: false,
        color: schema.dotsOptions?.color || '#000000',
        type: schema.dotsOptions?.type || 'square',
        ...(schema.dotsOptions?.gradient &&
          schema.dotsOptions.gradient.type !== 'none' && {
            gradient: {
              ...schema.dotsOptions.gradient,
              colorStops: getGradientColorStops(
                schema.dotsOptions.gradient,
                schema.dotsOptions?.color || '#000000',
              ),
            },
          }),
      },
      cornersSquareOptions: {
        color: schema.cornersSquareOptions?.color || '#000000',
        type: schema.cornersSquareOptions?.type || 'square',
        ...(schema.cornersSquareOptions?.gradient &&
          schema.cornersSquareOptions.gradient.type !== 'none' && {
            gradient: {
              ...schema.cornersSquareOptions.gradient,
              colorStops: getGradientColorStops(
                schema.cornersSquareOptions.gradient,
                schema.cornersSquareOptions?.color || '#000000',
              ),
            },
          }),
      },
      cornersDotOptions: {
        color: schema.cornersDotOptions?.color || '#000000',
        type: schema.cornersDotOptions?.type || 'square',
        ...(schema.cornersDotOptions?.gradient &&
          schema.cornersDotOptions.gradient.type !== 'none' && {
            gradient: {
              ...schema.cornersDotOptions.gradient,
              colorStops: getGradientColorStops(
                schema.cornersDotOptions.gradient,
                schema.cornersDotOptions?.color || '#000000',
              ),
            },
          }),
      },
      backgroundOptions: {
        color:
          schema.backgroundOptions?.color !== undefined
            ? schema.backgroundOptions.color
            : '#ffffff',
        ...(schema.backgroundOptions?.gradient &&
          schema.backgroundOptions.gradient.type !== 'none' && {
            gradient: {
              ...schema.backgroundOptions.gradient,
              colorStops:
                schema.backgroundOptions.gradient.colorStops &&
                schema.backgroundOptions.gradient.colorStops.length > 0
                  ? schema.backgroundOptions.gradient.colorStops
                  : [
                      {
                        offset: 0,
                        color:
                          schema.backgroundOptions?.color && schema.backgroundOptions.color !== null
                            ? schema.backgroundOptions.color
                            : '#ffffff',
                      },
                      {
                        offset: 1,
                        color:
                          schema.backgroundOptions?.color && schema.backgroundOptions.color !== null
                            ? schema.backgroundOptions.color
                            : '#ffffff',
                      },
                    ],
            },
          }),
      },
      ...(schema.imageOptions?.image && {
        image: schema.imageOptions.image,
        imageOptions: {
          margin: schema.imageOptions.margin || 20,
        },
      }),
    };

    const qrCode = new QRCodeStyling(options);

    qrCode.append(container);
  } catch (err) {
    console.error(`[@pdfme/ui] ${String(err)}`);
    container.appendChild(createErrorElm());
  }
};
