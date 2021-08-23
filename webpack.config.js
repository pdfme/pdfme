const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const postcssPrefixer = require('postcss-prefixer');
const pkg = require('./package.json');
const isProduction = process.env.NODE_ENV === 'production';
const FILENAME = pkg.name + (isProduction ? '.min' : '');

const isDevServer = process.env.DEV_SERVER === 'true';

const BANNER = [
    'labelmake editor',
    '@version ' + pkg.version + ' | ' + new Date().toDateString(),
    '@author ' + pkg.author,
    '@license ' + pkg.license
].join('\n');

const config = {
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.scss', '.css'], // '.js'を追加する。
    },
    plugins: [
        new StyleLintPlugin(),
        new webpack.BannerPlugin({
            banner: BANNER,
            entryOnly: true
        }),
        new MiniCssExtractPlugin({
            filename: `${FILENAME}.css`
        }),
        new HtmlWebpackPlugin({
            template: './public/index.html'
        })
    ],
    devtool: 'source-map',
    devServer: {
        historyApiFallback: false,
        host: '0.0.0.0',
    },
    entry: './src/index.tsx',
    output: {
        library: 'LabelmakeEditor',
        libraryTarget: 'umd',          // ライブラリターゲットの設定
        libraryExport: 'default',     // エントリーポイントのdefaultexportをネームスペースに設定するオプション
        path: path.join(__dirname, 'dist'),
        filename: FILENAME + '.js'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader'
            },
            {
                test: /\.(png|jpg|svg|gif)$/i,
                use: [
                    {
                        loader: 'url-loader',
                    },
                ],
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            esModule: true,
                            // modules: {
                            //     namedExport: true,
                            // },
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: true,
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            },
            {
                test: /\.(gif|png|jpe?g)$/,
                use: 'url-loader'
            }
        ]
    },
};
module.exports = config;