import React, { useEffect } from 'react';
import Head from '@docusaurus/Head';
import Layout from '@theme/Layout';
import { playgroundUrl } from '../constants';

const TemplatesPage = () => {
  useEffect(() => {
    window.location.replace(playgroundUrl);
  }, []);

  return (
    <Layout title="Sample Templates" description="Explore sample templates with our interactive playground.">
      <Head>
        <link rel="canonical" href={playgroundUrl} />
        <meta httpEquiv="refresh" content={`0; url=${playgroundUrl}`} />
      </Head>
      <main style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p>Opening the pdfme playground...</p>
        <p>
          <a href={playgroundUrl} target="_blank" rel="noopener noreferrer">
            Open playground in a new window
          </a>
        </p>
      </main>
    </Layout>
  );
};

export default TemplatesPage;
