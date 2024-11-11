// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'getting-started',
    'supported-features',
    'tables',
    'expression',
    'headers-and-footers',
    {
      type: 'category',
      collapsed: false,
      label: 'Customization',
      items: [
        'custom-fonts',
        'custom-ui',
        'custom-schemas',
      ],
    },
    'development-guide',
  ],
};

module.exports = sidebars;
