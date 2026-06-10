import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkTemplate, type Template } from '@pdfme/common';
import type { RenderResult } from '@pdfme/jsx';
import { Viewer } from '@pdfme/ui';
import { Copy, Download, ExternalLink, PencilRuler, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import CodeEditor from '../components/CodeEditor';
import PlaygroundButton from '../components/PlaygroundButton';
import ProjectSavedToast from '../components/ProjectSavedToast';
import { downloadJsonFile, generatePDF, getFontsData } from '../helper';
import { getPlugins } from '../plugins';
import JsxPlaygroundWorker from './jsxPlaygroundWorker?worker';
import { useRefreshCollapsedPreview } from './useRefreshCollapsedPreview';
import {
  loadAuthoringStarters,
  loadAuthoringStarterSource,
  type AuthoringStarter,
} from '../lib/authoringStarters';
import { getErrorMessage } from '../lib/errors';
import {
  getPlaygroundProject,
  savePlaygroundProject,
  type PlaygroundProject,
} from '../lib/playgroundProjects';
import { createTemplateThumbnailDataUrl } from '../lib/templateThumbnails';

const JSX_DOCS_URL = 'https://pdfme.com/docs/jsx#jsx-playground-beta';
const JSX_EDITOR_PATH = 'file:///jsx-playground.tsx';
const RENDER_TIMEOUT_MS = 15_000;
const FALLBACK_JSX_SOURCE = `return (
  <Page>
    <Text>Hello from JSX</Text>
  </Page>
);`;

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

const configureJsxEditor: Parameters<typeof CodeEditor>[0]['beforeMount'] = (monaco) => {
  const typeScriptLanguage = monaco.languages.typescript;
  if (!typeScriptLanguage) return;

  typeScriptLanguage.typescriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    jsx: typeScriptLanguage.JsxEmit.React,
    jsxFactory: 'createElement',
    jsxFragmentFactory: 'Fragment',
    lib: ['es2020'],
    moduleResolution: typeScriptLanguage.ModuleResolutionKind.NodeJs,
    target: typeScriptLanguage.ScriptTarget.ES2020,
  });
  typeScriptLanguage.typescriptDefaults.addExtraLib(
    `
declare const Fragment: unique symbol;
declare function Document(props: Record<string, unknown>): unknown;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageRootRef = useRef<HTMLElement | null>(null);
  const previewRootRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<Viewer | null>(null);
  const inputsRef = useRef<Record<string, string>[]>([{}]);
  const projectRef = useRef<PlaygroundProject | null>(null);
  const savedInputsForSourceRef = useRef<{
    inputs: Record<string, string>[];
    source: string;
  } | null>(null);
  const didLoadInitialStarterRef = useRef(false);
  const renderWorkerRef = useRef<Worker | null>(null);
  const pendingRenderRef = useRef<PendingRender | null>(null);
  const nextRenderRequestIdRef = useRef(0);
  const [presets, setPresets] = useState<AuthoringStarter[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [source, setSource] = useState(FALLBACK_JSX_SOURCE);
  const [template, setTemplate] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [pdfDuration, setPdfDuration] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const sourceTitle = projectRef.current?.title ?? selectedPreset?.label ?? 'Custom JSX';

  useEffect(() => {
    let cancelled = false;
    void loadAuthoringStarters('jsx')
      .then((starters) => {
        if (cancelled) return;
        setPresets(starters);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const projectId = searchParams.get('project');
    const presetId = searchParams.get('preset');
    if (!projectId && !presetId && didLoadInitialStarterRef.current) return;
    if (presets.length === 0 && !projectId) return;

    let cancelled = false;

    const consumeQuery = () => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('project');
      nextSearchParams.delete('preset');
      setSearchParams(nextSearchParams, { replace: true });
    };

    const loadPreset = async (preset: AuthoringStarter) => {
      const nextSource = await loadAuthoringStarterSource(preset);
      if (cancelled) return;

      consumeQuery();
      projectRef.current = null;
      savedInputsForSourceRef.current = null;
      didLoadInitialStarterRef.current = true;
      setSelectedPresetId(preset.id);
      setSource(nextSource);
      setError(null);
      setPdfDuration(null);
    };

    const loadProject = async (projectId: string) => {
      const project = await getPlaygroundProject(projectId);
      if (cancelled) return;
      if (!project || project.kind !== 'jsx' || !project.source) {
        toast.error('JSX project not found');
        return;
      }

      consumeQuery();
      projectRef.current = project;
      savedInputsForSourceRef.current = {
        inputs: project.inputs,
        source: project.source.content,
      };
      setSelectedPresetId(project.source.presetId ?? '');
      setSource(project.source.content);
      setTemplate(project.template);
      setInputs(project.inputs);
      inputsRef.current = project.inputs;
      didLoadInitialStarterRef.current = true;
    };

    if (projectId) {
      void loadProject(projectId).catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err));
      });
    } else {
      const preset = presetId
        ? presets.find((item) => item.id === presetId || item.assetName === presetId)
        : presets[0];
      if (!preset) {
        if (presetId) toast.error('JSX starter not found');
        return;
      }

      void loadPreset(preset).catch((err) => {
        if (cancelled) return;
        toast.error(getErrorMessage(err));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [presets, searchParams, setSearchParams]);

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
        const savedInputsForSource = savedInputsForSourceRef.current;
        const nextInputs =
          savedInputsForSource?.source === source ? savedInputsForSource.inputs : result.inputs;
        setTemplate(result.template);
        setInputs(nextInputs);
        inputsRef.current = nextInputs;
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
      if (previewRef.current) {
        previewRef.current.updateTemplate(template);
        previewRef.current.setInputs(currentInputs);
      } else {
        previewRef.current = new Viewer({
          domContainer: previewRootRef.current,
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
          template,
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [inputs, template, previewRefreshKey]);

  const refreshCollapsedPreview = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;

    preview.destroy();
    previewRef.current = null;
    setPreviewRefreshKey((key) => key + 1);
  }, []);

  useRefreshCollapsedPreview({
    containerRef: previewRootRef,
    enabled: template != null,
    onRefresh: refreshCollapsedPreview,
    scrollRootRef: pageRootRef,
  });

  useEffect(() => {
    return () => {
      clearPendingRender(new Error('JSX render cancelled.'));
      terminateRenderWorker();
      previewRef.current?.destroy();
      previewRef.current = null;
    };
  }, [clearPendingRender, terminateRenderWorker]);

  const onGeneratePdf = async () => {
    if (isGeneratingPdf) return;

    const startTimer = performance.now();
    setIsGeneratingPdf(true);
    try {
      const generated = await generatePDF(previewRef.current);
      if (generated) {
        const duration = Math.round(performance.now() - startTimer);
        setPdfDuration(duration);
        toast.info(`Generated PDF in ${duration}ms`);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const onDownloadTemplate = () => {
    if (!template) return;
    downloadJsonFile(template, 'jsx-template');
  };

  const saveCurrentProject = async (title?: string, saveAs = false) => {
    if (!template) return null;

    const currentTitle = projectRef.current?.title ?? `JSX - ${sourceTitle}`;
    const projectTitle =
      title ??
      (saveAs
        ? window.prompt('Save as', `${currentTitle} Copy`)
        : (projectRef.current?.title ?? window.prompt('Project name', currentTitle))) ??
      '';
    if (!projectTitle.trim()) return null;

    const thumbnail = await createTemplateThumbnailDataUrl(template, inputsRef.current).catch(
      () => projectRef.current?.thumbnail,
    );
    const savedProject = await savePlaygroundProject({
      id: saveAs ? undefined : projectRef.current?.id,
      inputs: inputsRef.current,
      kind: 'jsx',
      source: {
        content: source,
        language: 'jsx',
        presetId: selectedPresetId,
        route: '/jsx',
      },
      template,
      thumbnail,
      title: projectTitle,
    });
    projectRef.current = savedProject;
    savedInputsForSourceRef.current = {
      inputs: savedProject.inputs,
      source,
    };
    return savedProject;
  };

  const onSaveProject = async () => {
    try {
      checkTemplate(template);
      const savedProject = await saveCurrentProject();
      if (savedProject) toast.success(<ProjectSavedToast title={savedProject.title} />);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onSaveAsProject = async () => {
    try {
      checkTemplate(template);
      const savedProject = await saveCurrentProject(undefined, true);
      if (savedProject) toast.success(<ProjectSavedToast title={savedProject.title} />);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onOpenDesigner = async () => {
    if (!template) return;

    try {
      checkTemplate(template);
      const savedProject = await saveCurrentProject(
        projectRef.current?.title ?? `JSX - ${sourceTitle}`,
      );
      if (!savedProject) return;
      toast.success(`Saved "${savedProject.title}" — opening Designer`);
      navigate(`/designer?project=${encodeURIComponent(savedProject.id)}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <main
      ref={pageRootRef}
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gray-100 lg:overflow-hidden"
    >
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
          <p className="mt-1 break-words text-xs text-gray-500">
            {sourceTitle}
            {selectedPreset?.description ? ` - ${selectedPreset.description}` : ''}
          </p>
          <p className="mt-1 break-words text-xs text-gray-500">
            Write a JSX function body that returns a pdfme Document or Page nodes. Imports are
            intentionally disabled in this beta playground.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:pl-4">
          <PlaygroundButton disabled={!template || Boolean(error)} onClick={onDownloadTemplate}>
            <Download className="size-4" />
            Template JSON
          </PlaygroundButton>
          <PlaygroundButton
            disabled={!template || Boolean(error)}
            onClick={() => void onSaveProject()}
          >
            <Save className="size-4" />
            Save Project
          </PlaygroundButton>
          <PlaygroundButton
            disabled={!template || Boolean(error)}
            onClick={() => void onSaveAsProject()}
          >
            <Copy className="size-4" />
            Save As
          </PlaygroundButton>
          <PlaygroundButton
            disabled={!template || Boolean(error)}
            onClick={() => void onOpenDesigner()}
          >
            <PencilRuler className="size-4" />
            Open Designer
          </PlaygroundButton>
          <PlaygroundButton
            disabled={!template || Boolean(error) || isGeneratingPdf}
            onClick={onGeneratePdf}
          >
            {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
          </PlaygroundButton>
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
            <span>Viewer</span>
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
