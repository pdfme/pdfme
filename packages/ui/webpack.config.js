const path = require('path');
const webpack = require('webpack');
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
    extensions: ['.ts', '.tsx', '.js'],
    alias: { process: 'process/browser' },
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.ProvidePlugin({ process: 'process/browser' }),
    new webpack.BannerPlugin({ banner: BANNER, entryOnly: true }),
  ],
  devtool: 'source-map',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    globalObject: 'this',
    library: { type: 'umd' },
  },
  module: { rules: [{ test: /\.tsx?$/, use: 'ts-loader' }] },
};
module.exports = config;
