const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const pkg = require('./package.json');
const isProduction = process.env.NODE_ENV === 'production';
const FILENAME = pkg.name + (isProduction ? '.min' : '');

const BANNER = [
  'pdfme',
  '@version ' + pkg.version + ' | ' + new Date().toDateString(),
  '@author ' + pkg.author,
  '@license ' + pkg.license,
].join('\n');

const config = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.scss', '.css', '.png', '.svg'],
    fallback: { buffer: require.resolve('buffer/') },
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
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
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'pdfme.js',
    library: {
      name: 'pdfme',
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
        test: /\.(png|jpg|svg|gif|ttf)$/i,
        use: ['url-loader'],
      },
      {
        test: /\.module\.scss$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              modules: {
                namedExport: true,
              },
            },
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
module.exports = config;
