import React, { useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import HomepageFeatures from '../components/HomepageFeatures';
import HomepageHeader from '../components/HomepageHeader';
import Divider from '../components/Divider';
import Code from '../components/Code';
import GithubStar from '../components/GithubStar';
import type { Template } from '@pdfme/common';
import { getInputFromTemplate } from '@pdfme/common';
import type { Designer, Viewer, Form } from '@pdfme/ui';
import { getSampleTemplate, getGeneratorSampleCode } from '../libs/helper';

export default function Home(): JSX.Element {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const designer = useRef<Designer | null>(null);
  const viewer = useRef<Viewer | null>(null);
  const form = useRef<Form | null>(null);

  const [template, setTemplate] = useState<Template>(getSampleTemplate());
  const [mode, setMode] = useState<'viewer' | 'form'>('form');

  const onSaveTemplate = (t: Template) => {
    setTemplate(t);
    const inputData = getInputFromTemplate(t);
    form.current?.updateTemplate(t);
    form.current?.setInputs(inputData);
    viewer.current?.updateTemplate(t);
    viewer.current?.setInputs(inputData);
  };

  const initializeDesigner = async (domContainer: HTMLDivElement) => {
    const [{ Designer }, schemasModule] = await Promise.all([
      import('@pdfme/ui'),
      import('@pdfme/schemas'),
    ]);
    const { text, image, barcodes } = schemasModule;
    const plugins = { text, image, qrcode: barcodes.qrcode };

    const d = new Designer({
      domContainer,
      template,
      plugins,
    });

    d.onSaveTemplate(onSaveTemplate);
    d.onChangeTemplate(() => d.saveTemplate());
    return d;
  };

  const initializeUIComponent = async (
    domContainer: HTMLDivElement,
    componentType: 'Viewer' | 'Form',
    tmpl: Template
  ) => {
    const [uiModule, schemasModule] = await Promise.all([
      import('@pdfme/ui'),
      import('@pdfme/schemas'),
    ]);

    const { text, image, barcodes } = schemasModule;
    const { Viewer, Form } = uiModule;
    const plugins = { text, image, qrcode: barcodes.qrcode };
    const inputs = getInputFromTemplate(tmpl);

    if (componentType === 'Viewer') {
      const v = new Viewer({ domContainer, template: tmpl, plugins, inputs });
      return v;
    } else {
      const f = new Form({ domContainer, template: tmpl, plugins, inputs });
      f.onChangeInput(console.log);
      return f;
    }
  };

  const generatePDF = async () => {
    if (!form.current) return;
    const [{ text, image, barcodes }, { generate }] = await Promise.all([
      import('@pdfme/schemas'),
      import('@pdfme/generator'),
    ]);

    const pdf = await generate({
      template,
      plugins: { text, image, qrcode: barcodes.qrcode },
      inputs: form.current.getInputs(),
    });

    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  };

  useEffect(() => {
    if (designerRef.current) {
      initializeDesigner(designerRef.current).then((d) => {
        designer.current = d;
      });
    }
  }, [designerRef]);


  useEffect(() => {
    (async () => {
      if (viewerRef.current) {
        viewer.current = (await initializeUIComponent(viewerRef.current, 'Viewer', template)) as Viewer;
      }
      if (formRef.current) {
        form.current = (await initializeUIComponent(formRef.current, 'Form', template)) as Form;
      }
    })();
  }, [viewerRef, formRef, template, mode]);

  return (
    <Layout
      title="Free and Open source PDF generation library!"
      description="Free and Open source PDF generation library fully written in TypeScript, featuring a React-based UI template editor for efficient PDF creation."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <div className="container">
          <div className="row">
            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>

            <div className={'col col--6'}>
              <h2 id="template">
                PDF Generation Template
              </h2>
              <div className="card">
                <div className="card__image">
                  <img src={'/img/template.png'} alt="Image alt text" />
                </div>
                <div className="card__body">
                  <h3>A template is composed by a basePdf and a Schema</h3>
                  <small>
                    Templates are at the core of pdfme. In fact a template can be used with the
                    Generator, the Form, and the Viewer.
                  </small>
                </div>
                <div className="card__footer">
                  <Link
                    className="button button--lg button--primary button--block"
                    to="/docs/getting-started#template"
                  >
                    Learn more about PDF Generation Templates
                  </Link>
                </div>
              </div>
            </div>

            <div className={'col col--6'}>
              <h2 id="generate">
                PDF Generation
              </h2>
              <div style={{ maxHeight: 580, overflow: 'scroll' }}>
                <Code
                  code={getGeneratorSampleCode(getSampleTemplate())}
                  language="typescript"
                ></Code>
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
                  to="/docs/getting-started#generator"
                >
                  Learn more about PDF Generation
                </Link>
              </div>
            </div>

            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>

            <div className={'col col--12'}>
              <h2 id="designer">
                Designer
              </h2>
              <p>
                A template can be easily created using Designer (UI template editor). It supports
                shortcuts such as <code>Copy</code>, <code>Paste</code>, <code>Undo</code>,{' '}
                <code>Redo</code>, <code>Ruler</code>, and group selection.
              </p>
            </div>

            <div className={'col col--9'} style={{ padding: 0 }}>
              <div style={{ height: 700 }} ref={designerRef} />
            </div>
            <div className={'col col--3'}>
              <div style={{ height: 700, overflow: 'auto' }}>
                <Code code={JSON.stringify(template, null, 2).trim()} language="json" />
              </div>
            </div>

            <div className={'col col--12 margin-vert--lg'}>
              <div className="text--center">
                <p>It's easy to integrate with an external app.</p>
                <Link
                  className="button button--primary button--lg"
                  to="/docs/getting-started#designer"
                >
                  Learn more about the Designer
                </Link>
              </div>
            </div>

            <div className="col col--12 margin-vert--lg text--center">
              <Divider />
            </div>

            <div className={'col col--4'}>
              <h2 id="form-viewer">
                Form / Viewer
              </h2>
              <div>
                <div className="card">
                  <div className="card__image">
                    <img
                      loading="lazy"
                      src={mode === 'form' ? '/img/form.gif' : '/img/viewer.png'}
                      alt={`${mode === 'form' ? 'Form' : 'Viewer'} image`}
                    />
                  </div>
                  <div className="card__body">
                    <h3>
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
                    </h3>
                    <small>
                      {mode === 'form' ? (
                        <div>
                          Starting from a template you can generate a fillable form. Then you will
                          need a few seconds to generate a Pdf
                        </div>
                      ) : (
                        <div>
                          You can always check the filled content by using the Viewer.
                          <br />
                          Mobile browsers doesn't allow a user to view a PDF from an iframe, for
                          this reason the Viewer is the perfect solution for mobile users.
                        </div>
                      )}
                    </small>
                  </div>
                  <div className="card__footer">
                    <Link
                      className="button button--primary button--lg"
                      to={`/docs/getting-started#${mode}`}
                    >
                      Learn more about the {mode === 'form' ? 'Form' : 'Viewer'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className={'col col--8'}>
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

        <div className="col col--12 margin-vert--lg text--center">
          <h2>We are Open Source❤️</h2>
          <p>
            pdfme is an open source project and we love contributions.
            <br />
            We are always looking for contributors to help us improve our project.
          </p>

          <div className="margin-vert--lg">
            <h3 style={{ marginBottom: '20px' }}>Contributors</h3>
            <div>
              <a href="https://github.com/pdfme/pdfme/graphs/contributors">
                <img src="https://contrib.rocks/image?repo=pdfme/pdfme" />
              </a>
            </div>
          </div>

          <div className="margin-vert--lg">
            <h3>Support pdfme</h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <a href="https://github.com/sponsors/pdfme" target="_blank" style={{ margin: '20px' }}>
                <img alt="GitHub Sponsors" src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" width={190} />
              </a>
              <a href="https://opencollective.com/pdfme/donate" target="_blank" style={{ margin: '20px' }}>
                <img src="https://opencollective.com/webpack/donate/button@2x.png?color=blue" width={250} />
              </a>
            </div>
          </div>

          <GithubStar />
        </div>
      </main>
    </Layout >
  );
}
