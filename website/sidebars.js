/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Guides',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'doc',
          label: 'Custom Fonts',
          id: 'guides/custom-fonts',
        },
        {
          type: 'doc',
          label: 'Tables with Dynamic Data',
          id: 'guides/tables',
        },
      ],
    },
    {
      type: 'category',
      label: 'API',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: '@pdfme/common',
          link: { type: 'doc', id: 'api/common/index' },
          items: ['api/common/index'],
        },
        {
          type: 'category',
          label: '@pdfme/generator',
          link: { type: 'doc', id: 'api/generator/index' },
          items: ['api/generator/index'],
        },
        {
          type: 'category',
          label: '@pdfme/ui',
          link: { type: 'doc', id: 'api/ui/index' },
          items: [
            'api/ui/index',
            'api/ui/classes/Designer',
            'api/ui/classes/Form',
            'api/ui/classes/Viewer',
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;
