const fs = require("fs");
const path = require("path");

const publicDir = path.resolve(__dirname, "../public");
const sizes = [16, 32, 48];
const pngBuffers = sizes.map((s) =>
  fs.readFileSync(path.join(publicDir, "favicon-" + s + "x" + s + ".png"))
);

// ICO Header: 6 bytes
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // ICO type
header.writeUInt16LE(sizes.length, 4); // Number of images

// Directory: 16 bytes per image
const dirLength = 16 * sizes.length;
let currentOffset = 6 + dirLength;

const dirEntries = [];
for (let i = 0; i < sizes.length; i++) {
  const size = sizes[i];
  const pngBuf = pngBuffers[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
  entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
  entry.writeUInt8(0, 2); // Palette
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8); // Image size
  entry.writeUInt32LE(currentOffset, 12); // Image offset
  dirEntries.push(entry);
  currentOffset += pngBuf.length;
}

const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
console.log("Successfully wrote multi-size favicon.ico (" + icoBuffer.length + " bytes)!");
