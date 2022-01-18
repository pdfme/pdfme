import React from 'react';
import GitHubButton from 'react-github-btn';

export default () => (
  <div style={{ margin: '0 auto', width: 'fit-content' }}>
    <div style={{ display: 'flex', maxWidth: 400 }}>
      {/* TODO この画像がダークモードで汚い */}
      <img src={'/img/please-star.png'} alt="pleaseStar" style={{ width: '80%' }} />
      <img src={'/img/please-star-arrow.png'} alt="pleaseStarArrow" width="30" />
    </div>
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        margin: '0.8rem',
      }}
    >
      <a
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '10pt',
        }}
        // TODO 変更
        href="https://github.com/hand-dot/labelmake"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={'/img/github-icon.svg'} alt="github" width={25} />
        <span style={{ marginLeft: '0.5rem' }}>https://github.com/hand-dot/labelmake</span>
      </a>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ marginLeft: '0.5rem' }}>
          <GitHubButton
            // TODO 変更
            href="https://github.com/hand-dot/labelmake"
            data-size="large"
            data-icon="octicon-star"
            data-show-count={true}
            aria-label="Star hand-dot/labelmake on GitHub"
          >
            Star
          </GitHubButton>
        </div>
      </div>
    </div>
  </div>
);
