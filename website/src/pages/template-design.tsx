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

  return (
    <Layout title="Template Design" description='Design your PDF template with the playground editor.'>
      <iframe
        src={`${playgroundUrl}/${ui}?template=${template}`}
        style={{ width: '100%', height: `calc(100vh - ${headerHeight}px)` }}
      />
    </Layout>
  );
};

export default TemplateDesign;
