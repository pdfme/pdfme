import type { UIRenderProps } from '@pdfme/common';
import { getBoxContentArea } from '../box.js';
import { readFile } from '../utils.js';
import { TABLE_IMAGE_DATA_URL_PATTERN } from './constants.js';
import { getTableImageObjectPosition, resolveImageDimension } from './imageCell.js';
import type { CellSchema } from './types.js';

const buttonSize = 18;

type ImagePickerRequest = { rowIndex: number; colIndex: number; schemaKey: string };

let pendingImagePicker: ImagePickerRequest | null = null;

export const tableSchemaKey = (schema: { name: string; id?: unknown }): string =>
  typeof schema.id === 'string' && schema.id !== '' ? schema.id : schema.name;

export const noteRenderingTable = (schema: { name: string; id?: unknown }) => {
  const schemaKey = tableSchemaKey(schema);
  if (pendingImagePicker && pendingImagePicker.schemaKey !== schemaKey) {
    pendingImagePicker = null;
  }
};

export const clearImagePickerRequest = () => {
  pendingImagePicker = null;
};

export const requestImagePicker = (request: ImagePickerRequest) => {
  pendingImagePicker = request;
};

const consumePendingImagePicker = (request: ImagePickerRequest): boolean => {
  const pending = pendingImagePicker;
  if (
    !pending ||
    pending.rowIndex !== request.rowIndex ||
    pending.colIndex !== request.colIndex ||
    pending.schemaKey !== request.schemaKey
  ) {
    return false;
  }
  pendingImagePicker = null;
  return true;
};

const createImageButton = (options: {
  text: string;
  ariaLabel: string;
  right: string;
  onClick: () => void;
}): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerText = options.text;
  button.setAttribute('aria-label', options.ariaLabel);
  button.title = options.ariaLabel;
  button.style.width = `${buttonSize}px`;
  button.style.height = `${buttonSize}px`;
  button.style.position = 'absolute';
  button.style.top = '0px';
  button.style.right = options.right;
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.padding = '0';
  button.style.border = '1px solid #d9d9d9';
  button.style.borderRadius = '3px';
  button.style.background = '#ffffff';
  button.style.color = '#333333';
  button.style.fontSize = '11px';
  button.style.lineHeight = '1';
  button.style.cursor = 'pointer';
  button.style.zIndex = '20';
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    options.onClick();
  });
  return button;
};

const appendFrame = (schema: CellSchema) => {
  const contentArea = getBoxContentArea(schema);
  const frame = document.createElement('div');
  frame.style.position = 'absolute';
  frame.style.zIndex = '1';
  frame.style.width = `${contentArea.width}mm`;
  frame.style.height = `${contentArea.height}mm`;
  frame.style.top = `${contentArea.topInset}mm`;
  frame.style.left = `${contentArea.leftInset}mm`;
  frame.style.boxSizing = 'border-box';
  return frame;
};

const warnUnsupportedImage = (columnIndex: number | undefined) => {
  console.warn(
    `[@pdfme/schemas/table] unsupported image in column ${columnIndex ?? 0}; only PNG/JPEG data URL is supported`,
  );
};

// Designer-only editor. Caller mounts this solely for the cell being edited.
export const renderTableImageCellUi = (arg: UIRenderProps<CellSchema>) => {
  const { schema, rootElement, value, onChange, i18n, _cache } = arg;
  const dimension = value ? resolveImageDimension(value, _cache) : undefined;
  const frame = appendFrame(schema);

  if (dimension && value) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = value;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = getTableImageObjectPosition(
      schema.alignment,
      schema.verticalAlignment,
    );
    frame.appendChild(img);
  } else {
    frame.textContent = i18n('schemas.table.imageCell.placeholder');
    frame.style.border = '1px dotted #999';
    frame.style.color = '#999';
    frame.style.fontSize = '10px';
    frame.style.display = 'flex';
    frame.style.alignItems = 'center';
    frame.style.justifyContent = 'center';
    frame.style.textAlign = 'center';
    frame.style.overflow = 'hidden';
    frame.style.padding = '1mm';
  }
  rootElement.appendChild(frame);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png, image/jpeg';
  input.tabIndex = -1;
  input.style.display = 'none';
  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  input.addEventListener('change', () => {
    if (!input.files || input.files.length === 0) return;
    readFile(input.files)
      .then((result) => {
        if (
          typeof result === 'string' &&
          TABLE_IMAGE_DATA_URL_PATTERN.test(result) &&
          resolveImageDimension(result, _cache)
        ) {
          onChange?.({ key: 'content', value: result });
          return;
        }
        warnUnsupportedImage(schema.columnIndex);
      })
      .catch(() => {
        warnUnsupportedImage(schema.columnIndex);
      });
  });
  rootElement.appendChild(input);

  const hasValue = typeof value === 'string' && value !== '';
  rootElement.appendChild(
    createImageButton({
      text: '▣',
      ariaLabel: i18n('schemas.table.imageCell.select'),
      right: hasValue ? `${buttonSize + 2}px` : '0px',
      onClick: () => {
        input.click();
      },
    }),
  );

  if (hasValue) {
    rootElement.appendChild(
      createImageButton({
        text: '×',
        ariaLabel: i18n('schemas.table.imageCell.remove'),
        right: '0px',
        onClick: () => {
          onChange?.({ key: 'content', value: '' });
        },
      }),
    );
  }

  const { rowIndex, columnIndex, pickerSchemaKey } = schema;
  const openedByCellClick =
    typeof rowIndex === 'number' &&
    typeof columnIndex === 'number' &&
    typeof pickerSchemaKey === 'string' &&
    consumePendingImagePicker({ rowIndex, colIndex: columnIndex, schemaKey: pickerSchemaKey });
  if (openedByCellClick && !hasValue) {
    input.click();
  }
};
