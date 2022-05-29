import React from 'react';
import GitHubButton from 'react-github-btn';

const GithubStar = () => (
  <div className="col col--12 margin-vert--lg padding-vert--lg text--center">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'fit-content' }}>
        <div style={{ display: 'flex', maxWidth: 400 }}>
          <img src={'/img/please-star.png'} alt="pleaseStar" />
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
            href="https://github.com/pdfme/pdfme"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={'/img/github-icon.svg'} alt="github" width={25} />
            <span style={{ marginLeft: '0.5rem' }}>https://github.com/pdfme/pdfme</span>
          </a>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div style={{ marginLeft: '0.5rem' }}>
              <GitHubButton
                href="https://github.com/pdfme/pdfme"
                data-size="large"
                data-icon="octicon-star"
                data-show-count={true}
                aria-label="Star pdfme on GitHub"
              >
                Star
              </GitHubButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default GithubStar;
