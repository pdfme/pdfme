const PDFME_AGENT_ENABLED_KEY = 'pdfme-agent.enabled';

const getStorage = () => (typeof window === 'undefined' ? null : window.localStorage);

export const isPdfmeAgentEnabled = () => getStorage()?.getItem(PDFME_AGENT_ENABLED_KEY) === '1';

export const setPdfmeAgentEnabled = (enabled: boolean) => {
  const storage = getStorage();
  if (!storage) return;

  if (enabled) {
    storage.setItem(PDFME_AGENT_ENABLED_KEY, '1');
  } else {
    storage.removeItem(PDFME_AGENT_ENABLED_KEY);
  }
};

export const consumePdfmeAgentSearchParam = (searchParams: URLSearchParams) => {
  const value = searchParams.get('agent');
  if (value !== '1' && value !== '0') return null;

  setPdfmeAgentEnabled(value === '1');

  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.delete('agent');
  return nextSearchParams;
};
