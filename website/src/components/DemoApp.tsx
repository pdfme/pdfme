import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FileDownloadOutlined } from '@mui/icons-material';
import { generate, Template, BLANK_PDF, checkTemplate } from '@pdfme/generator';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './DemoApp.module.css';
import { getFont } from '../libs/helper';
import { useForm } from '../hooks';
import { demoAppsSourceCodeUrl } from '../constants';
import DemoAppHeader from './DemoAppHeader';
import TemplateItem from './TemplateItem';
import Faq from './Faq';

type Props = {
  title: string;
  description: string;
  thumbnail: string;
  templateItems: { id: string; jsonUrl: string; imgUrl: string }[];
};

const faqList = [
  {
    question: 'Can I use this for free?',
    answer: 'Yes. Free and unlimited use.',
  },
  {
    question: 'Can I access the source code?',
    answer: (
      <span>
        Source code is available at{' '}
        <a target="_blank" rel="noopener noreferrer" href={demoAppsSourceCodeUrl}>
          {demoAppsSourceCodeUrl}
        </a>
        .
      </span>
    ),
  },
];

const DemoApp = (props: Props) => {
  const { title, description, thumbnail, templateItems } = props;
  const formRef = useRef<HTMLDivElement | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templateItems[0].id);
  const [template, setTemplate] = useState<Template>({ basePdf: BLANK_PDF, schemas: [] });
  const form = useForm({ formRef, template });

  useEffect(() => {
    const selectedTemplateJsonUrl =
      templateItems.find((t) => t.id === selectedTemplateId).jsonUrl ?? '';
    if (!selectedTemplateJsonUrl) return;

    fetch(selectedTemplateJsonUrl)
      .then((_) => _.json())
      .then((t) => {
        checkTemplate(t);
        setTemplate(t);
      })
      .catch(alert);
  }, [selectedTemplateId]);

  const downloadPdf = async () => {
    const inputs = form.getInputs() ?? [];
    const font = await getFont();
    const pdf = await generate({ template, inputs, options: { font } });
    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  };

  const loadSampleData = () => {
    form.setInputs(template.sampledata ?? []);
    alert('Sample Data loaded.\nPlease click "Download" button.');
  };

  return (
    <Layout title={title} description={description}>
      <Head>
        <meta property="og:image" content={useBaseUrl(thumbnail, { absolute: true })} />
      </Head>
      <DemoAppHeader title={title} description={description} thumbnail={thumbnail} />
      <main>
        <section className="margin-vert--lg">
          <div className="container">
            <div className="row">
              <div className={clsx('col col--12')}>
                <h2>
                  <a aria-hidden="true" className="anchor enhancedAnchor" id="templates"></a>
                  Choose a Template
                  <a className="hash-link" href="#templates"></a>
                </h2>
              </div>
              {templateItems.map((props, idx) => (
                <TemplateItem
                  key={idx}
                  colNum={12 / templateItems.length}
                  {...props}
                  isSelected={selectedTemplateId === props.id}
                  onClick={(id) => {
                    window.location.hash = '#form';
                    setSelectedTemplateId(id);
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: 'rgb(74, 74, 74)' }}>
          <div className="container">
            <div style={{ color: '#eee' }} className={clsx('col col--12')}>
              <h2 className="padding-top--lg">
                <a aria-hidden="true" className="anchor enhancedAnchor" id="form"></a>
                Fill the Form
                <a className="hash-link" href="#form"></a>
              </h2>
              <p className="margin-bottom--none">
                Fill in the
                <span className={clsx(styles.inputBox, 'margin-horiz--sm padding-horiz--sm')}>
                  light blue border box
                </span>
                and click the
                <button disabled className="button margin-horiz--sm button--success">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <FileDownloadOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                    <span>Download</span>
                  </div>
                </button>
                button.
              </p>
              <div
                className={'text--center margin-top--md'}
                style={{ display: 'flex', justifyContent: 'flex-end' }}
              >
                <button onClick={loadSampleData} className="button button--info">
                  Sample Data
                </button>
                <span className="margin-horiz--md">/</span>
                <button onClick={downloadPdf} className="button button--success">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <FileDownloadOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                    <span>Download</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div ref={formRef}></div>
        </section>

        <section className="margin-vert--lg">
          <div className="container">
            <div className={clsx('col col--12')}>
              <Faq faqList={faqList} />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default DemoApp;
