const { merge } = require('@pdfme/manipulator');
const fs = require('fs');
const path = require('path');

const aPdf = fs.readFileSync(path.join(__dirname, 'a.pdf'));
const bPdf = fs.readFileSync(path.join(__dirname, 'b.pdf'));

merge([aPdf, bPdf]).then((pdf) => {
  console.log(pdf);
  fs.writeFileSync(path.join(__dirname, `test-merge.pdf`), pdf);
});