module.exports = ({ config }) => {
  config.module.rules.push({
    test: /\.module\.scss$/,
    use: [
      { loader: 'style-loader' },
      {
        loader: 'css-loader',
        options: { esModule: true, modules: { namedExport: true } },
      },
      'sass-loader',
    ],
  });

  config.module.rules.push({
    test: /\.scss$/,
    exclude: /\.module\.scss$/,
    use: ['style-loader', 'css-loader', 'sass-loader'],
  });

  config.module.rules.push({
    test: /\.ttf$/,
    use: ['file-loader'],
  });

  return config;
};
