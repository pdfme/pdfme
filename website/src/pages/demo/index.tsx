import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { demoAppsSourceCodeUrl } from '../../constants';
import {
  title as title_certificate,
  description as description_certificate,
  thumbnail as thumbnail_certificate,
} from './online-certificate-generator';
import {
  title as title_invoice,
  description as description_invoice,
  thumbnail as thumbnail_invoice,
} from './online-invoice-generator';

/*
TODO
- [x] certificate-generator
- [ ] invoice-templates
- [ ] barcode-qrcode-generator
- [ ] address-label
*/

const apps = [
  {
    title: title_certificate,
    url: '/demo/online-certificate-generator',
    thumbnail: thumbnail_certificate,
    description: description_certificate,
    developing: false,
  },
  {
    title: title_invoice,
    url: '/demo/online-invoice-generator',
    thumbnail: thumbnail_invoice,
    description: description_invoice,
    developing: false,
  },
  {
    title: 'Online Barcode, QRcode Generator',
    url: '',
    thumbnail: '/img/under-development.png',
    description: 'Comming soon...',
    developing: true,
  },
  {
    title: 'Online Address labels Maker',
    url: '',
    thumbnail: '/img/under-development.png',
    description: 'Comming soon...',
    developing: true,
  },
];

const title = 'Demo app to generate PDFs online';
const description = `Let's check out applications that you can make with pdfme and how it works by actually using it.`;

const Demo = () => (
  <Layout title={title} description={description}>
    <main>
      <section className="margin-vert--lg">
        <div className="container">
          <div className="row">
            <div className={clsx('col col--12')}>
              <h1>{title}</h1>
              <p style={{ whiteSpace: 'pre-line' }}>{description}</p>
            </div>
            {apps.map((app) => (
              <div key={app.title} className={clsx('col col--3')}>
                <div className="card-demo">
                  <div className="card">
                    <div className="card__image">
                      <Link to={app.url}>
                        <img
                          src={app.thumbnail}
                          alt={app.title}
                          title={app.title}
                          style={{
                            width: 200,
                            margin: '0 auto',
                            display: 'block',
                          }}
                        />
                      </Link>
                    </div>
                    <div className="card__body">
                      <h2>{app.title}</h2>
                      <small>{app.description}</small>
                    </div>
                    <div className="card__footer">
                      {app.developing ? (
                        <button
                          disabled={app.developing}
                          className="button button--primary button--block"
                        >
                          ---
                        </button>
                      ) : (
                        <Link className="button button--primary button--block" to={app.url}>
                          Check
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className={clsx('col col--12 margin-top--lg')}>
              <p>
                Source code can be accessed at{' '}
                <a target="_blank" rel="noopener noreferrer" href={demoAppsSourceCodeUrl}>
                  {demoAppsSourceCodeUrl}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </Layout>
);

export default Demo;
