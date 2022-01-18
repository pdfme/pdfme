import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';
import HomepageFeatures from '../components/HomepageFeatures';
import Divider from '../components/Divider';
import GiveMeStar from '../components/GiveMeStar';
import { generate, TemplateDesigner, Viewer, Form, blankPdf, Template } from '../../../src/index';
import { Sandpack } from '@codesandbox/sandpack-react';
require('@codesandbox/sandpack-react/dist/index.css');

const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

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
        type: 'qrcode',
        position: { x: 20, y: 35 },
        width: 20,
        height: 20,
      },
      field3: {
        type: 'qrcode',
        position: { x: 50, y: 135 },
        width: 20,
        height: 20,
      },
    },
  ],
  columns: ['field1', 'field2', 'field3'],
  sampledata: [
    {
      field1: 'bb',
      field2: 'aaaaaaaaaaaa',
      field3: 'test',
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
        <p className="hero__subtitle">
          TypeScript based PDF generator and React based UI. <br />
          From PDF design and generation to forms and viewers, you can efficiently create the PDF
          processing. <br />
          Open source, developed by the community, and completely free to use under the MIT license!
        </p>
        <div className={styles.buttons}>
          {/* TODO リンク */}
          <Link className="button button--lg button--success" to="/docs/intro">
            Get Started
          </Link>
          <Link className="button button--lg button--info" to="/docs/intro">
            Playground
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
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              <Divider />
            </div>

            <div className={clsx('col col--6')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="template"></a>
                Template
                <a className="hash-link" href="#template" title="Direct link to heading"></a>
              </h2>
              <div className="card-demo">
                <div className="card">
                  <div className="card__image">
                    <img
                      // https://excalidraw.com/ で画像を作る
                      src={
                        'https://images.unsplash.com/photo-1501619951397-5ba40d0f75da?ixlib=rb-1.2.1&amp;auto=format&amp;fit=crop&amp;w=1655&amp;q=80'
                      }
                      alt="Image alt text"
                      title="Logo Title Text 1"
                    />
                  </div>
                  <div className="card__body">
                    <h4>Template is made of schemas and basePdf</h4>
                    <small>
                      {/* TODO templateの解説 */}
                      テンプレートはpdfmeライブラリの中心となるデータ構造です。
                      理解しやすいJSONデータで、basePdfとschemasというプロパティを持っています。
                      JSONデータなのでコードエディタでも作成できますが、デザイナーでのGUIでも作成できます。
                      一度作ったテンプレートは再利用可能で、ジェネレーター、フォーム、ビューアのそれぞれに利用できます。
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
            <div className={clsx('col col--6')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="generate"></a>
                Generator
                <a className="hash-link" href="#generate" title="Direct link to heading"></a>
              </h2>
              <p>Most simple generate example is like this.</p>
              <div style={{ height: 820, overflow: 'scroll' }}>
                <Sandpack
                  files={{
                    'template.json': {
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
  const inputs = ${JSON.stringify(cloneDeep(template.sampledata), null, '')};

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
                {/* TODO PDF作成ボタンを追加 */}
                <button
                  className="button button--lg button--primary button--block"
                  onClick={generatePDF}
                >
                  Generate PDF
                </button>
              </div>
            </div>

            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
              <Divider />
            </div>

            <div className={clsx('col col--12')}>
              <h2>
                <a aria-hidden="true" className="anchor enhancedAnchor" id="designer"></a>
                Designer
                <a className="hash-link" href="#designer" title="Direct link to heading"></a>
              </h2>
              <p>
                {/* TODO 翻訳 */}
                デザイナーはGoogle
                SlideやパワーポイントなどのGUIを参考に、プログラマー以外でも使えるように作成しています。
                コピーや貼り付け、Undo,Reduなどのショートカットやグループ選択などをサポートしています。
              </p>
            </div>

            <div className={clsx('col col--8')} ref={templateDesignerRef}></div>
            <div className={clsx('col col--4')}>
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
              <div style={{ textAlign: 'center' }}>
                <p>
                  It can be easily integrated into your service.
                  <br />
                </p>
                <Link className="button button--primary button--lg" to="/docs/intro">
                  Learn more about the Designer
                </Link>
              </div>
            </div>
            <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
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
                    <h4>{mode === 'form' ? 'Form' : 'Viewer'}</h4>
                    <small>
                      {/* TODO 説明 */}
                      {mode === 'form' ? (
                        <div>
                          テンプレートを使用してinput部分をエンドユーザーに入力してもらうためのフォームを生成できます。
                        </div>
                      ) : (
                        <div>
                          テンプレートを使用してinput部分の入力を確認してもらうためのビューワーを生成できます。
                          <br />
                          モバイルの場合にはiframeでのPDFの確認が行えず
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
                <div style={{ height: 800, background: 'rgb(74, 74, 74)' }} ref={formRef}></div>
              ) : (
                <div style={{ height: 800, background: 'rgb(74, 74, 74)' }} ref={viewerRef}></div>
              )}
              <div className="margin-vert--lg text--center">
                <button className="button button--lg button--primary" onClick={generatePDF}>
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col col--12 margin-vert--lg" style={{ textAlign: 'center' }}>
          <GiveMeStar />
        </div>
      </main>

      <HomepageHeader />
    </Layout>
  );
}
