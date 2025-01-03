import React from 'react';
import Layout from '@theme/Layout';

const headerHeight = 60;
const controllerHeight = 0;

const TemplateDesign = () => {


  return (
    <Layout title="Template Design">
      <iframe
        src="https://playground.pdfme.com/"
        style={{ width: '100%', height: `calc(100vh - ${headerHeight + controllerHeight}px)` }}
      />
    </Layout>
  );
};

export default TemplateDesign;
