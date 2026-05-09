import React, { useEffect } from 'react';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import { useLocation } from '@docusaurus/router';
import { playgroundUrl } from '../constants';

const getPlaygroundDesignUrl = (search: string) => {
  const query = new URLSearchParams(search);
  const ui = query.get('ui') === 'form-viewer' ? 'form-viewer' : 'designer';
  const template = query.get('template');
  const playgroundPath = new URL(`${playgroundUrl}/${ui}`);
  if (template) playgroundPath.searchParams.set('template', template);
  return playgroundPath.toString();
};

const TemplateDesign = () => {
  const location = useLocation();
  const redirectUrl = getPlaygroundDesignUrl(location.search);

  useEffect(() => {
    window.location.replace(redirectUrl);
  }, [redirectUrl]);

  return (
    <Layout title="Template Design" description='Design your PDF template with the playground editor.'>
      <Head>
        <link rel="canonical" href={redirectUrl} />
        <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />
      </Head>
      <main style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p>Opening the pdfme playground...</p>
        <p>
          <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
            Open Designer in a new window
          </a>
        </p>
      </main>
    </Layout>
  );
};

export default TemplateDesign;
