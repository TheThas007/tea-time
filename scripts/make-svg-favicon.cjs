const fs = require("fs");
const path = require("path");

const iconBuf = fs.readFileSync(path.resolve(__dirname, "../public/favicon.png"));
const base64 = iconBuf.toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${base64}" width="512" height="512" />
</svg>`;

fs.writeFileSync(path.resolve(__dirname, "../public/favicon.svg"), svg);
console.log("Created public/favicon.svg (" + svg.length + " bytes)");

