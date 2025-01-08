import React, { useEffect } from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';
import { playgroundUrl } from '../constants';

const TemplateDesign = () => {
  const history = useHistory();

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'navigate') {
        const templateId = e.data?.payload?.templateId;
        if (templateId) {
          history.push(`/template-design?template=${templateId}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [history]);

  return (
    <Layout title="Sample Templates" description="Explore sample templates with our interactive playground.">
      <iframe src={`${playgroundUrl}/templates?embed=true`} style={{ width: '100%', height: '100vh' }} />
    </Layout>
  );
};

export default TemplateDesign;
