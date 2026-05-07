import { useEffect, useRef, useState } from 'react';
import type { Template } from '@pdfme/common';
import type { RenderResult } from '@pdfme/jsx';
import { Viewer } from '@pdfme/ui';
import { Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import CodeEditor from '../components/CodeEditor';
import { downloadJsonFile, generatePDF, getFontsData } from '../helper';
import { getPlugins } from '../plugins';
import { initialJsx } from './jsxPlaygroundExamples';
import JsxPlaygroundWorker from './jsxPlaygroundWorker?worker';

const JSX_DOCS_URL = 'https://pdfme.com/docs/jsx#jsx-playground-beta';
const JSX_EDITOR_PATH = 'jsx-playground.tsx';
const RENDER_TIMEOUT_MS = 15_000;

type WorkerResponse =
  | {
      ok: true;
      result: RenderResult;
    }
  | {
      error: string;
      ok: false;
    };

const renderJsxSourceInWorker = (source: string) =>
  new Promise<RenderResult>((resolve, reject) => {
    const worker = new JsxPlaygroundWorker();
    const timeoutId = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('JSX render timed out.'));
    }, RENDER_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      cleanup();
      if (event.data.ok) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };

    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || 'JSX render worker failed.'));
    };

    worker.postMessage({ font: getFontsData(), source });
  });

const configureJsxEditor: Parameters<typeof CodeEditor>[0]['beforeMount'] = (monaco) => {
  const typeScriptLanguage = monaco.languages.typescript;
  if (!typeScriptLanguage) return;

  typeScriptLanguage.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    jsx: typeScriptLanguage.JsxEmit.React,
    jsxFactory: 'createElement',
    jsxFragmentFactory: 'Fragment',
    moduleResolution: typeScriptLanguage.ModuleResolutionKind.NodeJs,
    target: typeScriptLanguage.ScriptTarget.ES2020,
  });
  typeScriptLanguage.typescriptDefaults.addExtraLib(
    `
declare const Fragment: unique symbol;
declare function Page(props: Record<string, unknown>): unknown;
declare function Header(props: Record<string, unknown>): unknown;
declare function Footer(props: Record<string, unknown>): unknown;
declare function Static(props: Record<string, unknown>): unknown;
declare function Absolute(props: Record<string, unknown>): unknown;
declare function Stack(props: Record<string, unknown>): unknown;
declare function Row(props: Record<string, unknown>): unknown;
declare function Box(props: Record<string, unknown>): unknown;
declare function Spacer(props: Record<string, unknown>): unknown;
declare function Text(props: Record<string, unknown>): unknown;
declare function MultiVariableText(props: Record<string, unknown>): unknown;
declare function Image(props: Record<string, unknown>): unknown;
declare function Svg(props: Record<string, unknown>): unknown;
declare function Rectangle(props: Record<string, unknown>): unknown;
declare function Ellipse(props: Record<string, unknown>): unknown;
declare function Line(props: Record<string, unknown>): unknown;
declare function List(props: Record<string, unknown>): unknown;
declare function Table(props: Record<string, unknown>): unknown;
declare function PageBreak(props?: Record<string, unknown>): unknown;
`,
    'file:///pdfme-jsx-playground.d.ts',
  );
};

export default function JsxPlayground() {
  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [source, setSource] = useState(initialJsx);
  const [template, setTemplate] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [pdfDuration, setPdfDuration] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const startTimer = performance.now();
      try {
        const result = await renderJsxSourceInWorker(source);
        if (cancelled) return;
        setTemplate(result.template);
        setInputs(result.inputs);
        setRenderDuration(Math.round(performance.now() - startTimer));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setRenderDuration(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source]);

  useEffect(() => {
    if (!viewerRootRef.current || !template) return;

    if (viewerRef.current) {
      viewerRef.current.updateTemplate(template);
      viewerRef.current.setInputs(inputs);
    } else {
      viewerRef.current = new Viewer({
        domContainer: viewerRootRef.current,
        template,
        inputs,
        options: {
          font: getFontsData(),
          lang: 'en',
          theme: {
            token: {
              colorPrimary: '#25c2a0',
            },
          },
        },
        plugins: getPlugins(),
      });
    }
  }, [template, inputs]);

  useEffect(() => {
    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, []);

  const onGeneratePdf = async () => {
    if (isGeneratingPdf) return;

    const startTimer = performance.now();
    setIsGeneratingPdf(true);
    try {
      await generatePDF(viewerRef.current);
      const duration = Math.round(performance.now() - startTimer);
      setPdfDuration(duration);
      toast.info(`Generated PDF in ${duration}ms`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const onDownloadTemplate = () => {
    if (!template) return;
    downloadJsonFile(template, 'jsx-template');
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-gray-100">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-900">@pdfme/jsx (beta)</h1>
            <a
              href={JSX_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-600"
            >
              Docs
              <ExternalLink className="size-3" />
            </a>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Write a JSX function body that returns pdfme pages. Imports are intentionally disabled
            in this beta playground.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-4">
          <button
            type="button"
            disabled={!template || Boolean(error)}
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" />
            Template JSON
          </button>
          <button
            type="button"
            disabled={!template || Boolean(error) || isGeneratingPdf}
            onClick={onGeneratePdf}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        This beta runs JSX in an isolated worker and blocks common browser globals, but it is still
        for trusted examples. Do not paste code you do not trust.
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        <section className="flex min-h-[45vh] flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            JSX
          </div>
          <CodeEditor
            ariaLabel="JSX"
            beforeMount={configureJsxEditor}
            language="typescript"
            onChange={setSource}
            path={JSX_EDITOR_PATH}
            value={source}
          />
        </section>
        <section className="flex min-h-[55vh] flex-col bg-gray-100 lg:min-h-0">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Viewer</span>
            <div className="flex items-center gap-3 normal-case tracking-normal">
              {renderDuration !== null && <span>render {renderDuration}ms</span>}
              {pdfDuration !== null && <span>pdf {pdfDuration}ms</span>}
              {error && <span className="max-w-[32rem] truncate text-red-600">{error}</span>}
            </div>
          </div>
          <div ref={viewerRootRef} className="min-h-0 flex-1" />
        </section>
      </div>
    </main>
  );
}
