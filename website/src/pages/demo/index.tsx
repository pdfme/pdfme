import React from 'react';
import Layout from '@theme/Layout';
import DemoAppCard from '../../components/DemoAppCard';
import GithubStar from '../../components/GithubStar';
import Divider from '../../components/Divider';
import { demoAppsSourceCodeUrl, templateDesignSourceCodeUrl } from '../../constants';
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

// TODO address-label, barcode-qrcodeでは一括編集モードみたいなのが欲しいかも

const apps = [
  {
    title: title_invoice,
    url: '/demo/free-invoice-generator',
    thumbnail: thumbnail_invoice,
    description: description_invoice,
  },
  {
    title: title_address_label,
    url: '/demo/address-label-maker',
    thumbnail: thumbnail_address_label,
    description: description_address_label,
  },
  {
    title: title_certificate,
    url: '/demo/online-certificate-maker',
    thumbnail: thumbnail_certificate,
    description: description_certificate,
  },
  {
    title: title_barcode_qrcode,
    url: '/demo/barcode-qrcode-generator',
    thumbnail: thumbnail_barcode_qrcode,
    description: description_barcode_qrcode,
  },
];

const title = 'Demo app to generate PDFs online';
const description = `Let's check out applications that you can make with pdfme and how it works by actually using it.`;

const Demo = () => (
  <Layout title={title} description={description}>
    {/* TODO ogimageの設定 */}
    <main>
      <section className="margin-vert--lg">
        <div className="container">
          <div className="row">
            <div className={'col col--12'}>
              <h1>{title}</h1>
              <p style={{ whiteSpace: 'pre-line' }}>{description}</p>
            </div>
            {apps.map((app) => (
              <div key={app.title} className={'col col--3'}>
                <DemoAppCard app={app} />
              </div>
            ))}
            <div className={'col col--12 margin-top--md'}>
              <p>
                Source code can be accessed at{' '}
                <a target="_blank" rel="noopener noreferrer" href={demoAppsSourceCodeUrl}>
                  {demoAppsSourceCodeUrl}
                </a>
              </p>
            </div>
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>
            {/* TODO どのdemoが何の機能に対応しているのか説明し、ドキュメントのリンクも貼る */}
            {/* TODO DesignerもTemplate designerに飛ばす */}
            <div className={'col col--3'}>
              <DemoAppCard
                app={{
                  title: 'Template Design',
                  url: '/template-design',
                  thumbnail: '/img/designer.png',
                  description: `The Designer allows you to edit the Template schemas, making it easy for anyone to create Template json objects.`,
                }}
              />
            </div>
            <div className={'col col--12 margin-top--md'}>
              <p>
                Source code can be accessed at{' '}
                <a target="_blank" rel="noopener noreferrer" href={templateDesignSourceCodeUrl}>
                  {templateDesignSourceCodeUrl}
                </a>
              </p>
            </div>
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>
            <GithubStar />
          </div>
        </div>
      </section>
    </main>
  </Layout>
);

export default Demo;
