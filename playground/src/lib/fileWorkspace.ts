import {
  PAGE_SIZE_PRESETS,
  checkTemplate,
  getInputFromTemplate,
  type Template,
} from '@pdfme/common';
import { createTemplateThumbnailDataUrl } from './templateThumbnails';

const DB_NAME = 'pdfme-playground-file-workspace';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const ACTIVE_STATE_KEY = 'active';
const DEFAULT_COLLECTION_POLLING_INTERVAL_MS = 4000;
const DEFAULT_ENTRY_POLLING_INTERVAL_MS = 1500;

export type SourceKind = 'designer' | 'jsx' | 'md2pdf';

export type FileWorkspaceSourceInput = {
  content: string;
  language: 'jsx' | 'markdown';
};

export type FileWorkspaceMetadata = {
  description?: string;
  order?: number;
  sourceKind: SourceKind;
  tags: string[];
  title?: string;
};

export type FileWorkspaceTemplateEntry = {
  description?: string;
  diskVersion: string;
  name: string;
  order?: number;
  path: string;
  sourceKind: SourceKind;
  tags: string[];
  template: Template;
  templateDirectoryHandle: FileSystemDirectoryHandle;
  thumbnailDataUrl?: string;
  title: string;
  updatedAt: number;
};

export type FileWorkspaceInvalidEntry = {
  error: string;
  name: string;
};

export type FileWorkspaceCollection = {
  entries: FileWorkspaceTemplateEntry[];
  invalidEntries: FileWorkspaceInvalidEntry[];
  rootHandle: FileSystemDirectoryHandle;
  rootName: string;
  selectedTemplateName?: string;
};

export type FileWorkspaceTemplateRead = {
  diskVersion: string;
  template: Template;
  templateFile: File;
};

type PersistedFileWorkspaceState = {
  rootHandle: FileSystemDirectoryHandle;
  selectedTemplateName?: string;
  updatedAt: number;
};

type RestoreResult =
  | { status: 'mounted'; collection: FileWorkspaceCollection }
  | { status: 'none' }
  | { rootName: string; selectedTemplateName?: string; status: 'permission-needed' }
  | { error: unknown; rootName?: string; status: 'error' };

type FileWorkspaceSubscriptionOptions = {
  intervalMs?: number;
  onError?: (error: unknown) => void;
  shouldSkip?: () => boolean;
};

type FileWorkspaceCollectionSubscriptionOptions = FileWorkspaceSubscriptionOptions & {
  getCollection?: () => FileWorkspaceCollection | null | undefined;
};

type CreateTemplateEntryOptions = {
  description?: string;
  sourcePdf?: File;
  source?: FileWorkspaceSourceInput;
  sourceKind?: SourceKind;
  tags?: string[];
  thumbnailDataUrl?: string;
};

export type EditableFileWorkspaceMetadata = {
  description: string;
  tags: string[];
  title: string;
};

export class FileWorkspaceTemplateDeletedError extends Error {
  constructor(name: string) {
    super(`Template "${name}" was deleted from disk.`);
    this.name = 'FileWorkspaceTemplateDeletedError';
  }
}

export class FileWorkspaceTemplateInvalidError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FileWorkspaceTemplateInvalidError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const titleFromDirectoryName = (name: string) =>
  name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || name;

const inferSourceKind = (name: string): SourceKind => {
  if (name.startsWith('jsx-')) return 'jsx';
  if (name.startsWith('md2pdf-')) return 'md2pdf';
  return 'designer';
};

const normalizeMetadata = (value: unknown, name: string): FileWorkspaceMetadata => {
  if (!isRecord(value)) return { sourceKind: inferSourceKind(name), tags: [] };

  const sourceKind = ['designer', 'jsx', 'md2pdf'].includes(String(value.sourceKind))
    ? (value.sourceKind as SourceKind)
    : inferSourceKind(name);

  return {
    description: typeof value.description === 'string' ? value.description : undefined,
    order:
      typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : undefined,
    sourceKind,
    tags: Array.isArray(value.tags)
      ? [
          ...new Set(
            value.tags.filter((tag): tag is string => typeof tag === 'string' && !!tag.trim()),
          ),
        ]
      : [],
    title: typeof value.title === 'string' ? value.title : undefined,
  };
};

const normalizeTags = (tags: string[]) => [
  ...new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
];

const getSourceKindLabel = (sourceKind: SourceKind) => {
  if (sourceKind === 'jsx') return 'JSX';
  if (sourceKind === 'md2pdf') return 'md2pdf';
  return 'Designer';
};

const hashText = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
};

const getDiskVersion = (file: File, rawJson: string) =>
  `${file.lastModified}:${file.size}:${hashText(rawJson)}`;

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(blob);
  });

const writeBlob = async (fileHandle: FileSystemFileHandle, blob: Blob) => {
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

const writeText = async (
  fileHandle: FileSystemFileHandle,
  text: string,
  type = 'application/json',
) => {
  await writeBlob(fileHandle, new Blob([text], { type }));
};

const readJsonFile = async (fileHandle: FileSystemFileHandle) => {
  const file = await fileHandle.getFile();
  return { file, raw: await file.text() };
};

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const getFileHandleIfExists = async (directoryHandle: FileSystemDirectoryHandle, name: string) => {
  try {
    return await directoryHandle.getFileHandle(name);
  } catch {
    return undefined;
  }
};

const readMetadata = async (
  directoryHandle: FileSystemDirectoryHandle,
  name: string,
): Promise<FileWorkspaceMetadata> => {
  const handle = await getFileHandleIfExists(directoryHandle, 'metadata.json');
  if (!handle) return normalizeMetadata(undefined, name);

  try {
    const { raw } = await readJsonFile(handle);
    return normalizeMetadata(JSON.parse(raw), name);
  } catch (error) {
    console.warn(`Failed to read metadata for ${name}`, error);
    return normalizeMetadata(undefined, name);
  }
};

const readRawMetadata = async (directoryHandle: FileSystemDirectoryHandle) => {
  const handle = await getFileHandleIfExists(directoryHandle, 'metadata.json');
  if (!handle) return {};

  try {
    const { raw } = await readJsonFile(handle);
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse metadata.json', error);
    return {};
  }
};

export const readTemplateEntryMetadata = async (
  entry: Pick<FileWorkspaceTemplateEntry, 'templateDirectoryHandle'>,
) => readRawMetadata(entry.templateDirectoryHandle);

const readThumbnail = async (directoryHandle: FileSystemDirectoryHandle) => {
  const handle = await getFileHandleIfExists(directoryHandle, 'thumbnail.png');
  if (!handle) return {};

  try {
    const file = await handle.getFile();
    return { thumbnailDataUrl: await blobToDataUrl(file) };
  } catch (error) {
    console.warn('Failed to read template thumbnail', error);
    return {};
  }
};

const getDirectoryEntries = async (directoryHandle: FileSystemDirectoryHandle) => {
  const entries: Array<[string, FileSystemDirectoryHandle | FileSystemFileHandle]> = [];
  for await (const entry of directoryHandle.entries()) {
    entries.push(entry);
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
};

const getChildDirectoryNames = async (directoryHandle: FileSystemDirectoryHandle) => {
  const entries = await getDirectoryEntries(directoryHandle);
  return entries.filter(([, handle]) => handle.kind === 'directory').map(([name]) => name);
};

const toDirectoryName = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'untitled-template';
};

const createUniqueDirectoryName = async (
  rootHandle: FileSystemDirectoryHandle,
  preferredName: string,
  currentName?: string,
) => {
  const baseName = toDirectoryName(preferredName);
  if (baseName === currentName) return baseName;

  const existing = new Set(await getChildDirectoryNames(rootHandle));
  if (!existing.has(baseName)) return baseName;

  for (let index = 2; ; index += 1) {
    const candidate = `${baseName}-${index}`;
    if (!existing.has(candidate)) return candidate;
  }
};

const copyDirectoryContents = async (
  sourceDirectoryHandle: FileSystemDirectoryHandle,
  targetDirectoryHandle: FileSystemDirectoryHandle,
) => {
  for (const [name, handle] of await getDirectoryEntries(sourceDirectoryHandle)) {
    if (handle.kind === 'directory') {
      const childTargetHandle = await targetDirectoryHandle.getDirectoryHandle(name, {
        create: true,
      });
      await copyDirectoryContents(handle, childTargetHandle);
      continue;
    }

    const sourceFile = await handle.getFile();
    const targetFileHandle = await targetDirectoryHandle.getFileHandle(name, { create: true });
    await writeBlob(targetFileHandle, sourceFile);
  }
};

export const serializeTemplateForFileWorkspace = (template: Template) =>
  `${JSON.stringify(template, null, 2)}\n`;

export const getBlankFileWorkspaceTemplate = (): Template => ({
  basePdf: {
    ...PAGE_SIZE_PRESETS.A4,
    padding: [20, 10, 20, 10],
  },
  schemas: [[]],
});

export const isFileWorkspaceSupported = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof window.showDirectoryPicker === 'function' &&
  typeof indexedDB !== 'undefined';

const queryFileWorkspacePermission = async (
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
) => {
  if (!handle.queryPermission) return 'granted' as PermissionState;
  return handle.queryPermission({ mode });
};

const requestFileWorkspacePermission = async (
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
) => {
  if (!handle.requestPermission) return 'granted' as PermissionState;
  return handle.requestPermission({ mode });
};

const openWorkspaceDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      request.result.createObjectStore(STORE_NAME);
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });

const idbRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });

const idbGet = async <T>(key: string) => {
  const db = await openWorkspaceDb();
  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    return await idbRequest<T | undefined>(transaction.objectStore(STORE_NAME).get(key));
  } finally {
    db.close();
  }
};

const idbSet = async (key: string, value: unknown) => {
  const db = await openWorkspaceDb();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    await idbRequest(transaction.objectStore(STORE_NAME).put(value, key));
  } finally {
    db.close();
  }
};

const idbDelete = async (key: string) => {
  const db = await openWorkspaceDb();
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    await idbRequest(transaction.objectStore(STORE_NAME).delete(key));
  } finally {
    db.close();
  }
};

const getPersistedFileWorkspaceState = () =>
  idbGet<PersistedFileWorkspaceState>(ACTIVE_STATE_KEY).catch(() => undefined);

export const persistFileWorkspaceState = async (
  rootHandle: FileSystemDirectoryHandle,
  selectedTemplateName?: string,
) => {
  await idbSet(ACTIVE_STATE_KEY, {
    rootHandle,
    selectedTemplateName,
    updatedAt: Date.now(),
  } satisfies PersistedFileWorkspaceState);
};

export const setSelectedFileWorkspaceTemplateName = async (
  rootHandle: FileSystemDirectoryHandle,
  selectedTemplateName: string,
) => {
  await persistFileWorkspaceState(rootHandle, selectedTemplateName);
};

export const clearPersistedFileWorkspace = () => idbDelete(ACTIVE_STATE_KEY);

export const readTemplateEntry = async (
  entry: Pick<FileWorkspaceTemplateEntry, 'name' | 'templateDirectoryHandle'>,
): Promise<FileWorkspaceTemplateRead> => {
  let templateFileHandle: FileSystemFileHandle;
  try {
    templateFileHandle = await entry.templateDirectoryHandle.getFileHandle('template.json');
  } catch {
    throw new FileWorkspaceTemplateDeletedError(entry.name);
  }

  try {
    const { file, raw } = await readJsonFile(templateFileHandle);
    const parsed = JSON.parse(raw) as Template;
    checkTemplate(parsed);
    return {
      diskVersion: getDiskVersion(file, raw),
      template: parsed,
      templateFile: file,
    };
  } catch (error) {
    if (error instanceof FileWorkspaceTemplateDeletedError) throw error;
    throw new FileWorkspaceTemplateInvalidError(
      `Template "${entry.name}" is not valid template JSON.`,
      error,
    );
  }
};

const buildTemplateEntry = async (
  name: string,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<FileWorkspaceTemplateEntry> => {
  const readResult = await readTemplateEntry({ name, templateDirectoryHandle: directoryHandle });
  const metadata = await readMetadata(directoryHandle, name);
  const { thumbnailDataUrl } = await readThumbnail(directoryHandle);

  return {
    description: metadata.description,
    diskVersion: readResult.diskVersion,
    name,
    order: metadata.order,
    path: `${name}/template.json`,
    sourceKind: metadata.sourceKind,
    tags: metadata.tags,
    template: readResult.template,
    templateDirectoryHandle: directoryHandle,
    thumbnailDataUrl,
    title: metadata.title ?? titleFromDirectoryName(name),
    updatedAt: readResult.templateFile.lastModified,
  };
};

export const scanTemplateCollection = async (
  rootHandle: FileSystemDirectoryHandle,
  selectedTemplateName?: string,
): Promise<FileWorkspaceCollection> => {
  const entries: FileWorkspaceTemplateEntry[] = [];
  const invalidEntries: FileWorkspaceInvalidEntry[] = [];
  const directoryEntries = await getDirectoryEntries(rootHandle);

  for (const [name, handle] of directoryEntries) {
    if (handle.kind !== 'directory' || name.startsWith('.')) continue;

    const templateFileHandle = await getFileHandleIfExists(handle, 'template.json');
    if (!templateFileHandle) continue;

    try {
      entries.push(await buildTemplateEntry(name, handle));
    } catch (error) {
      invalidEntries.push({
        error: error instanceof Error ? error.message : 'Invalid template.json',
        name,
      });
      console.warn(`Skipped invalid template directory "${name}"`, error);
    }
  }

  return {
    entries: entries.sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return a.title.localeCompare(b.title) || a.name.localeCompare(b.name);
    }),
    invalidEntries,
    rootHandle,
    rootName: rootHandle.name,
    selectedTemplateName,
  };
};

export const openTemplateCollectionDirectory = async () => {
  if (!window.showDirectoryPicker) {
    throw new Error('Directory picker is not supported in this browser.');
  }

  const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  const permission = await requestFileWorkspacePermission(rootHandle);
  if (permission !== 'granted') {
    throw new Error('Read/write permission was not granted for this folder.');
  }

  const collection = await scanTemplateCollection(rootHandle);
  await persistFileWorkspaceState(rootHandle, collection.selectedTemplateName);
  return collection;
};

export const restorePersistedTemplateCollection = async ({
  requestPermission = false,
}: {
  requestPermission?: boolean;
} = {}): Promise<RestoreResult> => {
  const persisted = await getPersistedFileWorkspaceState();
  if (!persisted) return { status: 'none' };

  try {
    let permission = await queryFileWorkspacePermission(persisted.rootHandle);
    if (permission !== 'granted' && requestPermission) {
      permission = await requestFileWorkspacePermission(persisted.rootHandle);
    }
    if (permission !== 'granted') {
      return {
        rootName: persisted.rootHandle.name,
        selectedTemplateName: persisted.selectedTemplateName,
        status: 'permission-needed',
      };
    }

    const collection = await scanTemplateCollection(
      persisted.rootHandle,
      persisted.selectedTemplateName,
    );
    return { collection, status: 'mounted' };
  } catch (error) {
    return {
      error,
      rootName: persisted.rootHandle.name,
      status: 'error',
    };
  }
};

export const refreshTemplateCollection = (collection: FileWorkspaceCollection) =>
  scanTemplateCollection(collection.rootHandle, collection.selectedTemplateName);

const subscribeFileSystemObserver = (
  handle: FileSystemHandle,
  callback: () => void | Promise<void>,
) => {
  if (typeof window === 'undefined' || !window.FileSystemObserver) return undefined;

  const observer = new window.FileSystemObserver(() => {
    void callback();
  });
  void observer.observe(handle).catch((error) => {
    console.warn('Failed to observe file workspace changes', error);
  });
  return () => observer.disconnect();
};

export const subscribeTemplateCollectionChanges = (
  collection: FileWorkspaceCollection,
  listener: (collection: FileWorkspaceCollection) => void,
  options: FileWorkspaceCollectionSubscriptionOptions = {},
) => {
  if (typeof window === 'undefined') return () => undefined;

  let disposed = false;
  let checking = false;
  const check = async () => {
    if (disposed || checking || options.shouldSkip?.()) return;

    checking = true;
    try {
      const currentCollection = options.getCollection ? options.getCollection() : collection;
      if (!currentCollection) return;

      listener(await refreshTemplateCollection(currentCollection));
    } catch (error) {
      options.onError?.(error);
    } finally {
      checking = false;
    }
  };

  const intervalId = window.setInterval(
    check,
    options.intervalMs ?? DEFAULT_COLLECTION_POLLING_INTERVAL_MS,
  );
  const disconnectObserver = subscribeFileSystemObserver(collection.rootHandle, check);

  return () => {
    disposed = true;
    window.clearInterval(intervalId);
    disconnectObserver?.();
  };
};

export const subscribeTemplateEntryChanges = (
  entry: FileWorkspaceTemplateEntry,
  listener: (readResult: FileWorkspaceTemplateRead) => void,
  options: FileWorkspaceSubscriptionOptions = {},
) => {
  if (typeof window === 'undefined') return () => undefined;

  let disposed = false;
  let checking = false;
  let lastDiskVersion = entry.diskVersion;
  let hadError = false;
  const check = async () => {
    if (disposed || checking || options.shouldSkip?.()) return;

    checking = true;
    try {
      const readResult = await readTemplateEntry(entry);
      if (readResult.diskVersion === lastDiskVersion && !hadError) return;

      hadError = false;
      lastDiskVersion = readResult.diskVersion;
      listener(readResult);
    } catch (error) {
      hadError = true;
      options.onError?.(error);
    } finally {
      checking = false;
    }
  };

  const intervalId = window.setInterval(
    check,
    options.intervalMs ?? DEFAULT_ENTRY_POLLING_INTERVAL_MS,
  );
  const disconnectObserver = subscribeFileSystemObserver(entry.templateDirectoryHandle, check);

  return () => {
    disposed = true;
    window.clearInterval(intervalId);
    disconnectObserver?.();
  };
};

export const createBlankTemplateEntry = async (
  rootHandle: FileSystemDirectoryHandle,
  title = 'Untitled Template',
) => {
  const name = await createUniqueDirectoryName(rootHandle, title);
  const directoryHandle = await rootHandle.getDirectoryHandle(name, { create: true });
  const templateFileHandle = await directoryHandle.getFileHandle('template.json', {
    create: true,
  });
  const metadataFileHandle = await directoryHandle.getFileHandle('metadata.json', {
    create: true,
  });
  const template = getBlankFileWorkspaceTemplate();

  await writeText(templateFileHandle, serializeTemplateForFileWorkspace(template));
  await writeText(
    metadataFileHandle,
    `${JSON.stringify(
      {
        description: 'A blank template created from the pdfme Playground.',
        sourceKind: 'designer',
        tags: ['Blank', 'Starter'],
        title: title.trim() || titleFromDirectoryName(name),
      },
      null,
      2,
    )}\n`,
  );

  const entry = await buildTemplateEntry(name, directoryHandle);
  await persistFileWorkspaceState(rootHandle, name).catch(() => undefined);
  return entry;
};

export const createTemplateEntryFromTemplate = async (
  collection: FileWorkspaceCollection,
  template: Template,
  title: string,
  options: CreateTemplateEntryOptions = {},
) => {
  checkTemplate(template);
  const name = await createUniqueDirectoryName(collection.rootHandle, title);
  const directoryHandle = await collection.rootHandle.getDirectoryHandle(name, { create: true });
  const templateFileHandle = await directoryHandle.getFileHandle('template.json', {
    create: true,
  });
  const metadataFileHandle = await directoryHandle.getFileHandle('metadata.json', {
    create: true,
  });
  const sourceKind = options.sourceKind ?? 'designer';
  const resolvedTitle = title.trim() || titleFromDirectoryName(name);

  await writeText(templateFileHandle, serializeTemplateForFileWorkspace(template));
  await writeText(
    metadataFileHandle,
    `${JSON.stringify(
      {
        description: options.description ?? 'A template saved from the pdfme Playground.',
        sourceKind,
        tags: normalizeTags(options.tags ?? [getSourceKindLabel(sourceKind)]),
        title: resolvedTitle,
      },
      null,
      2,
    )}\n`,
  );

  if (options.source) {
    const sourceFileName = options.source.language === 'markdown' ? 'source.md' : 'source.tsx';
    const sourceFileHandle = await directoryHandle.getFileHandle(sourceFileName, { create: true });
    await writeText(sourceFileHandle, options.source.content, 'text/plain');
  }

  if (options.sourcePdf) {
    const sourcePdfHandle = await directoryHandle.getFileHandle('source.pdf', { create: true });
    await writeBlob(sourcePdfHandle, options.sourcePdf);
  }

  if (options.thumbnailDataUrl) {
    try {
      const thumbnailFileHandle = await directoryHandle.getFileHandle('thumbnail.png', {
        create: true,
      });
      await writeBlob(thumbnailFileHandle, await dataUrlToBlob(options.thumbnailDataUrl));
    } catch (error) {
      console.warn('Failed to copy template thumbnail', error);
    }
  }

  const entry = await buildTemplateEntry(name, directoryHandle);
  await persistFileWorkspaceState(collection.rootHandle, name).catch(() => undefined);
  return entry;
};

export const writeTemplateMetadata = async (
  collection: Pick<FileWorkspaceCollection, 'rootHandle'>,
  entry: FileWorkspaceTemplateEntry,
  metadata: EditableFileWorkspaceMetadata,
): Promise<FileWorkspaceTemplateEntry> => {
  const nextTitle = metadata.title.trim() || entry.title;
  const nextName = await createUniqueDirectoryName(collection.rootHandle, nextTitle, entry.name);
  const shouldRename = nextName !== entry.name;
  const targetDirectoryHandle = shouldRename
    ? await collection.rootHandle.getDirectoryHandle(nextName, { create: true })
    : entry.templateDirectoryHandle;

  if (shouldRename) {
    await copyDirectoryContents(entry.templateDirectoryHandle, targetDirectoryHandle);
  }

  const rawMetadata = await readRawMetadata(entry.templateDirectoryHandle);
  const {
    description: _description,
    sourceKind: _sourceKind,
    tags: _tags,
    title: _title,
    ...restMetadata
  } = rawMetadata;
  const sourceKind = normalizeMetadata(rawMetadata, entry.name).sourceKind;
  const nextMetadata = {
    title: nextTitle,
    description: metadata.description.trim(),
    sourceKind,
    tags: normalizeTags(metadata.tags),
    ...restMetadata,
  };

  const metadataFileHandle = await targetDirectoryHandle.getFileHandle('metadata.json', {
    create: true,
  });
  await writeText(metadataFileHandle, `${JSON.stringify(nextMetadata, null, 2)}\n`);
  const updatedEntry = await buildTemplateEntry(nextName, targetDirectoryHandle);

  if (shouldRename) {
    await collection.rootHandle.removeEntry(entry.name, { recursive: true });
  }
  await persistFileWorkspaceState(collection.rootHandle, updatedEntry.name).catch(() => undefined);
  return updatedEntry;
};

export const writeTemplateEntry = async (
  entry: FileWorkspaceTemplateEntry,
  template: Template,
): Promise<FileWorkspaceTemplateEntry> => {
  checkTemplate(template);
  const templateFileHandle = await entry.templateDirectoryHandle.getFileHandle('template.json', {
    create: true,
  });
  await writeText(templateFileHandle, serializeTemplateForFileWorkspace(template));
  const readResult = await readTemplateEntry(entry);

  return {
    ...entry,
    diskVersion: readResult.diskVersion,
    template: readResult.template,
    updatedAt: readResult.templateFile.lastModified,
  };
};

export const writeTemplateEntryMetadata = async (
  entry: FileWorkspaceTemplateEntry,
  metadata: Record<string, unknown>,
): Promise<FileWorkspaceTemplateEntry> => {
  const metadataFileHandle = await entry.templateDirectoryHandle.getFileHandle('metadata.json', {
    create: true,
  });
  await writeText(metadataFileHandle, `${JSON.stringify(metadata, null, 2)}\n`);
  return buildTemplateEntry(entry.name, entry.templateDirectoryHandle);
};

export const writeTemplateThumbnail = async (
  entry: FileWorkspaceTemplateEntry,
  template: Template,
  inputs = getInputFromTemplate(template),
) => {
  const thumbnailDataUrl = await createTemplateThumbnailDataUrl(template, inputs);
  const thumbnail = await dataUrlToBlob(thumbnailDataUrl);
  const thumbnailFileHandle = await entry.templateDirectoryHandle.getFileHandle('thumbnail.png', {
    create: true,
  });
  await writeBlob(thumbnailFileHandle, thumbnail);

  return { thumbnailDataUrl };
};

export const findTemplateEntry = (
  collection: FileWorkspaceCollection,
  name: string | null | undefined,
) => collection.entries.find((entry) => entry.name === name) ?? null;
