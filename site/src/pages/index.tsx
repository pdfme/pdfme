import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '../components/HomepageFeatures';
import { generate, TemplateDesigner, Viewer, Form, blankPdf, Template } from '../../../src/index';
import { Sandpack } from '@codesandbox/sandpack-react';
require('@codesandbox/sandpack-react/dist/index.css');

// TODO アイコンのサイズがおかしい

const getTemplate = (): Template => ({
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
  columns: ['field1', 'field2'],
  sampledata: [
    {
      field1: 'bb',
      field2: 'aaaaaaaaaaaa',
    },
  ],
  basePdf: blankPdf,
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
            {/* TODO 明確な目標を掲げる, フリーであることを宣言する */}
            {/* ライセンスの選択と適用 */}
            Docusaurus Tutorial - 5min ⏱️
          </Link>
          {/* TODO ダウンロード */}
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

  const editor = useRef<TemplateDesigner | null>(null);
  const viewer = useRef<Viewer | null>(null);
  const form = useRef<Form | null>(null);

  const [template, setTemplate] = useState<Template>(getTemplate());
  const [mode, setMode] = useState<'viewer' | 'form'>('form');

  const saveTemplate = (t: Template) => {
    setTemplate(t);
    if (form.current) {
      form.current.updateTemplate(t);
      if (t.sampledata) {
        form.current.setInputs(JSON.parse(JSON.stringify(t.sampledata)));
      }
    }
    if (viewer.current) {
      viewer.current.updateTemplate(t);
      if (t.sampledata) {
        viewer.current.setInputs(JSON.parse(JSON.stringify(t.sampledata)));
      }
    }
  };

  useEffect(() => {
    if (templateDesignerRef.current) {
      editor.current = new TemplateDesigner({
        domContainer: templateDesignerRef.current,
        template,
        saveTemplate,
      });

      editor.current.onChangeTemplate(() => {
        editor.current.saveTemplate();
      });
    }
  }, [templateDesignerRef]);

  useEffect(() => {
    if (viewerRef.current) {
      viewer.current = new Viewer({
        domContainer: viewerRef.current,
        template,
        inputs: JSON.parse(JSON.stringify(template.sampledata)) ?? [{}],
      });
    }

    if (formRef.current) {
      form.current = new Form({
        domContainer: formRef.current,
        template,
        inputs: JSON.parse(JSON.stringify(template.sampledata)) ?? [{}],
        onChangeInput: console.log,
      });
    }
  }, [viewerRef, formRef, mode]);

  const generatePDF = () => {
    generate({
      template,
      inputs: form.current.getInputs(),
    }).then((pdf) => {
      const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob));
    });
  };

  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main>
        {/* TODO 機能一覧・要件一覧 */}
        <HomepageFeatures />

        <div className="container">
          <div className="row">
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              ---
            </div>
            <div className={clsx('col col--8')} ref={templateDesignerRef}></div>
            <div className={clsx('col col--4')}>
              <div style={{ height: 800, overflow: 'scroll' }}>
                <Sandpack
                  files={{
                    'template.json': {
                      code: JSON.stringify(template, null, 2),
                      active: true,
                    },
                  }}
                  template="react"
                  options={{
                    editorHeight: 800,
                    editorWidthPercentage: 100,
                  }}
                />
              </div>
            </div>
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              ---
            </div>
            <div className={clsx('col col--8 col--offset-4')}>
              <ul className="tabs">
                <li
                  onClick={() => setMode('form')}
                  className={`tabs__item ${mode === 'form' ? 'tabs__item--active' : ''}`}
                >
                  Form
                </li>
                <li
                  onClick={() => setMode('viewer')}
                  className={`tabs__item  ${mode === 'viewer' ? 'tabs__item--active' : ''}`}
                >
                  Viewer
                </li>
              </ul>
            </div>

            <div className={clsx('col col--4')}>
              <div className="card-demo">
                <div className="card">
                  <div className="card__image">
                    <img
                      // TODO 使用例とスクリーンショット
                      src={
                        mode === 'form'
                          ? 'https://images.unsplash.com/photo-1501619951397-5ba40d0f75da?ixlib=rb-1.2.1&amp;auto=format&amp;fit=crop&amp;w=1655&amp;q=80'
                          : 'https://images.unsplash.com/photo-1506624183912-c602f4a21ca7?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=crop&amp;w=800&amp;q=60'
                      }
                      alt="Image alt text"
                      title="Logo Title Text 1"
                    />
                  </div>
                  <div className="card__body">
                    <h4>Quaco Lighthouse</h4>
                    <small>
                      The Quaco Head Lighthouse is a well maintained lighthouse close to St.
                      Martins. It is a short, beautiful walk to the lighthouse along the seashore.
                    </small>
                  </div>
                  <div className="card__footer">
                    <button
                      className="button button--lg button--primary button--block"
                      onClick={generatePDF}
                    >
                      Generate PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx('col col--8')}>
              {mode === 'form' ? (
                <div style={{ height: 800, background: 'rgb(74, 74, 74)' }} ref={formRef}></div>
              ) : (
                <div style={{ height: 800, background: 'rgb(74, 74, 74)' }} ref={viewerRef}></div>
              )}
            </div>
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              ---
            </div>
          </div>
        </div>
      </main>
      <HomepageHeader />
    </Layout>
  );
}
