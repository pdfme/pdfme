import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { useLocation, useHistory } from '@docusaurus/router';
import { playgroundUrl } from '../constants';

const headerHeight = 60;

const TemplateDesign = () => {
  const location = useLocation();
  const history = useHistory();

  const [template, setTemplate] = useState('');
  const [ui, setUi] = useState('');
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const templateQuery = query.get('template');
    const uiQuery = query.get('ui');

    if (templateQuery) {
      setTemplate(templateQuery);
      query.delete('template');
    }

    if (uiQuery) {
      setUi(uiQuery);
      query.delete('ui');
    }

    history.replace({ pathname: location.pathname, search: query.toString() });

  }, []);

  useEffect(() => {
    const handleIframeLoad = () => {
      // Auto-focus iframe content when loaded
      setTimeout(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.focus();
          // Try to click inside iframe to ensure focus
          const iframeDoc = iframeRef.current.contentDocument;
          if (iframeDoc) {
            const clickEvent = new MouseEvent('click', {
              view: iframeRef.current.contentWindow,
              bubbles: true,
              cancelable: true,
              clientX: 10,
              clientY: 10
            });
            iframeDoc.body?.dispatchEvent(clickEvent);
          }
        }
      }, 500);
    };

    if (iframeRef.current) {
      iframeRef.current.addEventListener('load', handleIframeLoad);
    }

    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener('load', handleIframeLoad);
      }
    };
  }, []);

  return (
    <Layout title="Template Design" description='Design your PDF template with the playground editor.'>
      <iframe
        ref={iframeRef}
        src={`${playgroundUrl}/${ui}?template=${template}`}
        style={{ width: '100%', height: `calc(100vh - ${headerHeight}px)` }}
        allow="clipboard-write"
      />
    </Layout>
  );
};

export default TemplateDesign;
