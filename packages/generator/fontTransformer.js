const fs = require('fs');
const path = require('path');

const font = fs.readFileSync(path.join(__dirname, `../common/src/assets/Helvetica.ttf`), {
  encoding: 'base64',
});

module.exports = font;
