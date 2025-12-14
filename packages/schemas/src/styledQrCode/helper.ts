import type { StyledQrCodeSchema } from './types.js';
import { DEFAULT_STYLED_QR_CODE_ERROR_CORRECTION_LEVEL } from './constants.js';
import { getGradientColorStops } from './gradientUtils.js';

export const validateQRInput = (input: string): boolean => {
  if (!input) return false;
  return input.length < 500;
};

type QRCodeStylingOptions = {
  width: number;
  height: number;
  data: string;
  type: 'svg' | 'canvas';
  qrOptions?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  };
  dotsOptions?: {
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
  nodeCanvas?: unknown;
  jsdom?: unknown;
};

type QRCodeInstance = {
  getRawData: (extension: string) => Promise<Blob | Buffer | Uint8Array>;
};

type QRCodeStylingConstructor = new (options: QRCodeStylingOptions) => QRCodeInstance;

export const createStyledQRCode = async (
  schema: StyledQrCodeSchema,
  value: string,
  width: number,
  height: number,
): Promise<Buffer | Uint8Array> => {
  const qrCodeStylingModule = (await import('qr-code-styling')) as unknown as {
    default?: QRCodeStylingConstructor;
  } & QRCodeStylingConstructor;
  const QRCodeStyling = qrCodeStylingModule.default || qrCodeStylingModule;

  const isBrowser = typeof window !== 'undefined';

  const options: QRCodeStylingOptions = {
    width,
    height,
    data: value,
    type: 'svg',
    qrOptions: {
      errorCorrectionLevel:
        schema.qrOptions?.errorCorrectionLevel || DEFAULT_STYLED_QR_CODE_ERROR_CORRECTION_LEVEL,
    },
    dotsOptions: {
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
        schema.backgroundOptions?.color !== undefined ? schema.backgroundOptions.color : '#ffffff',
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

  let qrCode: QRCodeInstance;

  if (isBrowser) {
    qrCode = new QRCodeStyling(options);
  } else {
    const nodeCanvasModule = await import('canvas').catch(() => null);
    const jsdomModule = await import('jsdom').catch(() => null);

    if (!nodeCanvasModule || !jsdomModule) {
      throw new Error(
        '[@pdfme/schemas/qrcodeStyled] canvas and jsdom are required for Node.js environment. Please install them: npm install canvas jsdom',
      );
    }

    const nodeCanvas = nodeCanvasModule.default || nodeCanvasModule;
    const { JSDOM } = jsdomModule;

    qrCode = new QRCodeStyling({
      ...options,
      nodeCanvas,
      jsdom: JSDOM,
    });
  }

  const extension = 'png';
  const rawData = await qrCode.getRawData(extension);

  if (rawData instanceof Blob) {
    const arrayBuffer = await rawData.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  if (!rawData) {
    throw new Error('[@pdfme/schemas/qrcodeStyled] Failed to generate QR code');
  }

  return rawData;
};

export const getQRCodeCacheKey = (schema: StyledQrCodeSchema, value: string): string => {
  return JSON.stringify({
    type: schema.type,
    value,
    dotsOptions: schema.dotsOptions,
    cornersSquareOptions: schema.cornersSquareOptions,
    cornersDotOptions: schema.cornersDotOptions,
    backgroundOptions: schema.backgroundOptions,
    imageOptions: schema.imageOptions,
    qrOptions: schema.qrOptions,
  });
};
