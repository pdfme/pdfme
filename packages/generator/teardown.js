const path = require('path');
const { readdir, unlink } = require('fs');

module.exports = async () => {
  const dir = path.join(__dirname, '__tests__/assets/pdfs/tmp');
  const unLinkFile = (file) => {
    if (file !== '.gitkeep') {
      unlink(`${dir}/${file}`, (e) => {
        if (e) {
          throw e;
        }
      });
    }
  };
  readdir(dir, (err, files) => {
    if (err) {
      throw err;
    }
    files.forEach(unLinkFile);
  });
};