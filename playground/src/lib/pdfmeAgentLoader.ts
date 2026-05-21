const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4128';
const ENABLED_KEY = 'pdfme-agent.enabled';

let loadPromise: Promise<void> | null = null;

const getStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const setEnabled = (enabled: boolean) => {
  const storage = getStorage();
  if (!storage) return;
  if (enabled) {
    storage.setItem(ENABLED_KEY, '1');
  } else {
    storage.removeItem(ENABLED_KEY);
  }
};

export const isPdfmeAgentEnabled = () => getStorage()?.getItem(ENABLED_KEY) === '1';

const consumeSearchParam = () => {
  const url = new URL(window.location.href);
  const value = url.searchParams.get('agent');
  if (value !== '1' && value !== '0') return null;

  setEnabled(value === '1');
  url.searchParams.delete('agent');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return value === '1';
};

const getBridgeUrl = () =>
  (import.meta.env.VITE_PDFME_AGENT_BRIDGE_URL || DEFAULT_BRIDGE_URL).replace(/\/+$/, '');

export const loadPdfmeAgentSdk = () => {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.pdfmeAgent) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;
  if (document.querySelector('script[data-pdfme-agent-sdk="true"]')) {
    return Promise.resolve();
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const bridgeUrl = getBridgeUrl();
    const script = document.createElement('script');
    script.async = true;
    script.dataset.bridgeUrl = bridgeUrl;
    script.dataset.pdfmeAgentSdk = 'true';
    script.src = `${bridgeUrl}/sdk/pdfme-agent.js`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        loadPromise = null;
        script.remove();
        reject(new Error('pdfme Agent SDK failed to load'));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return loadPromise;
};

export const initPdfmeAgentLoader = () => {
  const explicitEnabled = consumeSearchParam();
  if (explicitEnabled === false) window.pdfmeAgent?.setEnabled?.(false);
  if (!isPdfmeAgentEnabled()) {
    window.pdfmeAgent?.stop?.();
    return;
  }
  void loadPdfmeAgentSdk().catch(() => {
    // The hidden SDK is optional and only used with a local bridge.
  });
};
