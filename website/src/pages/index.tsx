import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import GitHubButton from 'react-github-btn';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, { translate } from '@docusaurus/Translate';


export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={translate({
        id: 'homepage.title',
        message: 'Free and Open source PDF generation library!'
      })}
      description={translate({
        id: 'homepage.description',
        message: 'Free and Open source PDF generation library fully written in TypeScript, featuring a React-based UI template editor for efficient PDF creation.'
      })}
    >
      <header className={"hero hero--primary"}>
        <div className="container">
          <div className="row" style={{ alignItems: 'center', flexDirection: 'row-reverse' }}>
            <div className="col col--6" style={{ textAlign: 'center' }}>
              <img src="/img/logo.svg" alt="logo" width={300} className={''} />
            </div>
            <div className="col col--6">
              <h1 className="hero__title">
                {siteConfig.title}: {translate({
                  id: "homepage.hero.title",
                  message: "Free and Open source PDF generation library!"
                })}
              </h1>
              <p className="hero__subtitle">
                {translate({
                  id: "homepage.hero.subtitle",
                  message: "A powerful PDF generation library fully written in TypeScript, featuring a React-based UI template editor for seamless PDF creation*."
                })}
                <br />
                {translate({
                  id: "homepage.hero.subtitle.part2",
                  message: "Open source, community-driven, and completely free for PDF generation under the MIT license!"
                })}
              </p>
              <strong>
                {translate({
                  id: "homepage.hero.note",
                  message: "* The PDF generation library and the UI editor can be used separately."
                })}
              </strong>
            </div>
          </div>
          <div className="row row--no-gutters" style={{ alignItems: 'center' }}>
            <div className="col col--3" style={{ marginTop: '1rem' }}>
              <Link className="button button--lg button--success " to="/docs/getting-started">
                {translate({
                  id: "homepage.buttons.documentation",
                  message: "Documentation"
                })}
              </Link>
            </div>
            <div className="col col--3" style={{ marginTop: '1rem' }}>
              <a
                className="button button--lg button--info "
                href="https://playground.pdfme.com"
                target={'_blank'}
              >
                {translate({
                  id: "homepage.buttons.playground",
                  message: "Playground"
                })}
              </a>
            </div>
            <div className="col col--6" />
          </div>
        </div>
      </header>
      <main>
        <div className="container">
          <div className='padding-vert--lg'>
            <div className="col col--12 margin-vert--lg text--center">
              <h2 className="margin-top--lg">
                {translate({
                  id: "homepage.main.heading",
                  message: "Simple. Yet a powerful PDF generation library."
                })}
              </h2>
              <p>
                {translate({
                  id: "homepage.main.description.part1",
                  message: "pdfme provides PDF generation, forms, and a viewer centered on JSON templates."
                })}
                <br />
                {translate({
                  id: "homepage.main.description.part2",
                  message: "Additionally, templates can be easily created using the designer."
                })}
              </p>
            </div>
            <div className="row margin-vert--lg">
              {[
                {
                  id: 'template',
                  header: translate({
                    id: 'homepage.cards.template.header',
                    message: 'PDF Generation Template'
                  }),
                  image: { src: '/img/template.png', alt: translate({
                    id: 'homepage.cards.template.image.alt',
                    message: 'Template image'
                  }) },
                  body: {
                    title: translate({
                      id: 'homepage.cards.template.body.title',
                      message: 'A template is composed by a basePdf and a Schema'
                    }),
                    description: translate({
                      id: 'homepage.cards.template.body.description',
                      message: 'Templates are at the core of pdfme. In fact a template can be used with the Generator, the Form, and the Viewer.'
                    }),
                  },
                  link: {
                    to: '/docs/getting-started#template',
                    text: translate({
                      id: 'homepage.cards.template.link.text',
                      message: 'Learn more about PDF Generation Templates'
                    }),
                  },
                },
                {
                  id: 'designer',
                  header: translate({
                    id: 'homepage.cards.designer.header',
                    message: 'Template Designer'
                  }),
                  image: { src: '/img/designer.png', alt: translate({
                    id: 'homepage.cards.designer.image.alt',
                    message: 'Designer image'
                  }) },
                  body: {
                    title: translate({
                      id: 'homepage.cards.designer.body.title',
                      message: 'Easily create templates with a WYSIWYG editor'
                    }),
                    description: translate({
                      id: 'homepage.cards.designer.body.description',
                      message: 'The Designer can be integrated into your application. It is written in vanilla JavaScript, making integration effortless regardless of the framework.'
                    })
                  },
                  link: {
                    to: '/docs/getting-started#designer',
                    text: translate({
                      id: 'homepage.cards.designer.link.text',
                      message: 'Learn more about the Designer'
                    }),
                  },
                },
                {
                  id: 'generate',
                  header: translate({
                    id: 'homepage.cards.generate.header',
                    message: 'PDF Generation'
                  }),
                  image: { src: '/img/generator.png', alt: translate({
                    id: 'homepage.cards.generate.image.alt',
                    message: 'Generator image'
                  }) },
                  body: {
                    title: translate({
                      id: 'homepage.cards.generate.body.title',
                      message: 'High-performance PDF generation'
                    }),
                    description: translate({
                      id: 'homepage.cards.generate.body.description',
                      message: 'Most PDF generations complete within tens to hundreds of milliseconds. The Generator provides a simple interface that accepts a template and input data, making it very easy to use.'
                    }),
                  },
                  link: {
                    to: '/docs/getting-started#generator',
                    text: translate({
                      id: 'homepage.cards.generate.link.text',
                      message: 'Learn more about PDF Generation'
                    }),
                  },
                },
                {
                  id: 'form',
                  header: translate({
                    id: 'homepage.cards.form.header',
                    message: 'Data collection with Form'
                  }),
                  image: { src: '/img/form.png', alt: translate({
                    id: 'homepage.cards.form.image.alt',
                    message: 'Form image'
                  }) },
                  body: {
                    title: translate({
                      id: 'homepage.cards.form.body.title',
                      message: 'Create forms using templates'
                    }),
                    description: translate({
                      id: 'homepage.cards.form.body.description',
                      message: 'You can create forms that allow for easy input of template variables. When generating a PDF, the form\'s input values are used to create the document.'
                    })
                  },
                  link: {
                    to: '/docs/getting-started#form',
                    text: translate({
                      id: 'homepage.cards.form.link.text',
                      message: 'Learn more about Form'
                    }),
                  },
                },
              ]
                .map((card) => (
                  <div key={card.id} className="col col--6 margin-vert--md">
                    <div className="card">
                      <div className="card__header">
                        <h2 id={card.id}>{card.header}</h2>
                      </div>
                      <div className="card__image">
                        <img src={card.image.src} alt={card.image.alt} />
                      </div>
                      <div className="card__body">
                        <h3>{card.body.title}</h3>
                        <small>{card.body.description}</small>
                      </div>
                      <div className="card__footer">
                        <Link
                          className="button button--lg button--primary button--block"
                          to={card.link.to}
                        >
                          {card.link.text}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="padding-vert--lg col col--12 margin-vert--lg text--center">
            <div>
              <h2 className='margin-top--lg'>
                {translate({
                  id: "homepage.opensource.heading",
                  message: "We are Open Source❤️"
                })}
              </h2>
              <p>
                {translate({
                  id: "homepage.opensource.description.part1",
                  message: "pdfme is an open source project and we love contributions."
                })}
                <br />
                {translate({
                  id: "homepage.opensource.description.part2",
                  message: "We are always looking for contributors to help us improve our project."
                })}
              </p>
            </div>

            <div className="margin-vert--lg">
              <h3 style={{ marginBottom: '20px' }}>
                {translate({
                  id: "homepage.contributors.heading",
                  message: "Contributors"
                })}
              </h3>
              <div>
                <a href="https://github.com/pdfme/pdfme/graphs/contributors">
                  <img src="https://contrib.rocks/image?repo=pdfme/pdfme" />
                </a>
              </div>
            </div>

            <div className="margin-vert--lg">
              <h3>
                {translate({
                  id: "homepage.support.heading",
                  message: "Support pdfme"
                })}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <a href="https://github.com/sponsors/pdfme" target="_blank" style={{ margin: '20px' }}>
                  <img alt="GitHub Sponsors" src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" width={190} />
                </a>
                <a href="https://opencollective.com/pdfme/donate" target="_blank" style={{ margin: '20px' }}>
                  <img src="https://opencollective.com/webpack/donate/button@2x.png?color=blue" width={250} />
                </a>
              </div>
            </div>

            <div className="col col--12 margin-vert--lg padding-vert--lg text--center">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 'fit-content' }}>
                  <div style={{ display: 'flex', maxWidth: 350 }}>
                    <img src={'/img/please-star.png'} alt="pleaseStar" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', margin: '0.8rem', }}>
                    <a
                      style={{ display: 'flex', alignItems: 'center', fontSize: '10pt', }}
                      href="https://github.com/pdfme/pdfme"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src={'/img/github-icon.svg'} alt="github" width={25} />
                      <span style={{ marginLeft: '0.5rem' }}>https://github.com/pdfme/pdfme</span>
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', }}                      >
                      <div style={{ marginLeft: '0.5rem' }}>
                        <GitHubButton
                          href="https://github.com/pdfme/pdfme"
                          data-size="large"
                          data-icon="octicon-star"
                          data-show-count={true}
                          aria-label="Star pdfme on GitHub"
                        >
                          Star
                        </GitHubButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout >
  );
}
