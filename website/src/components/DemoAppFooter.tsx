import React from 'react';
import { useEffect, useState } from 'react';
import { TwitterIcon, TwitterShareButton } from 'react-share';
import DemoAppFaq from './DemoAppFaq';

export default () => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  useEffect(() => {
    setUrl(window.location.protocol + '//' + window.location.host + window.location.pathname);
    setTitle(document.title);
  }, []);
  return (
    <div className="container">
      <div className={'col col--12'}>
        <div className="margin-bottom--lg">
          <div className="alert alert--info" role="alert">
            <TwitterShareButton
              style={{ display: 'flex', alignItems: 'center' }}
              url={url}
              title={title + ':(OSS PDF library)'}
            >
              <TwitterIcon size={40} />
              <span className="margin-left--md">
                If you like pdfme, please share other developers!🙏
              </span>
            </TwitterShareButton>
          </div>
        </div>
        <DemoAppFaq />
      </div>
    </div>
  );
};
