import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkTemplate, getInputFromTemplate, type Template } from '@pdfme/common';
import {
  ChevronDown,
  Copy,
  Download,
  FolderOpen,
  FolderX,
  MoreHorizontal,
  Pencil,
  PencilRuler,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { downloadJsonFile, readFile } from '../helper';
import PlaygroundButton from '../components/PlaygroundButton';
import { getAuthoringStarterId, type AuthoringStarterKind } from '../lib/authoringStarters';
import {
  deletePlaygroundProject,
  duplicatePlaygroundProject,
  getProjectAuthoringPath,
  getProjectKindLabel,
  readPlaygroundProjects,
  renamePlaygroundProject,
  isPlaygroundProjectStorageQuotaError,
  savePlaygroundProject,
  setActivePlaygroundProjectId,
  setPlaygroundProjectThumbnail,
  type PlaygroundProject,
} from '../lib/playgroundProjects';
import { createTemplateFromPdfFile, getPdfTemplateTitle } from '../lib/pdfTemplate';
import {
  createTemplateThumbnailDataUrl,
  getProjectThumbnailInputs,
} from '../lib/templateThumbnails';
import {
  clearPersistedFileWorkspace,
  createBlankTemplateEntry,
  createTemplateEntryFromTemplate,
  findTemplateEntry,
  isFileWorkspaceSupported,
  openTemplateCollectionDirectory,
  persistFileWorkspaceState,
  refreshTemplateCollection,
  restorePersistedTemplateCollection,
  setSelectedFileWorkspaceTemplateName,
  subscribeTemplateCollectionChanges,
  writeTemplateMetadata,
  writeTemplateThumbnail,
  type EditableFileWorkspaceMetadata,
  type FileWorkspaceCollection,
  type FileWorkspaceSourceInput,
  type FileWorkspaceTemplateEntry,
  type SourceKind,
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
  description: string;
  fieldCount?: number;
  fontNames?: string[];
  hasCJK?: boolean;
  pageCount?: number;
  schemaTypes?: string[];
  sourceKind: Exclude<GenerationFilter, 'all'>;
  sourcePath?: string;
  tags: string[];
  title: string;
};

type UIType = 'designer' | 'form-viewer';
type GenerationFilter = 'all' | 'designer' | 'jsx' | 'md2pdf';
type MountedCollectionWriteRunner = <T>(write: () => Promise<T>) => Promise<T>;

type AuthoringPreset = {
  assetName: string;
  id: string;
  kind: AuthoringStarterKind;
};

// Constants
const DEVIN_AI_AUTHOR = 'Devin AI';
const DEVIN_INVITE_URL = 'https://app.devin.ai/invite/KyOTXVPrlFl2TjcT';

// GitHub serves user/org avatars at this URL, so no rate-limited API call is needed.
const getAuthorAvatarUrl = (author: string) =>
  author === DEVIN_AI_AUTHOR ? '/imgs/devin.svg' : `https://github.com/${author}.png?size=56`;
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

const tagFilterParam = 'tag';

const normalizeTagFilterParam = (value: string | null) => {
  const tag = value?.trim();
  return tag && tag.toLowerCase() !== 'all' ? tag : 'all';
};

const getTemplateGeneration = (template: TemplateData): Exclude<GenerationFilter, 'all'> =>
  template.sourceKind;

const getGenerationLabel = (generation: Exclude<GenerationFilter, 'all'>) => {
  if (generation === 'jsx') return 'JSX';
  if (generation === 'md2pdf') return 'md2pdf';
  return 'Designer';
};

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
  const tags = new Set(template.tags);

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
  onCreated: () => Promise<void> | void;
  project: PlaygroundProject;
}) => {
  const [src, setSrc] = useState(project.thumbnail);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSrc(project.thumbnail);
    setError(null);
    if (project.thumbnail) return;

    let cancelled = false;
    void createTemplateThumbnailDataUrl(project.template, getProjectThumbnailInputs(project))
      .then((thumbnail) => {
        if (cancelled) return;
        setSrc(thumbnail);
        void setPlaygroundProjectThumbnail(project.id, thumbnail)
          .then(() => onCreated())
          .catch((error) => {
            console.warn(error);
          });
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
  runWrite,
}: {
  entry: FileWorkspaceTemplateEntry;
  onCreated: () => void;
  runWrite: MountedCollectionWriteRunner;
}) => {
  const [src, setSrc] = useState(entry.thumbnailDataUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSrc(entry.thumbnailDataUrl);
    setError(null);
    if (entry.thumbnailDataUrl) return;

    let cancelled = false;
    void runWrite(() => writeTemplateThumbnail(entry, entry.template))
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
  }, [entry, onCreated, runWrite]);

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

type ProjectActionHandler = (project: PlaygroundProject) => Promise<void> | void;

type ProjectMoreActionsProps = {
  onDeleteProject: ProjectActionHandler;
  onDownloadProjectTemplate: ProjectActionHandler;
  onDuplicateProject: ProjectActionHandler;
  onOpenDesigner: ProjectActionHandler;
  onCopyToMountedFolder?: ProjectActionHandler;
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
  onCopyToMountedFolder,
  onRenameProject,
  project,
}: ProjectMoreActionsProps) {
  const [open, setOpen] = useState(false);
  const firstMenuItemRef = React.useRef<HTMLButtonElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const runAction = (handler: ProjectActionHandler) => {
    setOpen(false);
    void handler(project);
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
            {onCopyToMountedFolder && (
              <ProjectMenuItem onClick={() => runAction(onCopyToMountedFolder)}>
                <FolderOpen className="size-4" />
                Copy to Mounted Folder
              </ProjectMenuItem>
            )}
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

const TemplateCreateMenu = ({
  busy = false,
  disabled = false,
  label,
  onBlank,
  onPdf,
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onBlank: () => void;
  onPdf: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const firstMenuItemRef = React.useRef<HTMLButtonElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const isDisabled = disabled || busy;
  const runAction = (action: () => void) => {
    setOpen(false);
    action();
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
        disabled={isDisabled}
        onClick={() => setOpen((value) => !value)}
        variant="primary"
      >
        <PencilRuler className="size-4" />
        {busy ? 'Creating...' : label}
        <ChevronDown className="size-3.5" />
      </PlaygroundButton>
      {open && !isDisabled && (
        <>
          <button
            type="button"
            aria-label="Close template creation menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            <ProjectMenuItem buttonRef={firstMenuItemRef} onClick={() => runAction(onBlank)}>
              <PencilRuler className="size-4" />
              Blank template
            </ProjectMenuItem>
            <ProjectMenuItem onClick={() => runAction(onPdf)}>
              <Upload className="size-4" />
              From PDF
            </ProjectMenuItem>
          </div>
        </>
      )}
    </div>
  );
};

const parseTagInput = (value: string) => [
  ...new Set(
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];

const getProjectSourceKind = (project: PlaygroundProject): SourceKind => {
  if (project.kind === 'jsx') return 'jsx';
  if (project.kind === 'md2pdf') return 'md2pdf';
  return 'designer';
};

const getProjectSourceInput = (project: PlaygroundProject): FileWorkspaceSourceInput | undefined =>
  project.source
    ? {
        content: project.source.content,
        language: project.source.language,
      }
    : undefined;

const MountedMetadataDialog = ({
  entry,
  onClose,
  onSave,
}: {
  entry: FileWorkspaceTemplateEntry;
  onClose: () => void;
  onSave: (
    entry: FileWorkspaceTemplateEntry,
    metadata: EditableFileWorkspaceMetadata,
  ) => Promise<void>;
}) => {
  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description ?? '');
  const [tags, setTags] = useState(entry.tags.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSaving) return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSaving, onClose]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(entry, {
        description,
        tags: parseTagInput(tags),
        title,
      });
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save metadata.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        type="button"
        aria-label="Close metadata editor"
        className="absolute inset-0 cursor-default"
        onClick={isSaving ? undefined : onClose}
      />
      <form
        aria-labelledby="mounted-metadata-dialog-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
        onSubmit={(event) => void onSubmit(event)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="mounted-metadata-dialog-title" className="text-lg font-bold text-gray-900">
              Edit Metadata
            </h3>
            <p className="mt-1 text-xs text-gray-500">{entry.name}/metadata.json</p>
            <p className="mt-1 text-xs text-gray-500">
              Changing the title also renames the template folder.
            </p>
          </div>
          <PlaygroundButton disabled={isSaving} onClick={onClose} type="button" variant="ghost">
            Close
          </PlaygroundButton>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Title
            <input
              ref={titleInputRef}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Tags
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <PlaygroundButton disabled={isSaving} onClick={onClose} type="button" variant="secondary">
            Cancel
          </PlaygroundButton>
          <PlaygroundButton disabled={isSaving} type="submit" variant="primary">
            {isSaving ? 'Saving...' : 'Save Metadata'}
          </PlaygroundButton>
        </div>
      </form>
    </div>
  );
};

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

type TemplatesAppProps = {
  view?: 'templates' | 'workspace';
};

function TemplatesApp({ view = 'templates' }: TemplatesAppProps) {
  const showWorkspace = view === 'workspace';
  const showTemplateGallery = view === 'templates';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const importTemplateInputRef = React.useRef<HTMLInputElement | null>(null);
  const localPdfTemplateInputRef = React.useRef<HTMLInputElement | null>(null);
  const mountedCollectionRef = React.useRef<FileWorkspaceCollection | null>(null);
  const mountedCollectionWriteCountRef = React.useRef(0);
  const mountedPdfTemplateInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileWorkspaceSupported = isFileWorkspaceSupported();

  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [projects, setProjects] = useState<PlaygroundProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [mountedCollection, setMountedCollection] = useState<FileWorkspaceCollection | null>(null);
  const [editingMountedEntry, setEditingMountedEntry] = useState<FileWorkspaceTemplateEntry | null>(
    null,
  );
  const [lastFolderName, setLastFolderName] = useState<string | null>(null);
  const [isCreatingLocalPdfTemplate, setIsCreatingLocalPdfTemplate] = useState(false);
  const [isCreatingMountedPdfTemplate, setIsCreatingMountedPdfTemplate] = useState(false);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>('all');
  const tagFilterFromQuery = normalizeTagFilterParam(searchParams.get(tagFilterParam));

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await readPlaygroundProjects());
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load Browser Projects');
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);
  const setTemplateTagFilter = useCallback(
    (tag: string) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      if (normalizeTagFilterParam(tag) === 'all') {
        nextSearchParams.delete(tagFilterParam);
      } else {
        nextSearchParams.set(tagFilterParam, tag);
      }
      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams],
  );
  const runMountedCollectionWrite = useCallback(async <T,>(write: () => Promise<T>) => {
    mountedCollectionWriteCountRef.current += 1;
    try {
      return await write();
    } finally {
      mountedCollectionWriteCountRef.current = Math.max(
        0,
        mountedCollectionWriteCountRef.current - 1,
      );
    }
  }, []);
  const shouldSkipMountedCollectionRefresh = useCallback(
    () => mountedCollectionWriteCountRef.current > 0,
    [],
  );
  const refreshMountedCollection = useCallback(() => {
    const collection = mountedCollectionRef.current;
    if (!collection) return;

    void refreshTemplateCollection(collection)
      .then((collection) => {
        setMountedCollection(collection);
        setLastFolderName(collection.rootName);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to refresh folder');
      });
  }, []);

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

  const tagFilter = useMemo(() => {
    if (tagFilterFromQuery === 'all') return 'all';

    return (
      tagOptions.find((tag) => tag.toLowerCase() === tagFilterFromQuery.toLowerCase()) ??
      tagFilterFromQuery
    );
  }, [tagFilterFromQuery, tagOptions]);

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
    setTemplateTagFilter('all');
  };

  useEffect(() => {
    if (!showWorkspace) return;

    void refreshProjects();
    const onFocus = () => void refreshProjects();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshProjects, showWorkspace]);

  useEffect(() => {
    if (!fileWorkspaceSupported || !showWorkspace) return;

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
  }, [fileWorkspaceSupported, showWorkspace]);

  useEffect(() => {
    mountedCollectionRef.current = mountedCollection;
  }, [mountedCollection]);

  useEffect(() => {
    if (!showWorkspace) return;

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
        getCollection: () => mountedCollectionRef.current,
        shouldSkip: shouldSkipMountedCollectionRefresh,
      },
    );
  }, [mountedCollection?.rootHandle, shouldSkipMountedCollectionRefresh, showWorkspace]);

  // Fetch templates
  useEffect(() => {
    if (!showTemplateGallery) return;

    fetch('/template-assets/index.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load templates: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data: TemplateData[]) => {
        setTemplates(data);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to load templates');
      });
  }, [showTemplateGallery]);

  // Load ethical ads
  useEffect(() => {
    if (!showTemplateGallery) return;

    if (window.ethicalads && typeof window.ethicalads.load === 'function') {
      window.ethicalads.load();
    } else {
      console.warn('EthicalAds script is not loaded yet.');
    }
  }, [showTemplateGallery, templates]);

  // Unified navigation function
  const navigateTo = (name: string, ui: UIType) => {
    const path = ui === 'designer' ? '/designer' : '/form-viewer';
    navigate(`${path}?template=${name}`);
  };

  const navigateToProject = async (project: PlaygroundProject, target: UIType | 'source') => {
    await setActivePlaygroundProjectId(project.id);
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

    const { nextCollection, nextEntry } = await runMountedCollectionWrite(async () => {
      const entry = await createBlankTemplateEntry(collection.rootHandle);
      const collectionAfterCreate = await refreshTemplateCollection({
        ...collection,
        selectedTemplateName: entry.name,
      });

      return {
        nextCollection: collectionAfterCreate,
        nextEntry: findTemplateEntry(collectionAfterCreate, entry.name) ?? entry,
      };
    });
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

  const onCreateMountedTemplate = async () => {
    const collection = mountedCollectionRef.current;
    if (!collection) return;

    const title = window.prompt('Template name', 'Untitled Template') ?? '';
    if (!title.trim()) return;

    try {
      const { nextCollection, nextEntry } = await runMountedCollectionWrite(async () => {
        const entry = await createBlankTemplateEntry(collection.rootHandle, title);
        const collectionAfterCreate = await refreshTemplateCollection({
          ...collection,
          selectedTemplateName: entry.name,
        });

        return {
          nextCollection: collectionAfterCreate,
          nextEntry: findTemplateEntry(collectionAfterCreate, entry.name) ?? entry,
        };
      });
      setMountedCollection(nextCollection);
      setLastFolderName(nextCollection.rootName);
      await navigateToMountedTemplate(nextCollection, nextEntry, 'designer');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create template');
    }
  };

  const onCreateLocalTemplateFromPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsCreatingLocalPdfTemplate(true);
    try {
      const title = window.prompt('Template name', getPdfTemplateTitle(file)) ?? '';
      if (!title.trim()) return;

      const draft = await createTemplateFromPdfFile(file);
      const inputs = getInputFromTemplate(draft.template);
      const thumbnail = await createTemplateThumbnailDataUrl(draft.template, inputs).catch(
        () => undefined,
      );
      const project = await savePlaygroundProject({
        inputs,
        kind: 'template',
        template: draft.template,
        thumbnail,
        title,
      });

      await refreshProjects();
      toast.success(`Created "${project.title}" from ${draft.fileName}`);
      await navigateToProject(project, 'designer');
    } catch (error) {
      console.error(error);
      toast.error(
        isPlaygroundProjectStorageQuotaError(error)
          ? 'PDF is too large to save in Browser Projects. Try a mounted folder instead.'
          : error instanceof Error
            ? error.message
            : 'Failed to create template from PDF',
      );
    } finally {
      setIsCreatingLocalPdfTemplate(false);
    }
  };

  const onCreateMountedTemplateFromPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const collection = mountedCollectionRef.current;
    if (!collection) {
      toast.error('Open a mounted folder first');
      return;
    }

    setIsCreatingMountedPdfTemplate(true);
    try {
      const title = window.prompt('Template name', getPdfTemplateTitle(file)) ?? '';
      if (!title.trim()) return;

      const draft = await createTemplateFromPdfFile(file);
      const thumbnail = await createTemplateThumbnailDataUrl(draft.template).catch(() => undefined);
      const { nextCollection, nextEntry } = await runMountedCollectionWrite(async () => {
        const entry = await createTemplateEntryFromTemplate(collection, draft.template, title, {
          description: `A template created from ${draft.fileName}.`,
          sourceKind: 'designer',
          sourcePdf: file,
          tags: ['PDF', 'Designer'],
          thumbnailDataUrl: thumbnail,
        });
        const collectionAfterCreate = await refreshTemplateCollection({
          ...collection,
          selectedTemplateName: entry.name,
        });

        return {
          nextCollection: collectionAfterCreate,
          nextEntry: findTemplateEntry(collectionAfterCreate, entry.name) ?? entry,
        };
      });

      setMountedCollection(nextCollection);
      setLastFolderName(nextCollection.rootName);
      toast.success(`Created "${nextEntry.title}" from ${draft.fileName}`);
      await navigateToMountedTemplate(nextCollection, nextEntry, 'designer');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create template from PDF');
    } finally {
      setIsCreatingMountedPdfTemplate(false);
    }
  };

  const onSaveMountedMetadata = async (
    entry: FileWorkspaceTemplateEntry,
    metadata: EditableFileWorkspaceMetadata,
  ) => {
    const collection = mountedCollectionRef.current;
    if (!collection) throw new Error('Mounted folder is not available.');

    const { nextCollection, updatedEntry } = await runMountedCollectionWrite(async () => {
      const updatedEntry = await writeTemplateMetadata(collection, entry, metadata);
      const collectionAfterSave = await refreshTemplateCollection({
        ...collection,
        selectedTemplateName: updatedEntry.name,
      });

      return { nextCollection: collectionAfterSave, updatedEntry };
    });
    setMountedCollection(nextCollection);
    setLastFolderName(nextCollection.rootName);
    setEditingMountedEntry(null);
    toast.success(`Updated "${updatedEntry.title}" metadata`);
  };

  const onCopyProjectToMountedFolder = async (project: PlaygroundProject) => {
    const collection = mountedCollectionRef.current;
    if (!collection) {
      toast.error('Open a mounted folder first');
      return;
    }

    try {
      const { nextCollection } = await runMountedCollectionWrite(async () => {
        const sourceKind = getProjectSourceKind(project);
        const entry = await createTemplateEntryFromTemplate(
          collection,
          project.template,
          project.title,
          {
            description: 'A template copied from Browser Projects.',
            source: getProjectSourceInput(project),
            sourceKind,
            tags: [getGenerationLabel(sourceKind)],
            thumbnailDataUrl: project.thumbnail,
          },
        );
        const collectionAfterCopy = await refreshTemplateCollection({
          ...collection,
          selectedTemplateName: entry.name,
        });

        return { nextCollection: collectionAfterCopy };
      });
      setMountedCollection(nextCollection);
      setLastFolderName(nextCollection.rootName);
      toast.success(`Copied "${project.title}" to ${nextCollection.rootName}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to copy project');
    }
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
      const project = await savePlaygroundProject({
        inputs,
        kind: 'template',
        template,
        thumbnail,
        title,
      });
      await refreshProjects();
      toast.success(`Imported "${project.title}" into My Workspace`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Invalid template JSON');
    }
  };

  const onDeleteProject = async (project: PlaygroundProject) => {
    if (!window.confirm(`Delete "${project.title}" from this browser?`)) return;
    await deletePlaygroundProject(project.id);
    await refreshProjects();
    toast.info(`Deleted "${project.title}"`);
  };

  const onRenameProject = async (project: PlaygroundProject) => {
    const title = window.prompt('Project name', project.title) ?? '';
    if (!title.trim()) return;

    const renamedProject = await renamePlaygroundProject(project.id, title);
    if (!renamedProject) {
      toast.error('Project not found');
      return;
    }

    await refreshProjects();
    toast.success(`Renamed to "${renamedProject.title}"`);
  };

  const onDuplicateProject = async (project: PlaygroundProject) => {
    const title = window.prompt('Duplicate as', `${project.title} Copy`) ?? '';
    if (!title.trim()) return;

    const duplicatedProject = await duplicatePlaygroundProject(project.id, title);
    if (!duplicatedProject) {
      toast.error('Project not found');
      return;
    }

    await refreshProjects();
    toast.success(`Duplicated "${duplicatedProject.title}"`);
  };

  const onDownloadProjectTemplate = (project: PlaygroundProject) => {
    const fileName = project.title.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'template';
    downloadJsonFile(project.template, fileName);
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">
        {showWorkspace && (
          <div className="mb-10 rounded-lg border border-green-200 bg-green-50 p-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Workspace</h2>
              <p className="mt-2 max-w-3xl text-sm text-green-900">
                Work with templates saved in this browser, or mount a folder to edit template files
                directly on disk.
              </p>
            </div>

            <div>
              <div className="mt-5 border-t border-green-200 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Browser Projects</h3>
                    <p className="mt-1 text-sm text-green-900">
                      Drafts stored in this browser. They include template JSON, form inputs, and
                      source code when available.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
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
                    <input
                      ref={localPdfTemplateInputRef}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(event) => void onCreateLocalTemplateFromPdf(event)}
                    />
                    <TemplateCreateMenu
                      busy={isCreatingLocalPdfTemplate}
                      label="New Local Template"
                      onBlank={() => navigate('/designer?new=1')}
                      onPdf={() => localPdfTemplateInputRef.current?.click()}
                    />
                  </div>
                </div>

                {isLoadingProjects ? (
                  <div className="mt-5 rounded-md border border-dashed border-green-300 bg-white px-4 py-6 text-sm text-green-900">
                    Loading Browser Projects...
                  </div>
                ) : projects.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
                    {projects.map((project) => (
                      <GalleryCard
                        key={project.id}
                        tag={`Local ${getProjectKindLabel(project.kind)}`}
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
                                void navigateToProject(
                                  project,
                                  project.source ? 'source' : 'designer',
                                )
                              }
                            >
                              {project.source ? 'Source' : 'Designer'}
                            </PlaygroundButton>
                            <PlaygroundButton
                              onClick={() => void navigateToProject(project, 'form-viewer')}
                            >
                              Form/Viewer
                            </PlaygroundButton>
                            <ProjectMoreActions
                              project={project}
                              onOpenDesigner={(item) => navigateToProject(item, 'designer')}
                              onRenameProject={onRenameProject}
                              onDuplicateProject={onDuplicateProject}
                              onCopyToMountedFolder={
                                mountedCollection ? onCopyProjectToMountedFolder : undefined
                              }
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
                    No browser projects yet. Create a local template, import JSON, or save from
                    Designer, JSX, or md2pdf.
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-green-200 pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Mounted Folder</h3>
                    <p className="mt-1 text-sm text-green-900">
                      Templates in this section are read from and saved back to template files on
                      disk.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {!mountedCollection && (
                      <PlaygroundButton
                        disabled={!fileWorkspaceSupported || isOpeningFolder}
                        onClick={() => void onOpenFolder()}
                        variant="primary"
                      >
                        <FolderOpen className="size-4" />
                        {isOpeningFolder ? 'Opening...' : 'Open Folder'}
                      </PlaygroundButton>
                    )}
                    {!mountedCollection && lastFolderName && (
                      <PlaygroundButton
                        disabled={!fileWorkspaceSupported || isOpeningFolder}
                        onClick={() => void onReopenFolder()}
                        title={lastFolderName}
                        variant="secondary"
                      >
                        <FolderOpen className="size-4" />
                        Reopen Folder
                      </PlaygroundButton>
                    )}
                    {mountedCollection && (
                      <PlaygroundButton
                        onClick={() => void onDisconnectFolder()}
                        variant="secondary"
                      >
                        <FolderX className="size-4" />
                        Disconnect
                      </PlaygroundButton>
                    )}
                    {mountedCollection && (
                      <>
                        <input
                          ref={mountedPdfTemplateInputRef}
                          type="file"
                          accept="application/pdf"
                          className="sr-only"
                          onChange={(event) => void onCreateMountedTemplateFromPdf(event)}
                        />
                        <TemplateCreateMenu
                          busy={isCreatingMountedPdfTemplate}
                          label="New Mounted Template"
                          onBlank={() => void onCreateMountedTemplate()}
                          onPdf={() => mountedPdfTemplateInputRef.current?.click()}
                        />
                      </>
                    )}
                  </div>
                </div>
                {!fileWorkspaceSupported && (
                  <div className="mt-4 rounded-md border border-dashed border-green-300 bg-white px-4 py-4 text-sm text-green-900">
                    Folder workspaces need a Chromium browser in a secure context. Browser projects,
                    JSON import, and JSON download are still available.
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
                            tag={`Disk ${getGenerationLabel(entry.sourceKind)}`}
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
                                runWrite={runMountedCollectionWrite}
                              />
                            }
                            actions={
                              <div className="space-y-2">
                                <PlaygroundButton
                                  fullWidth
                                  onClick={() =>
                                    void navigateToMountedTemplate(
                                      mountedCollection,
                                      entry,
                                      'designer',
                                    )
                                  }
                                >
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
                                  Form/Viewer
                                </PlaygroundButton>
                                <PlaygroundButton
                                  fullWidth
                                  onClick={() => setEditingMountedEntry(entry)}
                                  variant="secondary"
                                >
                                  Edit Metadata
                                </PlaygroundButton>
                              </div>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-md border border-dashed border-green-300 bg-white px-4 py-4 text-sm text-green-900">
                        No valid template directories are mounted. Create a mounted template to
                        write a new folder with template.json.
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
          </div>
        )}
        {showTemplateGallery && (
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
                        onClick={() => setTemplateTagFilter('all')}
                      >
                        All
                      </PlaygroundButton>
                      {tagOptions.map((tag) => (
                        <PlaygroundButton
                          key={tag}
                          className="px-2 py-1 text-xs sm:px-2"
                          variant={tagFilter === tag ? 'primary' : 'secondary'}
                          onClick={() => setTemplateTagFilter(tag)}
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
                const title = template.title;
                const generation = getTemplateGeneration(template);
                const tag = getGenerationLabel(generation);
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
                          <p>{template.description}</p>
                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            by{' '}
                            <img
                              src={getAuthorAvatarUrl(author)}
                              alt={author}
                              loading="lazy"
                              className="inline-block size-7 rounded-full bg-gray-100"
                            />
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
                            Open Starter
                          </PlaygroundButton>
                        ) : (
                          <div className="space-y-2">
                            <PlaygroundButton
                              fullWidth
                              onClick={() => navigateTo(name, 'designer')}
                            >
                              Designer
                            </PlaygroundButton>
                            <PlaygroundButton
                              fullWidth
                              onClick={() => navigateTo(name, 'form-viewer')}
                            >
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
        )}
      </div>
      {editingMountedEntry && (
        <MountedMetadataDialog
          entry={editingMountedEntry}
          onClose={() => setEditingMountedEntry(null)}
          onSave={onSaveMountedMetadata}
        />
      )}
    </div>
  );
}

export function WorkspaceApp() {
  return <TemplatesApp view="workspace" />;
}

export default TemplatesApp;
