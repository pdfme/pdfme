import React, { useEffect, useRef, useState } from 'react';
import GitHubButton from 'react-github-btn';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '../components/HomepageFeatures';
import Divider from '../components/Divider';
import { generate, Designer, Viewer, Form, Template } from '../../../src/index';
import { examplePdfb64, dogPngb64 } from '../libs/sampleData';
import { Sandpack } from '@codesandbox/sandpack-react';
require('@codesandbox/sandpack-react/dist/index.css');

// TODO https://github.com/hand-dot/labelmake をpdfmeに置換する
// TODO Template,Generator,Designer,Form / Viewerに対してページ内リンクを追加する

const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

const getTemplate = (): Template => ({
  basePdf: examplePdfb64,
  schemas: [
    {
      name: {
        type: 'text',
        position: {
          x: 25.06,
          y: 26.35,
        },
        width: 77.77,
        height: 18.7,
        fontSize: 36,
        fontColor: '#14b351',
      },

      photo: {
        type: 'image',
        position: {
          x: 24.99,
          y: 65.61,
        },
        width: 60.66,
        height: 93.78,
      },
      age: {
        type: 'text',
        position: {
          x: 36,
          y: 179.46,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      sex: {
        type: 'text',
        position: {
          x: 36,
          y: 186.23,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      weight: {
        type: 'text',
        position: {
          x: 40,
          y: 192.99,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      breed: {
        type: 'text',
        position: {
          x: 40,
          y: 199.09,
        },
        width: 43.38,
        height: 6.12,
        fontSize: 12,
      },
      owner: {
        type: 'qrcode',
        position: {
          x: 115.09,
          y: 204.43,
        },
        width: 26.53,
        height: 26.53,
      },
    },
  ],
  sampledata: [
    {
      name: 'Pet Name',
      photo: dogPngb64,
      age: '4 years',
      sex: 'Male',
      weight: '33 pounds',
      breed: 'Mutt',
      owner: 'https://pdfme.com/',
    },
  ],
  columns: ['name', 'photo', 'age', 'sex', 'weight', 'breed', 'owner'],
});

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className="row" style={{ alignItems: 'center', flexDirection: 'row-reverse' }}>
          <div className="col col--6" style={{ textAlign: 'center' }}>
            <img src="/img/logo.svg" alt="logo" width={300} className={styles.logo} />
          </div>
          <div className="col col--6">
            <h1 className="hero__title">{siteConfig.title}</h1>
            <p className="hero__subtitle">
              TypeScript base PDF generator and React base UI. <br />
              Open source, developed by the community, and completely free to use under the MIT
              license!
            </p>
          </div>
          <div className="col col--6">
            <div style={{ paddingTop: '0.5rem', textAlign: 'center' }}>
              <GitHubButton
                href="https://github.com/hand-dot/labelmake"
                data-size="large"
                data-show-count={true}
                aria-label="Star hand-dot/labelmake on GitHub"
              >
                Star
              </GitHubButton>
            </div>
          </div>

          <div className="col col--6">
            <div className={styles.buttons}>
              {/* TODO リンク */}
              <Link className="button button--success" to="/docs/intro">
                Get Started
              </Link>
              <div style={{ marginLeft: '1rem' }}></div>
              {/* TODO リンク */}
              <Link className="button button--info" to="/docs/intro">
                Playground
              </Link>
              <div style={{ marginLeft: '1rem' }}></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  const designerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const designer = useRef<Designer | null>(null);
  const viewer = useRef<Viewer | null>(null);
  const form = useRef<Form | null>(null);

  const [template, setTemplate] = useState<Template>(getTemplate());
  const [mode, setMode] = useState<'viewer' | 'form'>('form');

  const saveTemplate = (t: Template) => {
    setTemplate(t);
    if (form.current) {
      form.current.updateTemplate(t);
      if (t.sampledata) {
        form.current.setInputs(cloneDeep(t.sampledata));
      }
    }
    if (viewer.current) {
      viewer.current.updateTemplate(t);
      if (t.sampledata) {
        viewer.current.setInputs(cloneDeep(t.sampledata));
      }
    }
  };

  useEffect(() => {
    if (designerRef.current) {
      designer.current = new Designer({
        domContainer: designerRef.current,
        template,
        saveTemplate,
      });

      designer.current.onChangeTemplate(() => {
        designer.current.saveTemplate();
      });
    }
  }, [designerRef]);

  useEffect(() => {
    if (viewerRef.current) {
      viewer.current = new Viewer({
        domContainer: viewerRef.current,
        template,
        inputs: cloneDeep(template.sampledata) ?? [{}],
      });
    }

    if (formRef.current) {
      form.current = new Form({
        domContainer: formRef.current,
        template,
        inputs: cloneDeep(template.sampledata) ?? [{}],
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
        <HomepageFeatures />
        <div className="container">
          <div className="row">
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>

            <div className={clsx('col col--7')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="template"></a>
                Template
                <a className="hash-link" href="#template" title="Direct link to heading"></a>
              </h2>
              <div className="card-demo">
                <div className="card">
                  <div className="card__image">
                    <img src={'/img/template.png'} alt="Image alt text" title="Logo Title Text 1" />
                  </div>
                  <div className="card__body">
                    <h4>Template is made of basePdf and schemas</h4>
                    <small>
                      {/* テンプレートはpdfmeライブラリの中心となるデータ構造です。
                      理解しやすいJSONデータで、basePdfとschemasというプロパティを持っています。
                      JSONデータなのでコードエディタでも作成できますが、デザイナーでのGUIでも作成できます。
                      一度作ったテンプレートは再利用可能で、ジェネレーター、フォーム、ビューアのそれぞれに利用できます。 */}
                      Templates are the core data structure of the pdfme library. It is JSON data
                      that is easy to understand and has the properties basePdf and schemas.
                      <br />
                      Templates can be created in the code editor, but you can also create them in
                      the Designer GUI.
                      <br />
                      Once templates are created, they are reusable and can be used in the
                      generator, form, and viewer.
                    </small>
                  </div>
                  <div className="card__footer">
                    <button className="button button--lg button--primary button--block">
                      Learn more about the Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className={clsx('col col--5')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="generate"></a>
                Generator
                <a className="hash-link" href="#generate" title="Direct link to heading"></a>
              </h2>
              <p>Most simple generate example is like this.</p>
              <div style={{ height: 820, overflow: 'scroll' }}>
                <Sandpack
                  files={{
                    'index.ts': {
                      code: `import { generate } from "pdfme";

(async () => {
  const template = ${JSON.stringify(
    Object.assign(cloneDeep(getTemplate()), {
      basePdf: 'data:application/pdf;base64,JVB...',
      columns: undefined,
      sampledata: undefined,
    }),
    null,
    2
  )};
  
  const inputs = ${JSON.stringify(
    [
      Object.assign(cloneDeep(template.sampledata[0]), {
        photo: 'data:image/png;base64,iVBORw0...',
      }),
    ],
    null,
    2
  )};

  const pdf = await generate({ template, inputs });

  const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob));
})();
`,
                      active: true,
                    },
                  }}
                  template="react"
                  options={{
                    editorHeight: 820,
                    editorWidthPercentage: 100,
                  }}
                />
              </div>
              <div>
                <button
                  className="margin-vert--md button button--lg button--secondary button--block"
                  onClick={generatePDF}
                >
                  Generate PDF
                </button>
                <Link
                  className="margin-vert--md button button--primary button--lg button--block"
                  to="/docs/intro"
                >
                  Learn more about the Generator
                </Link>
              </div>
            </div>

            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>

            <div className={clsx('col col--12')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="designer"></a>
                Designer
                <a className="hash-link" href="#designer" title="Direct link to heading"></a>
              </h2>
              <p>
                {/* デザイナーはGoogle
                SlideやパワーポイントなどのGUIを参考に、プログラマー以外でも使えるように作成しています。
                コピーや貼り付け、Undo,Reduなどのショートカットやグループ選択、ルーラーなどをサポートしています。 */}
                The designer aims for the GUI feel of Google Slides, PowerPoint, etc., and has been
                created so that it can be used by non-programmers.
                <br />
                It supports shortcuts such as Copy, Paste, Undo, Redo, Ruler, and group selection.
              </p>
            </div>

            <div className={clsx('col col--8')} ref={designerRef}></div>
            <div className={clsx('col col--4')}>
              <p style={{ marginLeft: '1rem' }}>Out put template json object</p>
              <div
                style={{
                  height: 800,
                  overflow: 'scroll',
                  marginLeft: '1rem',
                }}
              >
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
            <div className={clsx('col col--12 margin-vert--lg')}>
              <div className="text--center">
                <p>
                  You can easily integrate into your app.
                  <br />
                </p>
                {/* TODO リンク */}
                <Link className="button button--primary button--lg" to="/docs/intro">
                  Learn more about the Designer
                </Link>
              </div>
            </div>
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>

            <div className={clsx('col col--4')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="form-viewer"></a>
                Form / Viewer
                <a className="hash-link" href="#form-viewer" title="Direct link to heading"></a>
              </h2>
              <div className="card-demo">
                <div className="card">
                  <div className="card__image">
                    <img
                      src={mode === 'form' ? '/img/form.png' : '/img/viewer.png'}
                      alt="Image alt text"
                      title="Logo Title Text 1"
                    />
                  </div>
                  <div className="card__body">
                    <h4>
                      <span
                        style={{ cursor: 'pointer' }}
                        className={`${mode === 'form' ? 'text--primary' : ''}`}
                        onClick={() => setMode('form')}
                      >
                        Form
                      </span>
                      <span style={{ margin: '1rem' }}>/</span>
                      <span
                        style={{ cursor: 'pointer' }}
                        className={`${mode === 'viewer' ? 'text--primary' : ''}`}
                        onClick={() => setMode('viewer')}
                      >
                        Viewer
                      </span>
                    </h4>
                    <small>
                      {mode === 'form' ? (
                        <div>
                          {/* テンプレートを使用してinput部分をエンドユーザーに入力してもらうためのフォームを生成できます。
                          <br />
                          ユーザーが入力した値を使ってPDFを生成することが簡単に実現できます。 */}
                          You can use the template to generate a form for the user to input.
                          <br />
                          Generating a PDF with the values entered by the user can be easily
                          achieved.
                        </div>
                      ) : (
                        <div>
                          {/* テンプレートを使用してinput部分の入力を確認してもらうためのビューワーを生成できます。
                          <br />
                          モバイルブラウザではiframeでのPDFの確認が行えませんが、Viewerを使うことで簡単に実現することができます。 */}
                          You can use the template to generate a viewer for the user to check the
                          input.
                          <br />
                          Mobile browsers cannot check PDFs in an iframe, but you can easily achieve
                          this by using a viewer.
                        </div>
                      )}
                    </small>
                  </div>
                  <div className="card__footer">
                    <button className="button button--lg button--primary button--block">
                      Learn more about the {mode === 'form' ? 'Form' : 'Viewer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={clsx('col col--8')}>
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
              {mode === 'form' ? (
                <div style={{ height: 700, background: 'rgb(74, 74, 74)' }} ref={formRef}></div>
              ) : (
                <div style={{ height: 700, background: 'rgb(74, 74, 74)' }} ref={viewerRef}></div>
              )}
              <div className="margin-vert--lg text--center">
                <button className="button button--lg button--secondary" onClick={generatePDF}>
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="col col--12 margin-vert--lg text--center">
          <Divider />
        </div>
        <div className="col col--12 margin-vert--lg padding-vert--lg text--center">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img width={100} src={'/img/logo-mini2.png'} />
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
                  href="https://github.com/hand-dot/labelmake"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={'/img/github-icon.svg'} alt="github" width={25} />
                  <span style={{ marginLeft: '0.5rem' }}>
                    https://github.com/hand-dot/labelmake
                  </span>
                </a>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ marginLeft: '0.5rem' }}>
                    <GitHubButton
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
          </div>
        </div>
      </main>
    </Layout>
  );
}
