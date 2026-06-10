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
  metadata?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
  source?: PlaygroundProjectSource;
  template: Template;
  thumbnail?: string;
  title: string;
};

export type PlaygroundProjectStorage = {
  clearActiveProjectId: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  getActiveProjectId: () => Promise<string | null>;
  /** Optional fast path for single-project lookups; falls back to readProjects. */
  getProject?: (projectId: string) => Promise<unknown>;
  putProject: (project: PlaygroundProject) => Promise<void>;
  readProjects: () => Promise<unknown[]>;
  setActiveProjectId: (projectId: string) => Promise<void>;
};

const DB_NAME = 'pdfme-playground-projects';
const DB_VERSION = 1;
const PROJECTS_STORE_NAME = 'projects';
const META_STORE_NAME = 'meta';
const ACTIVE_PROJECT_ID_KEY = 'activeProjectId';

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

export class PlaygroundProjectStorageQuotaError extends Error {
  constructor() {
    super(
      'Browser Project is too large to save in browser storage. Try a mounted folder or delete unused Browser Projects.',
    );
    this.name = 'PlaygroundProjectStorageQuotaError';
  }
}

const createUniqueProjectTitle = (title: string, projects: PlaygroundProject[]) => {
  const normalizedTitle = normalizeTitle(title, 'Untitled Project');
  const existingTitles = new Set(projects.map((project) => project.title));
  if (!existingTitles.has(normalizedTitle)) return normalizedTitle;

  for (let index = 2; ; index += 1) {
    const candidate = `${normalizedTitle} ${index}`;
    if (!existingTitles.has(candidate)) return candidate;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStorageQuotaExceededError = (error: unknown) =>
  isRecord(error) &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

export const isPlaygroundProjectStorageQuotaError = (error: unknown) =>
  error instanceof PlaygroundProjectStorageQuotaError || isStorageQuotaExceededError(error);

const cloneRecord = (value: Record<string, unknown> | undefined) =>
  value ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>) : undefined;

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
    metadata: isRecord(value.metadata) ? cloneRecord(value.metadata) : undefined,
    source: isRecord(value.source) ? (value.source as PlaygroundProjectSource) : undefined,
    template: value.template as Template,
    thumbnail: typeof value.thumbnail === 'string' ? value.thumbnail : undefined,
    title: value.title,
    updatedAt: value.updatedAt,
  };
};

const idbRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });

const idbTransactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('error', () => reject(transaction.error));
    transaction.addEventListener('abort', () => reject(transaction.error));
  });

const normalizeStorageWriteError = (error: unknown) => {
  if (isStorageQuotaExceededError(error)) {
    return new PlaygroundProjectStorageQuotaError();
  }
  return error;
};

const wrapProjectStorageWrite = async (write: () => Promise<void>) => {
  try {
    await write();
  } catch (error) {
    throw normalizeStorageWriteError(error);
  }
};

const openProjectsDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
        db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME);
      }
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });

const defaultProjectStorage: PlaygroundProjectStorage = {
  clearActiveProjectId: async () => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(META_STORE_NAME, 'readwrite');
      await wrapProjectStorageWrite(async () => {
        await idbRequest(transaction.objectStore(META_STORE_NAME).delete(ACTIVE_PROJECT_ID_KEY));
        await idbTransactionDone(transaction);
      });
    } finally {
      db.close();
    }
  },
  deleteProject: async (projectId: string) => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
      await wrapProjectStorageWrite(async () => {
        await idbRequest(transaction.objectStore(PROJECTS_STORE_NAME).delete(projectId));
        await idbTransactionDone(transaction);
      });
    } finally {
      db.close();
    }
  },
  getActiveProjectId: async () => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(META_STORE_NAME, 'readonly');
      const value = await idbRequest<unknown>(
        transaction.objectStore(META_STORE_NAME).get(ACTIVE_PROJECT_ID_KEY),
      );
      return typeof value === 'string' ? value : null;
    } finally {
      db.close();
    }
  },
  getProject: async (projectId: string) => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(PROJECTS_STORE_NAME, 'readonly');
      return await idbRequest<unknown>(transaction.objectStore(PROJECTS_STORE_NAME).get(projectId));
    } finally {
      db.close();
    }
  },
  putProject: async (project: PlaygroundProject) => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
      await wrapProjectStorageWrite(async () => {
        await idbRequest(transaction.objectStore(PROJECTS_STORE_NAME).put(project));
        await idbTransactionDone(transaction);
      });
    } finally {
      db.close();
    }
  },
  readProjects: async () => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(PROJECTS_STORE_NAME, 'readonly');
      return await idbRequest<unknown[]>(transaction.objectStore(PROJECTS_STORE_NAME).getAll());
    } finally {
      db.close();
    }
  },
  setActiveProjectId: async (projectId: string) => {
    const db = await openProjectsDb();
    try {
      const transaction = db.transaction(META_STORE_NAME, 'readwrite');
      await wrapProjectStorageWrite(async () => {
        await idbRequest(
          transaction.objectStore(META_STORE_NAME).put(projectId, ACTIVE_PROJECT_ID_KEY),
        );
        await idbTransactionDone(transaction);
      });
    } finally {
      db.close();
    }
  },
};

const sortProjectsByUpdatedAt = (projects: PlaygroundProject[]) =>
  projects.sort((a, b) => b.updatedAt - a.updatedAt);

export const readPlaygroundProjects = async (
  storage: PlaygroundProjectStorage = defaultProjectStorage,
): Promise<PlaygroundProject[]> => {
  try {
    return sortProjectsByUpdatedAt(
      (await storage.readProjects())
        .map(parseProject)
        .filter((project): project is PlaygroundProject => project != null),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getPlaygroundProject = async (
  projectId: string,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
): Promise<PlaygroundProject | null> => {
  if (storage.getProject) {
    try {
      const project = parseProject(await storage.getProject(projectId));
      return project?.id === projectId ? project : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  return (
    (await readPlaygroundProjects(storage)).find((project) => project.id === projectId) ?? null
  );
};

export const savePlaygroundProject = async (
  input: SavePlaygroundProjectInput,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
): Promise<PlaygroundProject> => {
  checkTemplate(input.template);

  const existing = input.id ? await getPlaygroundProject(input.id, storage) : null;
  const now = Date.now();
  let savedProject: PlaygroundProject = {
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? input.id ?? createProjectId(),
    inputs: input.inputs ?? getInputFromTemplate(input.template),
    kind: input.kind,
    metadata: cloneRecord(input.metadata ?? existing?.metadata),
    source: input.source,
    template: input.template,
    thumbnail: input.thumbnail ?? existing?.thumbnail,
    title: normalizeTitle(input.title, existing?.title ?? 'Untitled Project'),
    updatedAt: now,
  };

  try {
    await storage.putProject(savedProject);
  } catch (error) {
    if (!isPlaygroundProjectStorageQuotaError(error) || !savedProject.thumbnail) {
      throw error;
    }

    savedProject = { ...savedProject, thumbnail: undefined };
    await storage.putProject(savedProject);
  }

  await storage.setActiveProjectId(savedProject.id);
  return savedProject;
};

export const deletePlaygroundProject = async (
  projectId: string,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  await storage.deleteProject(projectId);
  if ((await getActivePlaygroundProjectId(storage)) === projectId) {
    await storage.clearActiveProjectId();
  }
};

export const renamePlaygroundProject = async (
  projectId: string,
  title: string,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  const project = await getPlaygroundProject(projectId, storage);
  if (!project) return null;

  const updatedProject: PlaygroundProject = {
    ...project,
    title: normalizeTitle(title, project.title),
    updatedAt: Date.now(),
  };
  await storage.putProject(updatedProject);
  return updatedProject;
};

export const duplicatePlaygroundProject = async (
  projectId: string,
  title?: string,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  const projects = await readPlaygroundProjects(storage);
  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;

  const now = Date.now();
  const duplicatedProject: PlaygroundProject = {
    ...project,
    createdAt: now,
    id: createProjectId(),
    title: createUniqueProjectTitle(title ?? `${project.title} Copy`, projects),
    updatedAt: now,
  };

  await storage.putProject(duplicatedProject);
  await storage.setActiveProjectId(duplicatedProject.id);
  return duplicatedProject;
};

export const setPlaygroundProjectThumbnail = async (
  projectId: string,
  thumbnail: string,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  const project = await getPlaygroundProject(projectId, storage);
  if (!project) return null;

  const updatedProject = { ...project, thumbnail };
  await storage.putProject(updatedProject);
  return updatedProject;
};

export const getActivePlaygroundProjectId = async (
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => storage.getActiveProjectId();

export const setActivePlaygroundProjectId = async (
  projectId: string,
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  await storage.setActiveProjectId(projectId);
};

export const clearActivePlaygroundProject = async (
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  await storage.clearActiveProjectId();
};

export const getActivePlaygroundProject = async (
  storage: PlaygroundProjectStorage = defaultProjectStorage,
) => {
  const projectId = await getActivePlaygroundProjectId(storage);
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
