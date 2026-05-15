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
import {
  FileWorkspaceTemplateDeletedError,
  FileWorkspaceTemplateInvalidError,
  createTemplateEntryFromTemplate,
  findTemplateEntry,
  readTemplateEntry,
  refreshTemplateCollection,
  restorePersistedTemplateCollection,
  serializeTemplateForFileWorkspace,
  setSelectedFileWorkspaceTemplateName,
  subscribeTemplateEntryChanges,
  writeTemplateEntry,
  writeTemplateThumbnail,
  type FileWorkspaceCollection,
  type FileWorkspaceTemplateEntry,
  type FileWorkspaceTemplateRead,
} from '../lib/fileWorkspace';

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

type FileWorkspaceStatus = 'deleted' | 'invalid' | null;

type FileWorkspaceConflict = {
  incoming?: FileWorkspaceTemplateRead;
  message: string;
  saveTemplate?: Template;
};

function getDesignerLoadRequest(): DesignerLoadRequest {
  const searchParams = new URLSearchParams(window.location.search);
  const shouldCreateNewProject = searchParams.get('new') === '1';
  const templateId = searchParams.get('template');
  const projectId = searchParams.get('project');
  const workspaceTemplateName = searchParams.get('workspace');

  return {
    projectId,
    searchParams,
    shouldCreateNewProject,
    shouldConsumeQuery: shouldCreateNewProject || templateId != null || projectId != null,
    templateId,
    workspaceTemplateName,
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
  const fileWorkspaceCollectionRef = useRef<FileWorkspaceCollection | null>(null);
  const fileWorkspaceEntryRef = useRef<FileWorkspaceTemplateEntry | null>(null);
  const diskVersionRef = useRef<string | null>(null);
  const lastCleanSerializedTemplateRef = useRef<string | null>(null);
  const isApplyingTemplateRef = useRef(false);
  const isSavingFileWorkspaceRef = useRef(false);
  const isFileWorkspaceDirtyRef = useRef(false);
  const fileWorkspaceStatusRef = useRef<FileWorkspaceStatus>(null);
  const projectTitleRef = useRef('Untitled Template');
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
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [templateJsonSource, setTemplateJsonSource] = useState<Template | null>(null);

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
      setFileWorkspaceEntry(entry);
      setFileWorkspaceStatus(null);
      setFileWorkspaceConflict(null);
      setIsFileWorkspaceDirty(false);
      if (entry) setCurrentProjectTitle(entry.title);
    },
    [setCurrentProjectTitle],
  );

  const updateFileWorkspaceDirtyState = useCallback((template: Template) => {
    const cleanTemplate = lastCleanSerializedTemplateRef.current;
    const dirty =
      cleanTemplate != null && serializeTemplateForFileWorkspace(template) !== cleanTemplate;
    isFileWorkspaceDirtyRef.current = dirty;
    setIsFileWorkspaceDirty(dirty);
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
      if (!designer.current) return;

      const currentFileEntry = fileWorkspaceEntryRef.current;
      const currentFileCollection = fileWorkspaceCollectionRef.current;
      if (currentFileEntry && currentFileCollection) {
        const nextTemplate = template || designer.current.getTemplate();
        let targetEntry = currentFileEntry;

        if (saveAs) {
          const title =
            window.prompt('Save as', `${currentFileEntry.title || currentFileEntry.name} Copy`) ??
            '';
          if (!title.trim()) return;

          targetEntry = await createTemplateEntryFromTemplate(
            currentFileCollection,
            nextTemplate,
            title,
          );
          setSearchParams(new URLSearchParams([['workspace', targetEntry.name]]), {
            replace: true,
          });
        } else if (diskVersionRef.current) {
          try {
            const diskRead = await readTemplateEntry(currentFileEntry);
            if (diskRead.diskVersion !== diskVersionRef.current) {
              setFileWorkspaceConflict({
                incoming: diskRead,
                message: `${currentFileEntry.path} changed on disk since it was loaded.`,
                saveTemplate: nextTemplate,
              });
              return;
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
          toast.success(`Saved ${refreshedEntry.path}`);
        } finally {
          isSavingFileWorkspaceRef.current = false;
        }
        return;
      }

      const currentProject = projectRef.current;
      const nextTemplate = template || designer.current.getTemplate();
      const currentTitle =
        (currentProject?.title ?? projectTitleRef.current) || 'Untitled Template';
      const title = saveAs
        ? (window.prompt('Save as', `${currentTitle} Copy`) ?? '')
        : (currentProject?.title ?? window.prompt('Project name', currentTitle) ?? '');
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
    [setCurrentProjectTitle, setSearchParams],
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

        if (workspaceTemplateName) {
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
          await setSelectedFileWorkspaceTemplateName(restored.collection.rootHandle, entry.name);
          setActiveFileWorkspaceEntry(
            { ...restored.collection, selectedTemplateName: entry.name },
            entry,
          );
        } else if (shouldCreateNewProject) {
          setActiveFileWorkspaceEntry(null, null);
          clearActivePlaygroundProject();
          setCurrentProjectTitle('Untitled Template');
        } else if (projectIdFromQuery) {
          setActiveFileWorkspaceEntry(null, null);
          project = getPlaygroundProject(projectIdFromQuery);
          if (!project) throw new Error('Project not found');
          template = project.template;
        } else if (templateIdFromQuery) {
          setActiveFileWorkspaceEntry(null, null);
          const templateJson = await getTemplateById(templateIdFromQuery);
          checkTemplate(templateJson);
          template = templateJson;
          setCurrentProjectTitle(fromKebabCase(templateIdFromQuery));
        } else {
          setActiveFileWorkspaceEntry(null, null);
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
        nextDesigner.onChangeTemplate((nextTemplate) => {
          if (!fileWorkspaceEntryRef.current || isApplyingTemplateRef.current) return;
          updateFileWorkspaceDirtyState(nextTemplate);
        });
        return nextDesigner;
      } catch (error) {
        if (isCancelled()) return null;
        projectRef.current = null;
        setActiveFileWorkspaceEntry(null, null);
        console.error(error);
        return null;
      }
    },
    [
      onSaveTemplate,
      setActiveFileWorkspaceEntry,
      setCurrentProjectTitle,
      setSearchParams,
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

  const onResetTemplate = () => {
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

  const onReloadConflictFromDisk = () => {
    const currentEntry = fileWorkspaceEntryRef.current;
    const incoming = fileWorkspaceConflict?.incoming;
    if (!currentEntry || !incoming) {
      setFileWorkspaceConflict(null);
      return;
    }

    applyTemplateFromDisk(currentEntry, incoming);
  };

  const onKeepConflictEditing = () => {
    const incoming = fileWorkspaceConflict?.incoming;
    if (incoming) {
      diskVersionRef.current = incoming.diskVersion;
    }
    setFileWorkspaceConflict(null);
  };

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
        <div className="flex gap-1">
          <PlaygroundButton
            id="save-local"
            disabled={editingStaticSchemas}
            onClick={() => void onSaveTemplate()}
          >
            <Save className="size-3.5" />
            {fileWorkspaceEntry ? `Save ${fileWorkspaceEntry.path}` : 'Save Project'}
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
      {fileWorkspaceEntry && (fileWorkspaceStatus || isFileWorkspaceDirty) && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          {fileWorkspaceStatus === 'invalid' &&
            `${fileWorkspaceEntry.path} is currently invalid on disk. The editor is keeping the last valid template.`}
          {fileWorkspaceStatus === 'deleted' &&
            `${fileWorkspaceEntry.path} was deleted on disk. Saving will recreate it.`}
          {!fileWorkspaceStatus &&
            isFileWorkspaceDirty &&
            `${fileWorkspaceEntry.path} has unsaved changes.`}
        </div>
      )}
      <div ref={designerRef} className="flex-1 w-full" />
      {fileWorkspaceConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Template changed on disk</h2>
            <p className="mt-2 text-sm text-gray-600">{fileWorkspaceConflict.message}</p>
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
    </>
  );
}

export default DesignerApp;
