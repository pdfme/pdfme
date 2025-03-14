import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { playgroundUrl } from '../constants';

const TemplateDesign = () => {
  const history = useHistory();
  const { i18n } = useDocusaurusContext();
  const { currentLocale } = i18n;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'navigate') {
        const { name = "", ui = "" } = e.data?.payload;
        if (name && ui) {
            const localePath = currentLocale === 'en' ? '' : `/${currentLocale}`;
            history.push(`${localePath}/template-design?template=${name}&ui=${ui}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [history, currentLocale]);

  return (
    <Layout title="Sample Templates" description="Explore sample templates with our interactive playground.">
      <iframe
        src={`${playgroundUrl}/templates?embed=true`}
        style={{ width: '100%', height: '100vh' }}
        allow="clipboard-write"
      />
    </Layout>
  );
};

export default TemplateDesign;
