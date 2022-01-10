const path = require('path');

module.exports = ({ config }) => {
  config.module.rules = config.module.rules.map((rule) => {
    if (
      String(rule.test) ===
      String(/\.(svg|ico|jpg|jpeg|png|apng|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/)
    ) {
      return {
        ...rule,
        // Remove ttf
        test: /\.(svg|ico|jpg|jpeg|png|apng|gif|eot|otf|webp|woff|woff2|cur|ani|pdf)(\?.*)?$/,
      };
    }

    return rule;
  });

  config.module.rules.push({
    test: /\.ttf$/,
    use: 'url-loader',
    include: path.resolve(__dirname, '../'),
  });

  config.module.rules.push({
    test: /\.module\.scss$/,
    use: [
      'style-loader',
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

  return config;
};
