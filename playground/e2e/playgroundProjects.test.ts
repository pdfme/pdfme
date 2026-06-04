import type { Template } from '@pdfme/common';
import {
  deletePlaygroundProject,
  duplicatePlaygroundProject,
  getActivePlaygroundProject,
  PlaygroundProjectStorageQuotaError,
  readPlaygroundProjects,
  renamePlaygroundProject,
  savePlaygroundProject,
  setPlaygroundProjectThumbnail,
  type PlaygroundProject,
  type PlaygroundProjectStorage,
} from '../src/lib/playgroundProjects';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

class MemoryPlaygroundProjectStorage implements PlaygroundProjectStorage {
  protected activeProjectId: string | null = null;
  protected projects = new Map<string, unknown>();

  async clearActiveProjectId() {
    this.activeProjectId = null;
  }

  async deleteProject(projectId: string) {
    this.projects.delete(projectId);
  }

  async getActiveProjectId() {
    return this.activeProjectId;
  }

  async putProject(project: PlaygroundProject) {
    this.projects.set(project.id, clone(project));
  }

  async readProjects() {
    return [...this.projects.values()].map((project) => clone(project));
  }

  async setActiveProjectId(projectId: string) {
    this.activeProjectId = projectId;
  }

  seedProject(project: unknown) {
    if (
      typeof project === 'object' &&
      project !== null &&
      'id' in project &&
      typeof project.id === 'string'
    ) {
      this.projects.set(project.id, clone(project));
    }
  }
}

class ThumbnailQuotaStorage extends MemoryPlaygroundProjectStorage {
  async putProject(project: PlaygroundProject) {
    if (project.thumbnail?.includes('too-large')) {
      throw new PlaygroundProjectStorageQuotaError();
    }

    await super.putProject(project);
  }
}

class AlwaysQuotaStorage extends MemoryPlaygroundProjectStorage {
  async putProject() {
    throw new PlaygroundProjectStorageQuotaError();
  }
}

const template: Template = {
  basePdf: { height: 100, padding: [0, 0, 0, 0], width: 100 },
  schemas: [[]],
};

describe('playground project storage', () => {
  it('saves, updates, activates, and deletes local projects', async () => {
    const storage = new MemoryPlaygroundProjectStorage();
    const saved = await savePlaygroundProject(
      {
        kind: 'jsx',
        metadata: {
          pdfmeAgent: { domainRuleSkillIds: ['medical-form-rules'] },
          title: 'JSX draft',
        },
        source: {
          content: 'return <Page />;',
          language: 'jsx',
          presetId: 'basic',
          route: '/jsx',
        },
        template,
        thumbnail: 'data:image/png;base64,abc',
        title: ' JSX draft ',
      },
      storage,
    );

    expect(saved.title).toBe('JSX draft');
    expect(saved.metadata).toEqual({
      pdfmeAgent: { domainRuleSkillIds: ['medical-form-rules'] },
      title: 'JSX draft',
    });
    expect(saved.thumbnail).toBe('data:image/png;base64,abc');
    expect((await getActivePlaygroundProject(storage))?.id).toBe(saved.id);
    expect(await readPlaygroundProjects(storage)).toHaveLength(1);

    const updated = await savePlaygroundProject(
      {
        ...saved,
        template,
        title: 'Updated draft',
      },
      storage,
    );

    expect(updated.id).toBe(saved.id);
    expect(updated.metadata).toEqual(saved.metadata);
    expect(updated.thumbnail).toBe(saved.thumbnail);
    expect(await readPlaygroundProjects(storage)).toHaveLength(1);
    expect((await readPlaygroundProjects(storage))[0]?.title).toBe('Updated draft');

    const withUpdatedThumbnail = await setPlaygroundProjectThumbnail(
      saved.id,
      'data:image/png;base64,updated',
      storage,
    );
    expect(withUpdatedThumbnail?.updatedAt).toBe(updated.updatedAt);
    expect((await readPlaygroundProjects(storage))[0]?.thumbnail).toBe(
      'data:image/png;base64,updated',
    );

    await deletePlaygroundProject(saved.id, storage);
    expect(await readPlaygroundProjects(storage)).toEqual([]);
    expect(await getActivePlaygroundProject(storage)).toBeNull();
  });

  it('renames and duplicates projects without changing the original content', async () => {
    const storage = new MemoryPlaygroundProjectStorage();
    const saved = await savePlaygroundProject(
      {
        inputs: [{ name: 'Ada' }],
        kind: 'template',
        metadata: { pdfmeAgent: { domainRuleSkillIds: ['medical-form-rules'] } },
        template,
        thumbnail: 'data:image/png;base64,abc',
        title: 'Original',
      },
      storage,
    );

    const renamed = await renamePlaygroundProject(saved.id, ' Renamed project ', storage);
    expect(renamed?.id).toBe(saved.id);
    expect(renamed?.title).toBe('Renamed project');
    expect(await readPlaygroundProjects(storage)).toHaveLength(1);

    const duplicated = await duplicatePlaygroundProject(saved.id, ' Copy project ', storage);
    expect(duplicated?.id).not.toBe(saved.id);
    expect(duplicated?.title).toBe('Copy project');
    expect(duplicated?.template).toEqual(template);
    expect(duplicated?.metadata).toEqual(saved.metadata);
    expect(duplicated?.inputs).toEqual([{ name: 'Ada' }]);
    expect(duplicated?.thumbnail).toBe('data:image/png;base64,abc');
    expect((await getActivePlaygroundProject(storage))?.id).toBe(duplicated?.id);

    const duplicateWithSameTitle = await duplicatePlaygroundProject(
      saved.id,
      ' Copy project ',
      storage,
    );
    expect(duplicateWithSameTitle?.title).toBe('Copy project 2');

    const projects = await readPlaygroundProjects(storage);
    expect(projects).toHaveLength(3);
    expect(projects.map((project) => project.title).sort()).toEqual([
      'Copy project',
      'Copy project 2',
      'Renamed project',
    ]);
  });

  it('returns null when project actions target a missing project', async () => {
    const storage = new MemoryPlaygroundProjectStorage();

    expect(await renamePlaygroundProject('missing', 'Nope', storage)).toBeNull();
    expect(await duplicatePlaygroundProject('missing', 'Nope', storage)).toBeNull();
  });

  it('retries project saves without thumbnails when browser storage quota is exceeded', async () => {
    const storage = new ThumbnailQuotaStorage();
    const saved = await savePlaygroundProject(
      {
        kind: 'template',
        template,
        thumbnail: 'data:image/png;base64,too-large',
        title: 'Large thumbnail',
      },
      storage,
    );

    expect(saved.thumbnail).toBeUndefined();
    expect((await readPlaygroundProjects(storage))[0]?.thumbnail).toBeUndefined();
    expect((await getActivePlaygroundProject(storage))?.id).toBe(saved.id);
  });

  it('throws a friendly quota error when the project is too large without a thumbnail', async () => {
    const storage = new AlwaysQuotaStorage();

    await expect(
      savePlaygroundProject(
        {
          kind: 'template',
          template,
          title: 'Too large',
        },
        storage,
      ),
    ).rejects.toThrow(PlaygroundProjectStorageQuotaError);
  });

  it('ignores malformed stored projects', async () => {
    const storage = new MemoryPlaygroundProjectStorage();
    storage.seedProject({
      createdAt: 1,
      id: 'project_invalid_inputs',
      inputs: [{ field: 123 }],
      kind: 'template',
      template,
      title: 'Invalid inputs',
      updatedAt: 1,
    });

    expect(await readPlaygroundProjects(storage)).toEqual([]);
  });
});
