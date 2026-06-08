import { createPlaygroundTemplateRouteFromSearchParams } from '../src/lib/playgroundRoutes';

describe('playground template routes', () => {
  it('creates a Form/Viewer route for a workspace template', () => {
    const searchParams = new URLSearchParams([
      ['workspace', 'nenkin-shougai-seishin-shindansho'],
    ]);

    expect(createPlaygroundTemplateRouteFromSearchParams('form-viewer', searchParams)).toBe(
      '/form-viewer?workspace=nenkin-shougai-seishin-shindansho',
    );
  });

  it('creates a Designer route for a browser project', () => {
    const searchParams = new URLSearchParams([['project', 'project_123']]);

    expect(createPlaygroundTemplateRouteFromSearchParams('designer', searchParams)).toBe(
      '/designer?project=project_123',
    );
  });

  it('creates a Form/Viewer route for a bundled template', () => {
    const searchParams = new URLSearchParams([['template', 'invoice']]);

    expect(createPlaygroundTemplateRouteFromSearchParams('form-viewer', searchParams)).toBe(
      '/form-viewer?template=invoice',
    );
  });

  it('creates a plain route when no template source is present', () => {
    expect(createPlaygroundTemplateRouteFromSearchParams('designer', new URLSearchParams())).toBe(
      '/designer',
    );
  });

  it('encodes template source names in generated routes', () => {
    const searchParams = new URLSearchParams([['workspace', 'medical form/2026?draft']]);

    expect(createPlaygroundTemplateRouteFromSearchParams('form-viewer', searchParams)).toBe(
      '/form-viewer?workspace=medical+form%2F2026%3Fdraft',
    );
  });
});
