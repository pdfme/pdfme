// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const path = require('path');
const webpack = require('webpack');
const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

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
  trailingSlash: false,
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
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
      }),
    ],
  ],
  plugins: [
    function myPlugin() {
      return {
        name: 'custom-docusaurus-plugin',
        configureWebpack() {
          const newConfig = {
            plugins: [
              new webpack.IgnorePlugin({
                resourceRegExp: /canvas/,
              }),
              new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser',
              }),
            ],
          };
          return newConfig;
        },
      };
    },
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
        hideable: true,
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
          to: '/demo',
          position: 'right',
          label: 'Demo Apps',
        },
        {
          to: '/template-design',
          position: 'right',
          label: 'Template Design',
        },
        {
          to: '/docs/development-guide',
          position: 'right',
          label: 'Development Guide',
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
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Demo Apps',
              to: '/demo',
            },
            {
              label: 'Template Design',
              to: '/template-design',
            },
            {
              label: 'Development Guide',
              to: '/docs/development-guide',
            },
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
    prism: {
      theme: lightCodeTheme,
      darkTheme: darkCodeTheme,
    },
    algolia: {
      appId: 'V6YWG1D4SV',
      apiKey: '873346e96f9110d660c39fd1edd7eb17',
      indexName: 'pdfme',
    },
  },
};

module.exports = config;
