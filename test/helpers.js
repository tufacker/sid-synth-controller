/*
 * Test helpers: run the built device's controller and the bank-file helper in
 * Node, outside Max. The controller is taken from the built patch, so the tests
 * check exactly what ships.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const VERSION = require('../package.json').version;
const DIST = path.join(ROOT, 'dist', `SID-SYNTH-M4L-v${VERSION}`);
const PATCH = path.join(DIST, 'SID SYNTH Controller.maxpat');

function readPatch() {
  if (!fs.existsSync(PATCH)) throw new Error(`Build first: ${path.relative(ROOT, PATCH)} not found`);
  return JSON.parse(fs.readFileSync(PATCH, 'utf8')).patcher;
}

// The controller's message handlers (everything the patch can send it).
const HANDLERS = ['set', 'wavebit', 'bank', 'preset', 'bankpick', 'patchname', 'RESEND', 'PANIC', 'RANDOM', 'SHOWFOLDER', 'SAVEPATCH', 'CANCELSAVE',
  'LOADED', 'panelstored', 'restorebankname', 'dialogtext', 'dialogcancel', 'channel', 'note', 'wheel', 'bend', 'pressure',
  'midievent', 'fenvtick', 'motiontick', 'motionglide', 'motionreset',
  'banks', 'bankdata', 'banksaved', 'bankcreated', 'folderopened', 'bankerror'];
const OUTLETS = ['midi', 'state', 'ui'];

let controllerCode = null;

// A fresh controller. Every outlet call is logged as [outlet, ...atoms];
// Date.now() is the test's own clock (device.clock, in ms).
function createController(files = {}) {
  if (!controllerCode) controllerCode = readPatch().boxes.map(entry => entry.box).find(box => box.maxclass === 'v8.codebox').code;
  const device = {log: [], clock: 1000000, node: []};
  const RealDate = Date;
  const sandbox = {
    outlet: (n, ...atoms) => {
      atoms = atoms.flat();
      device.log.push([OUTLETS[n], ...atoms]);
      if (OUTLETS[n] === 'ui' && atoms[0] === 'node') device.node.push(atoms.slice(1));
    },
    post: () => {},
    Date: class extends RealDate { static now() { return device.clock; } }
  };
  const factory = new Function(...Object.keys(sandbox), `${controllerCode}\nreturn {${HANDLERS.join(',')}, state: () => state};`);
  device.api = factory(...Object.values(sandbox));
  device.clear = () => { device.log.length = 0; };
  device.midi = () => device.log.filter(entry => entry[0] === 'midi').map(entry => entry.slice(1));
  device.ccs = number => device.midi().filter(m => (m[0] & 0xf0) === 0xb0 && (number === undefined || m[1] === number)).map(m => m[2]);
  device.ui = command => device.log.filter(entry => entry[0] === 'ui' && entry[1] === command).map(entry => entry.slice(2));
  device.last = command => { const all = device.ui(command); return all.length ? all[all.length - 1].join(' ') : undefined; };
  device.shown = key => device.log.filter(entry => entry[0] === 'state' && entry[1] === key).map(entry => entry[2]);
  return attachFolder(device, files);
}

// A made-up .SLO bank as the hex string the helper sends: valid records that
// vary slot by slot, named "<tag> SND 01".."<tag> SND 54". Slot 5 is ARP+.
function makeBank(tag) {
  const bytes = Buffer.alloc(2378);
  bytes[0] = 0x00; bytes[1] = 0xc0;
  for (let i = 0; i < 54; i++) {
    const record = [i % 8 === 3 ? 0 : i % 8, i % 4, i % 16, (i * 5) % 16, (i * 7) % 16, (i * 3) % 16, 30, (i * 3) % 32, i % 16, i % 2,
      19, 22, 0, 0, 0, 16, 0, 1, 30, 0, 0, 1, 0, 0, 3, 8, 1, 0, 0, 0, 0, 0, 17, 0, 0];
    if (i === 4) { record[21] = 3; record[23] = 1; record[25] = 21; }
    Buffer.from(record).copy(bytes, 2 + i * 35);
    const name = `${tag} SND ${String(i + 1).padStart(2, '0')}`.padEnd(9, ' ');
    for (let c = 0; c < 9; c++) {
      const code = name.charCodeAt(c);
      bytes[2 + 54 * 35 + i * 9 + c] = code >= 65 && code <= 90 ? code - 64 : code;
    }
  }
  return bytes.toString('hex');
}

// A bank folder held in memory, answering the controller like sid_banks.js.
// device.flush() serves pending requests; device.list() sends a folder listing.
function attachFolder(device, files) {
  device.files = files;
  device.flush = () => {
    while (device.node.length) {
      const [command, ...args] = device.node.shift();
      if (command === 'list') device.list();
      else if (command === 'read') files[args[0]] ? device.api.bankdata(args[0], files[args[0]]) : device.api.bankerror(`Bank ${args[0]} not found`);
      else if (command === 'write') { files[args[0]] = args[1]; device.api.banksaved(args[0]); }
      else if (command === 'create') { files[args[0]] = args[1]; device.api.bankcreated(args[0]); device.list(); }
    }
  };
  device.list = () => { device.api.banks(...Object.keys(files).sort()); device.flush(); };
  return device;
}

// Simulates Live loading a device: every stored control, the stored location,
// LOADED, then the helper's first folder listing.
function restoreDevice(device, {params = {}, wave = [1, 0, 0, 0], bank = 1, preset = 1, stored = 1, bankName = '-'} = {}) {
  for (const [key, value] of Object.entries(params)) device.api.set(key, value);
  ['pulse', 'saw', 'tri', 'noise'].forEach((part, i) => device.api.wavebit(part, wave[i]));
  device.api.bank(bank);
  device.api.preset(preset);
  device.api.panelstored(stored);
  device.api.restorebankname(bankName);
  device.api.LOADED();
  device.list();
}

// Loads src/device/sid_banks.js against the max-api mock, with HOME set to a
// fresh temporary folder. Returns the mock (handlers and recorded outlets).
function loadBankHelper(home) {
  const mock = require('./mocks/max-api');
  mock._reset();
  process.env.HOME = home;
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    return request === 'max-api' ? require.resolve('./mocks/max-api') : resolve.call(this, request, ...rest);
  };
  const helper = path.join(ROOT, 'src', 'device', 'sid_banks.js');
  delete require.cache[helper];
  try { require(helper); } finally { Module._resolveFilename = resolve; }
  return mock;
}

module.exports = {ROOT, DIST, readPatch, createController, makeBank, restoreDevice, loadBankHelper};
