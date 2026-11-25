// sid_banks.js, the Node for Max helper that keeps user banks as .SLO files.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {loadBankHelper} = require('./helpers');

const BANK_BYTES = 2378;

function bankHex(fill = 0) {
  const bytes = Buffer.alloc(BANK_BYTES, fill);
  bytes[0] = 0x00; bytes[1] = 0xc0;
  return bytes.toString('hex');
}

const BANK_FOLDER = ['Presets', 'MIDI Effects', 'Max MIDI Effect', 'SID SYNTH Banks'];

// prepare(home) can lay out Live's preferences before the helper starts.
async function setup(prepare) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sid-banks-'));
  if (prepare) prepare(home);
  const api = loadBankHelper(home);
  await new Promise(resolve => setImmediate(resolve)); // the startup listing
  api.outlets.length = 0;
  return {api, home, folder: path.join(home, 'Music', 'Ableton', 'User Library', ...BANK_FOLDER)};
}

function libraryCfg(home, version, parent, name = 'User Library') {
  const dir = path.join(home, 'Library', 'Preferences', 'Ableton', `Live ${version}`);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'Library.cfg'), `<?xml version="1.0" encoding="UTF-8"?>
<Ableton>
\t<ContentLibrary>
\t\t<ProjectPath Value="/not/the/user/library" />
\t</ContentLibrary>
\t<UserLibrary>
\t\t<LibraryProject Id="0">
\t\t\t<ProjectLocation />
\t\t\t<ProjectName Value="${name}" />
\t\t\t<ProjectPath Value="${parent}" />
\t\t</LibraryProject>
\t</UserLibrary>
</Ableton>
`);
}

module.exports = {
  async 'keeps banks in the default User Library without a Live preference'() {
    const {folder} = await setup();
    assert.ok(fs.statSync(folder).isDirectory());
  },

  async 'follows the User Library set in the newest Live version'() {
    if (process.platform === 'win32') return;  // the layout below is the macOS one
    let moved;
    const {folder, home} = await setup(home => {
      moved = path.join(home, 'Drive & Co');
      fs.mkdirSync(path.join(moved, 'My Library'), {recursive: true});
      libraryCfg(home, '11.3.4', path.join(home, 'Old'));
      libraryCfg(home, '12.4.16', moved.replace('&', '&amp;'), 'My Library');
      libraryCfg(home, '12.10.1', path.join(home, 'Unplugged'));  // missing: skipped
      fs.mkdirSync(path.join(home, 'Library', 'Preferences', 'Ableton', 'Live Reports'), {recursive: true});
    });
    const expected = path.join(moved, 'My Library', ...BANK_FOLDER);
    assert.ok(fs.statSync(expected).isDirectory());
    assert.ok(!fs.existsSync(folder), 'the default library was not used');
    assert.ok(!fs.existsSync(path.join(home, 'Old')));
  },

  async 'creates, lists, writes and reads a bank'() {
    const {api, folder} = await setup();
    await api.handlers.create('my bank!', bankHex());
    assert.deepStrictEqual(api.outlets.slice(0, 2), [['bankcreated', 'MY BANK'], ['banks', 'MY BANK']]);
    assert.ok(fs.existsSync(path.join(folder, 'MY BANK.SLO')));
    await api.handlers.write('my bank', bankHex(7));
    assert.deepStrictEqual(api.outlets[2], ['banksaved', 'MY BANK']);
    await api.handlers.read('MY BANK');
    assert.deepStrictEqual(api.outlets[3], ['bankdata', 'MY BANK', bankHex(7)]);
  },

  async 'refuses to create a bank that exists, and cannot rename or delete'() {
    const {api, folder} = await setup();
    await api.handlers.create('ONE', bankHex());
    api.outlets.length = 0;
    await api.handlers.create('one', bankHex(7));
    assert.deepStrictEqual(api.outlets[0], ['bankerror', 'Bank ONE already exists']);
    assert.deepStrictEqual(fs.readdirSync(folder), ['ONE.SLO']);
    assert.deepStrictEqual(Object.keys(api.handlers).sort(), ['create', 'list', 'openbanks', 'read', 'write']);
  },

  async 'lists only valid .SLO files and rejects bad data'() {
    const {api, folder} = await setup();
    fs.writeFileSync(path.join(folder, 'C64DISK.SLO'), Buffer.from(bankHex(), 'hex'));
    fs.writeFileSync(path.join(folder, 'junk.slo'), 'not a bank');
    fs.writeFileSync(path.join(folder, 'notes.txt'), Buffer.from(bankHex(), 'hex'));
    await api.handlers.list();
    assert.deepStrictEqual(api.outlets[0], ['banks', 'C64DISK']);
    await api.handlers.write('C64DISK', 'abcd');
    assert.deepStrictEqual(api.outlets[1], ['bankerror', 'Save failed: bad bank data']);
    await api.handlers.read('missing');
    assert.deepStrictEqual(api.outlets[2], ['bankerror', 'Bank missing not found']);
  },

  async 'opens the bank folder (without really launching Finder)'() {
    const childProcess = require('child_process');
    const opened = [];
    const execFile = childProcess.execFile;
    childProcess.execFile = (command, args, done) => { opened.push([command, ...args]); done(); };
    try {
      const {api, folder} = await setup();
      await api.handlers.openbanks();
      assert.strictEqual(opened.length, 1);
      assert.strictEqual(opened[0][1], folder);
      assert.deepStrictEqual(api.outlets[0], ['folderopened', folder]);
    } finally {
      childProcess.execFile = execFile;
    }
  }
};
