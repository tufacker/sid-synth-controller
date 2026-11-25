/*
 * SID SYNTH user-bank files (Node for Max helper, run by node.script).
 *
 * User banks are native C64 SID SYNTH .SLO files (2378 bytes: load address
 * 00 C0, 54 x 35-byte sound records, 54 x 9-byte names) kept in one folder in
 * the user's Live User Library, beside the presets of other Max MIDI effects:
 *   <User Library>/Presets/MIDI Effects/Max MIDI Effect/SID SYNTH Banks/
 * Moving them to and from the C64 is left to the user. This helper only lists,
 * reads, writes and creates them, and opens the folder in Finder (or
 * Explorer); it never deletes anything.
 *
 * Messages in:  list | read NAME | write NAME HEX | create NAME HEX | openbanks
 * Messages out: banks NAME... | bankdata NAME HEX | banksaved NAME |
 *               bankcreated NAME | folderopened PATH | bankerror TEXT
 * NAME is the file name without its .SLO extension. Bank data travels as one
 * hex string so it stays a single Max atom.
 */
const maxApi = require('max-api');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BANK_FOLDER = ['Presets', 'MIDI Effects', 'Max MIDI Effect', 'SID SYNTH Banks'];

// The User Library is wherever Live's Preferences > Library points. Each installed
// Live version records it in its own Library.cfg (macOS:
// ~/Library/Preferences/Ableton/Live x.y.z/Library.cfg, Windows:
// %APPDATA%\Ableton\Live x.y.z\Preferences\Library.cfg); the newest version wins.
// Without one, or if it points at a folder that is not there (an unplugged drive),
// Live's default location is used.
function defaultUserLibrary() {
  const parent = process.platform === 'win32' ? 'Documents' : 'Music';
  return path.join(os.homedir(), parent, 'Ableton', 'User Library');
}

function liveVersion(folder) {
  const match = /^Live (\d+)\.(\d+)(?:\.(\d+))?/.exec(folder);
  return match ? match.slice(1).map(n => Number(n) || 0) : null;
}

function xmlValue(xml, tag) {
  const match = new RegExp(`<${tag}\\s+Value="([^"]*)"`).exec(xml);
  if (!match) return null;
  return match[1].replace(/&#(\d+);/g, (all, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function configuredUserLibrary() {
  const prefs = process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Ableton')
    : path.join(os.homedir(), 'Library', 'Preferences', 'Ableton');
  let versions;
  try {
    versions = fs.readdirSync(prefs).map(name => ({name, version: liveVersion(name)})).filter(v => v.version);
  } catch (error) { return null; }
  versions.sort((a, b) => b.version[0] - a.version[0] || b.version[1] - a.version[1] || b.version[2] - a.version[2]);
  for (const {name} of versions) {
    for (const cfg of [path.join(prefs, name, 'Library.cfg'), path.join(prefs, name, 'Preferences', 'Library.cfg')]) {
      let xml;
      try { xml = fs.readFileSync(cfg, 'utf8'); } catch (error) { continue; }
      const section = /<UserLibrary>([\s\S]*?)<\/UserLibrary>/.exec(xml);
      const parent = section && xmlValue(section[1], 'ProjectPath');
      const folder = section && xmlValue(section[1], 'ProjectName');
      if (!parent || !folder) continue;
      const library = path.join(parent, folder);
      try { if (fs.statSync(library).isDirectory()) return library; } catch (error) { /* not there */ }
    }
  }
  return null;
}

const DIR = path.join(configuredUserLibrary() || defaultUserLibrary(), ...BANK_FOLDER);
const BANK_BYTES = 2378;

function ensureDir() { fs.mkdirSync(DIR, { recursive: true }); }

function isBank(file) {
  if (!/\.slo$/i.test(file)) return false;
  try {
    const st = fs.statSync(path.join(DIR, file));
    return st.isFile() && st.size === BANK_BYTES;
  } catch (error) { return false; }
}

// name (no extension, case-insensitive) -> actual file name
function bankFiles() {
  ensureDir();
  return fs.readdirSync(DIR).filter(isBank)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
function bankName(file) { return file.replace(/\.slo$/i, ''); }
function fileFor(name) {
  const key = String(name).toUpperCase();
  return bankFiles().find(file => bankName(file).toUpperCase() === key) || null;
}

function cleanName(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9 _-]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 12).trim();
}

function hexToBuffer(hex) {
  hex = String(hex || '');
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length !== BANK_BYTES * 2) return null;
  const buffer = Buffer.from(hex, 'hex');
  return buffer[0] === 0x00 && buffer[1] === 0xc0 ? buffer : null;
}

// Write to a temporary file first so a failed write never leaves half a bank.
function writeBank(file, buffer) {
  const target = path.join(DIR, file);
  const temp = path.join(DIR, `.${file}.saving`);
  fs.writeFileSync(temp, buffer);
  fs.renameSync(temp, target);
}

async function list() {
  await maxApi.outlet('banks', ...bankFiles().map(bankName));
}

async function fail(text, error) {
  if (error) maxApi.post(`sid_banks: ${text}: ${error.message}`);
  await maxApi.outlet('bankerror', text);
}

maxApi.addHandlers({
  list: async () => {
    try { await list(); } catch (error) { await fail('Bank folder unavailable', error); }
  },
  read: async (name) => {
    try {
      const file = fileFor(name);
      if (!file) return fail(`Bank ${name} not found`);
      const buffer = fs.readFileSync(path.join(DIR, file));
      if (buffer.length !== BANK_BYTES || buffer[0] !== 0x00 || buffer[1] !== 0xc0) return fail(`${name} is not a SID SYNTH bank`);
      await maxApi.outlet('bankdata', bankName(file), buffer.toString('hex'));
    } catch (error) { await fail(`Could not read ${name}`, error); }
  },
  write: async (name, hex) => {
    try {
      const file = fileFor(name);
      const buffer = hexToBuffer(hex);
      if (!file) return fail(`Bank ${name} not found`);
      if (!buffer) return fail('Save failed: bad bank data');
      writeBank(file, buffer);
      await maxApi.outlet('banksaved', bankName(file));
    } catch (error) { await fail(`Save to ${name} failed`, error); }
  },
  create: async (name, hex) => {
    try {
      const clean = cleanName(name);
      const buffer = hexToBuffer(hex);
      if (!clean) return fail('Bank name needs letters or digits');
      if (fileFor(clean)) return fail(`Bank ${clean} already exists`);
      if (!buffer) return fail('Could not create bank: bad data');
      ensureDir();
      writeBank(`${clean}.SLO`, buffer);
      // Report the change before the refreshed list, so the device can follow it.
      await maxApi.outlet('bankcreated', clean);
      await list();
    } catch (error) { await fail(`Could not create ${name}`, error); }
  },
  openbanks: async () => {
    try {
      ensureDir();
      const opener = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      childProcess.execFile(opener, [DIR], () => {});
      await maxApi.outlet('folderopened', DIR);
    } catch (error) { await fail('Could not open the bank folder', error); }
  }
});

// Banks copied into the folder in Finder show up without reloading the device.
let rescanTimer = null;
try {
  ensureDir();
  fs.watch(DIR, () => {
    clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => { list().catch(() => {}); }, 400);
  });
} catch (error) {
  maxApi.post(`sid_banks: folder watch unavailable: ${error.message}`);
}

list().catch(error => fail('Bank folder unavailable', error));
