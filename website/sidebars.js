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
    {
      type: 'category',
      collapsed: true,
      label: 'Tools(New)',
      items: [
        'converter',
        'manipulator',
        'optimizer',
      ],
    },
    'development-guide',
    'template-contribution-guide',
  ],
};

module.exports = sidebars;
