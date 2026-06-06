import type { Template } from '@pdfme/common';
import { getProjectThumbnailInputs } from '../src/lib/templateThumbnails';
import type { PlaygroundProject, PlaygroundProjectKind } from '../src/lib/playgroundProjects';

const template: Template = {
  basePdf: { height: 100, padding: [0, 0, 0, 0], width: 100 },
  schemas: [[]],
};

const project = (kind: PlaygroundProjectKind): PlaygroundProject => ({
  createdAt: 1,
  id: `project-${kind}`,
  inputs: [{ title: `${kind} input` }],
  kind,
  template,
  title: kind,
  updatedAt: 1,
});

describe('project thumbnail inputs', () => {
  it('uses template content defaults for Designer template projects', () => {
    expect(getProjectThumbnailInputs(project('template'))).toBeUndefined();
  });

  it.each(['jsx', 'md2pdf'] as const)(
    'keeps generated inputs for %s projects',
    (kind) => {
      const sourceProject = project(kind);

      expect(getProjectThumbnailInputs(sourceProject)).toBe(sourceProject.inputs);
    },
  );
});
