export type AuthoringStarterKind = 'jsx' | 'md2pdf';

export type AuthoringStarter = {
  assetName: string;
  description: string;
  id: string;
  kind: AuthoringStarterKind;
  label: string;
  sourcePath: string;
};

type TemplateAssetEntry = {
  description: string;
  name: string;
  sourceKind: string;
  sourcePath?: string;
  title: string;
};

const TEMPLATE_ASSETS_BASE_PATH = '/template-assets';

export const getAuthoringStarterId = (assetName: string, kind: AuthoringStarterKind) => {
  const prefix = `${kind}-`;
  return assetName.startsWith(prefix) ? assetName.slice(prefix.length) : assetName;
};

export const loadAuthoringStarters = async (
  kind: AuthoringStarterKind,
): Promise<AuthoringStarter[]> => {
  const response = await fetch(`${TEMPLATE_ASSETS_BASE_PATH}/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to load template starters: ${response.statusText}`);
  }

  const entries = (await response.json()) as TemplateAssetEntry[];
  return entries
    .filter((entry) => entry.sourceKind === kind && typeof entry.sourcePath === 'string')
    .map((entry) => ({
      assetName: entry.name,
      description: entry.description,
      id: getAuthoringStarterId(entry.name, kind),
      kind,
      label: entry.title,
      sourcePath: entry.sourcePath!,
    }));
};

export const loadAuthoringStarterSource = async (starter: Pick<AuthoringStarter, 'sourcePath'>) => {
  const response = await fetch(`${TEMPLATE_ASSETS_BASE_PATH}/${starter.sourcePath}`);
  if (!response.ok) {
    throw new Error(`Failed to load starter source: ${response.statusText}`);
  }
  return response.text();
};
