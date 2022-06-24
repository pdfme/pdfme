const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const pkg = require('./package.json');

const isProduction = process.env.NODE_ENV === 'production';

const BANNER = [
  '@name ' + pkg.name,
  '@version ' + pkg.version + ' | ' + new Date().toDateString(),
  '@author ' + pkg.author,
  '@license ' + pkg.license,
].join('\n');

const config = {
  optimization: { minimize: isProduction },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new webpack.ProvidePlugin({
      atob: 'atob/node-atob.js',
    }),
    // new BundleAnalyzerPlugin(),
    new NodePolyfillPlugin(),
    new webpack.BannerPlugin({
      banner: BANNER,
      entryOnly: true,
    }),
  ],
  devtool: 'source-map',
  devServer: {
    historyApiFallback: false,
    host: '0.0.0.0',
  },
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    globalObject: 'this',
    library: {
      type: 'umd',
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
      {
        test: /\.(ttf)$/i,
        use: ['url-loader'],
      },
    ],
  },
};
module.exports = config;
