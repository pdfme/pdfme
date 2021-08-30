const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const pkg = require('./package.json');
const isProduction = process.env.NODE_ENV === 'production';
const FILENAME = pkg.name + (isProduction ? '.min' : '');

const BANNER = [
    'labelmake editor',
    '@version ' + pkg.version + ' | ' + new Date().toDateString(),
    '@author ' + pkg.author,
    '@license ' + pkg.license
].join('\n');

const config = {
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.scss', '.css', '.png', '.svg'],
    },
    plugins: [
        new BundleAnalyzerPlugin(),
        new StyleLintPlugin(),
        new webpack.BannerPlugin({
            banner: BANNER,
            entryOnly: true
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
        libraryTarget: 'umd',
        libraryExport: 'default',
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
                        }
                    },
                    {
                        loader: "sass-loader",
                    },
                ],
            },
            {
                test: /\.scss$/,
                exclude: /\.module\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ]
    },
};
module.exports = config;