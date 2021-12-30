const fs = require('fs');
const path = require('path');

const font = fs.readFileSync(path.join(__dirname, `src/assets/Helvetica.ttf`), {
  encoding: 'base64url',
});

module.exports = font;
