import React from 'react';
import Layout from '@theme/Layout';

const headerHeight = 60;
const controllerHeight = 0;

const TemplateDesign = () => {


  return (
    <Layout title="Template Design">
      <iframe
        src="http://localhost:5173/?template=invoice"
        // src="https://playground.pdfme.com/?template=invoice"
        style={{ width: '100%', height: `calc(100vh - ${headerHeight + controllerHeight}px)` }}
      />
    </Layout>
  );
};

export default TemplateDesign;
