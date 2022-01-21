import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

// TODO 読む気が失せる　もっと短くする

const FeatureList: FeatureItem[] = [
  {
    title: 'Simple JSON template',
    description: (
      <>
        {/* テンプレートとは、Base PDFとしてPDFを背景に設置し、その上にスキーマを配置したJSONオブジェクトです。
        スキーマにはテキストや画像やバーコードなどのタイプを用意しています。 */}
        {/* TODO  template はAPIドキュメントか、トップページのリンクにする*/}A template is a JSON
        object with a PDF placed in the background as Base PDF, and a schema placed on top of it.
        The schema can be text, image, barcode, or other types.
      </>
    ),
  },
  {
    title: 'PDF Generator',
    description: (
      <>
        {/* nodeとブラウザの上で動きます。 テンプレートを使ってPDFを作成するため複雑な操作は不要。
        template,inputのたった2つの引数とgenerate関数の呼び出しの1行で、複雑なPDFでも作成することができます。 */}
        {/* TODO  generate はトップページのセクションのリンクにする*/}
        Works on node and browser. Use templates to generate PDF, Complex operations are not needed.
        With only two arguments, template and input, and one line call to generate, even complex
        PDFs can be created.
      </>
    ),
  },
  {
    title: 'Design, Form, Preview',
    description: (
      <>
        {/* デザイナーで誰でも簡単にテンプレートが作成できます。
        テンプレートはPDF作成だけでなく、フォームやビューワーにも活用することができます。 */}
        {/* TODO  designer, forms, viewers は各セクションのリンクにする*/}
        Anyone can easily create templates with the designer. Templates can be used not only for PDF
        generation, it can also be used for forms and viewers.
      </>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--12')}>
            <h2>
              <a aria-hidden="true" className="anchor enhancedAnchor" id="features"></a>
              Features
              <a className="hash-link" href="#features" title="Direct link to heading"></a>
            </h2>
          </div>

          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
