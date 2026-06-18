import { createEngine, type PdfDocument, type PdfEngine } from 'clawpdf/browser';
import { pdf2img, type Pdf2ImgOptions } from './pdf2img.js';
import { pdf2size, type Pdf2SizeOptions } from './pdf2size.js';

type WorkerScope = {
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

type WorkerRequest =
  | {
      id: number;
      type: 'pdf2img';
      pdf: ArrayBuffer;
      options?: Pdf2ImgOptions;
    }
  | {
      id: number;
      type: 'pdf2size';
      pdf: ArrayBuffer;
      options?: Pdf2SizeOptions;
    };

const clonePdfData = (pdf: ArrayBuffer | Uint8Array) =>
  new Uint8Array(pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf));

let enginePromise: Promise<PdfEngine> | undefined;

const getEngine = () => {
  enginePromise ??= createEngine();
  return enginePromise;
};

const openDocument = async (pdf: ArrayBuffer | Uint8Array): Promise<PdfDocument> =>
  (await getEngine()).open(clonePdfData(pdf));

const workerScope = self as unknown as WorkerScope;

workerScope.addEventListener('message', (event) => {
  void handleRequest(event.data);
});

const handleRequest = async (request: WorkerRequest) => {
  try {
    if (request.type === 'pdf2img') {
      const result = await pdf2img(request.pdf, request.options, { openDocument });
      workerScope.postMessage({ id: request.id, ok: true, result }, result);
      return;
    }

    const result = await pdf2size(request.pdf, request.options, { openDocument });
    workerScope.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      ok: false,
      error: {
        name: error instanceof Error ? error.name : undefined,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
};
