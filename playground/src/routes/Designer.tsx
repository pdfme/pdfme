import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Code2, Copy, Download, Eye, Save } from 'lucide-react';
import { cloneDeep, Template, checkTemplate, Lang, isBlankPdf } from '@pdfme/common';
import { Designer, type DesignerSelection } from '@pdfme/ui';
import {
  getFontsData,
  getTemplateById,
  getTemplateMetadataById,
  getBlankTemplate,
  getDefaultPlaygroundTemplate,
  getDefaultPlaygroundTemplateMetadata,
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
  PDFME_AGENT_HOST_DESTROYED_EVENT,
  PDFME_AGENT_HOST_READY_EVENT,
  type PdfmeAgentHost,
} from '../lib/pdfmeAgentHost';
import { isPdfmeAgentEnabled } from '../lib/pdfmeAgentLoader';
import { getErrorMessage } from '../lib/errors';
import {
  clearActivePlaygroundProject,
  getActivePlaygroundProject,
  getPlaygroundProject,
  savePlaygroundProject,
  type PlaygroundProject,
} from '../lib/playgroundProjects';
import { createTemplateThumbnailDataUrl } from '../lib/templateThumbnails';
import {
  FileWorkspaceTemplateDeletedError,
  FileWorkspaceTemplateInvalidError,
  createTemplateEntryFromTemplate,
  findTemplateEntry,
  readTemplateEntry,
  readTemplateEntryMetadata,
  refreshTemplateCollection,
  restorePersistedTemplateCollection,
  serializeTemplateForFileWorkspace,
  setSelectedFileWorkspaceTemplateName,
  subscribeTemplateEntryChanges,
  writeTemplateEntry,
  writeTemplateEntryMetadata,
  writeTemplateThumbnail,
  type FileWorkspaceCollection,
  type FileWorkspaceTemplateEntry,
  type FileWorkspaceTemplateRead,
} from '../lib/fileWorkspace';
import {
  createPlaygroundTemplateRoute,
  type PlaygroundTemplateRouteSource,
} from '../lib/playgroundRoutes';

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
  workspaceTemplateName: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const serializeAgentMetadata = (metadata: unknown) => JSON.stringify(metadata ?? null);

const cloneMetadata = (metadata: unknown): Record<string, unknown> | null =>
  isRecord(metadata) ? cloneDeep(metadata) : null;

const mergeMetadataTitle = (metadata: Record<string, unknown> | null, title: string) => ({
  ...metadata,
  title,
});

type FileWorkspaceStatus = 'deleted' | 'invalid' | null;

type FileWorkspaceConflict = {
  incoming?: FileWorkspaceTemplateRead;
  message: string;
  saveTemplate?: Template;
};

type PreviewNavigationRequest = {
  requiresSave: boolean;
  targetPath: string;
};

function createDesignerLoadRequest(searchParams: URLSearchParams): DesignerLoadRequest {
  const shouldCreateNewProject = searchParams.get('new') === '1';
  const templateId = searchParams.get('template');
  const projectId = searchParams.get('project');
  const workspaceTemplateName = searchParams.get('workspace');

  return {
    projectId,
    searchParams: new URLSearchParams(searchParams),
    shouldCreateNewProject,
    shouldConsumeQuery: shouldCreateNewProject,
    templateId,
    workspaceTemplateName,
  };
}

function getDesignerLoadRequest(): DesignerLoadRequest {
  return createDesignerLoadRequest(new URLSearchParams(window.location.search));
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const searchParamsRef = useRef(searchParams);
  const projectRef = useRef<PlaygroundProject | null>(null);
  const fileWorkspaceCollectionRef = useRef<FileWorkspaceCollection | null>(null);
  const fileWorkspaceEntryRef = useRef<FileWorkspaceTemplateEntry | null>(null);
  const diskVersionRef = useRef<string | null>(null);
  const lastCleanSerializedTemplateRef = useRef<string | null>(null);
  const lastCleanBrowserProjectTemplateRef = useRef<string | null>(null);
  const isApplyingTemplateRef = useRef(false);
  const isSavingFileWorkspaceRef = useRef(false);
  const isFileWorkspaceDirtyRef = useRef(false);
  const fileWorkspaceStatusRef = useRef<FileWorkspaceStatus>(null);
  const projectTitleRef = useRef('Untitled Template');
  const currentMetadataRef = useRef<Record<string, unknown> | null>(null);
  const agentSelectionRef = useRef<DesignerSelection | null>(null);
  const agentSelectionListenersRef = useRef(
    new Set<(selection: DesignerSelection | null) => void>(),
  );
  const editingStaticSchemasRef = useRef(false);
  const loadRequestRef = useRef<DesignerLoadRequest | null>(null);
  const didCleanLoadQueryRef = useRef(false);

  const [editingStaticSchemas, setEditingStaticSchemas] = useState(false);
  const [fileWorkspaceEntry, setFileWorkspaceEntry] = useState<FileWorkspaceTemplateEntry | null>(
    null,
  );
  const [fileWorkspaceStatus, setFileWorkspaceStatus] = useState<FileWorkspaceStatus>(null);
  const [fileWorkspaceConflict, setFileWorkspaceConflict] = useState<FileWorkspaceConflict | null>(
    null,
  );
  const [isFileWorkspaceDirty, setIsFileWorkspaceDirty] = useState(false);
  const [isBrowserProjectDirty, setIsBrowserProjectDirty] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);
  const [pendingPreviewNavigation, setPendingPreviewNavigation] =
    useState<PreviewNavigationRequest | null>(null);
  const [isSavingPreviewNavigation, setIsSavingPreviewNavigation] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [templateJsonSource, setTemplateJsonSource] = useState<Template | null>(null);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    editingStaticSchemasRef.current = editingStaticSchemas;
  }, [editingStaticSchemas]);

  const setCurrentProjectTitle = useCallback((title: string) => {
    projectTitleRef.current = title;
  }, []);

  const setActiveFileWorkspaceEntry = useCallback(
    (collection: FileWorkspaceCollection | null, entry: FileWorkspaceTemplateEntry | null) => {
      fileWorkspaceCollectionRef.current = collection;
      fileWorkspaceEntryRef.current = entry;
      diskVersionRef.current = entry?.diskVersion ?? null;
      lastCleanSerializedTemplateRef.current = entry
        ? serializeTemplateForFileWorkspace(entry.template)
        : null;
      lastCleanBrowserProjectTemplateRef.current = null;
      setFileWorkspaceEntry(entry);
      setFileWorkspaceStatus(null);
      setFileWorkspaceConflict(null);
      setIsFileWorkspaceDirty(false);
      setIsBrowserProjectDirty(false);
      if (entry) setCurrentProjectTitle(entry.title);
      if (!entry) currentMetadataRef.current = null;
    },
    [setCurrentProjectTitle],
  );

  const setCleanBrowserProjectTemplate = useCallback((template: Template | null) => {
    lastCleanBrowserProjectTemplateRef.current = template
      ? serializeTemplateForFileWorkspace(template)
      : null;
    setIsBrowserProjectDirty(false);
  }, []);

  const updateFileWorkspaceDirtyState = useCallback((template: Template) => {
    const cleanTemplate = lastCleanSerializedTemplateRef.current;
    const dirty =
      cleanTemplate != null && serializeTemplateForFileWorkspace(template) !== cleanTemplate;
    isFileWorkspaceDirtyRef.current = dirty;
    setIsFileWorkspaceDirty(dirty);
  }, []);

  const updateBrowserProjectDirtyState = useCallback((template: Template) => {
    const cleanTemplate = lastCleanBrowserProjectTemplateRef.current;
    const dirty =
      cleanTemplate != null && serializeTemplateForFileWorkspace(template) !== cleanTemplate;
    setIsBrowserProjectDirty(dirty);
  }, []);

  const applyTemplateFromDisk = useCallback(
    (entry: FileWorkspaceTemplateEntry, readResult: FileWorkspaceTemplateRead) => {
      if (!designer.current) return;

      isApplyingTemplateRef.current = true;
      try {
        designer.current.updateTemplate(readResult.template);
      } finally {
        isApplyingTemplateRef.current = false;
      }

      const nextEntry: FileWorkspaceTemplateEntry = {
        ...entry,
        diskVersion: readResult.diskVersion,
        template: readResult.template,
        updatedAt: readResult.templateFile.lastModified,
      };
      fileWorkspaceEntryRef.current = nextEntry;
      diskVersionRef.current = readResult.diskVersion;
      lastCleanSerializedTemplateRef.current = serializeTemplateForFileWorkspace(
        readResult.template,
      );
      setFileWorkspaceEntry(nextEntry);
      setFileWorkspaceStatus(null);
      setFileWorkspaceConflict(null);
      setIsFileWorkspaceDirty(false);
    },
    [],
  );

  const onSaveTemplate = useCallback(
    async (template?: Template, saveAs = false) => {
      if (!designer.current) return false;

      const currentFileEntry = fileWorkspaceEntryRef.current;
      const currentFileCollection = fileWorkspaceCollectionRef.current;
      if (currentFileEntry && currentFileCollection) {
        const nextTemplate = template || designer.current.getTemplate();
        let targetEntry = currentFileEntry;

        if (saveAs) {
          const title =
            window.prompt('Save as', `${currentFileEntry.title || currentFileEntry.name} Copy`) ??
            '';
          if (!title.trim()) return false;

          targetEntry = await createTemplateEntryFromTemplate(
            currentFileCollection,
            nextTemplate,
            title,
          );
          const nextSearchParams = new URLSearchParams(searchParamsRef.current);
          nextSearchParams.set('workspace', targetEntry.name);
          nextSearchParams.delete('new');
          nextSearchParams.delete('template');
          nextSearchParams.delete('project');
          loadRequestRef.current = createDesignerLoadRequest(nextSearchParams);
          setSearchParams(nextSearchParams, { replace: true });
        } else if (diskVersionRef.current) {
          try {
            const diskRead = await readTemplateEntry(currentFileEntry);
            if (diskRead.diskVersion !== diskVersionRef.current) {
              setFileWorkspaceConflict({
                incoming: diskRead,
                message: `${currentFileEntry.path} changed on disk since it was loaded.`,
                saveTemplate: nextTemplate,
              });
              return false;
            }
          } catch (error) {
            if (
              !(error instanceof FileWorkspaceTemplateDeletedError) &&
              !(error instanceof FileWorkspaceTemplateInvalidError)
            ) {
              throw error;
            }
          }
        }

        isSavingFileWorkspaceRef.current = true;
        try {
          const savedEntry = await writeTemplateEntry(targetEntry, nextTemplate);
          let nextEntry = savedEntry;
          try {
            const thumbnail = await writeTemplateThumbnail(savedEntry, nextTemplate);
            nextEntry = {
              ...savedEntry,
              thumbnailDataUrl: thumbnail.thumbnailDataUrl,
            };
          } catch (error) {
            console.warn(error);
            toast.warn('Saved template, but thumbnail update failed');
          }

          const refreshedCollection = await refreshTemplateCollection({
            ...currentFileCollection,
            selectedTemplateName: nextEntry.name,
          }).catch(() => currentFileCollection);
          const refreshedEntry =
            findTemplateEntry(refreshedCollection, nextEntry.name) ?? nextEntry;
          fileWorkspaceCollectionRef.current = refreshedCollection;
          fileWorkspaceEntryRef.current = refreshedEntry;
          diskVersionRef.current = refreshedEntry.diskVersion;
          lastCleanSerializedTemplateRef.current = serializeTemplateForFileWorkspace(
            refreshedEntry.template,
          );
          setFileWorkspaceEntry(refreshedEntry);
          setFileWorkspaceStatus(null);
          setFileWorkspaceConflict(null);
          setIsFileWorkspaceDirty(false);
          setCurrentProjectTitle(refreshedEntry.title);
          await setSelectedFileWorkspaceTemplateName(
            refreshedCollection.rootHandle,
            refreshedEntry.name,
          );
          toast.success(
            <ProjectSavedToast
              formPath={`/form-viewer?workspace=${encodeURIComponent(refreshedEntry.name)}`}
              title={refreshedEntry.path}
            />,
          );
        } finally {
          isSavingFileWorkspaceRef.current = false;
        }
        return true;
      }

      const currentProject = projectRef.current;
      const nextTemplate = template || designer.current.getTemplate();
      const currentTitle =
        (currentProject?.title ?? projectTitleRef.current) || 'Untitled Template';
      const title = saveAs
        ? (window.prompt('Save as', `${currentTitle} Copy`) ?? '')
        : (currentProject?.title ?? window.prompt('Project name', currentTitle) ?? '');
      if (!title.trim()) return false;

      const thumbnail = await createTemplateThumbnailDataUrl(nextTemplate).catch(
        () => currentProject?.thumbnail,
      );
      const nextMetadata = mergeMetadataTitle(
        currentMetadataRef.current ?? currentProject?.metadata ?? null,
        title,
      );
      let savedProject: PlaygroundProject;
      try {
        savedProject = await savePlaygroundProject({
          id: saveAs ? undefined : currentProject?.id,
          inputs: currentProject?.inputs,
          kind: currentProject?.kind ?? 'template',
          metadata: nextMetadata,
          source: currentProject?.source,
          template: nextTemplate,
          thumbnail,
          title,
        });
      } catch (error) {
        console.error(error);
        toast.error(getErrorMessage(error));
        return false;
      }
      projectRef.current = savedProject;
      currentMetadataRef.current = savedProject.metadata ?? null;
      setCleanBrowserProjectTemplate(savedProject.template);
      setCurrentProjectTitle(savedProject.title);
      const nextSearchParams = new URLSearchParams(searchParamsRef.current);
      nextSearchParams.set('project', savedProject.id);
      nextSearchParams.delete('new');
      nextSearchParams.delete('template');
      nextSearchParams.delete('workspace');
      loadRequestRef.current = createDesignerLoadRequest(nextSearchParams);
      setSearchParams(nextSearchParams, { replace: true });
      toast.success(
        <ProjectSavedToast
          formPath={`/form-viewer?project=${encodeURIComponent(savedProject.id)}`}
          title={savedProject.title}
        />,
      );
      return true;
    },
    [setCleanBrowserProjectTemplate, setCurrentProjectTitle, setSearchParams],
  );

  const buildDesigner = useCallback(
    async (isCancelled: () => boolean) => {
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
          workspaceTemplateName,
        } = loadRequestRef.current;

        if (templateIdFromQuery) {
          setActiveFileWorkspaceEntry(null, null);
          const [templateJson, metadata] = await Promise.all([
            getTemplateById(templateIdFromQuery),
            getTemplateMetadataById(templateIdFromQuery),
          ]);
          template = templateJson;
          currentMetadataRef.current = metadata;
          setCurrentProjectTitle(metadata.title);
        } else if (workspaceTemplateName) {
          const restored = await restorePersistedTemplateCollection();
          if (restored.status !== 'mounted') {
            throw new Error('Mounted folder is not available. Reopen it from Templates.');
          }

          const entry = findTemplateEntry(restored.collection, workspaceTemplateName);
          if (!entry) {
            throw new Error(
              `Template "${workspaceTemplateName}" was not found in the mounted folder.`,
            );
          }

          template = entry.template;
          currentMetadataRef.current = await readTemplateEntryMetadata(entry);
          await setSelectedFileWorkspaceTemplateName(restored.collection.rootHandle, entry.name);
          setActiveFileWorkspaceEntry(
            { ...restored.collection, selectedTemplateName: entry.name },
            entry,
          );
        } else if (shouldCreateNewProject) {
          setActiveFileWorkspaceEntry(null, null);
          currentMetadataRef.current = null;
          await clearActivePlaygroundProject();
          setCurrentProjectTitle('Untitled Template');
        } else if (projectIdFromQuery) {
          setActiveFileWorkspaceEntry(null, null);
          project = await getPlaygroundProject(projectIdFromQuery);
          if (!project) throw new Error('Project not found');
          template = project.template;
          currentMetadataRef.current = project.metadata ?? null;
        } else {
          setActiveFileWorkspaceEntry(null, null);
          project = await getActivePlaygroundProject();
          if (project) {
            template = project.template;
            currentMetadataRef.current = project.metadata ?? null;
          } else {
            const [defaultTemplate, metadata] = await Promise.all([
              getDefaultPlaygroundTemplate(),
              getDefaultPlaygroundTemplateMetadata(),
            ]);
            template = defaultTemplate;
            currentMetadataRef.current = metadata;
            setCurrentProjectTitle(metadata.title);
          }
        }

        projectRef.current = project;
        if (fileWorkspaceEntryRef.current) {
          setCleanBrowserProjectTemplate(null);
        } else {
          setCleanBrowserProjectTemplate(template);
        }
        if (project) setCurrentProjectTitle(project.title);

        if (shouldConsumeQuery && !didCleanLoadQueryRef.current) {
          const nextSearchParams = new URLSearchParams(initialSearchParams);
          nextSearchParams.delete('new');
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
            maxZoom: 300,
          },
          plugins: getPlugins(),
        });
        designer.current = nextDesigner;
        agentSelectionRef.current = nextDesigner.getSelection();
        nextDesigner.onChangeSelection((selection) => {
          agentSelectionRef.current = selection;
          agentSelectionListenersRef.current.forEach((listener) => listener(selection));
        });
        nextDesigner.onSaveTemplate(onSaveTemplate);
        nextDesigner.onChangeTemplate((nextTemplate) => {
          if (isApplyingTemplateRef.current) return;
          if (fileWorkspaceEntryRef.current) {
            updateFileWorkspaceDirtyState(nextTemplate);
            return;
          }
          updateBrowserProjectDirtyState(nextTemplate);
        });
        return nextDesigner;
      } catch (error) {
        if (isCancelled()) return null;
        projectRef.current = null;
        setActiveFileWorkspaceEntry(null, null);
        console.error(error);
        toast.error(getErrorMessage(error));
        return null;
      }
    },
    [
      onSaveTemplate,
      setActiveFileWorkspaceEntry,
      setCleanBrowserProjectTemplate,
      setCurrentProjectTitle,
      setSearchParams,
      updateBrowserProjectDirtyState,
      updateFileWorkspaceDirtyState,
    ],
  );

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

  const onResetTemplate = async () => {
    if (fileWorkspaceEntryRef.current && designer.current) {
      const entry = fileWorkspaceEntryRef.current;
      isApplyingTemplateRef.current = true;
      try {
        designer.current.updateTemplate(entry.template);
      } finally {
        isApplyingTemplateRef.current = false;
      }
      lastCleanSerializedTemplateRef.current = serializeTemplateForFileWorkspace(entry.template);
      setIsFileWorkspaceDirty(false);
      return;
    }

    projectRef.current = null;
    currentMetadataRef.current = null;
    setCurrentProjectTitle('Untitled Template');
    await clearActivePlaygroundProject();
    const nextSearchParams = new URLSearchParams([['new', '1']]);
    loadRequestRef.current = createDesignerLoadRequest(nextSearchParams);
    didCleanLoadQueryRef.current = false;
    setSearchParams(nextSearchParams, { replace: true });
    if (designer.current) {
      const blankTemplate = getBlankTemplate();
      setCleanBrowserProjectTemplate(blankTemplate);
      designer.current.updateTemplate(blankTemplate);
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

  const onReloadConflictFromDisk = () => {
    const currentEntry = fileWorkspaceEntryRef.current;
    const incoming = fileWorkspaceConflict?.incoming;
    if (!currentEntry || !incoming) {
      setFileWorkspaceConflict(null);
      return;
    }

    applyTemplateFromDisk(currentEntry, incoming);
  };

  const onKeepConflictEditing = useCallback(() => {
    const incoming = fileWorkspaceConflict?.incoming;
    if (incoming) {
      diskVersionRef.current = incoming.diskVersion;
    }
    setFileWorkspaceConflict(null);
  }, [fileWorkspaceConflict]);

  const onSaveOverConflict = async () => {
    if (!designer.current) return;

    const currentConflict = fileWorkspaceConflict;
    const template = fileWorkspaceConflict?.saveTemplate ?? designer.current.getTemplate();
    if (fileWorkspaceConflict?.incoming) {
      diskVersionRef.current = fileWorkspaceConflict.incoming.diskVersion;
    }
    try {
      await onSaveTemplate(template);
      setFileWorkspaceConflict(null);
    } catch (error) {
      console.error(error);
      setFileWorkspaceConflict(currentConflict);
      toast.error(error instanceof Error ? error.message : 'Failed to save over disk');
    }
  };

  const applyAgentTemplateUpdate: PdfmeAgentHost['applyTemplateUpdate'] = useCallback(
    async ({ baseMetadata, baseTemplate, metadata, template }) => {
      if (!designer.current) throw new Error('Designer is not ready');

      const currentProject = projectRef.current;
      if (currentProject && currentProject.kind !== 'template') {
        throw new Error('AI edits are currently supported for template browser projects only');
      }

      checkTemplate(template as Template);
      const nextTemplate = cloneDeep(template as Template);
      const nextMetadata = cloneMetadata(metadata);

      if (
        baseTemplate &&
        serializeTemplateForFileWorkspace(designer.current.getTemplate()) !==
          serializeTemplateForFileWorkspace(baseTemplate as Template)
      ) {
        throw new Error(
          'Template changed while the agent was editing. The AI update was not applied.',
        );
      }
      if (
        metadata !== undefined &&
        baseMetadata !== undefined &&
        serializeAgentMetadata(currentMetadataRef.current) !== serializeAgentMetadata(baseMetadata)
      ) {
        throw new Error(
          'Template metadata changed while the agent was editing. The AI metadata update was not applied.',
        );
      }

      if (fileWorkspaceEntryRef.current) {
        const saved = await onSaveTemplate(nextTemplate);
        if (!saved) {
          throw new Error('AI update was not saved because the mounted template changed on disk.');
        }

        if (nextMetadata) {
          const currentEntry = fileWorkspaceEntryRef.current;
          if (!currentEntry) {
            throw new Error(
              'AI metadata update was not saved because the mounted template closed.',
            );
          }
          const updatedEntry = await writeTemplateEntryMetadata(currentEntry, nextMetadata);
          fileWorkspaceEntryRef.current = updatedEntry;
          currentMetadataRef.current = await readTemplateEntryMetadata(updatedEntry);
          setFileWorkspaceEntry(updatedEntry);
          setCurrentProjectTitle(updatedEntry.title);
        }

        isApplyingTemplateRef.current = true;
        try {
          designer.current.updateTemplate(nextTemplate);
        } finally {
          isApplyingTemplateRef.current = false;
        }
        return;
      }

      designer.current.updateTemplate(nextTemplate);
      if (nextMetadata) currentMetadataRef.current = nextMetadata;

      if (!currentProject) {
        toast.success('AI update applied');
        return;
      }

      const thumbnail = await createTemplateThumbnailDataUrl(nextTemplate).catch(
        () => currentProject.thumbnail,
      );
      const savedProject = await savePlaygroundProject({
        id: currentProject.id,
        inputs: currentProject.inputs,
        kind: 'template',
        metadata: nextMetadata ?? currentProject.metadata,
        source: currentProject.source,
        template: nextTemplate,
        thumbnail,
        title: currentProject.title,
      });
      projectRef.current = savedProject;
      currentMetadataRef.current = savedProject.metadata ?? null;
      setCleanBrowserProjectTemplate(savedProject.template);
      setCurrentProjectTitle(savedProject.title);
      toast.success('AI update saved to Browser Project');
    },
    [onSaveTemplate, setCleanBrowserProjectTemplate, setCurrentProjectTitle],
  );

  useEffect(() => {
    if (!isPdfmeAgentEnabled()) return;

    const host: PdfmeAgentHost = {
      applyTemplateUpdate: applyAgentTemplateUpdate,
      getCurrentTemplate: () => designer.current?.getTemplate() ?? null,
      getCurrentTemplateMetadata: () => currentMetadataRef.current,
      getCurrentTemplateTitle: () => projectTitleRef.current,
      getSelection: () => agentSelectionRef.current ?? designer.current?.getSelection() ?? null,
      getSelectedSchemas: () =>
        agentSelectionRef.current?.schemas ?? designer.current?.getSelectedSchemas() ?? [],
      getTemplateContext: () => {
        const currentEntry = fileWorkspaceEntryRef.current;
        return {
          editingStaticSchemas: editingStaticSchemasRef.current,
          templateName: currentEntry?.name ?? null,
        };
      },
      onChangeSelection: (cb) => {
        const listeners = agentSelectionListenersRef.current;
        listeners.add(cb);
        cb(agentSelectionRef.current ?? designer.current?.getSelection() ?? null);
        return () => {
          listeners.delete(cb);
        };
      },
    };

    window.pdfmeAgentHost = host;
    window.dispatchEvent(new CustomEvent(PDFME_AGENT_HOST_READY_EVENT));
    window.pdfmeAgent?.start?.(host);

    return () => {
      if (window.pdfmeAgentHost !== host) return;
      window.dispatchEvent(new CustomEvent(PDFME_AGENT_HOST_DESTROYED_EVENT));
      window.pdfmeAgent?.stop?.();
      delete window.pdfmeAgentHost;
    };
  }, [applyAgentTemplateUpdate]);

  useEffect(() => {
    if (!fileWorkspaceConflict) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onKeepConflictEditing();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [fileWorkspaceConflict, onKeepConflictEditing]);

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
    const selectionListeners = agentSelectionListenersRef.current;

    void buildDesigner(() => cancelled).then((nextDesigner) => {
      if (!nextDesigner) return;

      if (cancelled) {
        if (designer.current === nextDesigner) designer.current = null;
        agentSelectionRef.current = null;
        agentSelectionListenersRef.current.forEach((listener) => listener(null));
        destroyDesignerInstance(nextDesigner);
        return;
      }

      mountedDesigner = nextDesigner;
    });

    return () => {
      cancelled = true;
      if (!mountedDesigner) return;

      if (designer.current === mountedDesigner) designer.current = null;
      agentSelectionRef.current = null;
      selectionListeners.forEach((listener) => listener(null));
      destroyDesignerInstance(mountedDesigner);
    };
  }, [buildDesigner]);

  useEffect(() => {
    fileWorkspaceStatusRef.current = fileWorkspaceStatus;
  }, [fileWorkspaceStatus]);

  useEffect(() => {
    isFileWorkspaceDirtyRef.current = isFileWorkspaceDirty;
  }, [isFileWorkspaceDirty]);

  useEffect(() => {
    if (!fileWorkspaceEntry) return;

    return subscribeTemplateEntryChanges(
      fileWorkspaceEntry,
      (readResult) => {
        const currentEntry = fileWorkspaceEntryRef.current;
        if (!currentEntry) return;

        if (readResult.diskVersion === diskVersionRef.current) {
          if (fileWorkspaceStatusRef.current) setFileWorkspaceStatus(null);
          return;
        }

        if (isFileWorkspaceDirtyRef.current) {
          setFileWorkspaceConflict({
            incoming: readResult,
            message: `${currentEntry.path} changed on disk while you were editing.`,
          });
          diskVersionRef.current = readResult.diskVersion;
          return;
        }

        applyTemplateFromDisk(currentEntry, readResult);
        toast.info(`Reloaded ${currentEntry.path} from disk`, {
          toastId: `file-workspace-reload:${currentEntry.path}`,
        });
      },
      {
        onError: (error) => {
          if (error instanceof FileWorkspaceTemplateDeletedError) {
            setFileWorkspaceStatus('deleted');
            return;
          }

          if (error instanceof FileWorkspaceTemplateInvalidError) {
            setFileWorkspaceStatus('invalid');
            return;
          }

          console.error(error);
        },
        shouldSkip: () => isSavingFileWorkspaceRef.current,
      },
    );
  }, [applyTemplateFromDisk, fileWorkspaceEntry]);

  const saveTemplateLabel = fileWorkspaceEntry ? `Save ${fileWorkspaceEntry.path}` : 'Save Project';
  const hasUnsavedFileWorkspaceChanges = Boolean(
    fileWorkspaceEntry && isFileWorkspaceDirty && !fileWorkspaceStatus,
  );
  const hasUnsavedBrowserProjectChanges = Boolean(!fileWorkspaceEntry && isBrowserProjectDirty);
  const hasUnsavedTemplateChanges =
    hasUnsavedFileWorkspaceChanges || hasUnsavedBrowserProjectChanges;
  const requiresSaveBeforePreview = Boolean(fileWorkspaceEntry && fileWorkspaceStatus);

  const getCurrentTemplateRouteSource = (): PlaygroundTemplateRouteSource => {
    const activeWorkspaceName = fileWorkspaceEntryRef.current?.name;
    if (activeWorkspaceName) return { workspace: activeWorkspaceName };

    const activeProjectId = projectRef.current?.id;
    if (activeProjectId) return { project: activeProjectId };

    const sourceParams = searchParamsRef.current;
    const template = sourceParams.get('template');
    if (template) return { template };

    const workspace = sourceParams.get('workspace');
    if (workspace) return { workspace };

    const project = sourceParams.get('project');
    if (project) return { project };

    return {};
  };

  const getFormViewerRoute = () =>
    createPlaygroundTemplateRoute('form-viewer', getCurrentTemplateRouteSource());

  const onOpenFormViewer = () => {
    if (editingStaticSchemasRef.current) return;

    const targetPath = getFormViewerRoute();
    if (hasUnsavedTemplateChanges || requiresSaveBeforePreview) {
      setPendingPreviewNavigation({
        requiresSave: requiresSaveBeforePreview,
        targetPath,
      });
      return;
    }

    navigate(targetPath);
  };

  const onSaveAndOpenPreview = async () => {
    if (!pendingPreviewNavigation || isSavingPreviewNavigation) return;

    setIsSavingPreviewNavigation(true);
    try {
      const saved = await onSaveTemplate();
      if (!saved) {
        setPendingPreviewNavigation(null);
        return;
      }

      setPendingPreviewNavigation(null);
      navigate(getFormViewerRoute());
    } finally {
      setIsSavingPreviewNavigation(false);
    }
  };

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
      label: fileWorkspaceEntry ? 'Workspace' : 'Project',
      content: (
        <div className="flex min-w-0 gap-1">
          <PlaygroundButton
            className={`relative ${fileWorkspaceEntry ? 'max-w-60 xl:max-w-72' : ''}`}
            id="save-local"
            aria-label={
              hasUnsavedTemplateChanges
                ? `${saveTemplateLabel} (unsaved changes)`
                : saveTemplateLabel
            }
            disabled={editingStaticSchemas}
            onClick={() => void onSaveTemplate()}
            title={fileWorkspaceEntry ? saveTemplateLabel : undefined}
          >
            {hasUnsavedTemplateChanges && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white"
              />
            )}
            <Save className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{saveTemplateLabel}</span>
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
            onClick={() => void onResetTemplate()}
          >
            Reset
          </PlaygroundButton>
        </div>
      ),
    },
    {
      label: 'Preview',
      content: (
        <PlaygroundButton
          id="open-form-viewer"
          disabled={editingStaticSchemas}
          onClick={onOpenFormViewer}
          title={editingStaticSchemas ? 'End static schema editing first' : undefined}
        >
          <Eye className="size-3.5" />
          Form/Viewer
        </PlaygroundButton>
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
              const generated = await generatePDF(designer.current, output);
              if (!generated) return;
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

  const fileWorkspaceStatusMessage = fileWorkspaceEntry
    ? fileWorkspaceStatus === 'invalid'
      ? `${fileWorkspaceEntry.path} is currently invalid on disk. The editor is keeping the last valid template.`
      : fileWorkspaceStatus === 'deleted'
        ? `${fileWorkspaceEntry.path} was deleted on disk. Saving will recreate it.`
        : ''
    : '';

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <NavBar items={navItems} />
      {fileWorkspaceEntry && fileWorkspaceStatusMessage && (
        <div
          key="file-workspace-status"
          aria-atomic="true"
          aria-live="polite"
          className="flex items-center border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900"
          role="status"
        >
          <span className="min-w-0 flex-1 truncate">{fileWorkspaceStatusMessage}</span>
        </div>
      )}
      <div key="designer-container" ref={designerRef} className="min-h-0 flex-1 w-full" />
      {pendingPreviewNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            aria-describedby="preview-navigation-description"
            aria-labelledby="preview-navigation-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
          >
            <h2 id="preview-navigation-title" className="text-lg font-bold text-gray-900">
              Save before opening Form/Viewer?
            </h2>
            <div
              id="preview-navigation-description"
              className="mt-2 space-y-2 text-sm text-gray-600"
            >
              {pendingPreviewNavigation.requiresSave ? (
                <p>The workspace file needs to be saved before Form/Viewer can open it.</p>
              ) : (
                <p>Opening without saving will use the last saved template.</p>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <PlaygroundButton
                disabled={isSavingPreviewNavigation}
                onClick={() => setPendingPreviewNavigation(null)}
                variant="secondary"
              >
                Cancel
              </PlaygroundButton>
              {!pendingPreviewNavigation.requiresSave && (
                <PlaygroundButton
                  id="open-form-viewer-without-saving"
                  disabled={isSavingPreviewNavigation}
                  onClick={() => {
                    const { targetPath } = pendingPreviewNavigation;
                    setPendingPreviewNavigation(null);
                    navigate(targetPath);
                  }}
                  variant="secondary"
                >
                  Open without saving
                </PlaygroundButton>
              )}
              <PlaygroundButton
                id="save-and-open-form-viewer"
                disabled={isSavingPreviewNavigation}
                onClick={() => void onSaveAndOpenPreview()}
                variant="primary"
              >
                {isSavingPreviewNavigation ? 'Saving...' : 'Save & Open'}
              </PlaygroundButton>
            </div>
          </div>
        </div>
      )}
      {fileWorkspaceConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            aria-describedby="file-workspace-conflict-description"
            aria-labelledby="file-workspace-conflict-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
          >
            <h2 id="file-workspace-conflict-title" className="text-lg font-bold text-gray-900">
              Template changed on disk
            </h2>
            <div
              id="file-workspace-conflict-description"
              className="mt-2 space-y-2 text-sm text-gray-600"
            >
              <p>{fileWorkspaceConflict.message}</p>
              <p>Keeping your edits means the next save will overwrite the current disk version.</p>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <PlaygroundButton
                disabled={!fileWorkspaceConflict.incoming}
                onClick={onReloadConflictFromDisk}
                variant="secondary"
              >
                Reload from disk
              </PlaygroundButton>
              <PlaygroundButton onClick={onKeepConflictEditing} variant="secondary">
                Keep editing
              </PlaygroundButton>
              <PlaygroundButton onClick={() => void onSaveOverConflict()} variant="primary">
                Save over disk
              </PlaygroundButton>
            </div>
          </div>
        </div>
      )}
      <TemplateJsonDialog
        isOpen={jsonDialogOpen}
        template={templateJsonSource}
        onClose={() => {
          setJsonDialogOpen(false);
          setTemplateJsonSource(null);
        }}
        onCommit={onCommitTemplateJson}
      />
    </main>
  );
}

export default DesignerApp;
