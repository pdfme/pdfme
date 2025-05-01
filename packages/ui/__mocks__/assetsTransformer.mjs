import path from 'path';

export default {
  process(src, filename, config, options) {
    return { code: 'export default ' + JSON.stringify(path.basename(filename)) + ';' };
  },
};
