import type { PdfDocument, PdfEngine } from 'clawpdf/browser';
import { pdf2img as _pdf2img, Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size as _pdf2size, Pdf2SizeOptions } from './pdf2size.js';
import workerSrc from './clawpdf-worker.js?worker&url';

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  new Uint8Array(pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf));

type WorkerRequestType = 'pdf2img' | 'pdf2size';

type WorkerSuccessResponse<T> = {
  id: number;
  ok: true;
  result: T;
};

type WorkerErrorResponse = {
  id: number;
  ok: false;
  error: {
    name?: string;
    message: string;
    stack?: string;
  };
};

type PendingWorkerRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let enginePromise: Promise<PdfEngine> | undefined;
let clawpdfPromise: Promise<typeof import('clawpdf/browser')> | undefined;
let worker: Worker | undefined;
let workerRequestId = 0;
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>();

const getEngine = () => {
  enginePromise ??= (async () => {
    clawpdfPromise ??= import('clawpdf/browser');
    const { createEngine } = await clawpdfPromise;
    return createEngine();
  })();
  return enginePromise;
};

const openDocument = async (pdf: ArrayBuffer | Uint8Array): Promise<PdfDocument> =>
  (await getEngine()).open(clonePdfData(pdf));

const runInWorker = <T>(
  type: WorkerRequestType,
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions | Pdf2SizeOptions,
): Promise<T> => {
  worker ??= createRenderWorker();

  const id = ++workerRequestId;
  const pdfData = clonePdfData(pdf);
  const pdfBuffer = pdfData.buffer as ArrayBuffer;

  return new Promise((resolve, reject) => {
    pendingWorkerRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });
    worker?.postMessage({ id, type, pdf: pdfBuffer, options }, [pdfBuffer]);
  });
};

const createRenderWorker = () => {
  const nextWorker = new Worker(workerSrc, { type: 'module' });

  nextWorker.addEventListener(
    'message',
    (
      event: MessageEvent<
        | WorkerSuccessResponse<ArrayBuffer[] | Awaited<ReturnType<typeof pdf2size>>>
        | WorkerErrorResponse
      >,
    ) => {
      const response = event.data;
      const pending = pendingWorkerRequests.get(response.id);
      if (!pending) return;

      pendingWorkerRequests.delete(response.id);
      if (response.ok) {
        pending.resolve(response.result);
        return;
      }

      const error = new Error(response.error.message);
      error.name = response.error.name || error.name;
      error.stack = response.error.stack;
      pending.reject(error);
    },
  );

  nextWorker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'PDF render worker failed');
    for (const pending of pendingWorkerRequests.values()) {
      pending.reject(error);
    }
    pendingWorkerRequests.clear();
    worker?.terminate();
    worker = undefined;
  });

  return nextWorker;
};

const runPdf2imgDirect = (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> =>
  _pdf2img(pdf, options, {
    openDocument,
  });

const runPdf2sizeDirect = (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  _pdf2size(pdf, options, {
    openDocument,
  });

export const pdf2img = async (
  pdf: ArrayBuffer | Uint8Array,
  options: Pdf2ImgOptions = {},
): Promise<ArrayBuffer[]> => {
  if (typeof Worker === 'undefined') {
    return runPdf2imgDirect(pdf, options);
  }

  return runInWorker<ArrayBuffer[]>('pdf2img', pdf, options);
};

export const pdf2size = async (pdf: ArrayBuffer | Uint8Array, options: Pdf2SizeOptions = {}) =>
  typeof Worker === 'undefined'
    ? runPdf2sizeDirect(pdf, options)
    : runInWorker<Awaited<ReturnType<typeof runPdf2sizeDirect>>>('pdf2size', pdf, options);

export { img2pdf } from './img2pdf.js';
