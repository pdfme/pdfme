import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Template } from '@pdfme/common';
import { md2pdf } from '@pdfme/converter/md2pdf';
import { Viewer } from '@pdfme/ui';
import { Copy, ExternalLink, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { generatePDF, getFontsData } from '../helper';
import { getPlugins } from '../plugins';
import CodeEditor from '../components/CodeEditor';
import PlaygroundButton from '../components/PlaygroundButton';
import ProjectSavedToast from '../components/ProjectSavedToast';
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

const MD2PDF_DOCS_URL = 'https://pdfme.com/docs/converter#md2pdf-beta';
const FALLBACK_MARKDOWN = '# md2pdf playground\n\nWrite Markdown on the left to preview a PDF.';

export default function Md2Pdf() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageRootRef = useRef<HTMLElement | null>(null);
  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const projectRef = useRef<PlaygroundProject | null>(null);
  const didLoadInitialStarterRef = useRef(false);
  const [presets, setPresets] = useState<AuthoringStarter[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [markdown, setMarkdown] = useState(FALLBACK_MARKDOWN);
  const [template, setTemplate] = useState<Template | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>[]>([{}]);
  const [error, setError] = useState<string | null>(null);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [pdfDuration, setPdfDuration] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [viewerRefreshKey, setViewerRefreshKey] = useState(0);
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const sourceTitle = projectRef.current?.title ?? selectedPreset?.label ?? 'Custom Markdown';

  useEffect(() => {
    let cancelled = false;
    void loadAuthoringStarters('md2pdf')
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
      const nextMarkdown = await loadAuthoringStarterSource(preset);
      if (cancelled) return;

      consumeQuery();
      projectRef.current = null;
      didLoadInitialStarterRef.current = true;
      setSelectedPresetId(preset.id);
      setMarkdown(nextMarkdown);
      setError(null);
      setPdfDuration(null);
    };

    const loadProject = async (projectId: string) => {
      const project = await getPlaygroundProject(projectId);
      if (cancelled) return;
      if (!project || project.kind !== 'md2pdf' || !project.source) {
        toast.error('md2pdf project not found');
        return;
      }

      consumeQuery();
      projectRef.current = project;
      setSelectedPresetId(project.source.presetId ?? '');
      setMarkdown(project.source.content);
      setTemplate(project.template);
      setInputs(project.inputs);
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
        if (presetId) toast.error('md2pdf starter not found');
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

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const startTimer = performance.now();
      try {
        const result = await md2pdf(markdown, {
          style: {
            fontName: 'NotoSansJP',
            lineHeight: 1.3,
          },
        });
        if (cancelled) return;
        setTemplate(result.template);
        setInputs(result.inputs);
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
  }, [markdown]);

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
  }, [template, inputs, viewerRefreshKey]);

  const refreshCollapsedViewer = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.destroy();
    viewerRef.current = null;
    setViewerRefreshKey((key) => key + 1);
  }, []);

  useRefreshCollapsedPreview({
    containerRef: viewerRootRef,
    enabled: template != null,
    onRefresh: refreshCollapsedViewer,
    scrollRootRef: pageRootRef,
  });

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
      const generated = await generatePDF(viewerRef.current);
      if (generated) {
        const duration = Math.round(performance.now() - startTimer);
        setPdfDuration(duration);
        toast.info(`Generated PDF in ${duration}ms`);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const onSaveProject = async (saveAs = false) => {
    if (!template) return;

    const currentTitle = projectRef.current?.title ?? `md2pdf - ${sourceTitle}`;
    const title = saveAs
      ? (window.prompt('Save as', `${currentTitle} Copy`) ?? '')
      : (projectRef.current?.title ?? window.prompt('Project name', currentTitle) ?? '');
    if (!title.trim()) return;

    try {
      const thumbnail = await createTemplateThumbnailDataUrl(template, inputs).catch(
        () => projectRef.current?.thumbnail,
      );
      const savedProject = await savePlaygroundProject({
        id: saveAs ? undefined : projectRef.current?.id,
        inputs,
        kind: 'md2pdf',
        source: {
          content: markdown,
          language: 'markdown',
          presetId: selectedPresetId,
          route: '/md2pdf',
        },
        template,
        thumbnail,
        title,
      });
      projectRef.current = savedProject;
      toast.success(<ProjectSavedToast title={savedProject.title} />);
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
            <h1 className="text-sm font-semibold text-gray-900">md2pdf (beta)</h1>
            <a
              href={MD2PDF_DOCS_URL}
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
            GFM support is intentionally partial: complex table/list content and remote images are
            simplified.
          </p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:pl-4">
          <PlaygroundButton
            disabled={!template || Boolean(error)}
            onClick={() => void onSaveProject()}
          >
            <Save className="size-4" />
            Save Project
          </PlaygroundButton>
          <PlaygroundButton
            disabled={!template || Boolean(error)}
            onClick={() => void onSaveProject(true)}
          >
            <Copy className="size-4" />
            Save As
          </PlaygroundButton>
          <PlaygroundButton
            disabled={!template || Boolean(error) || isGeneratingPdf}
            onClick={onGeneratePdf}
            className="col-span-2 sm:col-span-1"
          >
            {isGeneratingPdf ? 'Generating...' : 'Generate PDF'}
          </PlaygroundButton>
        </div>
      </div>
      <div className="grid min-w-0 flex-none grid-cols-1 gap-0 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        <section className="flex min-h-[28rem] min-w-0 flex-col border-b border-gray-200 bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Markdown
          </div>
          <CodeEditor
            ariaLabel="Markdown"
            language="markdown"
            onChange={setMarkdown}
            path="md2pdf.md"
            value={markdown}
          />
        </section>
        <section className="flex min-h-[44rem] min-w-0 flex-col bg-gray-100 lg:min-h-0">
          <div className="flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Viewer</span>
            <div className="flex items-center gap-3 normal-case tracking-normal">
              {renderDuration !== null && <span>render {renderDuration}ms</span>}
              {pdfDuration !== null && <span>pdf {pdfDuration}ms</span>}
              {error && <span className="text-red-600">{error}</span>}
            </div>
          </div>
          <div ref={viewerRootRef} className="h-[38rem] flex-none lg:h-auto lg:min-h-0 lg:flex-1" />
        </section>
      </div>
    </main>
  );
}
