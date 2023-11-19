// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'getting-started',
    'supported-features',
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
    'tables',
    'development-guide',
  ],
};

module.exports = sidebars;
