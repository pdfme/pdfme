import type { PDFImage } from '@pdfme/pdf-lib';
import type { Plugin } from '@pdfme/common';
import type { PropPanelSchema, Schema } from '@pdfme/common';
import type * as CSS from 'csstype';
import { px2mm } from '@pdfme/common';
import { Buffer } from 'buffer';
import { Image } from 'lucide';
import {
  convertForPdfLayoutProps,
  rotatePoint,
  addAlphaToHex,
  isEditable,
  readFile,
  createSvgStr,
} from '../utils.js';
import { DEFAULT_OPACITY } from '../constants.js';
import { detectImageFormat, normalizeImageOrientation } from './orientation.js';

/**
 * Build a short fingerprint for a potentially-large base64 image string.
 * Previously `${schema.type}${input}` was used, pinning multi-MB base64
 * strings in the cache Map forever — every unique image input created a
 * permanent Map key whose byte length matched the image itself.
 *
 * The fingerprint is an FNV-1a 32-bit hash over the full input, combined
 * with the schema type and input byte length. An earlier revision sampled
 * three 16-char regions (first + middle + last) instead of hashing, but
 * the first-16 slice is a constant data-URI prefix for any image of the
 * same MIME type (`data:image/png;b…` / `data:image/jpeg…`), contributing
 * no entropy. Hashing every byte removes that weakness at the same O(n)
 * cost, without retaining any slice of the input as a Map key. Keys stay
 * well under ~40 chars regardless of input size.
 */
const getCacheKey = (schema: Schema, input: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${schema.type}:${input.length}:${hex}`;
};

const dataUrlToBytes = (value: string): Uint8Array => {
  const prefix = ';base64,';
  const idx = value.indexOf(prefix);
  const base64 = idx >= 0 ? value.slice(idx + prefix.length) : value;
  return new Uint8Array(Buffer.from(base64, 'base64'));
};
const fullSize = { width: '100%', height: '100%' };
export const IMAGE_OBJECT_FITS = ['contain', 'cover'] as const;
export type ImageObjectFit = (typeof IMAGE_OBJECT_FITS)[number];

export const IMAGE_OBJECT_POSITIONS = [
  'left top',
  'center top',
  'right top',
  'left center',
  'center center',
  'right center',
  'left bottom',
  'center bottom',
  'right bottom',
] as const;
export type ImageObjectPosition = (typeof IMAGE_OBJECT_POSITIONS)[number];

export const DEFAULT_IMAGE_OBJECT_FIT: ImageObjectFit = 'contain';
export const DEFAULT_IMAGE_OBJECT_POSITION: ImageObjectPosition = 'center center';

const imageObjectFitSet = new Set<string>(IMAGE_OBJECT_FITS);
const imageObjectPositionSet = new Set<string>(IMAGE_OBJECT_POSITIONS);

const normalizeObjectFit = (value: unknown): ImageObjectFit =>
  typeof value === 'string' && imageObjectFitSet.has(value)
    ? (value as ImageObjectFit)
    : DEFAULT_IMAGE_OBJECT_FIT;

const normalizeObjectPosition = (value: unknown): ImageObjectPosition =>
  typeof value === 'string' && imageObjectPositionSet.has(value)
    ? (value as ImageObjectPosition)
    : DEFAULT_IMAGE_OBJECT_POSITION;

export const getEffectiveObjectPosition = (schema: ImageSchema): ImageObjectPosition => {
  const objectFit = normalizeObjectFit(schema.objectFit);
  return objectFit === 'cover'
    ? DEFAULT_IMAGE_OBJECT_POSITION
    : normalizeObjectPosition(schema.objectPosition);
};

const alignOffset = (
  space: number,
  position: 'left' | 'center' | 'right' | 'top' | 'bottom',
) => {
  if (position === 'right' || position === 'bottom') return space;
  if (position === 'center') return space / 2;
  return 0;
};

export const getImageFitLayout = (arg: {
  sourceWidth: number;
  sourceHeight: number;
  boxWidth: number;
  boxHeight: number;
  objectFit?: unknown;
  objectPosition?: unknown;
}) => {
  const { sourceWidth, sourceHeight, boxWidth, boxHeight } = arg;
  const objectFit = normalizeObjectFit(arg.objectFit);
  const objectPosition =
    objectFit === 'cover'
      ? DEFAULT_IMAGE_OBJECT_POSITION
      : normalizeObjectPosition(arg.objectPosition);
  const scale =
    objectFit === 'cover'
      ? Math.max(boxWidth / sourceWidth, boxHeight / sourceHeight)
      : Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const [horizontal, vertical] = objectPosition.split(' ') as [
    'left' | 'center' | 'right',
    'top' | 'center' | 'bottom',
  ];

  return {
    objectFit,
    objectPosition,
    width,
    height,
    offsetX: alignOffset(boxWidth - width, horizontal),
    offsetY: alignOffset(boxHeight - height, vertical),
  };
};

const getClipPathCorners = (arg: { schema: ImageSchema; pageHeight: number }) => {
  const { schema, pageHeight } = arg;
  const clippingBox = convertForPdfLayoutProps({
    schema,
    pageHeight,
    applyRotateTranslate: false,
  });
  const { x, y } = clippingBox.position;
  const width = clippingBox.width;
  const height = clippingBox.height;
  const rotateDegrees = schema.rotate ? -schema.rotate : 0;
  const corners = [
    { x, y },
    { x, y: y + height },
    { x: x + width, y: y + height },
    { x: x + width, y },
  ];

  if (!rotateDegrees) return corners;

  const pivot = { x: x + width / 2, y: y + height / 2 };
  return corners.map((corner) => rotatePoint(corner, pivot, rotateDegrees));
};
const defaultValue =
  'data:image/png;base64,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';

export type ImageSchema = Schema & {
  objectFit?: ImageObjectFit;
  objectPosition?: ImageObjectPosition;
};

const getImagePropPanelSchema = ({
  i18n,
  activeSchema,
}: {
  i18n: (key: string) => string;
  activeSchema: Schema;
}): Record<string, PropPanelSchema> => {
  const objectFit = normalizeObjectFit((activeSchema as ImageSchema).objectFit);
  const positionOptions = IMAGE_OBJECT_POSITIONS.map((value) => ({
    value,
    label: i18n(`schemas.image.position.${value.replace(' ', '.')}`),
  }));

  return {
    objectFit: {
      title: i18n('schemas.image.objectFit'),
      type: 'string',
      widget: 'select',
      default: DEFAULT_IMAGE_OBJECT_FIT,
      props: {
        options: [
          { label: i18n('schemas.image.fit.contain'), value: 'contain' },
          { label: i18n('schemas.image.fit.cover'), value: 'cover' },
        ],
      },
      span: 8,
    },
    objectPosition: {
      title: i18n('schemas.image.objectPosition'),
      type: 'string',
      widget: 'select',
      default: DEFAULT_IMAGE_OBJECT_POSITION,
      hidden: objectFit === 'cover',
      props: { options: positionOptions },
      span: 16,
    },
  };
};

const imageSchema: Plugin<ImageSchema> = {
  pdf: async (arg) => {
    const { value, schema, pdfDoc, page, pdfLib, _cache } = arg;
    if (!value) return;

    const inputImageCacheKey = getCacheKey(schema, value);
    let image = _cache.get(inputImageCacheKey) as PDFImage;
    if (!image) {
      const originalBytes = dataUrlToBytes(value);
      const kind = detectImageFormat(originalBytes);
      let bytes = originalBytes;
      try {
        if (kind === 'jpeg' || kind === 'png') {
          bytes = normalizeImageOrientation(originalBytes);
        }
      } catch (error) {
        console.warn(
          '[@pdfme/schemas] EXIF orientation bake failed; embedding original bytes:',
          error,
        );
        bytes = originalBytes;
      }
      image = await (kind === 'png' ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes));
      _cache.set(inputImageCacheKey, image);
    }

    const _schema = { ...schema, position: { ...schema.position } };
    const imageWidth = px2mm(image.width);
    const imageHeight = px2mm(image.height);
    const boxWidth = _schema.width;
    const boxHeight = _schema.height;
    const fitLayout = getImageFitLayout({
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      boxWidth,
      boxHeight,
      objectFit: _schema.objectFit,
      objectPosition: _schema.objectPosition,
    });

    _schema.width = fitLayout.width;
    _schema.height = fitLayout.height;
    _schema.position.x += fitLayout.offsetX;
    _schema.position.y += fitLayout.offsetY;

    const pageHeight = page.getHeight();
    const lProps = convertForPdfLayoutProps({ schema: _schema, pageHeight });
    const { width, height, rotate, position, opacity } = lProps;
    const { x, y } = position;

    const drawOptions = { x, y, rotate, width, height, opacity };
    if (fitLayout.objectFit === 'cover') {
      const [firstCorner, ...corners] = getClipPathCorners({ schema, pageHeight });
      page.pushOperators(
        pdfLib.pushGraphicsState(),
        pdfLib.moveTo(firstCorner.x, firstCorner.y),
        ...corners.map((corner) => pdfLib.lineTo(corner.x, corner.y)),
        pdfLib.closePath(),
        pdfLib.clip(),
        pdfLib.endPath(),
      );
    }
    page.drawImage(image, drawOptions);
    if (fitLayout.objectFit === 'cover') {
      page.pushOperators(pdfLib.popGraphicsState());
    }
  },
  ui: (arg) => {
    const {
      value,
      rootElement,
      mode,
      onChange,
      stopEditing,
      tabIndex,
      placeholder,
      theme,
      schema,
    } = arg;
    const editable = isEditable(mode, schema);
    const isDefault = value === defaultValue;
    const objectFit = normalizeObjectFit(schema.objectFit);
    const objectPosition = getEffectiveObjectPosition(schema);

    const container = document.createElement('div');
    const backgroundStyle = placeholder ? `url(${placeholder})` : 'none';
    const containerStyle: CSS.Properties = {
      ...fullSize,
      backgroundImage: value ? 'none' : backgroundStyle,
      backgroundSize: objectFit,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: objectPosition,
    };
    Object.assign(container.style, containerStyle);
    container.addEventListener('click', (e) => {
      if (editable) {
        e.stopPropagation();
      }
    });
    rootElement.appendChild(container);

    // image tag
    if (value) {
      const img = document.createElement('img');
      const imgStyle: CSS.Properties = {
        height: '100%',
        width: '100%',
        borderRadius: 0,
        objectFit,
        ...(objectPosition === DEFAULT_IMAGE_OBJECT_POSITION ? {} : { objectPosition }),
      };
      Object.assign(img.style, imgStyle);
      img.src = value;
      container.appendChild(img);
    }

    // remove button
    if (value && !isDefault && editable) {
      const button = document.createElement('button');
      button.textContent = 'x';
      const buttonStyle: CSS.Properties = {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#333',
        background: '#f2f2f2',
        borderRadius: '2px',
        border: '1px solid #767676',
        cursor: 'pointer',
        height: '24px',
        width: '24px',
      };
      Object.assign(button.style, buttonStyle);
      button.addEventListener('click', () => {
        if (onChange) onChange({ key: 'content', value: '' });
      });
      container.appendChild(button);
    }

    // file input
    if ((!value || isDefault) && editable) {
      const label = document.createElement('label');
      const labelStyle: CSS.Properties = {
        ...fullSize,
        display: editable ? 'flex' : 'none',
        position: 'absolute',
        top: 0,
        backgroundColor: editable || value ? addAlphaToHex(theme.colorPrimaryBg, 30) : 'none',
        cursor: 'pointer',
      };
      Object.assign(label.style, labelStyle);
      container.appendChild(label);
      const input = document.createElement('input');
      const inputStyle: CSS.Properties = {
        ...fullSize,
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '180px',
        height: '30px',
        marginLeft: '-90px',
        marginTop: '-15px',
      };
      Object.assign(input.style, inputStyle);
      input.tabIndex = tabIndex || 0;
      input.type = 'file';
      input.accept = 'image/jpeg, image/png';
      input.addEventListener('change', (event: Event) => {
        const target = event.target;
        const files = target instanceof HTMLInputElement ? target.files : null;
        readFile(files)
          .then((result) => {
            if (onChange) onChange({ key: 'content', value: result as string });
          })
          .catch((error) => {
            console.error('Error reading file:', error);
          });
      });
      input.addEventListener('blur', () => {
        if (stopEditing) stopEditing();
      });
      label.appendChild(input);
    }
  },
  propPanel: {
    schema: ({ i18n, activeSchema }) => getImagePropPanelSchema({ i18n, activeSchema }),
    defaultSchema: {
      name: '',
      type: 'image',
      content: defaultValue,
      position: { x: 0, y: 0 },
      width: 40,
      height: 40,
      objectFit: DEFAULT_IMAGE_OBJECT_FIT,
      objectPosition: DEFAULT_IMAGE_OBJECT_POSITION,
      // If the value of "rotate" is set to undefined or not set at all, rotation will be disabled in the UI.
      // Check this document: https://pdfme.com//docs/custom-schemas#learning-how-to-create-from-pdfmeschemas-code
      rotate: 0,
      opacity: DEFAULT_OPACITY,
    },
  },
  icon: createSvgStr(Image),
};

export default imageSchema;
