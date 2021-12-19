const fs = require("fs");

const tgt = __dirname + "/" + process.argv[2];
const ttf = fs.readFileSync(tgt + ".ttf");
const base64 = Buffer.from(ttf).toString("base64");
fs.writeFileSync(tgt + ".ts", `export default "${base64}";`);
