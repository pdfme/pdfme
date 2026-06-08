export type PlaygroundTemplateRouteTarget = 'designer' | 'form-viewer';

export type PlaygroundTemplateRouteSource = {
  project?: string | null;
  template?: string | null;
  workspace?: string | null;
};

const targetPaths: Record<PlaygroundTemplateRouteTarget, string> = {
  designer: '/designer',
  'form-viewer': '/form-viewer',
};

const sourceQueryKeys = ['workspace', 'project', 'template'] as const;

export function createPlaygroundTemplateRoute(
  target: PlaygroundTemplateRouteTarget,
  source: PlaygroundTemplateRouteSource = {},
) {
  const searchParams = new URLSearchParams();

  for (const key of sourceQueryKeys) {
    const value = source[key];
    if (value) {
      searchParams.set(key, value);
      break;
    }
  }

  const query = searchParams.toString();
  return query ? `${targetPaths[target]}?${query}` : targetPaths[target];
}

export function createPlaygroundTemplateRouteFromSearchParams(
  target: PlaygroundTemplateRouteTarget,
  searchParams: URLSearchParams,
) {
  return createPlaygroundTemplateRoute(target, {
    project: searchParams.get('project'),
    template: searchParams.get('template'),
    workspace: searchParams.get('workspace'),
  });
}
