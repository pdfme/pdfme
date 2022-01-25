import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Fast PDF Generator',
    description: (
      <>
        Works on node and browser. Use templates to generate PDF, Complex operations are not needed.
      </>
    ),
  },
  {
    title: 'Easy PDF template design',
    description: <>Anyone can easily create templates with the designer.</>,
  },
  {
    title: 'Simple JSON template',
    description: (
      <>Templates are JSON data that is easy to understand and handle.</>
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
