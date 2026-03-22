interface ExampleTemplateIndexEntry {
  name: string;
}

export function getExamplesBaseUrl(): string {
  return process.env.PDFME_EXAMPLES_BASE_URL ?? 'https://playground.pdfme.com/template-assets';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getExampleTemplateNames(): Promise<string[]> {
  const index = await fetchJson<ExampleTemplateIndexEntry[]>(`${getExamplesBaseUrl()}/index.json`);
  return index
    .map((entry) => entry.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .sort();
}

export async function fetchExampleTemplate(name: string): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(
    `${getExamplesBaseUrl()}/${encodeURIComponent(name)}/template.json`,
  );
}
