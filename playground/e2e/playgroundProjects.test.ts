import type { Template } from '@pdfme/common';
import {
  deletePlaygroundProject,
  getActivePlaygroundProject,
  readPlaygroundProjects,
  savePlaygroundProject,
  setPlaygroundProjectThumbnail,
} from '../src/lib/playgroundProjects';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const projectsStorageKey = 'playground:projects:v1';
const activeProjectStorageKey = 'playground:activeProjectId:v1';

const template: Template = {
  basePdf: { height: 100, padding: [0, 0, 0, 0], width: 100 },
  schemas: [[]],
};

describe('playground project storage', () => {
  it('saves, updates, activates, and deletes local projects', () => {
    const storage = new MemoryStorage();
    const saved = savePlaygroundProject(
      {
        kind: 'jsx',
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
    expect(saved.thumbnail).toBe('data:image/png;base64,abc');
    expect(getActivePlaygroundProject(storage)?.id).toBe(saved.id);
    expect(readPlaygroundProjects(storage)).toHaveLength(1);

    const updated = savePlaygroundProject(
      {
        ...saved,
        template,
        title: 'Updated draft',
      },
      storage,
    );

    expect(updated.id).toBe(saved.id);
    expect(updated.thumbnail).toBe(saved.thumbnail);
    expect(readPlaygroundProjects(storage)).toHaveLength(1);
    expect(readPlaygroundProjects(storage)[0]?.title).toBe('Updated draft');

    const withUpdatedThumbnail = setPlaygroundProjectThumbnail(
      saved.id,
      'data:image/png;base64,updated',
      storage,
    );
    expect(withUpdatedThumbnail?.updatedAt).toBe(updated.updatedAt);
    expect(readPlaygroundProjects(storage)[0]?.thumbnail).toBe('data:image/png;base64,updated');

    deletePlaygroundProject(saved.id, storage);
    expect(readPlaygroundProjects(storage)).toEqual([]);
    expect(getActivePlaygroundProject(storage)).toBeNull();
  });

  it('migrates legacy localStorage template state into a project', () => {
    const storage = new MemoryStorage();
    storage.setItem('template', JSON.stringify(template));
    storage.setItem('inputs', JSON.stringify([{ field: 'value' }]));

    const projects = readPlaygroundProjects(storage);

    expect(projects).toHaveLength(1);
    expect(projects[0]?.title).toBe('Imported local template');
    expect(projects[0]?.inputs).toEqual([{ field: 'value' }]);
    expect(storage.getItem('template')).toBeNull();
    expect(storage.getItem('inputs')).toBeNull();
    expect(storage.getItem(projectsStorageKey)).toBeTruthy();
    expect(storage.getItem(activeProjectStorageKey)).toBe(projects[0]?.id);
  });

  it('ignores malformed stored projects', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      projectsStorageKey,
      JSON.stringify([
        {
          createdAt: 1,
          id: 'project_invalid_inputs',
          inputs: [{ field: 123 }],
          kind: 'template',
          template,
          title: 'Invalid inputs',
          updatedAt: 1,
        },
      ]),
    );

    expect(readPlaygroundProjects(storage)).toEqual([]);
  });
});
