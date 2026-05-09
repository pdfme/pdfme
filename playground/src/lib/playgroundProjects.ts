import { checkTemplate, getInputFromTemplate, type Template } from '@pdfme/common';

export type PlaygroundProjectKind = 'template' | 'jsx' | 'md2pdf';

export type PlaygroundProjectSource = {
  content: string;
  language: 'jsx' | 'markdown';
  presetId?: string;
  route: '/jsx' | '/md2pdf';
};

export type PlaygroundProject = {
  createdAt: number;
  id: string;
  inputs: Record<string, string>[];
  kind: PlaygroundProjectKind;
  source?: PlaygroundProjectSource;
  template: Template;
  thumbnail?: string;
  title: string;
  updatedAt: number;
};

export type SavePlaygroundProjectInput = {
  id?: string;
  inputs?: Record<string, string>[];
  kind: PlaygroundProjectKind;
  source?: PlaygroundProjectSource;
  template: Template;
  thumbnail?: string;
  title: string;
};

const PROJECTS_STORAGE_KEY = 'playground:projects:v1';
const ACTIVE_PROJECT_STORAGE_KEY = 'playground:activeProjectId:v1';
const LEGACY_TEMPLATE_STORAGE_KEY = 'template';
const LEGACY_INPUTS_STORAGE_KEY = 'inputs';

type StorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

const getStorage = (): StorageLike | null =>
  typeof window === 'undefined' ? null : window.localStorage;

const createProjectId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `project_${crypto.randomUUID()}`;
  }

  return `project_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeTitle = (title: string, fallback: string) => {
  const normalized = title.trim().replace(/\s+/g, ' ');
  return normalized || fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseInputs = (value: unknown): Record<string, string>[] | null => {
  if (!Array.isArray(value)) return null;

  const inputs: Record<string, string>[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;

    const input: Record<string, string> = {};
    for (const [key, inputValue] of Object.entries(item)) {
      if (typeof inputValue !== 'string') return null;
      input[key] = inputValue;
    }
    inputs.push(input);
  }

  return inputs;
};

const parseProject = (value: unknown): PlaygroundProject | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.kind !== 'string' ||
    !['template', 'jsx', 'md2pdf'].includes(value.kind) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    !isRecord(value.template)
  ) {
    return null;
  }

  const inputs = parseInputs(value.inputs);
  if (!inputs) return null;

  try {
    checkTemplate(value.template as Template);
  } catch {
    return null;
  }

  return {
    createdAt: value.createdAt,
    id: value.id,
    inputs,
    kind: value.kind as PlaygroundProjectKind,
    source: isRecord(value.source) ? (value.source as PlaygroundProjectSource) : undefined,
    template: value.template as Template,
    thumbnail: typeof value.thumbnail === 'string' ? value.thumbnail : undefined,
    title: value.title,
    updatedAt: value.updatedAt,
  };
};

const writePlaygroundProjects = (projects: PlaygroundProject[], storage = getStorage()) => {
  if (!storage) return;
  storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

const migrateLegacyProject = (storage: StorageLike): PlaygroundProject | null => {
  const legacyTemplate = storage.getItem(LEGACY_TEMPLATE_STORAGE_KEY);
  if (!legacyTemplate) return null;

  try {
    const template = JSON.parse(legacyTemplate) as Template;
    checkTemplate(template);

    const parsedInputs = JSON.parse(storage.getItem(LEGACY_INPUTS_STORAGE_KEY) ?? 'null');
    const now = Date.now();
    const project: PlaygroundProject = {
      createdAt: now,
      id: `project_legacy_${now.toString(36)}`,
      inputs: parseInputs(parsedInputs) ?? getInputFromTemplate(template),
      kind: 'template',
      template,
      title: 'Imported local template',
      updatedAt: now,
    };

    writePlaygroundProjects([project], storage);
    setActivePlaygroundProjectId(project.id, storage);
    storage.removeItem(LEGACY_TEMPLATE_STORAGE_KEY);
    storage.removeItem(LEGACY_INPUTS_STORAGE_KEY);
    return project;
  } catch {
    return null;
  }
};

export const readPlaygroundProjects = (storage = getStorage()): PlaygroundProject[] => {
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(PROJECTS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];

    const projects = parsed
      .map(parseProject)
      .filter((project): project is PlaygroundProject => project != null)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (projects.length > 0) return projects;

    const migratedProject = migrateLegacyProject(storage);
    return migratedProject ? [migratedProject] : [];
  } catch {
    return [];
  }
};

export const getPlaygroundProject = (
  projectId: string,
  storage = getStorage(),
): PlaygroundProject | null =>
  readPlaygroundProjects(storage).find((project) => project.id === projectId) ?? null;

export const savePlaygroundProject = (
  input: SavePlaygroundProjectInput,
  storage = getStorage(),
): PlaygroundProject => {
  checkTemplate(input.template);

  const projects = readPlaygroundProjects(storage);
  const existing = input.id ? projects.find((project) => project.id === input.id) : undefined;
  const now = Date.now();
  const project: PlaygroundProject = {
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? input.id ?? createProjectId(),
    inputs: input.inputs ?? getInputFromTemplate(input.template),
    kind: input.kind,
    source: input.source,
    template: input.template,
    thumbnail: input.thumbnail ?? existing?.thumbnail,
    title: normalizeTitle(input.title, existing?.title ?? 'Untitled Project'),
    updatedAt: now,
  };

  writePlaygroundProjects(
    [project, ...projects.filter((item) => item.id !== project.id)].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    ),
    storage,
  );
  setActivePlaygroundProjectId(project.id, storage);
  return project;
};

export const deletePlaygroundProject = (projectId: string, storage = getStorage()) => {
  const projects = readPlaygroundProjects(storage).filter((project) => project.id !== projectId);
  writePlaygroundProjects(projects, storage);
  if (getActivePlaygroundProjectId(storage) === projectId) {
    storage?.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
  }
};

export const setPlaygroundProjectThumbnail = (
  projectId: string,
  thumbnail: string,
  storage = getStorage(),
) => {
  const projects = readPlaygroundProjects(storage);
  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;

  const updatedProject = { ...project, thumbnail };
  writePlaygroundProjects(
    projects.map((item) => (item.id === projectId ? updatedProject : item)),
    storage,
  );
  return updatedProject;
};

export const getActivePlaygroundProjectId = (storage = getStorage()) =>
  storage?.getItem(ACTIVE_PROJECT_STORAGE_KEY) ?? null;

export const setActivePlaygroundProjectId = (projectId: string, storage = getStorage()) => {
  storage?.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);
};

export const clearActivePlaygroundProject = (storage = getStorage()) => {
  storage?.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
};

export const getActivePlaygroundProject = (storage = getStorage()) => {
  const projectId = getActivePlaygroundProjectId(storage);
  return projectId ? getPlaygroundProject(projectId, storage) : null;
};

export const getProjectAuthoringPath = (project: PlaygroundProject) => {
  if (project.kind === 'jsx') return `/jsx?project=${encodeURIComponent(project.id)}`;
  if (project.kind === 'md2pdf') return `/md2pdf?project=${encodeURIComponent(project.id)}`;
  return `/designer?project=${encodeURIComponent(project.id)}`;
};

export const getProjectKindLabel = (kind: PlaygroundProjectKind) => {
  if (kind === 'jsx') return 'JSX';
  if (kind === 'md2pdf') return 'md2pdf';
  return 'Template';
};
