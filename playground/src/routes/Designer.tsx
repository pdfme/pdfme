import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Code2, Copy, Download, Save } from 'lucide-react';
import { cloneDeep, Template, checkTemplate, Lang, isBlankPdf } from '@pdfme/common';
import { Designer } from '@pdfme/ui';
import {
  fromKebabCase,
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  getDefaultPlaygroundTemplate,
  readFile,
  generatePDF,
  downloadJsonFile,
  translations,
} from '../helper';
import { getPlugins } from '../plugins';
import { NavBar, NavItem } from '../components/NavBar';
import PlaygroundButton from '../components/PlaygroundButton';
import ProjectSavedToast from '../components/ProjectSavedToast';
import TemplateJsonDialog from '../components/TemplateJsonDialog';
import {
  clearActivePlaygroundProject,
  getActivePlaygroundProject,
  getPlaygroundProject,
  savePlaygroundProject,
  type PlaygroundProject,
} from '../lib/playgroundProjects';
import { createTemplateThumbnailDataUrl } from '../lib/templateThumbnails';

function destroyDesignerInstance(instance: Designer) {
  try {
    instance.destroy();
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes('this instance is already destroyed')
    ) {
      throw error;
    }
  }
}

type DesignerLoadRequest = {
  projectId: string | null;
  searchParams: URLSearchParams;
  shouldCreateNewProject: boolean;
  shouldConsumeQuery: boolean;
  templateId: string | null;
};

function getDesignerLoadRequest(): DesignerLoadRequest {
  const searchParams = new URLSearchParams(window.location.search);
  const shouldCreateNewProject = searchParams.get('new') === '1';
  const templateId = searchParams.get('template');
  const projectId = searchParams.get('project');

  return {
    projectId,
    searchParams,
    shouldCreateNewProject,
    shouldConsumeQuery: shouldCreateNewProject || templateId != null || projectId != null,
    templateId,
  };
}

type DesignerFileButtonProps = {
  accept: string;
  disabled?: boolean;
  label: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function DesignerFileButton({
  accept,
  disabled = false,
  label,
  onChange,
}: DesignerFileButtonProps) {
  return (
    <label
      aria-disabled={disabled}
      className={`inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition focus-within:outline-none focus-within:ring-2 focus-within:ring-gray-300 focus-within:ring-offset-2 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
      }`}
    >
      {label}
      <input
        disabled={disabled}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={onChange}
      />
    </label>
  );
}

function DesignerApp() {
  const [, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const projectRef = useRef<PlaygroundProject | null>(null);
  const projectTitleRef = useRef('Untitled Template');
  const loadRequestRef = useRef<DesignerLoadRequest | null>(null);
  const didCleanLoadQueryRef = useRef(false);

  const [editingStaticSchemas, setEditingStaticSchemas] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [templateJsonSource, setTemplateJsonSource] = useState<Template | null>(null);

  const setCurrentProjectTitle = useCallback((title: string) => {
    projectTitleRef.current = title;
  }, []);

  const onSaveTemplate = useCallback(
    async (template?: Template, saveAs = false) => {
      if (!designer.current) return;

      const currentProject = projectRef.current;
      const nextTemplate = template || designer.current.getTemplate();
      const currentTitle =
        (currentProject?.title ?? projectTitleRef.current) || 'Untitled Template';
      const title = saveAs
        ? window.prompt('Save as', `${currentTitle} Copy`) ?? ''
        : currentProject?.title ?? window.prompt('Project name', currentTitle) ?? '';
      if (!title.trim()) return;

      const thumbnail = await createTemplateThumbnailDataUrl(
        nextTemplate,
        currentProject?.inputs,
      ).catch(() => currentProject?.thumbnail);
      const savedProject = savePlaygroundProject({
        id: saveAs ? undefined : currentProject?.id,
        inputs: currentProject?.inputs,
        kind: currentProject?.kind ?? 'template',
        source: currentProject?.source,
        template: nextTemplate,
        thumbnail,
        title,
      });
      projectRef.current = savedProject;
      setCurrentProjectTitle(savedProject.title);
      toast.success(<ProjectSavedToast title={savedProject.title} />);
    },
    [setCurrentProjectTitle],
  );

  const buildDesigner = useCallback(async (isCancelled: () => boolean) => {
    if (!designerRef.current) return;
    try {
      let template: Template = getBlankTemplate();
      let project: PlaygroundProject | null = null;
      loadRequestRef.current ??= getDesignerLoadRequest();
      const {
        projectId: projectIdFromQuery,
        searchParams: initialSearchParams,
        shouldConsumeQuery,
        shouldCreateNewProject,
        templateId: templateIdFromQuery,
      } = loadRequestRef.current;

      if (shouldCreateNewProject) {
        clearActivePlaygroundProject();
        setCurrentProjectTitle('Untitled Template');
      } else if (projectIdFromQuery) {
        project = getPlaygroundProject(projectIdFromQuery);
        if (!project) throw new Error('Project not found');
        template = project.template;
      } else if (templateIdFromQuery) {
        const templateJson = await getTemplateById(templateIdFromQuery);
        checkTemplate(templateJson);
        template = templateJson;
        setCurrentProjectTitle(fromKebabCase(templateIdFromQuery));
      } else {
        project = getActivePlaygroundProject();
        if (project) {
          template = project.template;
        } else {
          template = await getDefaultPlaygroundTemplate();
          setCurrentProjectTitle(fromKebabCase('invoice'));
        }
      }

      projectRef.current = project;
      if (project) setCurrentProjectTitle(project.title);

      if (shouldConsumeQuery && !didCleanLoadQueryRef.current) {
        const nextSearchParams = new URLSearchParams(initialSearchParams);
        nextSearchParams.delete('new');
        nextSearchParams.delete('template');
        nextSearchParams.delete('project');
        didCleanLoadQueryRef.current = true;
        setSearchParams(nextSearchParams, { replace: true });
      }

      if (isCancelled() || !designerRef.current) return null;

      const nextDesigner = new Designer({
        domContainer: designerRef.current,
        template,
        options: {
          font: getFontsData(),
          lang: 'en',
          labels: {
            'signature.clear': '🗑️',
          },
          theme: {
            token: { colorPrimary: '#25c2a0' },
          },
          icons: {
            multiVariableText:
              '<svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24"><path d="M6.643,13.072,17.414,2.3a1.027,1.027,0,0,1,1.452,0L20.7,4.134a1.027,1.027,0,0,1,0,1.452L9.928,16.357,5,18ZM21,20H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
          },
          maxZoom: 250,
        },
        plugins: getPlugins(),
      });
      designer.current = nextDesigner;
      nextDesigner.onSaveTemplate(onSaveTemplate);
      return nextDesigner;
    } catch (error) {
      if (isCancelled()) return null;
      projectRef.current = null;
      console.error(error);
      return null;
    }
  }, [onSaveTemplate, setCurrentProjectTitle, setSearchParams]);

  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      readFile(e.target.files[0], 'dataURL').then(async (basePdf) => {
        if (designer.current) {
          const newTemplate = cloneDeep(designer.current.getTemplate());
          newTemplate.basePdf = basePdf;
          designer.current.updateTemplate(newTemplate);
        }
      });
    }
  };

  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), 'template');
      toast.success('Downloaded template JSON');
    }
  };

  const onResetTemplate = () => {
    projectRef.current = null;
    setCurrentProjectTitle('Untitled Template');
    clearActivePlaygroundProject();
    setSearchParams(new URLSearchParams([['new', '1']]), { replace: true });
    if (designer.current) {
      designer.current.updateTemplate(getBlankTemplate());
    }
  };

  const onOpenTemplateJson = () => {
    if (!designer.current) return;
    setTemplateJsonSource(cloneDeep(designer.current.getTemplate()));
    setJsonDialogOpen(true);
  };

  const onCommitTemplateJson = (template: Template) => {
    if (!designer.current) return;

    designer.current.updateTemplate(template);
    toast.success('Template JSON committed');
  };

  const toggleEditingStaticSchemas = () => {
    if (!designer.current) return;

    if (!editingStaticSchemas) {
      const currentTemplate = cloneDeep(designer.current.getTemplate());
      if (!isBlankPdf(currentTemplate.basePdf)) {
        toast.error(
          <div>
            <p>The current template cannot edit the static schema.</p>
            <a
              className="text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
              href="https://pdfme.com/docs/headers-and-footers"
            >
              See: Headers and Footers
            </a>
          </div>,
        );
        return;
      }

      setOriginalTemplate(currentTemplate);

      const { width, height } = currentTemplate.basePdf;
      const staticSchema = currentTemplate.basePdf.staticSchema || [];
      designer.current.updateTemplate({
        ...currentTemplate,
        schemas: [staticSchema],
        basePdf: { width, height, padding: [0, 0, 0, 0] },
      });

      setEditingStaticSchemas(true);
    } else {
      const editedTemplate = designer.current.getTemplate();
      if (!originalTemplate) return;
      const merged = cloneDeep(originalTemplate);
      if (!isBlankPdf(merged.basePdf)) {
        toast.error('Invalid basePdf format');
        return;
      }

      merged.basePdf.staticSchema = editedTemplate.schemas[0];
      designer.current.updateTemplate(merged);

      setOriginalTemplate(null);
      setEditingStaticSchemas(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let mountedDesigner: Designer | null = null;

    void buildDesigner(() => cancelled).then((nextDesigner) => {
      if (!nextDesigner) return;

      if (cancelled) {
        if (designer.current === nextDesigner) designer.current = null;
        destroyDesignerInstance(nextDesigner);
        return;
      }

      mountedDesigner = nextDesigner;
    });

    return () => {
      cancelled = true;
      if (!mountedDesigner) return;

      if (designer.current === mountedDesigner) designer.current = null;
      destroyDesignerInstance(mountedDesigner);
    };
  }, [buildDesigner]);

  const navItems: NavItem[] = [
    {
      label: 'Lang',
      content: (
        <select
          disabled={editingStaticSchemas}
          className={`w-full border rounded px-2 py-1 border-gray-300 ${
            editingStaticSchemas ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onChange={(e) => {
            designer.current?.updateOptions({ lang: e.target.value as Lang });
          }}
        >
          {translations.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: 'Base PDF',
      content: (
        <div className="flex gap-1">
          <DesignerFileButton
            disabled={editingStaticSchemas}
            label="Change PDF"
            accept="application/pdf"
            onChange={onChangeBasePDF}
          />
        </div>
      ),
    },
    {
      label: 'Edit',
      content: (
        <div className="flex gap-1">
          <PlaygroundButton onClick={toggleEditingStaticSchemas}>
            {editingStaticSchemas ? 'End editing' : 'Static schema'}
          </PlaygroundButton>
          <PlaygroundButton disabled={editingStaticSchemas} onClick={onOpenTemplateJson}>
            <Code2 className="size-3.5" />
            JSON
          </PlaygroundButton>
        </div>
      ),
    },
    {
      label: 'Project',
      content: (
        <div className="flex gap-1">
          <PlaygroundButton
            id="save-local"
            disabled={editingStaticSchemas}
            onClick={() => void onSaveTemplate()}
          >
            <Save className="size-3.5" />
            Save Project
          </PlaygroundButton>
          <PlaygroundButton
            id="save-as"
            disabled={editingStaticSchemas}
            onClick={() => void onSaveTemplate(undefined, true)}
          >
            <Copy className="size-3.5" />
            Save As
          </PlaygroundButton>
          <PlaygroundButton
            id="reset-template"
            disabled={editingStaticSchemas}
            onClick={onResetTemplate}
          >
            Reset
          </PlaygroundButton>
        </div>
      ),
    },
    {
      label: 'Output',
      content: (
        <div className="flex gap-1">
          <PlaygroundButton disabled={editingStaticSchemas} onClick={onDownloadTemplate}>
            <Download className="size-3.5" />
            Template JSON
          </PlaygroundButton>
          <PlaygroundButton
            id="generate-pdf"
            disabled={editingStaticSchemas}
            onClick={async (e) => {
              const output = e.altKey ? 'form' : 'pdf';
              const startTimer = performance.now();
              await generatePDF(designer.current, output);
              const endTimer = performance.now();
              toast.info(
                `Generated ${output === 'form' ? 'Form' : 'PDF'} in ${Math.round(
                  endTimer - startTimer,
                )}ms ⚡️`,
              );
            }}
          >
            Generate PDF
          </PlaygroundButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <NavBar items={navItems} />
      <div ref={designerRef} className="flex-1 w-full" />
      <TemplateJsonDialog
        isOpen={jsonDialogOpen}
        template={templateJsonSource}
        onClose={() => {
          setJsonDialogOpen(false);
          setTemplateJsonSource(null);
        }}
        onCommit={onCommitTemplateJson}
      />
    </>
  );
}

export default DesignerApp;
