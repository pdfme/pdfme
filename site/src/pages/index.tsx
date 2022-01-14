import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '../components/HomepageFeatures';
import { TemplateDesigner, Viewer, Form, blankPdf, Template } from '../../../src/index';
import { Sandpack } from '@codesandbox/sandpack-react';
require('@codesandbox/sandpack-react/dist/index.css');

// TODO ページャーがfixedなので複数ある場合におかしくなる

const getTemplate = (): Template => ({
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'bb',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  basePdf: blankPdf,
  schemas: [
    {
      field1: {
        type: 'text',
        position: { x: 20, y: 20 },
        width: 100,
        height: 15,
        alignment: 'left',
        fontSize: 30,
        characterSpacing: 0,
        lineHeight: 1,
      },
      field2: {
        type: 'text',
        position: { x: 20, y: 35 },
        width: 100,
        height: 40,
        alignment: 'left',
        fontSize: 20,
        characterSpacing: 0,
        lineHeight: 1,
      },
    },
  ],
});

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Docusaurus Tutorial - 5min ⏱️
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  const templateDesignerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const editor = useRef<any>(null);
  const viewer = useRef<any>(null);
  const form = useRef<any>(null);

  const [template, setTemplate] = useState<Template>(getTemplate());

  const saveTemplate = (t: Template) => {
    // TODO ここは参照渡しだからサンプレデータがおかしい感じになる
    setTemplate(t);
    form.current.updateTemplate(t);
    viewer.current.updateTemplate(t);
    if (template.sampledata) {
      form.current.setInputs(template.sampledata);
      viewer.current.setInputs(template.sampledata);
    }
  };

  useEffect(() => {
    if (!templateDesignerRef.current) return;
    if (!viewerRef.current) return;
    if (!formRef.current) return;

    editor.current = new TemplateDesigner({
      domContainer: templateDesignerRef.current,
      template,
      saveTemplate,
    });

    viewer.current = new Viewer({
      domContainer: viewerRef.current,
      template,
      inputs: template.sampledata ?? [{}],
    });

    form.current = new Form({
      domContainer: formRef.current,
      template,
      inputs: template.sampledata ?? [{}],
      onChangeInput: console.log,
    });
  }, [templateDesignerRef, viewerRef, formRef]);

  // TODO generatorで作成できることをわかるようにする

  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />

        <div className="container">
          <div className="row">
            <div className={clsx('col col--12')} ref={templateDesignerRef}></div>
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              ---
            </div>
            <div className={clsx('col col--12')}>
              <Sandpack
                files={{
                  'template.json': {
                    code: JSON.stringify(template, null, 2),
                    active: true,
                  },
                }}
                template="react"
                options={{
                  editorHeight: 900,
                  editorWidthPercentage: 100,
                }}
              />
            </div>
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              ---
            </div>
            <div className={clsx('col col--6')}>
              <div style={{ height: 900 }} ref={viewerRef}></div>
            </div>
            <div className={clsx('col col--6')}>
              <div style={{ height: 900 }} ref={formRef}></div>
            </div>
          </div>
        </div>
        <div className="margin-vert--lg" style={{ textAlign: 'center' }}>
          <button className="button button--primary">Primary</button>
        </div>
      </main>
    </Layout>
  );
}
