import type { Template } from '@pdfme/common';
import {
  FileWorkspaceTemplateDeletedError,
  FileWorkspaceTemplateInvalidError,
  createBlankTemplateEntry,
  createTemplateEntryFromTemplate,
  readTemplateEntry,
  readTemplateEntryMetadata,
  scanTemplateCollection,
  serializeTemplateForFileWorkspace,
  writeTemplateEntry,
  writeTemplateEntryMetadata,
  writeTemplateMetadata,
} from '../src/lib/fileWorkspace';

class MemoryFileHandle {
  readonly kind = 'file';
  lastModified = 1;

  constructor(
    readonly name: string,
    private content: string,
  ) {}

  async createWritable() {
    const chunks: Array<Blob | BufferSource | string> = [];
    return {
      close: async () => {
        const parts = await Promise.all(
          chunks.map(async (chunk) => {
            if (typeof chunk === 'string') return chunk;
            if (chunk instanceof Blob) return chunk.text();
            return new TextDecoder().decode(chunk as BufferSource);
          }),
        );
        this.content = parts.join('');
        this.lastModified += 1;
      },
      write: async (data: Blob | BufferSource | string) => {
        chunks.push(data);
      },
    } as FileSystemWritableFileStream;
  }

  async getFile() {
    return new File([this.content], this.name, {
      lastModified: this.lastModified,
      type: this.name.endsWith('.json') ? 'application/json' : 'application/octet-stream',
    });
  }

  get text() {
    return this.content;
  }

  set text(content: string) {
    this.content = content;
    this.lastModified += 1;
  }
}

class MemoryDirectoryHandle {
  readonly kind = 'directory';
  private children = new Map<string, MemoryDirectoryHandle | MemoryFileHandle>();

  constructor(readonly name: string) {}

  addDirectory(name: string) {
    const directory = new MemoryDirectoryHandle(name);
    this.children.set(name, directory);
    return directory;
  }

  addFile(name: string, content: string) {
    const file = new MemoryFileHandle(name, content);
    this.children.set(name, file);
    return file;
  }

  async *entries() {
    for (const entry of this.children.entries()) {
      yield entry;
    }
  }

  async getDirectoryHandle(name: string, options: { create?: boolean } = {}) {
    const child = this.children.get(name);
    if (child instanceof MemoryDirectoryHandle) return child;
    if (!child && options.create) return this.addDirectory(name);
    throw new Error(`Directory not found: ${name}`);
  }

  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    const child = this.children.get(name);
    if (child instanceof MemoryFileHandle) return child;
    if (!child && options.create) return this.addFile(name, '');
    throw new Error(`File not found: ${name}`);
  }

  async removeEntry(name: string, _options: { recursive?: boolean } = {}) {
    if (!this.children.delete(name)) throw new Error(`Entry not found: ${name}`);
  }
}

const blankTemplate: Template = {
  basePdf: { height: 100, padding: [0, 0, 0, 0], width: 100 },
  schemas: [[]],
};

describe('file workspace helpers', () => {
  it('scans one-level template directories and skips invalid template JSON', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const invoice = root.addDirectory('invoice');
    invoice.addFile('template.json', serializeTemplateForFileWorkspace(blankTemplate));
    invoice.addFile(
      'metadata.json',
      JSON.stringify({
        description: 'Invoice template',
        sourceKind: 'designer',
        tags: ['Invoice'],
        title: 'Invoice',
      }),
    );
    root
      .addDirectory('.cache')
      .addFile('template.json', serializeTemplateForFileWorkspace(blankTemplate));
    root.addDirectory('broken').addFile('template.json', '{');

    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);

    expect(collection.entries).toHaveLength(1);
    expect(collection.entries[0]?.name).toBe('invoice');
    expect(collection.entries[0]?.title).toBe('Invoice');
    expect(collection.invalidEntries.map((entry) => entry.name)).toEqual(['broken']);
  });

  it('writes pretty template JSON back to the selected template file', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const invoice = root.addDirectory('invoice');
    const templateFile = invoice.addFile(
      'template.json',
      serializeTemplateForFileWorkspace(blankTemplate),
    );
    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);
    const entry = collection.entries[0];
    if (!entry) throw new Error('Missing test entry');

    const nextTemplate: Template = {
      ...blankTemplate,
      pdfmeVersion: 'test',
    };
    const saved = await writeTemplateEntry(entry, nextTemplate);

    expect(saved.template.pdfmeVersion).toBe('test');
    expect(templateFile.text).toBe(serializeTemplateForFileWorkspace(nextTemplate));
  });

  it('updates editable metadata fields and renames the template directory', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const invoice = root.addDirectory('invoice');
    invoice.addFile('template.json', serializeTemplateForFileWorkspace(blankTemplate));
    invoice.addFile(
      'metadata.json',
      JSON.stringify({
        customField: 'keep me',
        description: 'Old description',
        order: 7,
        sourceKind: 'designer',
        tags: ['Old'],
        title: 'Old title',
      }),
    );
    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);
    const entry = collection.entries[0];
    if (!entry) throw new Error('Missing test entry');

    const updated = await writeTemplateMetadata(collection, entry, {
      description: 'New description',
      tags: ['Invoice', 'Business', 'Invoice'],
      title: 'New title',
    });
    const renamedDirectory = await root.getDirectoryHandle('new-title');
    const metadataFile = await renamedDirectory.getFileHandle('metadata.json');

    expect(updated.name).toBe('new-title');
    expect(updated.title).toBe('New title');
    expect(updated.description).toBe('New description');
    expect(updated.tags).toEqual(['Invoice', 'Business']);
    await expect(root.getDirectoryHandle('invoice')).rejects.toThrow('Directory not found');
    expect(JSON.parse(metadataFile.text)).toEqual({
      title: 'New title',
      description: 'New description',
      sourceKind: 'designer',
      tags: ['Invoice', 'Business'],
      order: 7,
      customField: 'keep me',
    });
  });

  it('reads and writes raw template metadata without renaming the directory', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const invoice = root.addDirectory('invoice');
    invoice.addFile('template.json', serializeTemplateForFileWorkspace(blankTemplate));
    invoice.addFile(
      'metadata.json',
      JSON.stringify({
        description: 'Invoice template',
        sourceKind: 'designer',
        tags: ['Invoice'],
        title: 'Invoice',
      }),
    );
    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);
    const entry = collection.entries[0];
    if (!entry) throw new Error('Missing test entry');

    expect(await readTemplateEntryMetadata(entry)).toEqual({
      description: 'Invoice template',
      sourceKind: 'designer',
      tags: ['Invoice'],
      title: 'Invoice',
    });

    const updated = await writeTemplateEntryMetadata(entry, {
      description: 'Invoice template',
      pdfmeAgent: { domainRuleSkillIds: ['medical-form-rules'] },
      sourceKind: 'designer',
      tags: ['Invoice'],
      title: 'Invoice',
    });
    const metadataFile = await invoice.getFileHandle('metadata.json');

    expect(updated.name).toBe('invoice');
    expect(JSON.parse(metadataFile.text)).toEqual({
      description: 'Invoice template',
      pdfmeAgent: { domainRuleSkillIds: ['medical-form-rules'] },
      sourceKind: 'designer',
      tags: ['Invoice'],
      title: 'Invoice',
    });
  });

  it('copies a template with metadata and source into a collection', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);

    const entry = await createTemplateEntryFromTemplate(collection, blankTemplate, 'JSX Project', {
      description: 'Copied project',
      source: {
        content: 'export default <Document />;',
        language: 'jsx',
      },
      sourceKind: 'jsx',
      tags: ['JSX', 'Copied'],
    });
    const directory = await root.getDirectoryHandle('jsx-project');
    const sourceFile = await directory.getFileHandle('source.tsx');
    const metadataFile = await directory.getFileHandle('metadata.json');

    expect(entry.name).toBe('jsx-project');
    expect(entry.sourceKind).toBe('jsx');
    expect(sourceFile.text).toBe('export default <Document />;');
    expect(JSON.parse(metadataFile.text)).toEqual({
      title: 'JSX Project',
      description: 'Copied project',
      sourceKind: 'jsx',
      tags: ['JSX', 'Copied'],
    });
  });

  it('reports disk version changes when template JSON changes externally', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const invoice = root.addDirectory('invoice');
    const templateFile = invoice.addFile(
      'template.json',
      serializeTemplateForFileWorkspace(blankTemplate),
    );
    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);
    const entry = collection.entries[0];
    if (!entry) throw new Error('Missing test entry');

    templateFile.text = serializeTemplateForFileWorkspace({
      ...blankTemplate,
      pdfmeVersion: 'external',
    });
    const readResult = await readTemplateEntry(entry);

    expect(readResult.diskVersion).not.toBe(entry.diskVersion);
    expect(readResult.template.pdfmeVersion).toBe('external');
  });

  it('throws typed errors for deleted or invalid template JSON', async () => {
    const root = new MemoryDirectoryHandle('templates');
    const invoice = root.addDirectory('invoice');
    const templateFile = invoice.addFile(
      'template.json',
      serializeTemplateForFileWorkspace(blankTemplate),
    );
    const collection = await scanTemplateCollection(root as unknown as FileSystemDirectoryHandle);
    const entry = collection.entries[0];
    if (!entry) throw new Error('Missing test entry');

    templateFile.text = '{';
    await expect(readTemplateEntry(entry)).rejects.toBeInstanceOf(
      FileWorkspaceTemplateInvalidError,
    );

    await invoice.removeEntry('template.json');
    await expect(readTemplateEntry(entry)).rejects.toBeInstanceOf(
      FileWorkspaceTemplateDeletedError,
    );
  });

  it('creates an untitled blank template when a collection is empty', async () => {
    const root = new MemoryDirectoryHandle('templates');

    const entry = await createBlankTemplateEntry(root as unknown as FileSystemDirectoryHandle);
    const directory = await root.getDirectoryHandle('untitled-template');
    const templateFile = await directory.getFileHandle('template.json');

    expect(entry.name).toBe('untitled-template');
    expect(entry.sourceKind).toBe('designer');
    expect(entry.title).toBe('Untitled Template');
    expect(templateFile.text).toContain('"schemas": [');
  });
});
