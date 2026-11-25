/*
 * Extracts every file from a C64 .d64 disk image (1541, 35 tracks) and writes
 * a directory.json listing. Files are named <name>.<type> (SID SYNTH.prg), or
 * just <name> when it has its own extension (PRESETS1.SLO).
 *   node tools/extract_d64.js IMAGE.D64 OUT_DIR
 */
const fs = require('fs');
const path = require('path');

const imagePath = process.argv[2];
const outDir = process.argv[3];
if (!imagePath || !outDir) throw new Error('usage: node extract_d64.js IMAGE.D64 OUT_DIR');

const image = fs.readFileSync(imagePath);
const sectorsPerTrack = track => track <= 17 ? 21 : track <= 24 ? 19 : track <= 30 ? 18 : 17;
function sectorOffset(track, sector) {
  if (track < 1 || track > 35 || sector < 0 || sector >= sectorsPerTrack(track)) {
    throw new Error(`invalid track/sector ${track}/${sector}`);
  }
  let sectors = 0;
  for (let t = 1; t < track; t++) sectors += sectorsPerTrack(t);
  return (sectors + sector) * 256;
}
function readSector(track, sector) {
  const offset = sectorOffset(track, sector);
  return image.subarray(offset, offset + 256);
}
function petsciiName(bytes) {
  const end = bytes.findIndex(value => value === 0xa0 || value === 0x00);
  return Buffer.from(end < 0 ? bytes : bytes.subarray(0, end))
    .toString('latin1')
    .replace(/[^A-Za-z0-9 _.-]/g, '_')
    .trim();
}
function readFile(track, sector) {
  const chunks = [];
  const seen = new Set();
  while (track) {
    const key = `${track}/${sector}`;
    if (seen.has(key)) throw new Error(`cyclic file chain at ${key}`);
    seen.add(key);
    const block = readSector(track, sector);
    const nextTrack = block[0];
    const nextSector = block[1];
    const dataLength = nextTrack === 0 ? Math.max(0, nextSector - 1) : 254;
    chunks.push(block.subarray(2, 2 + dataLength));
    track = nextTrack;
    sector = nextSector;
  }
  return Buffer.concat(chunks);
}

const types = ['DEL', 'SEQ', 'PRG', 'USR', 'REL'];
const entries = [];
let directoryTrack = 18;
let directorySector = 1;
const seenDirectory = new Set();
while (directoryTrack) {
  const key = `${directoryTrack}/${directorySector}`;
  if (seenDirectory.has(key)) throw new Error(`cyclic directory chain at ${key}`);
  seenDirectory.add(key);
  const block = readSector(directoryTrack, directorySector);
  for (let i = 0; i < 8; i++) {
    const offset = 2 + i * 32;
    const rawType = block[offset];
    if ((rawType & 0x07) === 0) continue;
    const name = petsciiName(block.subarray(offset + 3, offset + 19));
    const type = types[rawType & 0x07] || `TYPE${rawType & 0x07}`;
    const track = block[offset + 1];
    const sector = block[offset + 2];
    const sectors = block.readUInt16LE(offset + 30);
    entries.push({name, type, track, sector, sectors, locked:!!(rawType & 0x40), closed:!!(rawType & 0x80)});
  }
  directoryTrack = block[0];
  directorySector = block[1];
}

fs.mkdirSync(outDir, {recursive:true});
for (const entry of entries) {
  const data = readFile(entry.track, entry.sector);
  entry.bytes = data.length;
  const safeName = entry.name || `unnamed_${entry.track}_${entry.sector}`;
  // Names that carry their own extension (PRESETS1.SLO) keep it as is.
  const outputName = /\.[A-Za-z0-9]{1,3}$/.test(safeName) ? safeName : `${safeName}.${entry.type.toLowerCase()}`;
  fs.writeFileSync(path.join(outDir, outputName), data);
}
fs.writeFileSync(path.join(outDir, 'directory.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(JSON.stringify(entries, null, 2));
