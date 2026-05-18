import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkTemplate, getInputFromTemplate, type Template } from '@pdfme/common';
import {
  Code2,
  Copy,
  Download,
  Eye,
  FileText,
  FolderOpen,
  FolderX,
  MoreHorizontal,
  Pencil,
  PencilRuler,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { downloadJsonFile, fromKebabCase, readFile } from '../helper';
import PlaygroundButton from '../components/PlaygroundButton';
import { getAuthoringStarterId, type AuthoringStarterKind } from '../lib/authoringStarters';
import {
  deletePlaygroundProject,
  duplicatePlaygroundProject,
  getProjectAuthoringPath,
  getProjectKindLabel,
  readPlaygroundProjects,
  renamePlaygroundProject,
  savePlaygroundProject,
  setActivePlaygroundProjectId,
  setPlaygroundProjectThumbnail,
  type PlaygroundProject,
} from '../lib/playgroundProjects';
import { createTemplateThumbnailDataUrl } from '../lib/templateThumbnails';
import {
  clearPersistedFileWorkspace,
  createBlankTemplateEntry,
  findTemplateEntry,
  isFileWorkspaceSupported,
  openTemplateCollectionDirectory,
  persistFileWorkspaceState,
  refreshTemplateCollection,
  restorePersistedTemplateCollection,
  setSelectedFileWorkspaceTemplateName,
  subscribeTemplateCollectionChanges,
  writeTemplateThumbnail,
  type FileWorkspaceCollection,
  type FileWorkspaceTemplateEntry,
} from '../lib/fileWorkspace';

declare global {
  interface Window {
    ethicalads?: {
      load: () => void;
      wait?: Promise<unknown>;
    };
  }
}

type TemplateData = {
  name: string;
  author: string;
  basePdfKind?: string;
  description?: string;
  fieldCount?: number;
  fontNames?: string[];
  hasCJK?: boolean;
  pageCount?: number;
  schemaTypes?: string[];
  sourceKind?: Exclude<GenerationFilter, 'all'>;
  sourcePath?: string;
  tags?: string[];
  title?: string;
};

type UIType = 'designer' | 'form-viewer';
type GenerationFilter = 'all' | 'designer' | 'jsx' | 'md2pdf';

type AuthoringPreset = {
  assetName: string;
  id: string;
  kind: AuthoringStarterKind;
};

// Constants
const DEVIN_AI_AUTHOR = 'Devin AI';
const DEVIN_INVITE_URL = 'https://app.devin.ai/invite/KyOTXVPrlFl2TjcT';
const tagSortOrder = [
  'Invoice',
  'Quote',
  'Business',
  'Form',
  'Report',
  'Markdown',
  'CJK',
  'Certificate',
  'Labels',
  'QR',
  'Table',
  'Visual',
  'Image',
  'MVT',
  'Government',
  'Brochure',
  'Blank',
];

const generationFilters: Array<{ label: string; value: GenerationFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Designer', value: 'designer' },
  { label: 'JSX', value: 'jsx' },
  { label: 'md2pdf', value: 'md2pdf' },
];

const getTemplateGeneration = (template: TemplateData): Exclude<GenerationFilter, 'all'> =>
  template.sourceKind ?? 'designer';

const getAuthoringPreset = (template: TemplateData): AuthoringPreset | null => {
  const kind = getTemplateGeneration(template);
  if ((kind !== 'jsx' && kind !== 'md2pdf') || !template.sourcePath) return null;
  return {
    assetName: template.name,
    id: getAuthoringStarterId(template.name, kind),
    kind,
  };
};

const getTemplateTags = (template: TemplateData) => {
  const tags = new Set(template.tags ?? []);

  return [...tags].sort((a, b) => {
    const aIndex = tagSortOrder.indexOf(a);
    const bIndex = tagSortOrder.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
};

const ThumbnailImage = ({ alt, src }: { alt: string; src?: string }) =>
  src ? (
    <img alt={alt} src={src} className="h-72 w-full object-contain" />
  ) : (
    <div className="flex h-72 w-full items-center justify-center bg-gray-100 p-4 text-center text-xs text-gray-500">
      Creating thumbnail...
    </div>
  );

const ProjectThumbnailImage = ({
  onCreated,
  project,
}: {
  onCreated: () => void;
  project: PlaygroundProject;
}) => {
  const [src, setSrc] = useState(project.thumbnail);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSrc(project.thumbnail);
    setError(null);
    if (project.thumbnail) return;

    let cancelled = false;
    void createTemplateThumbnailDataUrl(project.template, project.inputs)
      .then((thumbnail) => {
        if (cancelled) return;
        setSrc(thumbnail);
        setPlaygroundProjectThumbnail(project.id, thumbnail);
        onCreated();
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to create thumbnail');
      });

    return () => {
      cancelled = true;
    };
  }, [onCreated, project]);

  if (error) {
    return (
      <div className="flex h-72 w-full items-center justify-center bg-red-50 p-4 text-center text-xs text-red-700">
        {error}
      </div>
    );
  }

  return <ThumbnailImage alt={project.title} src={src} />;
};

const MountedThumbnailImage = ({
  entry,
  onCreated,
}: {
  entry: FileWorkspaceTemplateEntry;
  onCreated: () => void;
}) => {
  const [src, setSrc] = useState(entry.thumbnailDataUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSrc(entry.thumbnailDataUrl);
    setError(null);
    if (entry.thumbnailDataUrl) return;

    let cancelled = false;
    void writeTemplateThumbnail(entry, entry.template)
      .then(({ thumbnailDataUrl }) => {
        if (cancelled) return;
        setSrc(thumbnailDataUrl);
        onCreated();
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to create thumbnail');
      });

    return () => {
      cancelled = true;
    };
  }, [entry, onCreated]);

  if (error) {
    return (
      <div className="flex h-72 w-full items-center justify-center bg-yellow-50 p-4 text-center text-xs text-yellow-800">
        Thumbnail unavailable
      </div>
    );
  }

  return <ThumbnailImage alt={entry.title} src={src} />;
};

const GalleryCard = ({
  actions,
  description,
  tags = [],
  tag,
  thumbnail,
  title,
}: {
  actions: React.ReactNode;
  description: React.ReactNode;
  tags?: string[];
  tag: string;
  thumbnail: React.ReactNode;
  title: string;
}) => (
  <div className="relative flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
    <div className="relative overflow-hidden rounded border border-gray-100 bg-gray-100">
      {thumbnail}
      <span className="absolute left-2 top-2 rounded bg-white/95 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 shadow-sm">
        {tag}
      </span>
    </div>
    <div className="mt-4 min-w-0 flex-1">
      <h3 className="truncate text-base font-bold text-gray-900">{title}</h3>
      <div className="mt-2 text-sm text-gray-600">{description}</div>
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((item) => (
            <span
              key={item}
              className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
    <div className="mt-4">{actions}</div>
  </div>
);

type ProjectActionHandler = (project: PlaygroundProject) => void;

type ProjectMoreActionsProps = {
  onDeleteProject: ProjectActionHandler;
  onDownloadProjectTemplate: ProjectActionHandler;
  onDuplicateProject: ProjectActionHandler;
  onOpenDesigner: ProjectActionHandler;
  onRenameProject: ProjectActionHandler;
  project: PlaygroundProject;
};

const ProjectMenuItem = ({
  buttonRef,
  children,
  danger = false,
  onClick,
}: {
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) => (
  <button
    ref={buttonRef}
    type="button"
    role="menuitem"
    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
      danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
    }`}
    onClick={onClick}
  >
    {children}
  </button>
);

function ProjectMoreActions({
  onDeleteProject,
  onDownloadProjectTemplate,
  onDuplicateProject,
  onOpenDesigner,
  onRenameProject,
  project,
}: ProjectMoreActionsProps) {
  const [open, setOpen] = useState(false);
  const firstMenuItemRef = React.useRef<HTMLButtonElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const runAction = (handler: ProjectActionHandler) => {
    setOpen(false);
    handler(project);
  };

  useEffect(() => {
    if (!open) return;

    firstMenuItemRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <PlaygroundButton
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`More actions for ${project.title}`}
        className="px-2 sm:px-2"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="size-4" />
      </PlaygroundButton>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close project actions"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            {project.source && (
              <ProjectMenuItem
                buttonRef={firstMenuItemRef}
                onClick={() => runAction(onOpenDesigner)}
              >
                <PencilRuler className="size-4" />
                Designer
              </ProjectMenuItem>
            )}
            <ProjectMenuItem
              buttonRef={project.source ? undefined : firstMenuItemRef}
              onClick={() => runAction(onRenameProject)}
            >
              <Pencil className="size-4" />
              Rename
            </ProjectMenuItem>
            <ProjectMenuItem onClick={() => runAction(onDuplicateProject)}>
              <Copy className="size-4" />
              Duplicate
            </ProjectMenuItem>
            <ProjectMenuItem onClick={() => runAction(onDownloadProjectTemplate)}>
              <Download className="size-4" />
              Template JSON
            </ProjectMenuItem>
            <ProjectMenuItem danger onClick={() => runAction(onDeleteProject)}>
              <Trash2 className="size-4" />
              Delete
            </ProjectMenuItem>
          </div>
        </>
      )}
    </div>
  );
}

// Author link component to avoid duplication
const AuthorLink = ({ author }: { author: string }) => {
  if (author === DEVIN_AI_AUTHOR) {
    return (
      <a
        href={DEVIN_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline text-md font-bold hover:text-blue-400 transition duration-300"
      >
        {author}
      </a>
    );
  }

  return (
    <a
      href={`https://github.com/${author}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline text-md font-bold hover:text-blue-400 transition duration-300"
    >
      {author}
    </a>
  );
};

function TemplatesApp() {
  const navigate = useNavigate();
  const importTemplateInputRef = React.useRef<HTMLInputElement | null>(null);
  const mountedCollectionRef = React.useRef<FileWorkspaceCollection | null>(null);
  const fileWorkspaceSupported = isFileWorkspaceSupported();

  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [avatarUrlMap, setAvatarUrlMap] = useState<{ [key: string]: string }>({});
  const [projects, setProjects] = useState<PlaygroundProject[]>([]);
  const [mountedCollection, setMountedCollection] = useState<FileWorkspaceCollection | null>(null);
  const [lastFolderName, setLastFolderName] = useState<string | null>(null);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [isRefreshingFolder, setIsRefreshingFolder] = useState(false);
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>('all');
  const [tagFilter, setTagFilter] = useState('all');

  const refreshProjects = useCallback(() => setProjects(readPlaygroundProjects()), []);
  const refreshMountedCollection = useCallback(() => {
    if (!mountedCollection) return;

    setIsRefreshingFolder(true);
    void refreshTemplateCollection(mountedCollection)
      .then((collection) => {
        setMountedCollection(collection);
        setLastFolderName(collection.rootName);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to refresh folder');
      })
      .finally(() => setIsRefreshingFolder(false));
  }, [mountedCollection]);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    templates.forEach((template) => getTemplateTags(template).forEach((tag) => tags.add(tag)));

    return [...tags].sort((a, b) => {
      const aIndex = tagSortOrder.indexOf(a);
      const bIndex = tagSortOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [templates]);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const generation = getTemplateGeneration(template);
        if (generationFilter !== 'all' && generation !== generationFilter) {
          return false;
        }

        return tagFilter === 'all' || getTemplateTags(template).includes(tagFilter);
      }),
    [generationFilter, tagFilter, templates],
  );

  const hasActiveTemplateFilter = generationFilter !== 'all' || tagFilter !== 'all';

  const clearTemplateFilters = () => {
    setGenerationFilter('all');
    setTagFilter('all');
  };

  useEffect(() => {
    refreshProjects();
    window.addEventListener('focus', refreshProjects);
    return () => window.removeEventListener('focus', refreshProjects);
  }, [refreshProjects]);

  useEffect(() => {
    if (!fileWorkspaceSupported) return;

    let cancelled = false;
    void restorePersistedTemplateCollection().then((result) => {
      if (cancelled) return;
      if (result.status === 'mounted') {
        setMountedCollection(result.collection);
        setLastFolderName(result.collection.rootName);
      } else if (result.status === 'permission-needed') {
        setLastFolderName(result.rootName);
      } else if (result.status === 'error') {
        setLastFolderName(result.rootName ?? null);
        console.error(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fileWorkspaceSupported]);

  useEffect(() => {
    mountedCollectionRef.current = mountedCollection;
  }, [mountedCollection]);

  useEffect(() => {
    const collection = mountedCollectionRef.current;
    if (!collection) return;

    return subscribeTemplateCollectionChanges(
      collection,
      (collection) => {
        setMountedCollection(collection);
        setLastFolderName(collection.rootName);
      },
      {
        onError: (error) => {
          console.error(error);
        },
      },
    );
  }, [mountedCollection?.rootHandle, mountedCollection?.selectedTemplateName]);

  // Fetch templates and author avatars
  useEffect(() => {
    fetch('/template-assets/index.json')
      .then((response) => response.json())
      .then((data: TemplateData[]) => {
        setTemplates(data);

        const authors = new Set(data.map(({ author }) => author));
        const avatarUrlMap: { [key: string]: string } = {};

        Promise.all(
          Array.from(authors).map((author) => {
            if (author === DEVIN_AI_AUTHOR) {
              avatarUrlMap[author] = '/imgs/devin.svg';
              return Promise.resolve();
            } else {
              return fetch(`https://api.github.com/users/${author}`)
                .then((res) => res.json())
                .then((ghData) => {
                  avatarUrlMap[author] = ghData.avatar_url;
                });
            }
          }),
        ).then(() => {
          setAvatarUrlMap(avatarUrlMap);
        });
      });
  }, []);

  // Load ethical ads
  useEffect(() => {
    if (window.ethicalads && typeof window.ethicalads.load === 'function') {
      window.ethicalads.load();
    } else {
      console.warn('EthicalAds script is not loaded yet.');
    }
  }, [templates]);

  // Unified navigation function
  const navigateTo = (name: string, ui: UIType) => {
    const path = ui === 'designer' ? '/designer' : '/form-viewer';
    navigate(`${path}?template=${name}`);
  };

  const navigateToProject = (project: PlaygroundProject, target: UIType | 'source') => {
    setActivePlaygroundProjectId(project.id);
    if (target === 'source') {
      navigate(getProjectAuthoringPath(project));
      return;
    }

    const path = target === 'designer' ? '/designer' : '/form-viewer';
    navigate(`${path}?project=${encodeURIComponent(project.id)}`);
  };

  const navigateToMountedTemplate = async (
    collection: FileWorkspaceCollection,
    entry: FileWorkspaceTemplateEntry,
    ui: UIType,
  ) => {
    await setSelectedFileWorkspaceTemplateName(collection.rootHandle, entry.name);
    const path = ui === 'designer' ? '/designer' : '/form-viewer';
    navigate(`${path}?workspace=${encodeURIComponent(entry.name)}`);
  };

  const navigateToAuthoringPreset = (preset: AuthoringPreset) => {
    const route = preset.kind === 'jsx' ? '/jsx' : '/md2pdf';
    navigate(`${route}?preset=${encodeURIComponent(preset.id)}`);
  };

  const mountCollection = async (collection: FileWorkspaceCollection) => {
    setMountedCollection(collection);
    setLastFolderName(collection.rootName);

    if (collection.entries.length > 0) {
      await persistFileWorkspaceState(
        collection.rootHandle,
        collection.selectedTemplateName ?? collection.entries[0]?.name,
      );
      return;
    }

    const shouldCreate = window.confirm(
      `"${collection.rootName}" has no valid template directories. Create a blank template now?`,
    );
    if (!shouldCreate) return;

    const entry = await createBlankTemplateEntry(collection.rootHandle);
    const nextCollection = await refreshTemplateCollection({
      ...collection,
      selectedTemplateName: entry.name,
    });
    const nextEntry = findTemplateEntry(nextCollection, entry.name) ?? entry;
    setMountedCollection(nextCollection);
    await navigateToMountedTemplate(nextCollection, nextEntry, 'designer');
  };

  const onOpenFolder = async () => {
    setIsOpeningFolder(true);
    try {
      await mountCollection(await openTemplateCollectionDirectory());
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to open folder');
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const onReopenFolder = async () => {
    setIsOpeningFolder(true);
    try {
      const result = await restorePersistedTemplateCollection({ requestPermission: true });
      if (result.status === 'mounted') {
        await mountCollection(result.collection);
      } else if (result.status === 'permission-needed') {
        setLastFolderName(result.rootName);
        toast.error('Folder permission was not granted');
      } else if (result.status === 'none') {
        setLastFolderName(null);
        toast.info('No previous folder was found');
      } else {
        console.error(result.error);
        toast.error('Failed to reopen folder');
      }
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const onDisconnectFolder = async () => {
    await clearPersistedFileWorkspace();
    setMountedCollection(null);
    setLastFolderName(null);
    toast.info('Disconnected mounted folder');
  };

  const onImportTemplateJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const rawJson = await readFile(file, 'text');
      const template = JSON.parse(rawJson as string) as Template;
      checkTemplate(template);

      const title = file.name.replace(/\.json$/i, '').trim() || 'Imported Template';
      const inputs = getInputFromTemplate(template);
      const thumbnail = await createTemplateThumbnailDataUrl(template, inputs).catch(
        () => undefined,
      );
      const project = savePlaygroundProject({
        inputs,
        kind: 'template',
        template,
        thumbnail,
        title,
      });
      refreshProjects();
      toast.success(`Imported "${project.title}" into My Workspace`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Invalid template JSON');
    }
  };

  const onDeleteProject = (project: PlaygroundProject) => {
    if (!window.confirm(`Delete "${project.title}" from this browser?`)) return;
    deletePlaygroundProject(project.id);
    refreshProjects();
    toast.info(`Deleted "${project.title}"`);
  };

  const onRenameProject = (project: PlaygroundProject) => {
    const title = window.prompt('Project name', project.title) ?? '';
    if (!title.trim()) return;

    const renamedProject = renamePlaygroundProject(project.id, title);
    if (!renamedProject) {
      toast.error('Project not found');
      return;
    }

    refreshProjects();
    toast.success(`Renamed to "${renamedProject.title}"`);
  };

  const onDuplicateProject = (project: PlaygroundProject) => {
    const title = window.prompt('Duplicate as', `${project.title} Copy`) ?? '';
    if (!title.trim()) return;

    const duplicatedProject = duplicatePlaygroundProject(project.id, title);
    if (!duplicatedProject) {
      toast.error('Project not found');
      return;
    }

    refreshProjects();
    toast.success(`Duplicated "${duplicatedProject.title}"`);
  };

  const onDownloadProjectTemplate = (project: PlaygroundProject) => {
    const fileName = project.title.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'template';
    downloadJsonFile(project.template, fileName);
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">
        <div className="mb-10 rounded-lg border border-green-200 bg-green-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Workspace</h2>
              <p className="mt-2 max-w-3xl text-sm text-green-900">
                Save templates from Designer, JSX, or md2pdf as local projects. A project keeps the
                generated template, inputs, and source when available.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <PlaygroundButton
                disabled={!fileWorkspaceSupported || isOpeningFolder}
                onClick={() => void onOpenFolder()}
                variant="secondary"
              >
                <FolderOpen className="size-4" />
                {isOpeningFolder ? 'Opening...' : 'Open Folder'}
              </PlaygroundButton>
              <PlaygroundButton
                onClick={() => importTemplateInputRef.current?.click()}
                variant="secondary"
              >
                <Upload className="size-4" />
                Import Template JSON
              </PlaygroundButton>
              <input
                ref={importTemplateInputRef}
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={onImportTemplateJson}
              />
              <PlaygroundButton onClick={() => navigate('/designer?new=1')} variant="primary">
                <PencilRuler className="size-4" />
                New Template
              </PlaygroundButton>
            </div>
          </div>
          {projects.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
              {projects.map((project) => (
                <GalleryCard
                  key={project.id}
                  tag={getProjectKindLabel(project.kind)}
                  title={project.title}
                  description={
                    <p className="text-xs text-gray-500">
                      Updated {new Date(project.updatedAt).toLocaleString()}
                    </p>
                  }
                  thumbnail={
                    <ProjectThumbnailImage project={project} onCreated={refreshProjects} />
                  }
                  actions={
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                      <PlaygroundButton
                        onClick={() =>
                          navigateToProject(project, project.source ? 'source' : 'designer')
                        }
                      >
                        {project.source ? (
                          <>
                            <Code2 className="size-4" />
                            Source
                          </>
                        ) : (
                          <>
                            <PencilRuler className="size-4" />
                            Designer
                          </>
                        )}
                      </PlaygroundButton>
                      <PlaygroundButton onClick={() => navigateToProject(project, 'form-viewer')}>
                        Preview
                      </PlaygroundButton>
                      <ProjectMoreActions
                        project={project}
                        onOpenDesigner={(item) => navigateToProject(item, 'designer')}
                        onRenameProject={onRenameProject}
                        onDuplicateProject={onDuplicateProject}
                        onDownloadProjectTemplate={onDownloadProjectTemplate}
                        onDeleteProject={onDeleteProject}
                      />
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-green-300 bg-white px-4 py-6 text-sm text-green-900">
              No local projects yet. Start from a sample, JSX, md2pdf, or a blank Designer template.
            </div>
          )}
          <div className="mt-6 border-t border-green-200 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Mounted Folder</h3>
                <p className="mt-1 text-sm text-green-900">
                  Edit a template-assets style folder directly on disk.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {mountedCollection && (
                  <PlaygroundButton
                    disabled={isRefreshingFolder}
                    onClick={() => void refreshMountedCollection()}
                    variant="secondary"
                  >
                    <RefreshCw className="size-4" />
                    Refresh
                  </PlaygroundButton>
                )}
                {!mountedCollection && lastFolderName && (
                  <PlaygroundButton
                    disabled={!fileWorkspaceSupported || isOpeningFolder}
                    onClick={() => void onReopenFolder()}
                    variant="secondary"
                  >
                    <FolderOpen className="size-4" />
                    Reopen last folder
                  </PlaygroundButton>
                )}
                {mountedCollection && (
                  <PlaygroundButton onClick={() => void onDisconnectFolder()} variant="secondary">
                    <FolderX className="size-4" />
                    Disconnect
                  </PlaygroundButton>
                )}
              </div>
            </div>
            {!fileWorkspaceSupported && (
              <div className="mt-4 rounded-md border border-dashed border-green-300 bg-white px-4 py-4 text-sm text-green-900">
                Folder workspaces need a Chromium browser in a secure context. Template JSON import
                and download are still available.
              </div>
            )}
            {mountedCollection && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-green-900">
                  <span className="font-semibold">{mountedCollection.rootName}</span>
                  <span className="text-green-700">
                    {mountedCollection.entries.length} template
                    {mountedCollection.entries.length === 1 ? '' : 's'}
                  </span>
                  {mountedCollection.invalidEntries.length > 0 && (
                    <span className="rounded border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      {mountedCollection.invalidEntries.length} invalid skipped
                    </span>
                  )}
                </div>
                {mountedCollection.entries.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
                    {mountedCollection.entries.map((entry) => (
                      <GalleryCard
                        key={entry.name}
                        tag="Mounted"
                        title={entry.title}
                        tags={entry.tags}
                        description={
                          <div className="space-y-2">
                            <p>
                              {entry.description ??
                                `${entry.name}/template.json from the mounted folder.`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Updated {new Date(entry.updatedAt).toLocaleString()}
                            </p>
                          </div>
                        }
                        thumbnail={
                          <MountedThumbnailImage
                            entry={entry}
                            onCreated={refreshMountedCollection}
                          />
                        }
                        actions={
                          <div className="space-y-2">
                            <PlaygroundButton
                              fullWidth
                              onClick={() =>
                                void navigateToMountedTemplate(mountedCollection, entry, 'designer')
                              }
                            >
                              <PencilRuler className="size-4" />
                              Designer
                            </PlaygroundButton>
                            <PlaygroundButton
                              fullWidth
                              onClick={() =>
                                void navigateToMountedTemplate(
                                  mountedCollection,
                                  entry,
                                  'form-viewer',
                                )
                              }
                            >
                              <Eye className="size-4" />
                              Form/Viewer
                            </PlaygroundButton>
                          </div>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-green-300 bg-white px-4 py-4 text-sm text-green-900">
                    No valid template directories are mounted.
                  </div>
                )}
              </>
            )}
            {!mountedCollection && fileWorkspaceSupported && !lastFolderName && (
              <div className="mt-4 rounded-md border border-dashed border-green-300 bg-white px-4 py-4 text-sm text-green-900">
                Open a folder that contains directories like{' '}
                <code className="rounded bg-green-100 px-1">invoice/template.json</code>.
              </div>
            )}
          </div>
        </div>
        <section>
          <div className="border-b border-dashed border-gray-200 pb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Choose a Designer sample, JSX starter, or md2pdf starter from the same gallery.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="w-24 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Type
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {generationFilters.map((filter) => (
                      <PlaygroundButton
                        key={filter.value}
                        className="px-2 py-1 text-xs sm:px-2"
                        variant={generationFilter === filter.value ? 'primary' : 'secondary'}
                        onClick={() => setGenerationFilter(filter.value)}
                      >
                        {filter.label}
                      </PlaygroundButton>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <span className="w-24 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <PlaygroundButton
                      className="px-2 py-1 text-xs sm:px-2"
                      variant={tagFilter === 'all' ? 'primary' : 'secondary'}
                      onClick={() => setTagFilter('all')}
                    >
                      All
                    </PlaygroundButton>
                    {tagOptions.map((tag) => (
                      <PlaygroundButton
                        key={tag}
                        className="px-2 py-1 text-xs sm:px-2"
                        variant={tagFilter === tag ? 'primary' : 'secondary'}
                        onClick={() => setTagFilter(tag)}
                      >
                        {tag}
                      </PlaygroundButton>
                    ))}
                  </div>
                </div>
              </div>
              {hasActiveTemplateFilter && (
                <PlaygroundButton variant="ghost" onClick={clearTemplateFilters}>
                  Clear
                </PlaygroundButton>
              )}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
            {filteredTemplates.map((template, index) => {
              const { name, author } = template;
              const authoringPreset = getAuthoringPreset(template);
              const title = template.title ?? fromKebabCase(name);
              const generation = getTemplateGeneration(template);
              const tag =
                generation === 'jsx' ? 'JSX' : generation === 'md2pdf' ? 'md2pdf' : 'Designer';
              const Icon = generation === 'md2pdf' ? FileText : Code2;
              const tags = getTemplateTags(template);

              return (
                <React.Fragment key={name}>
                  {index === 3 && (
                    <div
                      data-ea-publisher="pdfmecom"
                      data-ea-type="image"
                      style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                    />
                  )}
                  <GalleryCard
                    tag={tag}
                    title={title}
                    tags={tags}
                    description={
                      <div className="space-y-3">
                        <p>{template.description ?? 'A ready-to-edit pdfme sample template.'}</p>
                        <p className="flex items-center gap-2 text-xs text-gray-500">
                          by{' '}
                          {avatarUrlMap[author] && (
                            <img
                              src={avatarUrlMap[author]}
                              alt={author}
                              className="inline-block size-7 rounded-full bg-gray-100"
                            />
                          )}
                          <AuthorLink author={author} />
                        </p>
                      </div>
                    }
                    thumbnail={
                      <img
                        id={`template-img-${name}`}
                        onClick={() =>
                          authoringPreset
                            ? navigateToAuthoringPreset(authoringPreset)
                            : navigateTo(name, 'designer')
                        }
                        alt={title}
                        src={`/template-assets/${name}/thumbnail.png`}
                        className="h-72 w-full cursor-pointer object-contain"
                      />
                    }
                    actions={
                      authoringPreset ? (
                        <PlaygroundButton
                          fullWidth
                          onClick={() => navigateToAuthoringPreset(authoringPreset)}
                        >
                          <Icon className="size-4" />
                          Open Starter
                        </PlaygroundButton>
                      ) : (
                        <div className="space-y-2">
                          <PlaygroundButton fullWidth onClick={() => navigateTo(name, 'designer')}>
                            <PencilRuler className="size-4" />
                            Designer
                          </PlaygroundButton>
                          <PlaygroundButton
                            fullWidth
                            onClick={() => navigateTo(name, 'form-viewer')}
                          >
                            <Eye className="size-4" />
                            Form/Viewer
                          </PlaygroundButton>
                        </div>
                      )
                    }
                  />
                </React.Fragment>
              );
            })}
            {filteredTemplates.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 sm:col-span-2 lg:col-span-4">
                No templates match the selected filters.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TemplatesApp;
