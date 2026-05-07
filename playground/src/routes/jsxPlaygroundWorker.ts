import type { Font } from '@pdfme/common';
import type { RenderResult } from '@pdfme/jsx';
import { renderJsxSource } from './jsxPlaygroundRuntime';

type RenderRequest = {
  font: Font;
  id: number;
  source: string;
};

type RenderResponse =
  | {
      id: number;
      ok: true;
      result: RenderResult;
    }
  | {
      error: string;
      id: number;
      ok: false;
    };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<RenderRequest>) => void) | null;
  postMessage: (response: RenderResponse) => void;
};

workerScope.onmessage = async (event: MessageEvent<RenderRequest>) => {
  const { font, id, source } = event.data;
  try {
    const result = await renderJsxSource(source, font);
    workerScope.postMessage({ id, ok: true, result } satisfies RenderResponse);
  } catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : String(error),
      id,
      ok: false,
    } satisfies RenderResponse);
  }
};
