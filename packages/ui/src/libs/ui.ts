// @ts-ignore
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = PDFJSWorker;
import hotkeys from 'hotkeys-js';
import { pt2mm,cloneDeep,b64toBlob,uuid } from '../../../common/src/utils'
import { getB64BasePdf } from '../../../common/src/helper'
import { Template,SchemaForUI } from '../../../common/src/type'

const up = 'up';
const shiftUp = 'shift+up';
const down = 'down';
const shiftDown = 'shift+down';
const left = 'left';
const shiftLeft = 'shift+left';
const right = 'right';
const shiftRight = 'shift+right';

const rmWin = 'backspace';
const rmMac = 'delete';
const esc = 'esc';
const copyWin = 'ctrl+c';
const copyMac = 'command+c';
const pasteWin = 'ctrl+v';
const pasteMac = 'command+v';
const redoWin = 'ctrl+y';
const redoMac = 'shift+command+z';
const undoWin = 'ctrl+z';
const undoMac = 'command+z';
const saveWin = 'ctrl+s';
const saveMac = 'command+s';

const keys = [
  up,
  shiftUp,
  down,
  shiftDown,
  left,
  shiftLeft,
  right,
  shiftRight,
  rmMac,
  rmWin,
  esc,
  copyWin,
  copyMac,
  pasteWin,
  pasteMac,
  redoWin,
  redoMac,
  undoWin,
  undoMac,
  saveWin,
  saveMac,
];

export const initShortCuts = (arg: {
  move: (command: 'up' | 'down' | 'left' | 'right', isShift: boolean) => void;
  remove: () => void;
  esc: () => void;
  copy: () => void;
  paste: () => void;
  redo: () => void;
  undo: () => void;
  save: () => void;
}) => {
  hotkeys(keys.join(), (e, handler) => {
    switch (handler.shortcut) {
      case up:
      case shiftUp:
        e.preventDefault();
        arg.move('up', hotkeys.shift);
        break;
      case down:
      case shiftDown:
        e.preventDefault();
        arg.move('down', hotkeys.shift);
        break;
      case left:
      case shiftLeft:
        e.preventDefault();
        arg.move('left', hotkeys.shift);
        break;
      case right:
      case shiftRight:
        e.preventDefault();
        arg.move('right', hotkeys.shift);
        break;
      case rmWin:
      case rmMac:
        arg.remove();
        break;
      case esc:
        arg.esc();
        break;
      case copyWin:
      case copyMac:
        arg.copy();
        break;
      case pasteWin:
      case pasteMac:
        arg.paste();
        break;
      case redoWin:
      case redoMac:
        arg.redo();
        break;
      case undoWin:
      case undoMac:
        arg.undo();
        break;
      case saveWin:
      case saveMac:
        e.preventDefault();
        arg.save();
        break;
      default:
        break;
    }
  });
};

export const destroyShortCuts = () => {
  hotkeys.unbind(keys.join());
};

const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && file !== null) {
        r(e.target.result);
      }
    });
    if (file !== null) {
      if (type === 'text') {
        fileReader.readAsText(file);
      } else if (type === 'dataURL') {
        fileReader.readAsDataURL(file);
      } else if (type === 'arrayBuffer') {
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
};

export const readFiles = (files: FileList | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && files !== null) {
        r(e.target.result);
      }
    });
    if (files !== null && files[0]) {
      readFile(files[0], type).then((data) => r(data));
    }
  });
};

const sortSchemasList = (template: Template, pageNum: number): SchemaForUI[][] =>
  new Array(pageNum).fill('').reduce((acc, _, i) => {
    acc.push(
      template.schemas[i]
        ? Object.entries(template.schemas[i])
            .sort((a, b) => {
              const aIndex = (template.columns ?? []).findIndex((c) => c === a[0]);
              const bIndex = (template.columns ?? []).findIndex((c) => c === b[0]);

              return aIndex > bIndex ? 1 : -1;
            })
            .map((e) => {
              const [key, value] = e;
              const data = template.sampledata ? template.sampledata[0][key] : '';

              return Object.assign(value, {
                key,
                data,
                id: uuid(),
              });
            })
        : []
    );

    return acc;
  }, [] as SchemaForUI[][]);

export const templateSchemas2SchemasList = async (_template: Template) => {
  const template = cloneDeep(_template);
  const sortedSchemasList = sortSchemasList(template, template.schemas.length);
  const basePdf = await getB64BasePdf(template.basePdf);
  const pdfBlob = b64toBlob(basePdf);
  const pageSizes = await getPdfPageSizes(pdfBlob);
  const ssl = sortedSchemasList.length;
  const psl = pageSizes.length;
  const schemasList = (
    ssl < psl
      ? sortedSchemasList.concat(new Array(psl - ssl).fill(cloneDeep([])))
      : sortedSchemasList.slice(0, pageSizes.length)
  ).map((schema, i) => {
    Object.values(schema).forEach((value) => {
      const { width, height } = pageSizes[i];
      const xEdge = value.position.x + value.width;
      const yEdge = value.position.y + value.height;
      if (width < xEdge) {
        const diff = xEdge - width;
        value.position.x += diff;
      }
      if (height < yEdge) {
        const diff = yEdge - height;
        value.position.y += diff;
      }
    });

    return schema;
  });

  return schemasList;
};



export const getPdfPageSizes = async (pdfBlob: Blob) => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await getDocument({ url }).promise;

  const promises = Promise.all(
    new Array(pdfDoc.numPages).fill('').map(async (_, i) => {
      const pageSize = await pdfDoc.getPage(i + 1).then((page) => {
        const { height, width } = page.getViewport({ scale: 1 });

        return { height: pt2mm(height), width: pt2mm(width) };
      });

      return pageSize;
    })
  );

  URL.revokeObjectURL(url);

  return promises;
};

const pdf2Images = async (pdfBlob: Blob, width: number, imageType: 'png' | 'jpeg') => {
  const url = URL.createObjectURL(pdfBlob);
  const pdfDoc = await getDocument({ url }).promise;

  const promises = Promise.all(
    new Array(pdfDoc.numPages).fill('').map(async (_, i) => {
      const image = await pdfDoc.getPage(i + 1).then((page) => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        const canvasContext = canvas.getContext('2d')!;
        const scaleRequired = canvas.width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: scaleRequired });
        canvas.height = viewport.height;

        return page
          .render({ canvasContext, viewport })
          .promise.then(() => canvas.toDataURL(`image/${imageType}`));
      });

      return image;
    })
  );
  URL.revokeObjectURL(url);

  return promises;
};

export const pdf2Pngs = (pdfBlob: Blob, width: number) => pdf2Images(pdfBlob, width, 'png');