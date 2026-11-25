// The controller: MIDI out, banks, load/restore, saving, performance layers.
// Banks are made up (helpers.makeBank): no SID SYNTH preset data is needed.
const assert = require('assert');
const {createController, makeBank, restoreDevice} = require('./helpers');

const CC = {cutoff: 74, attack: 73, sustain: 70, wave: 28, ring: 25, sync: 26};
const FOLDER = () => ({PRESETS1: makeBank('P1'), PRESETS3: makeBank('P3'), 'MY BANK': makeBank('MY')});

// A device as freshly added to a track, with a bank folder.
function freshDevice(files = FOLDER()) {
  const device = createController(files);
  restoreDevice(device, {stored: 0});
  return device;
}

module.exports = {
  'nothing is sent while the device loads'() {
    const device = createController(FOLDER());
    device.api.set('cutoff', 100);
    device.api.wavebit('saw', 1);
    device.api.bank(1); device.api.preset(6);
    device.api.RESEND();
    assert.deepStrictEqual(device.midi(), []);
  },

  'a fresh device selects PRESETS1 slot 1 and sends it'() {
    const device = freshDevice();
    const midi = device.midi();
    assert.deepStrictEqual(midi[0], [0xc0, 0]);
    assert.strictEqual(midi.length, 35);
    assert.strictEqual(device.last('patchname'), 'P1 SND 01');
    assert.strictEqual(device.last('userbank'), 'PRESETS1');
    assert.strictEqual(device.ui('edited').length, 0);
  },

  'a fresh device without PRESETS1 takes the first bank'() {
    const device = freshDevice({ZEBRA: makeBank('ZB'), ALPHA: makeBank('AL')});
    assert.strictEqual(device.last('patchname'), 'AL SND 01');
  },

  'with no banks the slots are INIT sounds'() {
    const device = freshDevice({});
    assert.strictEqual(device.last('patchname'), 'INIT 01');
    assert.strictEqual(device.midi().length, 35);
    assert.deepStrictEqual(device.ui('bankitems').pop().slice(1), ['NO BANKS', 'NEW BANK…']);
  },

  'a reopened set keeps its edited panel, marks it EDITED and sends it'() {
    const device = createController(FOLDER());
    restoreDevice(device, {params: {attack: 15}, bank: 6, bankName: 'MY BANK', preset: 6});
    assert.deepStrictEqual(device.midi()[0], [0xc0, 5]);
    assert.deepStrictEqual(device.ccs(CC.attack), [120]);
    assert.strictEqual(device.ui('edited').length, 1);
    assert.strictEqual(device.last('status'), 'Sent edited MY SND 06 to C64');
    assert.strictEqual(device.shown('attack').length, 0, 'the restored panel is not overwritten');
  },

  'a reopened set that matches its slot is not marked EDITED'() {
    const reference = freshDevice();
    reference.api.preset(14);
    const stored = Object.assign({}, reference.api.state());
    const wave = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 0], [1, 1, 1, 0]][stored.wave];
    const params = Object.assign({}, stored); delete params.wave; delete params.vibwheel;
    const device = createController(FOLDER());
    restoreDevice(device, {params, wave, bank: 6, bankName: 'PRESETS1', preset: 14});
    assert.strictEqual(device.ui('edited').length, 0);
    assert.strictEqual(device.last('status'), 'Sent 14 P1 SND 14 to C64');
  },

  'a set from before v0.25 on factory bank 3 finds PRESETS3'() {
    const device = createController(FOLDER());
    restoreDevice(device, {bank: 3, preset: 2, bankName: ''});
    assert.strictEqual(device.last('patchname'), 'P3 SND 02');
    assert.strictEqual(device.last('userbank'), 'PRESETS3');
  },

  'a reopened set whose bank is gone keeps its sound on the first bank'() {
    const device = createController(FOLDER());
    restoreDevice(device, {bank: 6, bankName: 'GONE', preset: 2});
    assert.strictEqual(device.last('status'), 'Bank GONE not found');
    assert.strictEqual(device.last('userbank'), 'MY BANK');
    assert.strictEqual(device.shown('attack').length, 0);
  },

  'RESEND sends Program Change then every CC, keeping edits'() {
    const device = freshDevice();
    device.api.set('cutoff', 99);
    device.clear();
    device.api.RESEND();
    const midi = device.midi();
    assert.deepStrictEqual(midi[0], [0xc0, 0]);
    assert.strictEqual(midi.length, 35);
    assert.deepStrictEqual(device.ccs(CC.cutoff), [99]);
    assert.strictEqual(device.last('status'), 'Sent 01 P1 SND 01 to C64');
  },

  'PANIC sends All Sound Off and All Notes Off'() {
    const device = freshDevice();
    device.clear();
    device.api.PANIC();
    assert.deepStrictEqual(device.midi(), [[0xb0, 120, 0], [0xb0, 123, 0]]);
  },

  'the MIDI channel applies to everything sent'() {
    const device = freshDevice();
    device.api.channel(3);
    device.clear();
    device.api.RESEND();
    assert.ok(device.midi().every(m => (m[0] & 0x0f) === 2));
  },

  'picking a bank and a slot recalls and sends'() {
    const device = freshDevice();
    device.clear();
    device.api.bankpick(0); device.flush(); // MY BANK (sorted first)
    assert.strictEqual(device.last('patchname'), 'MY SND 01');
    device.api.preset(7);
    assert.strictEqual(device.last('patchname'), 'MY SND 07');
    assert.deepStrictEqual(device.midi().filter(m => m[0] === 0xc0), [[0xc0, 0], [0xc0, 6]]);
  },

  'an incoming Program Change selects that slot without sending another'() {
    const device = freshDevice();
    device.clear();
    device.api.midievent(144, 60, 100);
    assert.deepStrictEqual(device.midi(), []);
    device.api.midievent(194, 2);
    assert.strictEqual(device.last('slotparam'), '3');
    assert.strictEqual(device.last('patchname'), 'P1 SND 03');
    assert.ok(!device.midi().some(m => (m[0] & 0xf0) === 0xc0));
    assert.strictEqual(device.midi().length, 34);
  },

  'Ring Mod and Hard Sync switch each other off'() {
    const device = freshDevice();
    device.api.set('sync', 1);
    device.clear();
    device.api.set('ring', 1);
    assert.deepStrictEqual(device.shown('sync'), [0]);
    assert.deepStrictEqual(device.midi(), [[0xb0, CC.sync, 0], [0xb0, CC.ring, 127]]);
  },

  'waveform toggles combine, Noise is exclusive'() {
    const device = freshDevice();
    device.clear();
    device.api.wavebit('saw', 1);
    device.api.wavebit('pulse', 0);
    device.api.wavebit('noise', 1);
    assert.deepStrictEqual(device.ccs(CC.wave), [6 * 16, 1 * 16, 3 * 16]);
  },

  'ARP Speed shows its clock division'() {
    const device = freshDevice();
    device.api.set('playmode', 0);
    const shown = speed => { device.api.set('arpspeed', speed); return device.last('arpsync'); };
    assert.strictEqual(shown(1), 'SYNC 1/1');
    assert.strictEqual(shown(8), 'SYNC 1/4');
    assert.strictEqual(shown(21), 'SYNC 1/16');
    assert.strictEqual(shown(31), 'SYNC 1/64T');
    device.api.set('playmode', 1);
    assert.strictEqual(device.last('arpsync'), ' ');
  },

  'Pressure on Sustain fades and restores'() {
    const device = freshDevice();
    device.api.set('sustain', 12);
    device.api.set('presstarget', 8);
    device.api.set('pressamount', -16);
    device.clear();
    device.api.pressure(127); device.api.pressure(64); device.api.pressure(0);
    assert.deepStrictEqual(device.ccs(CC.sustain), [0, 32, 96]);
  },

  'Step Mod offsets its target on each step and restores it when off'() {
    const device = freshDevice();
    device.api.set('cutoff', 64);
    device.api.set('motiontarget', 0);
    device.api.set('motionamount', 16);
    device.api.set('motionon', 1);
    device.clear();
    device.api.motiontick(); device.clock += 125; device.api.motiontick();
    assert.deepStrictEqual(device.ccs(CC.cutoff), [127, 64]);
    assert.deepStrictEqual(device.ui('motionstep'), [[0], [1]]);
    device.clear();
    device.api.set('motionon', 0);
    assert.deepStrictEqual(device.ccs(CC.cutoff), [64]);
  },

  'the Cutoff Envelope rises on a note and falls back after release'() {
    const device = freshDevice();
    device.api.set('cutoff', 64);
    device.api.set('fenvon', 1);
    device.api.set('fenvattack', 100);
    device.api.set('fenvrelease', 100);
    device.clear();
    device.api.note(60, 127);
    for (let i = 0; i < 6; i++) { device.clock += 20; device.api.fenvtick(); }
    assert.strictEqual(Math.max(...device.ccs(CC.cutoff)), 127);
    device.api.note(60, 0);
    for (let i = 0; i < 6; i++) { device.clock += 20; device.api.fenvtick(); }
    const after = device.ccs(CC.cutoff);
    assert.strictEqual(after[after.length - 1], 64);
  },

  'saving: create a bank, choose a slot, STORE writes the sound and name'() {
    const device = freshDevice({});
    device.api.patchname('Lead', 'one');
    device.api.SAVEPATCH(); device.flush();
    assert.strictEqual(device.last('status'), 'Make a bank: NEW BANK…');
    device.api.bankpick(1); // NEW BANK... (NO BANKS is item 0)
    device.api.dialogtext('symbol', 'my bank!'); device.flush();
    assert.deepStrictEqual(Object.keys(device.files), ['MY BANK']);
    device.api.preset(5);
    assert.strictEqual(device.last('status'), 'To MY BANK 05 (now INIT 05)');
    device.api.SAVEPATCH(); device.flush();
    assert.strictEqual(device.last('status'), 'Saved LEAD ONE to MY BANK 05');
    const bytes = Buffer.from(device.files['MY BANK'], 'hex');
    assert.strictEqual(bytes.length, 2378);
    const name = [...bytes.subarray(2 + 54 * 35 + 4 * 9, 2 + 54 * 35 + 5 * 9)]
      .map(v => v === 32 ? ' ' : String.fromCharCode(64 + v)).join('').trim();
    assert.strictEqual(name, 'LEAD ONE');
    assert.strictEqual(device.last('userbank'), 'MY BANK');
  },

  'the bank menu offers NEW BANK but no rename (that is done in the folder)'() {
    const device = freshDevice();
    const items = device.log.filter(entry => entry[0] === 'ui' && entry[1] === 'bankitems').pop()
      .slice(3).map(item => String(item).replace(/\u00a0/g, ' '));
    assert.deepStrictEqual(items, ['MY BANK', 'PRESETS1', 'PRESETS3', 'NEW BANK\u2026']);
  },

  'a bank renamed in the folder is followed; one deleted keeps the sound'() {
    const device = freshDevice();
    device.files.FIRSTS = device.files.PRESETS1; delete device.files.PRESETS1;
    device.list();
    assert.strictEqual(device.last('status'), 'Bank PRESETS1 is now FIRSTS');
    assert.strictEqual(device.last('userbank'), 'FIRSTS');
    assert.strictEqual(device.last('bankset'), '0');  // FIRSTS sorts first
    delete device.files.FIRSTS;
    device.list();
    assert.strictEqual(device.last('status'), 'Bank FIRSTS not found');
  },

  'RANDOM sends a new playable sound to the current slot'() {
    const device = freshDevice();
    device.clear();
    device.api.RANDOM();
    const midi = device.midi();
    assert.strictEqual(midi.length, 34, 'every CC, no Program Change');
    assert.ok(midi.every(m => (m[0] & 0xf0) === 0xb0));
    assert.strictEqual(device.last('patchname'), 'RANDOM');
    assert.strictEqual(device.ui('edited').length, 1);
    assert.strictEqual(device.last('status'), 'Random sound sent to C64');
    assert.strictEqual(device.shown('cutoff').length, 1, 'the panel shows it');
  },

  'RANDOM values stay in range and keep the rules, and differ per press'() {
    const device = freshDevice();
    const RANGES = {playmode: [0, 6], arpspeed: [1, 31], arpdir: [0, 2], porta: [0, 1], attack: [0, 15], decay: [0, 15],
      sustain: [0, 15], release: [0, 15], envretrig: [0, 2], wave: [0, 7], ring: [0, 1], sync: [0, 1], click: [0, 1],
      tremon: [0, 1], tremrate: [0, 31], pwmwidth: [0, 127], pwmrate: [0, 31], pwmdepth: [0, 31], pwmcycle: [0, 3],
      pwmretrig: [0, 2], pwmon: [0, 1], filtermode: [0, 3], cutoff: [0, 127], resonance: [0, 15], filterrate: [0, 31],
      filtercycle: [0, 4], filterretrig: [0, 2], vibfreq: [0, 31], vibrate: [1, 32], vibtype: [0, 3], vibdelay: [0, 31],
      vibretrig: [0, 1], vibon: [0, 1]};
    const seen = new Set();
    for (let press = 0; press < 500; press++) {
      device.clock += 977;
      device.api.RANDOM();
      const state = device.api.state();
      for (const [key, [lo, hi]] of Object.entries(RANGES)) {
        assert.ok(Number.isInteger(state[key]) && state[key] >= lo && state[key] <= hi, `${key} = ${state[key]}`);
      }
      assert.ok(!(state.ring && state.sync), 'Ring and Sync together');
      if (state.ring) assert.strictEqual(state.wave, 2, 'Ring uses triangle');
      if (state.filtermode === 1) assert.ok(state.cutoff >= 32, 'low-pass stays audible');
      seen.add(JSON.stringify(state));
    }
    assert.ok(seen.size > 490, `only ${seen.size} different sounds in 500 presses`);
  },

  'the folder button asks the helper to open the bank folder'() {
    const device = freshDevice();
    device.node.length = 0;
    device.api.SHOWFOLDER();
    assert.deepStrictEqual(device.node, [['openbanks']]);
    device.api.folderopened('/Users/someone/Music/Ableton/User', 'Library/SID', 'SYNTH', 'Banks');
    assert.strictEqual(device.last('status'), 'Bank folder: /Users/someone/Music/Ableton/User Library/SID SYNTH Banks');
  }
};
