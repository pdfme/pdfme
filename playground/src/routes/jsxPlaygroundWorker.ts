import type { Font } from '@pdfme/common';
import type { RenderResult } from '@pdfme/jsx';
import { renderJsxSource } from './jsxPlaygroundRuntime';

type RenderRequest = {
  font: Font;
  source: string;
};

type RenderResponse =
  | {
      ok: true;
      result: RenderResult;
    }
  | {
      error: string;
      ok: false;
    };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<RenderRequest>) => void) | null;
  postMessage: (response: RenderResponse) => void;
};

workerScope.onmessage = async (event: MessageEvent<RenderRequest>) => {
  try {
    const result = await renderJsxSource(event.data.source, event.data.font);
    workerScope.postMessage({ ok: true, result } satisfies RenderResponse);
  } catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : String(error),
      ok: false,
    } satisfies RenderResponse);
  }
};
