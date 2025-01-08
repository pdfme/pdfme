import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import { useLocation, useHistory } from '@docusaurus/router';
import { playgroundUrl } from '../constants';

const headerHeight = 60;

const TemplateDesign = () => {
  const location = useLocation();
  const history = useHistory();

  const [template, setTemplate] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const param = query.get('template');

    if (param) {
      setTemplate(param);

      query.delete('template');
      history.replace({
        pathname: location.pathname,
        search: query.toString(),
      });
    }
  }, [location, history]);

  return (
    <Layout title="Template Design" description='Design your PDF template with the playground editor.'>
      <iframe
        src={`${playgroundUrl}?template=${template}`}
        style={{ width: '100%', height: `calc(100vh - ${headerHeight}px)` }}
      />
    </Layout>
  );
};

export default TemplateDesign;
