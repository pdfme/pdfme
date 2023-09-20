import React from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import DemoAppCard from '../../components/DemoAppCard';
import DemoAppFooter from '../../components/DemoAppFooter';
import Divider from '../../components/Divider';
import {
  title as title_certificate,
  description as description_certificate,
  thumbnail as thumbnail_certificate,
} from './online-certificate-maker';
import {
  title as title_invoice,
  description as description_invoice,
  thumbnail as thumbnail_invoice,
} from './free-invoice-generator';
import {
  title as title_barcode_qrcode,
  description as description_barcode_qrcode,
  thumbnail as thumbnail_barcode_qrcode,
} from './barcode-qrcode-generator';
import {
  title as title_address_label,
  description as description_address_label,
  thumbnail as thumbnail_address_label,
} from './address-label-maker';

const apps: {
  title: string;
  tags: ('ui/form' | 'ui/viewer' | 'ui/designer' | 'generator')[];
  url: string;
  thumbnail: string;
  description: string;
}[] = [
    {
      title: title_invoice,
      tags: ['ui/form', 'generator'],
      url: '/demo/free-invoice-generator',
      thumbnail: thumbnail_invoice,
      description: description_invoice,
    },
    {
      title: title_address_label,
      tags: ['ui/viewer', 'generator'],
      url: '/demo/address-label-maker',
      thumbnail: thumbnail_address_label,
      description: description_address_label,
    },
    {
      title: title_certificate,
      tags: ['ui/form', 'generator'],
      url: '/demo/online-certificate-maker',
      thumbnail: thumbnail_certificate,
      description: description_certificate,
    },
    {
      title: title_barcode_qrcode,
      tags: ['ui/viewer', 'generator'],
      url: '/demo/barcode-qrcode-generator',
      thumbnail: thumbnail_barcode_qrcode,
      description: description_barcode_qrcode,
    },
    {
      title: 'Template Design',
      tags: ['ui/designer', 'generator'],
      url: '/template-design',
      thumbnail: '/img/designer.png',
      description: `The Designer allows you to edit the Template schemas, making it easy for anyone to create Template json objects.`,
    },
  ];

const title = 'Demo Apps to generate PDFs online';
const description = `Let's check out applications that you can make with pdfme and how it works by actually using it.`;

const Demo = () => (
  <Layout title={title} description={description}>
    <Head>
      <meta property="og:image" content={useBaseUrl('/img/demoapps.png', { absolute: true })} />
    </Head>
    <main>
      <section className="margin-vert--lg">
        <div className="container">
          <div className="row">
            <div className={'col col--12'}>
              <h1>{title}</h1>
              <p style={{ whiteSpace: 'pre-line' }}>{description}</p>
            </div>
            {apps.map((app) => (
              <div key={app.title} className={'col col--4 padding--md'}>
                <DemoAppCard app={app} />
              </div>
            ))}
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>
            <DemoAppFooter />
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>
            <div className={clsx('col col--12 margin-vert--lg')}>
              <div className="text--center">
                <p>
                Let's see how to use pdfme. Let's check the document!
                </p>
                <Link className="button button--primary button--lg" to="/docs/getting-started">
                  Check the document
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </Layout>
);

export default Demo;
