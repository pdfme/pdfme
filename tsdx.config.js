const postcss = require('rollup-plugin-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
// const url = require('@rollup/plugin-url');
const svgr = require('@svgr/rollup').default;
const image = require('@rollup/plugin-image');

module.exports = {
  rollup(config, options) {
    config.plugins.push(
      // url(),
      image({ dom: true }),
      svgr(),
      postcss({
        plugins: [
          autoprefixer(),
          cssnano({
            preset: 'default',
          }),
        ],
        inject: true,
        // only write out CSS for the first bundle (avoids pointless extra files):
        extract: !!options.writeMeta,
        modules: true,
        use: ['sass'],
      })
    );
    return config;
  },
};