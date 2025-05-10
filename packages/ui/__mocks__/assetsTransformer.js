import path from 'path';

export function process(src, filename) {
  return 'export default ' + JSON.stringify(path.basename(filename)) + ';';
}
