import React from 'react';
import clsx from 'clsx';
import styles from './HomepageHeader.module.css';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Link from '@docusaurus/Link';

export default function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className="row" style={{ alignItems: 'center', flexDirection: 'row-reverse' }}>
          <div className="col col--6" style={{ textAlign: 'center' }}>
            <img src="/img/logo.svg" alt="logo" width={300} className={styles.logo} />
          </div>
          <div className="col col--6">
            <h1 className="hero__title">{siteConfig.title}: Free and Open source PDF generator!</h1>
            <p className="hero__subtitle">
              A PDF generator library fully written in TypeScript coming with a React based UI
              template editor*.
              <br />
              Open source, developed by the community, and completely free to use under the MIT
              license!
            </p>
            <strong>* The generator library and the UI editor can be used separately.</strong>
          </div>
        </div>
        <div className="row row--no-gutters" style={{ alignItems: 'center' }}>
          <div className="col col--3" style={{ marginTop: '1rem' }}>
            <Link className="button button--lg button--success " to="/docs/getting-started">
              Getting Started
            </Link>
          </div>
          <div className="col col--3" style={{ marginTop: '1rem' }}>
            <Link className="button button--lg button--secondary " to="/demo">
              Demo Apps
            </Link>
          </div>
          <div className="col col--3" style={{ marginTop: '1rem' }}>
            <a
              className="button button--lg button--info "
              href="https://playground.pdfme.com"
              target={'_blank'}
            >
              Playground
            </a>
          </div>
          <div className="col col--6" />
        </div>
      </div>
    </header>
  );
}
