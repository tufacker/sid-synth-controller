/*
 * Regression guard: a long scripted session (every feature, including bank
 * saving and set restores) must produce exactly the recorded MIDI, control
 * values and panel commands in test/fixtures/session.json.
 *
 * After an intended behaviour change, review the difference, then record the
 * new output with:  npm run test:record
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {createController, makeBank, restoreDevice} = require('./helpers');

const FIXTURE = path.join(__dirname, 'fixtures', 'session.json');

// Stored control values of a device on its default sound.
const PANEL = {playmode: 1, arpspeed: 8, arpdir: 1, porta: 0, vibon: 0, vibfreq: 1, vibrate: 30, vibdelay: 0, vibtype: 0, vibretrig: 0,
  ring: 0, sync: 0, click: 0, pwmon: 0, pwmwidth: 120, pwmrate: 19, pwmdepth: 22, pwmcycle: 0, pwmretrig: 0, filtermode: 0,
  cutoff: 64, resonance: 0, filterrate: 16, filtercycle: 0, filterretrig: 0, tremon: 0, tremrate: 17, envretrig: 0,
  attack: 4, decay: 8, sustain: 6, release: 0, fenvon: 0, motionon: 0, veltarget: 0, wheeltarget: 0};

function runSession() {
  const files = {PRESETS1: makeBank('P1'), PRESETS2: makeBank('P2')};
  const log = [];
  let device;
  const start = (label, options) => {
    device = createController(files);
    step(label, () => restoreDevice(device, options));
  };
  const step = (label, fn) => {
    device.clear(); fn(); device.flush();
    for (const entry of device.log) log.push([label, ...entry.map(atom => typeof atom === 'number' ? Math.round(atom * 1000) / 1000 : atom)]);
  };

  start('fresh device', {params: PANEL, stored: 0});
  const api = device.api;
  step('edits', () => { api.set('cutoff', 90); api.set('attack', 12); api.set('playmode', 0); api.set('arpspeed', 21); api.set('playmode', 6); api.set('arpspeed', 1); api.set('playmode', 2); });
  step('waveform', () => { api.wavebit('saw', 1); api.wavebit('pulse', 0); api.wavebit('tri', 1); api.wavebit('noise', 1); api.wavebit('noise', 0); });
  step('ring and sync', () => { api.set('sync', 1); api.set('ring', 1); api.set('sync', 1); api.set('sync', 0); });
  step('slots', () => { for (const slot of [2, 6, 54, 13]) api.preset(slot); });
  step('banks', () => { api.bankpick(1); api.preset(5); api.bankpick(0); });
  step('resend and panic', () => { api.RESEND(); api.PANIC(); api.channel(3); api.RESEND(); api.channel(1); });
  step('program change', () => { api.midievent(192, 2); api.midievent(144, 60, 100); api.midievent(195, 40); });
  step('expression', () => {
    api.set('veltarget', 1); api.set('velamount', -12); api.note(60, 100); api.note(72, 30); api.note(60, 0); api.note(72, 0);
    api.set('presstarget', 8); api.set('pressamount', -16); api.pressure(127); api.pressure(40); api.pressure(0);
    api.set('wheeltarget', 3); api.set('wheelamount', 20); api.wheel(100); api.wheel(0); api.set('wheeltarget', 0);
    api.set('bendtarget', 5); api.set('bendamount', 10); api.bend(8191); api.bend(-8192); api.bend(0);
    api.set('keytarget', 2); api.set('keyamount', 8); api.note(84, 90); api.note(84, 0); api.set('keytarget', 0);
    api.set('velenv', 50); api.set('veltarget', 0); api.set('presstarget', 0); api.set('bendtarget', 0);
  });
  step('cutoff envelope', () => {
    api.set('fenvon', 1); api.set('fenvamount', 20); api.set('fenvattack', 100); api.set('fenvdecay', 200);
    api.set('fenvsustain', 40); api.set('fenvrelease', 300);
    api.note(60, 127); for (let i = 0; i < 20; i++) { device.clock += 20; api.fenvtick(); }
    api.note(60, 0); for (let i = 0; i < 20; i++) { device.clock += 20; api.fenvtick(); }
    api.set('fenvon', 0);
  });
  step('step mod', () => {
    api.set('motiontarget', 6); api.set('motionamount', -16); api.set('motionlength', 4);
    for (let i = 1; i <= 8; i++) api.set(`motionstep${i}`, (i * 37) % 200 - 100);
    api.set('motionon', 1); for (let i = 0; i < 6; i++) { device.clock += 125; api.motiontick(); }
    api.set('motionsmooth', 60); for (let i = 0; i < 4; i++) { device.clock += 40; api.motionglide(); device.clock += 85; api.motiontick(); }
    api.motionreset(); api.set('motiontarget', 0); api.set('motionon', 0);
  });
  step('random', () => { for (let i = 0; i < 3; i++) { device.clock += 500; api.RANDOM(); } });
  step('save mode', () => { api.patchname('Lead', 'one'); api.SAVEPATCH(); });
  step('new bank', () => { api.bankpick(2); api.dialogtext('symbol', 'my bank!'); });
  step('store', () => { api.preset(5); api.SAVEPATCH(); });
  step('browse banks', () => { api.bankpick(1); api.preset(5); api.bankpick(0); });
  step('bank renamed in the folder', () => { files.RENAMED = files['MY BANK']; delete files['MY BANK']; device.list(); });
  step('cancel save', () => { api.SAVEPATCH(); api.CANCELSAVE(); api.dialogcancel(); });
  step('errors', () => { api.bankerror('Something', 'failed'); api.bankdata('X', 'zz'); });

  start('restore edited slot', {params: Object.assign({}, PANEL, {attack: 15}), wave: [0, 1, 0, 0], bank: 6, bankName: 'PRESETS2', preset: 6});
  start('restore set from before v0.25', {params: PANEL, bank: 2, preset: 5, bankName: ''});
  start('restore renamed bank', {params: PANEL, bank: 6, preset: 5, bankName: 'RENAMED'});
  start('restore missing bank', {bank: 6, preset: 2, bankName: 'GONE'});
  step('file removed while in use', () => { delete files.PRESETS1; device.list(); });
  return log;
}

module.exports = {
  'the scripted session matches the recording'() {
    const log = runSession();
    if (process.env.RECORD) {
      fs.writeFileSync(FIXTURE, '[\n' + log.map(entry => JSON.stringify(entry)).join(',\n') + '\n]\n');
      console.log(`    recorded ${log.length} messages`);
      return;
    }
    const expected = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
    for (let i = 0; i < Math.max(log.length, expected.length); i++) {
      assert.deepStrictEqual(log[i], expected[i], `message ${i} differs`);
    }
  }
};
