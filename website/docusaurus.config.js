// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'pdfme',
  url: 'https://pdfme.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'favicon.ico',
  organizationName: 'pdfme',
  projectName: 'pdfme',
  deploymentBranch: 'website',
  trailingSlash: false,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ja'],
    localeConfigs: {
      en: {
        label: 'English',
        direction: 'ltr',
      },
      ja: {
        label: '日本語',
        direction: 'ltr',
      },
    },
  },
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/pdfme/pdfme/tree/main/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        gtag: {
          trackingID: 'G-1Z2MZW44WP',
        },
      },
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: '/docs/tables',
            from: '/docs/guides/tables',
          },
          {
            to: '/docs/custom-fonts',
            from: '/docs/guides/custom-fonts',
          },
          {
            to: '/docs/development-guide',
            from: '/development-guide',
          },
          {
            to: '/templates',
            from: '/demo'
          },
          {
            to: '/templates',
            from: '/demo/address-label-maker'
          },
          {
            to: '/templates',
            from: '/demo/barcode-qrcode-generator'
          },
          {
            to: '/templates',
            from: '/demo/free-invoice-generator'
          },
          {
            to: '/templates',
            from: '/demo/online-certificate-maker'
          }
        ],
      },
    ]
  ],
  themeConfig:
  /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
  {
    announcementBar: {
      id: 'support_us',
      content: `⭐️  &nbsp; If you like pdfme, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/pdfme/pdfme">GitHub</a>! &nbsp; ⭐️`,
    },
    image: 'img/ogimage.png',
    docs: {
      sidebar: {
        hideable: false,
      },
    },
    hideOnScroll: true,
    navbar: {
      title: 'pdfme',
      items: [
        {
          type: 'doc',
          docId: 'getting-started',
          position: 'right',
          label: 'Docs',
        },
        {
          to: '/templates',
          position: 'right',
          label: 'Examples',
        },
        {
          to: '/template-design',
          position: 'right',
          label: 'Template Design',
        },
        {
          href: 'https://github.com/pdfme/pdfme',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://discord.gg/xWPTJbmgNV',
          label: 'Discord',
          position: 'right',
        },
        {
          href: 'https://app.pdfme.com?utm_source=website&utm_content=navbar',
          label: 'Try pdfme Cloud',
          position: 'right',
        },
        {
          href: 'https://app.pdfme.com/contact?utm_source=website&utm_content=navbar',
          label: 'Contact',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        }
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Supported Features',
              to: '/docs/supported-features',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Examples',
              to: '/templates',
            },
            {
              label: 'Template Design',
              to: '/template-design',
            },
            {
              label: 'Try pdfme Cloud',
              href: 'https://app.pdfme.com?utm_source=website&utm_content=footer',
            }
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Github',
              href: 'https://github.com/pdfme/pdfme',
            },
            {
              label: 'Discord',
              href: 'https://discord.gg/xWPTJbmgNV',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} pdfme`,
    },
    algolia: {
      appId: 'V6YWG1D4SV',
      apiKey: '873346e96f9110d660c39fd1edd7eb17',
      indexName: 'pdfme',
    },
  },
  scripts: [
    {
      src: 'https://media.ethicalads.io/media/client/ethicalads.min.js',
      async: true,
    },
  ],
};

module.exports = config;
