const PDFME_AGENT_ENABLED_KEY = 'pdfme-agent.enabled';
export const PDFME_AGENT_FEATURE_EVENT = 'pdfme-agent-feature-change';

let runtimePdfmeAgentEnabled = false;

const getStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const getSearchParamValue = () =>
  typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('agent');

export const isPdfmeAgentEnabled = () => {
  const searchValue = getSearchParamValue();
  if (searchValue === '1') return true;
  if (searchValue === '0') return false;
  return runtimePdfmeAgentEnabled || getStorage()?.getItem(PDFME_AGENT_ENABLED_KEY) === '1';
};

export const setPdfmeAgentEnabled = (enabled: boolean) => {
  runtimePdfmeAgentEnabled = enabled;
  const storage = getStorage();
  if (storage) {
    if (enabled) {
      storage.setItem(PDFME_AGENT_ENABLED_KEY, '1');
    } else {
      storage.removeItem(PDFME_AGENT_ENABLED_KEY);
    }
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PDFME_AGENT_FEATURE_EVENT));
};

export const consumePdfmeAgentSearchParam = (searchParams: URLSearchParams) => {
  const value = searchParams.get('agent');
  if (value !== '1' && value !== '0') return null;

  setPdfmeAgentEnabled(value === '1');

  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.delete('agent');
  return nextSearchParams;
};
