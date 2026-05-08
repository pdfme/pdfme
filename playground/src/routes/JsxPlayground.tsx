import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Template } from '@pdfme/common';
import type { RenderResult } from '@pdfme/jsx';
import { Form, Viewer } from '@pdfme/ui';
import { Download, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import CodeEditor from '../components/CodeEditor';
import { downloadJsonFile, generatePDF, getFontsData } from '../helper';
import { getPlugins } from '../plugins';
import { initialJsx, jsxPlaygroundPresets } from './jsxPlaygroundExamples';
import JsxPlaygroundWorker from './jsxPlaygroundWorker?worker';
import { shouldRefreshCollapsedPreview } from './previewSizing';

const JSX_DOCS_URL = 'https://pdfme.com/docs/jsx#jsx-playground-beta';
const JSX_EDITOR_PATH = 'file:///jsx-playground.tsx';
const RENDER_TIMEOUT_MS = 15_000;

type WorkerResponse =
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

type PendingRender = {
  id: number;
  reject: (error: Error) => void;
  resolve: (result: RenderResult) => void;
  timeoutId: number;
};

type PreviewMode = 'viewer' | 'form';

type PreviewInstance = {
  mode: PreviewMode;
  ui: Form | Viewer;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

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
  const previewRootRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<PreviewInstance | null>(null);
  const inputsRef = useRef<Record<string, string>[]>([{}]);
  const renderWorkerRef = useRef<Worker | null>(null);
  const pendingRenderRef = useRef<PendingRender | null>(null);
  const nextRenderRequestIdRef = useRef(0);
  const [selectedPresetId, setSelectedPresetId] = useState(jsxPlaygroundPresets[0]?.id ?? '');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('viewer');
  const [source, setSource] = useState(initialJsx);
  const [template, setTemplate] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [pdfDuration, setPdfDuration] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const selectedPreset =
    jsxPlaygroundPresets.find((preset) => preset.id === selectedPresetId) ??
    jsxPlaygroundPresets[0];

  const terminateRenderWorker = useCallback(() => {
    renderWorkerRef.current?.terminate();
    renderWorkerRef.current = null;
  }, []);

  const clearPendingRender = useCallback((error?: Error) => {
    const pendingRender = pendingRenderRef.current;
    if (!pendingRender) return;

    window.clearTimeout(pendingRender.timeoutId);
    pendingRenderRef.current = null;
    if (error) pendingRender.reject(error);
  }, []);

  const getRenderWorker = useCallback(() => {
    if (renderWorkerRef.current) return renderWorkerRef.current;

    const worker = new JsxPlaygroundWorker();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const pendingRender = pendingRenderRef.current;
      if (!pendingRender || event.data.id !== pendingRender.id) return;

      clearPendingRender();
      if (event.data.ok) {
        pendingRender.resolve(event.data.result);
      } else {
        pendingRender.reject(new Error(event.data.error));
      }
    };
    worker.onerror = (event) => {
      const pendingRender = pendingRenderRef.current;
      clearPendingRender();
      terminateRenderWorker();
      pendingRender?.reject(new Error(event.message || 'JSX render worker failed.'));
    };
    renderWorkerRef.current = worker;
    return worker;
  }, [clearPendingRender, terminateRenderWorker]);

  const renderJsxSourceInWorker = useCallback(
    (nextSource: string) =>
      new Promise<RenderResult>((resolve, reject) => {
        if (pendingRenderRef.current) {
          clearPendingRender(new Error('JSX render cancelled.'));
          terminateRenderWorker();
        }

        const worker = getRenderWorker();
        const id = (nextRenderRequestIdRef.current += 1);
        const timeoutId = window.setTimeout(() => {
          const pendingRender = pendingRenderRef.current;
          if (!pendingRender || pendingRender.id !== id) return;

          clearPendingRender(new Error('JSX render timed out.'));
          terminateRenderWorker();
        }, RENDER_TIMEOUT_MS);

        pendingRenderRef.current = { id, reject, resolve, timeoutId };
        worker.postMessage({ font: getFontsData(), id, source: nextSource });
      }),
    [clearPendingRender, getRenderWorker, terminateRenderWorker],
  );

  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const startTimer = performance.now();
      try {
        const result = await renderJsxSourceInWorker(source);
        if (cancelled) return;
        setTemplate(result.template);
        setInputs(result.inputs);
        inputsRef.current = result.inputs;
        setRenderDuration(Math.round(performance.now() - startTimer));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(getErrorMessage(err));
        setRenderDuration(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [renderJsxSourceInWorker, source]);

  useEffect(() => {
    if (!previewRootRef.current || !template) return;
    const currentInputs = inputsRef.current;

    try {
      if (previewRef.current && previewRef.current.mode !== previewMode) {
        previewRef.current.ui.destroy();
        previewRef.current = null;
      }

      if (previewRef.current) {
        previewRef.current.ui.updateTemplate(template);
        previewRef.current.ui.setInputs(currentInputs);
      } else {
        const Ui = previewMode === 'form' ? Form : Viewer;
        const ui = new Ui({
          domContainer: previewRootRef.current,
          template,
          inputs: currentInputs,
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

        if (previewMode === 'form') {
          (ui as Form).onChangeInput(({ index, name, value }) => {
            setInputs((previousInputs) => {
              if (previousInputs[index]?.[name] === value) return previousInputs;
              const nextInputs = [...previousInputs];
              nextInputs[index] = { ...nextInputs[index], [name]: value };
              inputsRef.current = nextInputs;
              return nextInputs;
            });
          });
        }

        previewRef.current = { mode: previewMode, ui };
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [template, previewMode, previewRefreshKey]);

  useEffect(() => {
    if (previewMode !== 'viewer' || !previewRef.current || previewRef.current.mode !== 'viewer') {
      return;
    }

    try {
      previewRef.current.ui.setInputs(inputs);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [inputs, previewMode]);

  useEffect(() => {
    if (!template) return;

    let frameId: number | null = null;
    const refreshPreviewIfVisible = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const container = previewRootRef.current;
        const preview = previewRef.current;
        if (!container || !preview || !shouldRefreshCollapsedPreview(container)) return;

        preview.ui.destroy();
        previewRef.current = null;
        setPreviewRefreshKey((key) => key + 1);
      });
    };

    window.addEventListener('scroll', refreshPreviewIfVisible, { passive: true });
    window.addEventListener('resize', refreshPreviewIfVisible);
    const timeoutId = window.setTimeout(refreshPreviewIfVisible, 150);

    return () => {
      window.removeEventListener('scroll', refreshPreviewIfVisible);
      window.removeEventListener('resize', refreshPreviewIfVisible);
      window.clearTimeout(timeoutId);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [template, previewMode]);

  useEffect(() => {
    return () => {
      clearPendingRender(new Error('JSX render cancelled.'));
      terminateRenderWorker();
      previewRef.current?.ui.destroy();
      previewRef.current = null;
    };
  }, [clearPendingRender, terminateRenderWorker]);

  const onGeneratePdf = async () => {
    if (isGeneratingPdf) return;

    const startTimer = performance.now();
    setIsGeneratingPdf(true);
    try {
      await generatePDF(previewRef.current?.ui ?? null);
      const duration = Math.round(performance.now() - startTimer);
      setPdfDuration(duration);
      toast.info(`Generated PDF in ${duration}ms`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const onDownloadTemplate = () => {
    if (!template) return;
    downloadJsonFile(template, 'jsx-template');
  };

  const onChangePreset = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = jsxPlaygroundPresets.find((item) => item.id === event.target.value);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setSource(preset.source);
    setError(null);
    setPdfDuration(null);
  };

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gray-100 lg:overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
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
          <p className="mt-1 break-words text-xs text-gray-500">{selectedPreset?.description}</p>
          <p className="mt-1 break-words text-xs text-gray-500">
            Write a JSX function body that returns pdfme pages. Imports are intentionally disabled
            in this beta playground.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:pl-4">
          <select
            aria-label="JSX preset"
            value={selectedPresetId}
            onChange={onChangePreset}
            className="col-span-2 max-w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 sm:col-span-1 sm:min-w-40"
          >
            {jsxPlaygroundPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!template || Boolean(error)}
            onClick={onDownloadTemplate}
            className="inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
          >
            <Download className="size-4" />
            Template JSON
          </button>
          <button
            type="button"
            disabled={!template || Boolean(error) || isGeneratingPdf}
            onClick={onGeneratePdf}
            className="min-w-0 whitespace-nowrap rounded border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
          >
            {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        This beta runs JSX in an isolated worker and blocks common browser globals, but it is still
        for trusted examples. Do not paste code you do not trust.
      </div>
      <div className="grid min-w-0 flex-none grid-cols-1 gap-0 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        <section className="flex min-h-[28rem] min-w-0 flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            JSX
          </div>
          <CodeEditor
            ariaLabel="JSX"
            beforeMount={configureJsxEditor}
            inferLanguageFromPath
            language="typescript"
            onChange={setSource}
            path={JSX_EDITOR_PATH}
            value={source}
          />
        </section>
        <section className="flex min-h-[44rem] min-w-0 flex-col bg-gray-100 lg:min-h-0">
          <div className="flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span>{previewMode === 'form' ? 'Form' : 'Viewer'}</span>
              <div className="inline-flex overflow-hidden rounded border border-gray-300 normal-case tracking-normal">
                {(['viewer', 'form'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewMode(mode)}
                    className={`px-2 py-1 text-xs ${
                      previewMode === mode
                        ? 'bg-green-50 text-green-700'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {mode === 'form' ? 'Form' : 'Viewer'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 normal-case tracking-normal">
              {renderDuration !== null && <span>render {renderDuration}ms</span>}
              {pdfDuration !== null && <span>pdf {pdfDuration}ms</span>}
              {error && <span className="max-w-[32rem] truncate text-red-600">{error}</span>}
            </div>
          </div>
          <div
            ref={previewRootRef}
            className="h-[38rem] flex-none lg:h-auto lg:min-h-0 lg:flex-1"
          />
        </section>
      </div>
    </main>
  );
}
