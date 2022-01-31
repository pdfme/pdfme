const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
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
    extensions: ['.ts', '.tsx', '.js', '.png', '.svg'],
    alias: { process: 'process/browser' },
  },
  plugins: [
    new BundleAnalyzerPlugin(),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.BannerPlugin({
      banner: BANNER,
      entryOnly: true,
    }),
    new HtmlWebpackPlugin({
      template: './public/Designer.html',
      filename: 'Designer.html',
    }),
    new HtmlWebpackPlugin({
      template: './public/Viewer.html',
      filename: 'Viewer.html',
    }),
    new HtmlWebpackPlugin({
      template: './public/Form.html',
      filename: 'Form.html',
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
    filename: `${pkg.name}.js`,
    library: {
      name: pkg.name,
      type: 'umd',
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
      },
      {
        test: /\.(png|svg|ttf)$/i,
        use: ['url-loader'],
      },
    ],
  },
};
module.exports = config;
