import React, { useEffect, useRef, useState } from 'react';
import { generate, Template, BLANK_PDF, checkTemplate } from '@pdfme/generator';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { getFont } from '../libs/helper';
import { useForm } from '../hooks';
import DemoAppHeader from './DemoAppHeader';
import DemoAppTemplateList from './DemoAppTemplateList';
import DemoAppFormHeader from './DemoAppFormHeader';
import DemoAppFooter from './DemoAppFooter';
import Divider from './Divider';


type Props = {
  title: string;
  description: string;
  thumbnail: string;
  templateItems: { id: string; jsonUrl: string; imgUrl: string }[];
};

const DemoApp = (props: Props) => {
  const { title, description, thumbnail, templateItems } = props;
  const formRef = useRef<HTMLDivElement | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templateItems[0].id);
  const [template, setTemplate] = useState<Template>({ basePdf: BLANK_PDF, schemas: [] });
  const [pdfCreationTime, setPdfCreationTime] = useState(0);
  const form = useForm({ formRef, template });

  useEffect(() => {
    const selectedTemplateJsonUrl =
      templateItems.find((t) => t.id === selectedTemplateId)?.jsonUrl ?? '';
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
    const inputs = form?.getInputs() ?? [{}];
    const font = await getFont();

    const t0 = performance.now();
    const pdf = await generate({ template, inputs, options: { font } });
    const t1 = performance.now();

    setPdfCreationTime(t1 - t0);
    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  };

  const loadSampleData = () => {
    form?.setInputs(template.sampledata ?? []);
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
          <DemoAppTemplateList
            selectedTemplateId={selectedTemplateId}
            templateItems={templateItems}
            onClick={(id) => {
              window.location.hash = '';
              window.location.hash = '#form';
              setSelectedTemplateId(id);
            }}
          />
        </section>
        <section style={{ background: 'rgb(74, 74, 74)' }}>
          <DemoAppFormHeader
            pdfCreationTime={pdfCreationTime}
            loadSampleData={loadSampleData}
            downloadPdf={downloadPdf}
          />
          <div ref={formRef}></div>
        </section>

        <section className="margin-vert--lg">
          <DemoAppFooter />
        </section>
        <Divider />
        <div className={'col col--12 margin-vert--lg'}>
          <div className="text--center">
            <Link className="button button--primary button--lg" to="/demo">
              Check out the other Demo Apps
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default DemoApp;
