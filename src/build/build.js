/*
 * Builds the SID SYNTH Controller Max for Live device.
 *
 *   node src/build/build.js   ->   dist/SID-SYNTH-M4L-v<version>/
 *
 * The device is generated rather than edited in Max so that every control,
 * colour and patch cord is reviewable here. Output folder contents:
 *   SID SYNTH Controller.amxd     the device (drag it onto a MIDI track); the
 *                                 version is in its Info View, not its name
 *   SID SYNTH Controller.maxpat   the same patcher as plain JSON
 *   sid_ui_logic.js, sid_banks.js           scripts the device loads from its folder
 *   sid_wave_*.svg, sid_folder.svg          button icons
 *   README.md, SETUP_GUIDE.md, default_cc_map.csv
 */
const fs = require('fs');
const path = require('path');
const {Patcher, liveAttrs, writeDevice} = require('./patcher');
const {CONTROLS} = require('./controls');
const PALETTE = require('../device/sid_palette');

const ROOT = path.resolve(__dirname, '..', '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const DEVICE_DIR = path.join(ROOT, 'src', 'device');
const OUT_DIR = path.join(ROOT, 'dist', `SID-SYNTH-M4L-v${VERSION}`);
const DEVICE_NAME = 'SID SYNTH Controller';
const WIDTH = 664, HEIGHT = 169;

fs.mkdirSync(OUT_DIR, {recursive: true});

// ---------------------------------------------------------------------------
// Files next to the device
// ---------------------------------------------------------------------------
const WAVE_ICONS = {
  'sid_wave_tri.svg': 'M1 10 L6 1 L11 10 L16 1 L21 10',
  'sid_wave_saw.svg': 'M1 10 L11 1 L11 10 L21 1 L21 10',
  'sid_wave_pulse.svg': 'M1 10 L1 1 L8 1 L8 10 L15 10 L15 1 L21 1',
  'sid_wave_noise.svg': 'M1 6 L4 2 L7 9 L10 1 L13 8 L16 3 L19 9 L21 5'
};
for (const [file, d] of Object.entries(WAVE_ICONS)) {
  fs.writeFileSync(path.join(OUT_DIR, file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 30">
  <path d="${d}" transform="translate(3 9.5)" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
</svg>\n`);
}
const ICONS = [...Object.keys(WAVE_ICONS), 'sid_folder.svg'];
fs.writeFileSync(path.join(OUT_DIR, 'sid_folder.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 15">
  <path d="M2.5 4.5 L5.5 4.5 L6.5 5.5 L11.5 5.5 L11.5 10.5 L2.5 10.5 Z" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
</svg>\n`);
const readDevice = file => fs.readFileSync(path.join(DEVICE_DIR, file), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'sid_ui_logic.js'), readDevice('sid_palette.js') + '\n' + readDevice('sid_ui_logic.js'));
fs.writeFileSync(path.join(OUT_DIR, 'sid_banks.js'), readDevice('sid_banks.js'));
fs.writeFileSync(path.join(OUT_DIR, 'README.md'),
  fs.readFileSync(path.join(ROOT, 'docs', 'USER_GUIDE.md'), 'utf8').replace(/\{\{VERSION\}\}/g, VERSION));
fs.copyFileSync(path.join(ROOT, 'docs', 'HARDWARE_SETUP.md'), path.join(OUT_DIR, 'SETUP_GUIDE.md'));
fs.copyFileSync(path.join(ROOT, 'docs', 'default_cc_map.csv'), path.join(OUT_DIR, 'default_cc_map.csv'));

const controllerCode = readDevice('sid_controller.js');

// ---------------------------------------------------------------------------
// Panel building blocks. Colours are applied at the end from the palette.
// ---------------------------------------------------------------------------
const P = new Patcher();
const add = box => P.add(box);
const connect = (...cord) => P.connect(...cord);
const FONT = 'Ableton Sans Medium';

// Live's Info View shows an object's annotation, titled by annotation_name
// (parameters show their parameter info instead). No Max hint: its yellow
// tooltip would repeat the same text.
function help(id, title, text) {
  Object.assign(P.box(id), {annotation_name: title, annotation: text});
  return id;
}

// Live shows no Info View for text, so titles and readouts get an invisible,
// inert button on top that carries their help.
const CLEAR = [0, 0, 0, 0];
function infoZone(name, rect, title, text) {
  const id = add({maxclass: 'live.text', numinlets: 1, numoutlets: 2, outlettype: ['', ''], parameter_enable: 0, mode: 0,
    text: '', texton: '', varname: `info_${name}`, patching_rect: rect, presentation: 1, presentation_rect: rect,
    bgcolor: CLEAR, activebgcolor: CLEAR, bgoncolor: CLEAR, activebgoncolor: CLEAR, bordercolor: CLEAR, focusbordercolor: CLEAR,
    textcolor: CLEAR, activetextcolor: CLEAR, textoncolor: CLEAR, activetextoncolor: CLEAR, textoffcolor: CLEAR});
  return help(id, title, text);
}

function panel(name, x, y, w, h, extra = {}) {
  const rect = [x, y, w, h];
  return add({maxclass: 'panel', numinlets: 1, numoutlets: 0, background: 1, border: 0, rounded: 0, mode: 0,
    patching_rect: rect, presentation: 1, presentation_rect: rect, varname: P.uniqueName(name), ...extra});
}

function text(name, value, rect, size = 8, bold = false, align = 0) {
  return add({maxclass: 'live.comment', numinlets: 1, numoutlets: 0, text: value, fontsize: size, fontface: bold ? 1 : 0,
    fontname: FONT, textjustification: align, patching_rect: rect, presentation: 1, presentation_rect: rect,
    varname: P.uniqueName(name)});
}

// Control captions: 13 px live.comments.
function label(value, x, y, w, align = 0, name = null) {
  return text(name || `label_${value.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, value, [x, y, w, 13], 8.5, false, align);
}

// One Live parameter control plus its "set <key>" message to the controller.
function control(c, order) {
  const rect = [c.x, c.y, c.w, c.h];
  const common = {numinlets: 1, parameter_enable: 1, patching_rect: rect, presentation: c.hidePresentation ? 0 : 1,
    presentation_rect: rect, varname: c.varname || c.key};
  if (c.labelRect) label(c.label, ...c.labelRect, c.labelAlign || 0, c.labelVar);
  let box;
  if (c.type === 'toggle') {
    const caption = c.text !== undefined ? c.text : c.label;
    box = {maxclass: 'live.text', numoutlets: 2, outlettype: ['', ''], mode: 1, text: caption, texton: caption,
      fontsize: c.fontsize || 7.5, fontface: 1, rounded: 0, appearance: 0,
      saved_attribute_attributes: liveAttrs(c.param, c.label, 0, 1, c.initial, 2, ['OFF', 'ON'], order, c.info)};
    if (c.picture) Object.assign(box, {usepicture: 1, pictures: [c.picture, c.picture], remapsvgcolors: 1, usesvgviewbox: 1});
  } else if (c.type === 'menu' || c.type === 'tab') {
    const attrs = liveAttrs(c.param, c.label, 0, c.enums.length - 1, c.initial, 2, c.enums, order, c.info);
    box = c.type === 'menu'
      ? {maxclass: 'live.menu', numoutlets: 3, outlettype: ['', '', 'float'], appearance: 0, saved_attribute_attributes: attrs}
      : {maxclass: 'live.tab', numoutlets: 3, outlettype: ['', '', 'float'], num_lines_patching: c.lines || 1,
        num_lines_presentation: c.lines || 1, fontsize: c.fontsize || 8.5, saved_attribute_attributes: attrs};
  } else {
    const attrs = liveAttrs(c.param, c.label, c.min, c.max, c.initial, c.ptype || 0, null, order, c.info);
    if (c.unitstyle !== undefined) attrs.valueof.parameter_unitstyle = c.unitstyle;
    if (c.units) attrs.valueof.parameter_units = c.units;
    if (c.type === 'bar') {
      box = {maxclass: 'live.numbox', numoutlets: 2, outlettype: ['', 'float'], appearance: 2, saved_attribute_attributes: attrs};
    } else if (c.type === 'slider') {
      box = {maxclass: 'live.slider', numoutlets: 2, outlettype: ['', 'float'], orientation: c.orientation || 0,
        showname: c.showname === undefined ? 1 : c.showname, saved_attribute_attributes: attrs};
    } else {
      box = {maxclass: 'live.dial', numoutlets: 2, outlettype: ['', 'float'], appearance: c.appearance || 0, showname: 1,
        shownumber: c.shownumber === undefined ? 1 : c.shownumber, fontsize: c.fontsize || 8, saved_attribute_attributes: attrs};
    }
  }
  const ui = add({...box, ...common});
  const message = P.prepend(c.command || `set ${c.key}`, [20, 340 + order * 21, 150, 20]);
  connect(ui, 0, message, 0);
  return {ui, message};
}

// A momentary button. Live draws a momentary live.text as a rounded pill, so
// the button is transparent and a square panel behind it (btnbg_<name>) is the
// fill that sid_ui_logic.js lights when pressed.
function button(caption, x, y, w, h, varname, title, text, picture = null) {
  panel(`btnbg_${varname}`, x, y, w, h, {ignoreclick: 1});
  const rect = [x, y, w, h];
  const id = help(add({maxclass: 'live.text', numinlets: 1, numoutlets: 2, outlettype: ['', ''], parameter_enable: 0, mode: 0,
    text: caption, texton: caption, fontsize: 8, fontface: 0, rounded: 0, varname,
    patching_rect: rect, presentation: 1, presentation_rect: rect}), title, text);
  // An icon is drawn by a separate picture underneath that ignores the mouse;
  // a picture live.text does not pass presses through reliably in Live.
  if (picture) {
    add({maxclass: 'live.text', numinlets: 1, numoutlets: 2, outlettype: ['', ''], parameter_enable: 0, mode: 0,
      text: '', texton: '', varname: `icon_${varname}`, ignoreclick: 1, usepicture: 1, pictures: [picture, picture],
      remapsvgcolors: 1, usesvgviewbox: 1, patching_rect: rect, presentation: 1, presentation_rect: rect});
  }
  return id;
}

// ---------------------------------------------------------------------------
// Cells, titles and dividers
// ---------------------------------------------------------------------------
for (const [name, ...rect] of [['cell_program', 0, 0, 80, 169], ['cell_mode', 82, 0, 124, 84],
  ['cell_vibrato', 82, 85, 124, 84], ['cell_oscillator', 208, 0, 124, 169], ['cell_filter', 334, 0, 152, 84],
  ['cell_envelope', 334, 85, 152, 84], ['cell_m4l', 488, 0, 176, 169],
  // Max draws earlier background boxes on top, so the device background is
  // added after the cells and shows only through the 1-2 px gutters.
  ['device_background', 0, 0, WIDTH, HEIGHT]]) {
  panel(name, ...rect);
}

// Section titles: hovering one shows what the section does.
text('title_mode', 'MODE', [84, 1, 80, 12], 8, true);
infoZone('title_mode', [84, 1, 80, 12], 'Mode',
  'How notes are played. ARP and ARP+ cycle the held notes (ARP+ adds the octave); POLY plays up to three voices (six with a second SID); MONO one; OCT, OCT+ and 5TH double each note an octave or a fifth up. PORTA glides between notes at the Speed rate (not in ARP modes).');
text('lbl_arpeggio', 'ARPEGGIO', [84, 35, 60, 10], 7.5, true);
infoZone('lbl_arpeggio', [84, 35, 60, 10], 'Arpeggio',
  'Speed and direction of the arpeggiator in ARP and ARP+. In the other modes Speed is the Portamento glide rate and Dir does nothing. When the C64 follows MIDI clock, the readout on the right shows the note division Speed selects.');
// The note division ARP/ARP+ Speed selects when the C64 follows MIDI clock
// (blank in the other modes, where Speed is the glide rate).
const arpSyncLabel = text('lbl_arp_sync', ' ', [142, 35, 60, 10], 7, false, 2);
infoZone('lbl_arp_sync', [142, 35, 60, 10], 'Clock Division',
  'In ARP and ARP+, the note division Speed selects when the C64 follows MIDI clock (two Speed steps per division, 1/1 to 1/64 triplet). Without clock, Speed is a free-running rate.');
// live.comment glyphs render four pixels below their rectangle and a 9 px
// toggle's fill starts two below, so section titles sit three pixels higher.
text('title_vibrato', 'VIBRATO', [93, 85, 40, 12], 8, true);
infoZone('title_vibrato', [93, 85, 40, 12], 'Vibrato',
  'Pitch vibrato, switched on by the square. Freq is its depth, Rate its speed, Delay the wait before it starts; Type picks its shape and Retrig whether each new note restarts it. The mod wheel plays vibrato on top (see EXPR, Wheel).');
text('title_tremolo', 'TREMOLO', [93, 154, 60, 12], 8, true);
infoZone('title_tremolo', [93, 154, 60, 12], 'Tremolo',
  'Volume tremolo at full depth, switched on by the square; Rate sets its speed.');
text('title_sound', 'OSCILLATOR', [210, 1, 80, 12], 8, true);
infoZone('title_sound', [210, 1, 80, 12], 'Oscillator',
  'The waveform: Pulse, Saw and Triangle combine (combinations are quieter, depending on the SID chip); Noise plays on its own. Ring Mod (forces triangle) and Hard Sync are voice-1 effects and switch each other off. Click adds a short noise burst at each attack.');
text('title_pwm', 'PWM', [219, 85, 60, 12], 8, true);
infoZone('title_pwm', [219, 85, 60, 12], 'PWM',
  'Pulse-width modulation, switched on by the square. It shapes the pulse waveform: Width is where the sweep starts, Rate and Depth how fast and far it moves, Cycle its path and Retrig when it restarts.');
text('title_filter', 'FILTER', [334, 1, 54, 12], 8, true);
infoZone('title_filter', [334, 1, 54, 12], 'Filter',
  'The SID filter: Off, low-, band- or high-pass, with Cutoff and Reso. Rate, Cycle and Retrig run SID SYNTH\'s own automatic filter sweep, with Cutoff as its ceiling.');
text('title_envelope', 'ENVELOPE', [334, 85, 80, 12], 8, true);
infoZone('title_envelope', [334, 85, 80, 12], 'Envelope',
  'The SID volume envelope: Attack, Decay, Sustain and Release, 16 steps each. Retrig sets how a new note restarts it in the single-voice modes.');
panel('div_mode', 138, 40, 64, 1);
panel('div_vibrato', 86, 151, 116, 1);
panel('div_oscillator', 212, 84, 116, 1);
label('Retrig', 390, 85, 43, 2, 'lbl_env_retrig');
label('Target', 534, 33, 84, 0, 'lbl_expression_target');
label('Amount', 622, 33, 40, 0, 'lbl_expression_amount');
label('Velocity', 490, 45, 44, 0, 'lbl_velocity');
label('Pressure', 490, 65, 44, 0, 'lbl_pressure');
text('lbl_fenv_title', 'CUTOFF ENV', [499, 21, 120, 12], 8, true);
infoZone('lbl_fenv_title', [499, 21, 120, 12], 'Cutoff Envelope',
  'Live-side: a note-triggered ADSR that moves Cutoff over MIDI, with a bipolar Amount. Turn on the filter for it to be heard. Stored with the Live Set, not in the C64 sound.');
text('lbl_motion_title', 'STEP MOD', [499, 21, 80, 12], 8, true);
infoZone('lbl_motion_title', [499, 21, 80, 12], 'Step Mod',
  'Live-side: eight tempo-synced steps offset one setting while Live plays; Smooth glides between them, up to a drawable LFO. Its parameters are named Clocked Motion. Stored with the Live Set, not in the C64 sound.');
text('lbl_expression_title', 'EXPRESSION', [490, 21, 120, 12], 8, true);
infoZone('lbl_expression_title', [490, 21, 120, 12], 'Expression',
  'Live-side: velocity, aftertouch (Pressure), mod wheel, pitch bend and key tracking, each mapped to one setting with a bipolar amount, plus velocity scaling of the Cutoff Envelope. Stored with the Live Set.');

// M4L section page selector (CUT ENV / STEP MOD / EXPR), stored with the set.
const m4lTab = add({maxclass: 'live.tab', numinlets: 1, numoutlets: 3, outlettype: ['', '', 'float'], parameter_enable: 1,
  num_lines_patching: 1, num_lines_presentation: 1, mode: 0, fontsize: 7.5, patching_rect: [492, 3, 168, 13],
  presentation: 1, presentation_rect: [492, 3, 168, 13], varname: 'sid_m4l_page',
  saved_attribute_attributes: liveAttrs('M4L Section', 'M4L', 0, 2, 0, 2, ['CUT ENV', 'STEP MOD', 'EXPR'], 199,
    'Switches the shared Live-side panel between Cutoff Envelope, tempo-synced Motion, and performance Expression. The selected page is stored with the Live Set.')});
// Status dots on the page tab: round panels that sid_ui_logic.js colours from
// each page's on/off state. They ignore clicks, so the tab still gets them.
for (const [name, x] of [['dot_fenv', 495], ['dot_motion', 551], ['dot_expression', 607]]) {
  panel(name, x, 7, 5, 5, {background: 0, rounded: 4, ignoreclick: 1});
}

// ---------------------------------------------------------------------------
// Program strip, one tall cell: PATCH NAME and the name field; PATCH SELECT
// (bank menu and folder button, slot menu, < > SAVE); EDITED and the version;
// C64 SYNC; RANDOM and PANIC.
// ---------------------------------------------------------------------------
text('title_patch_name', 'PATCH NAME', [2, 1, 76, 12], 8, true);
infoZone('title_patch_name', [2, 1, 76, 12], 'Patch Name',
  'The name of the sound on the panel: the slot\'s name when you pick one, or RANDOM. Type a new name (up to 9 letters, digits or spaces, as on the C64) and SAVE stores the sound under it.');
// The menus are live.menus like MODE. A live.menu only draws its items as a
// parameter, so each is a Hidden parameter (not stored, not automatable) with
// no initial output; Preset Bank / Preset Slot (below) hold the stored state.
const NBSP = '\u00a0', ELLIPSIS = '\u2026';
const two = n => String(n).padStart(2, '0');
const slotItem = (index, name) => `${two(index + 1)}${NBSP}${String(name).replace(/ /g, NBSP)}`;
let stripOrder = 204;
function stripMenu(varname, longname, enums, rect, fontsize, info) {
  const attrs = liveAttrs(longname, longname, 0, enums.length - 1, 0, 2, enums, stripOrder++, info);
  attrs.valueof.parameter_invisible = 2;
  attrs.valueof.parameter_initial_enable = 0;
  return add({maxclass: 'live.menu', numinlets: 1, numoutlets: 3, outlettype: ['', '', 'float'], parameter_enable: 1,
    appearance: 0, fontsize, varname, patching_rect: rect, presentation: 1, presentation_rect: rect,
    saved_attribute_attributes: attrs});
}
const bankMenu = stripMenu('bank_title_menu', 'Bank Menu', [`NO${NBSP}BANKS`, `NEW${NBSP}BANK${ELLIPSIS}`], [4, 49, 56, 15], 8.5,
  'Chooses a bank: the SID SYNTH .SLO files in the SID SYNTH Banks folder of your Live User Library (copy SID SYNTH\'s own PRESETS1-5 there to use them), or NEW BANK to create one (rename or delete banks in the folder the folder button opens). Picking a bank loads its current slot and sends the whole sound to the C64.');
const slotMenu = stripMenu('sid_slot', 'Slot Menu', Array.from({length: 54}, (_, i) => slotItem(i, `INIT ${two(i + 1)}`)), [4, 66, 72, 15], 7.5,
  'Selects a sound slot in the bank and sends the whole sound to the C64 (Program Change, then every CC). While saving, it picks the slot to save into instead. A Program Change arriving on the track (from a clip, say) selects that slot too.');

// Beside the bank menu: open the bank folder.
const folderButton = button(' ', 62, 49, 14, 15, 'sid_bank_folder', 'Open Bank Folder',
  'Opens the bank folder in Finder (Explorer on Windows): SID SYNTH Banks in your Live User Library, under Presets > MIDI Effects > Max MIDI Effect. Put SID SYNTH .SLO banks there, such as SID SYNTH\'s own PRESETS1-5 copied from its disk image, and they appear in the bank menu at once. Rename or delete banks here, and copy them to your C64 disk the same way.',
  'sid_folder.svg');
const prevButton = button('<', 4, 83, 16, 15, 'sid_prev', 'Previous Slot', 'Selects the previous slot in the bank and sends its sound to the C64 (Program Change and every CC).');
const nextButton = button('>', 21, 83, 16, 15, 'sid_next', 'Next Slot', 'Selects the next slot in the bank and sends its sound to the C64 (Program Change and every CC).');
// SAVE opens save mode; it then reads STORE. CANCEL takes the place of < >.
const saveButton = button('SAVE', 39, 83, 37, 15, 'sid_save_patch', 'Save / Store',
  'Saves the current sound, under the name in PATCH NAME, into a bank. Press SAVE, choose the bank and slot in the menus above (the slot menu shows the sound you would replace), then press STORE, or CANCEL. The bank file is rewritten at once. With no banks yet, choose NEW BANK first.');
const cancelButton = button('CANCEL', 4, 83, 33, 15, 'sid_cancel', 'Cancel Save', 'Leaves save mode without saving.');
P.box(cancelButton).fontsize = 7;
const nameField = add({maxclass: 'textedit', numinlets: 1, numoutlets: 4, outlettype: ['', 'int', '', ''], parameter_enable: 0,
  bangmode: 1, keymode: 1, lines: 1, outputmode: 1, nosymquotes: 1, text: 'INIT 01', fontsize: 8.5, fontname: FONT,
  varname: 'sid_patch_name', patching_rect: [4, 14, 72, 15], presentation: 1, presentation_rect: [4, 14, 72, 15]});
// PATCH SELECT: a divider and title over the bank and slot controls.
panel('div_program', 4, 33, 72, 1);
text('title_patch_select', 'PATCH SELECT', [2, 34, 76, 12], 8, true);
infoZone('title_patch_select', [2, 34, 76, 12], 'Patch Select',
  'Choose a bank (the folder button opens the bank folder) and a slot to load a sound and send it to the C64; < and > step through the slots. SAVE stores the panel\'s sound, under PATCH NAME, into a slot of one of your banks.');
help(nameField, 'Patch Name', 'The name the sound is saved under: up to 9 letters, digits or spaces, as on the C64. Picking a slot shows its name. It is stored in the bank file; MIDI cannot send names, so the C64 shows its own slot name.');
text('lbl_dirty', 'EDITED', [2, 110, 40, 13], 7.5, true);
// The version, small and dim, at the right of the EDITED row.
text('lbl_version', `v${VERSION}`, [42, 110, 36, 13], 7, false, 2);
infoZone('lbl_dirty', [2, 110, 40, 13], 'Edited',
  'Lit while the sound on the panel differs from its slot, after an edit, RANDOM, or a Live Set reopened with unsaved changes. SAVE keeps the sound; picking a slot discards it.');
const resendButton = button('C64 SYNC', 4, 131, 72, 15, 'sid_resend', 'C64 Sync',
  'Sends the sound on the panel to the C64 now: Program Change for this slot number (so the C64 shows that slot), then all 34 controls over MIDI CC. No save needed. Use it after reconnecting or restarting SID SYNTH, or after changing the sound with the C64\'s own keys.');
// RANDOM and PANIC share the bottom row.
const randomButton = button('RANDOM', 4, 150, 35, 15, 'sid_random', 'Random Sound',
  'Makes a new random sound and sends it to the C64 as CCs on the current slot: a pluck, lead or pad envelope, waveform, filter and modulation chosen to stay playable (Ring and Sync never together). It replaces the panel\'s sound, named RANDOM and marked EDITED; SAVE keeps one you like.');
P.box(randomButton).fontsize = 7;
const panicButton = button('PANIC', 41, 150, 35, 15, 'sid_panic', 'Panic',
  'Sends All Sound Off and All Notes Off (CC120, CC123) to stop stuck notes. The sound is not changed.');
P.box(panicButton).fontsize = 7;

// ---------------------------------------------------------------------------
// Sound and performance controls
// ---------------------------------------------------------------------------
const ui = {};
const controlMessage = {};
CONTROLS.forEach((c, order) => {
  if (c.retired) return;
  const made = control(c, order);
  ui[c.key] = made.ui;
  controlMessage[c.key] = made.message;
});

// Cutoff Env shape editor, mirroring the four envelope dials.
const envShape = add({maxclass: 'live.adsrui', numinlets: 10, numoutlets: 10, outlettype: Array(10).fill(''), parameter_enable: 0,
  varname: 'sid_fenv_shape', patching_rect: [492, 36, 168, 58], presentation: 1, presentation_rect: [492, 36, 168, 58],
  attack_domain: [0, 2000], decay_domain: [0, 4000], release_domain: [0, 4000],
  attack_time: 20, decay_time: 300, sustain: 0.35, release_time: 300,
  initial: 0, peak: 1, final: 0, enable_initial: 0, enable_peak: 0, enable_final: 0,
  show_bounds: 0, show_slopehandles: 0, outputmode: 0, tethering: 0});
help(envShape, 'Cutoff Envelope Shape', 'Shows and edits the Live-side Cutoff Envelope: drag the handles to set Attack, Decay, Sustain and Release (the dials below follow). It moves Cutoff by MIDI CC on each note; it is stored with the Live Set, not in the C64 sound.');
const sustainToUnit = P.newobj('/ 100.', 1, ['float'], [900, 490, 52, 20]);
const sustainToPercent = P.newobj('* 100.', 1, ['float'], [958, 490, 52, 20]);
connect(ui.fenvattack, 0, envShape, 0);
connect(ui.fenvdecay, 0, envShape, 1);
connect(ui.fenvsustain, 0, sustainToUnit, 0); connect(sustainToUnit, 0, envShape, 2);
connect(ui.fenvrelease, 0, envShape, 3);
connect(envShape, 0, ui.fenvattack, 0);
connect(envShape, 1, ui.fenvdecay, 0);
connect(envShape, 2, sustainToPercent, 0); connect(sustainToPercent, 0, ui.fenvsustain, 0);
connect(envShape, 3, ui.fenvrelease, 0);

// Step Mod bars, mirroring the eight (hidden) step parameters.
const STEP_DEFAULTS = [100, 0, 75, -25, 50, -50, 25, -75];
const stepBars = add({maxclass: 'multislider', numinlets: 1, numoutlets: 2, outlettype: ['', ''], parameter_enable: 0,
  varname: 'sid_motion_steps', size: 8, setstyle: 1, signed: 1, setminmax: [-100, 100], spacing: 2, thickness: 17,
  patching_rect: [492, 74, 168, 70], presentation: 1, presentation_rect: [492, 74, 168, 70]});
help(stepBars, 'Step Mod Steps', 'Draw the eight Step Mod steps: above the centre line adds to the target, below subtracts, as a share of Amount. Steps past Len are darkened and skipped; the playhead marks the current step while Live plays. Each step is also an automatable parameter (Clocked Motion Step 1-8).');
// Click-through dressing above the bars: column gaps, a zero line, a mask per
// step (darkened beyond Len) and a 2 px playhead per step.
const overlay = (name, rect) => panel(name, ...rect, {background: 0, ignoreclick: 1});
for (let gap = 1; gap < 8; gap++) overlay(`step_gap_${gap}`, [492 + gap * 21, 74, 1, 70]);
overlay('step_zero', [492, 109, 168, 1]);
const stepColumn = step => [492 + (step - 1) * 21 + (step > 1 ? 1 : 0), step > 1 ? 20 : 21];
for (let step = 1; step <= 8; step++) { const [x, w] = stepColumn(step); overlay(`step_mask_${step}`, [x, 74, w, 70]); }
for (let step = 1; step <= 8; step++) { const [x, w] = stepColumn(step); overlay(`step_head_${step}`, [x, 72, w, 2]); }
const stepPack = P.newobj(`pak ${STEP_DEFAULTS.join(' ')}`, 8, [''], [900, 520, 250, 20]);
const stepSetList = P.prepend('setlist', [1158, 520, 92, 20]);
const stepUnpack = P.newobj('unpack 0 0 0 0 0 0 0 0', 1, Array(8).fill('int'), [900, 546, 210, 20]);
connect(stepPack, 0, stepSetList, 0); connect(stepSetList, 0, stepBars, 0);
connect(stepBars, 0, stepUnpack, 0);
for (let i = 0; i < 8; i++) {
  const step = ui[`motionstep${i + 1}`];
  connect(step, 0, stepPack, i);
  connect(stepUnpack, i, step, 0);
  label(String(i + 1), 492 + i * 21, 61, 21, 1, `lbl_motion_index_${i + 1}`);
  // 27 px wide (wider than the 21 px column) so "-35" stays on one line.
  const value = label(String(STEP_DEFAULTS[i]), 489 + i * 21, 146, 27, 1, `lbl_motion_value_${i + 1}`);
  P.box(value).fontsize = 8;
  const format = P.newobj('sprintf %d', 1, [''], [1130, 570 + i * 18, 70, 20]);
  const setValue = P.prepend('set', [1204, 570 + i * 18, 80, 20]);
  connect(step, 0, format, 0); connect(format, 0, setValue, 0); connect(setValue, 0, value, 0);
}

// What each M4L page shows; the others are hidden.
const range = (prefix, n) => Array.from({length: n}, (_, i) => `${prefix}${i + 1}`);
const M4L_PAGES = {
  fenv: ['sid_fenv_on', 'sid_fenv_amt', 'sid_fenv_atk', 'sid_fenv_dec', 'sid_fenv_sus', 'sid_fenv_rel', 'sid_fenv_shape',
    'lbl_fenv_title', 'info_lbl_fenv_title'],
  motion: ['sid_motion_on', 'sid_motion_target', 'sid_motion_division', 'sid_motion_length', 'sid_motion_amount',
    'sid_motion_smooth', 'lbl_motion_smooth', 'lbl_motion_title', 'info_lbl_motion_title', 'lbl_motion_target', 'lbl_motion_division',
    'lbl_motion_length', 'lbl_motion_amount', 'sid_motion_steps', ...range('lbl_motion_index_', 8),
    ...range('lbl_motion_value_', 8), ...range('step_gap_', 7), 'step_zero', ...range('step_mask_', 8), ...range('step_head_', 8)],
  expression: ['sid_velocity_target', 'sid_velocity_amount', 'sid_pressure_target', 'sid_pressure_amount',
    'lbl_expression_title', 'info_lbl_expression_title', 'lbl_expression_target', 'lbl_expression_amount', 'lbl_velocity', 'lbl_pressure',
    'sid_wheel_target', 'sid_wheel_amount', 'sid_bend_target', 'sid_bend_amount', 'sid_key_target', 'sid_key_amount',
    'sid_vel_env', 'lbl_wheel_row', 'lbl_bend_row', 'lbl_key_row', 'lbl_velenv_row']
};
const hiddenAtStart = new Set([...M4L_PAGES.motion, ...M4L_PAGES.expression, 'sid_cancel', 'btnbg_sid_cancel']);

// ---------------------------------------------------------------------------
// MIDI: track input, the controller, and output
// ---------------------------------------------------------------------------
const midiIn = P.newobj('midiin', 1, ['int'], [30, 270, 45, 20]);
const midiOut = P.newobj('midiout', 1, [], [300, 270, 50, 20]);
const controller = add({maxclass: 'v8.codebox', numinlets: 1, numoutlets: 3, outlettype: ['', '', ''], filename: 'none',
  code: controllerCode, saved_object_attributes: {parameter_enable: 0}, patching_rect: [120, 270, 520, 220], hidden: 1});
const byteList = P.newobj('iter', 1, ['int'], [300, 300, 35, 20]);
connect(controller, 0, byteList, 0); connect(byteList, 0, midiOut, 0);
for (const message of Object.values(controlMessage)) connect(message, 0, controller, 0);

// Pass-through. Incoming MIDI goes to midiout byte for byte, except while the
// mod wheel is mapped to a target (passmode 2): then it is parsed and rebuilt
// without CC1, so SID SYNTH's own wheel vibrato is not also triggered.
const passGate = P.newobj('gate 2 1', 2, ['', ''], [30, 300, 50, 20]);
const passParse = P.newobj('midiparse @hires 2', 1, Array(8).fill(''), [30, 330, 110, 20]);
const passFormat = P.newobj('midiformat @hires 2', 7, ['int', ''], [30, 390, 120, 20]);
const passDropWheel = P.newobj('route 1', 1, ['', ''], [80, 360, 50, 20]);
connect(midiIn, 0, passGate, 1); connect(passGate, 0, midiOut, 0); connect(passGate, 1, passParse, 0);
for (const outlet of [0, 1, 3, 4, 5, 6]) connect(passParse, outlet, passFormat, outlet);
connect(passParse, 2, passDropWheel, 0); connect(passDropWheel, 1, passFormat, 2);
connect(passFormat, 0, midiOut, 0);

// The controller also listens to notes, mod wheel, bend, aftertouch and
// (as raw "midievent" lists) Program Changes.
const parse = P.newobj('midiparse @hires 2', 1, Array(8).fill(''), [360, 270, 110, 20]);
const wheelOnly = P.newobj('route 1', 1, ['', ''], [480, 300, 50, 20]);
connect(midiIn, 0, parse, 0);
for (const [outlet, word, rect] of [[0, 'note', [430, 270, 90, 20]], [4, 'pressure', [430, 294, 108, 20]], [5, 'bend', [580, 324, 90, 20]]]) {
  const prefix = P.prepend(word, rect);
  connect(parse, outlet, prefix, 0); connect(prefix, 0, controller, 0);
}
const wheelPrefix = P.prepend('wheel', [480, 324, 90, 20]);
connect(parse, 2, wheelOnly, 0); connect(wheelOnly, 0, wheelPrefix, 0); connect(wheelPrefix, 0, controller, 0);
connect(parse, 7, controller, 0);

// 20 ms clock for the Cutoff Envelope and Step Mod's Smooth glide.
const tick20 = P.newobj('metro 20', 2, ['bang'], [530, 270, 58, 20]);
for (const [word, rect] of [['fenvtick', [595, 270, 66, 20]], ['motionglide', [595, 294, 80, 20]]]) {
  const message = P.message(word, rect);
  connect(tick20, 0, message, 0); connect(message, 0, controller, 0);
}

// Step Mod clock: a tempo-relative metro follows Live's transport; quantizing
// to the same division keeps step 1 on the grid.
const stepMetro = P.newobj('metro 16n @quantize 16n', 2, ['bang'], [20, 510, 168, 20]);
const stepTick = P.message('motiontick', [194, 510, 82, 20]);
connect(ui.motionon, 0, stepMetro, 0); connect(stepMetro, 0, stepTick, 0); connect(stepTick, 0, controller, 0);
const divisionSelect = P.newobj('sel 0 1 2 3 4 5 6 7', 1, Array(9).fill(''), [282, 510, 152, 20]);
connect(ui.motiondivision, 0, divisionSelect, 0);
const divisionMessages = ['4n', '8n', '8nt', '16n', '16nt', '16nd', '32n', '32nt'].map((division, i) => {
  const message = P.message(`interval ${division}, quantize ${division}`, [440, 510 + i * 22, 172, 20]);
  connect(divisionSelect, i, message, 0); connect(message, 0, stepMetro, 0);
  return message;
});
// A new playback pass restarts at step 1.
const transport = P.newobj('transport', 1, ['int', 'int', 'float', 'float', 'float', '', 'int', 'float', ''], [620, 510, 68, 20]);
const transportChange = P.newobj('change', 1, ['int'], [694, 510, 48, 20]);
const transportStarted = P.newobj('sel 1', 1, ['bang', ''], [748, 510, 42, 20]);
const stepReset = P.message('motionreset', [796, 510, 88, 20]);
connect(tick20, 0, transport, 0); connect(transport, 6, transportChange, 0); connect(transportChange, 0, transportStarted, 0);
connect(transportStarted, 0, stepReset, 0); connect(stepReset, 0, controller, 0);

// ---------------------------------------------------------------------------
// Panel -> controller
// ---------------------------------------------------------------------------
const channel = add({maxclass: 'live.numbox', numinlets: 1, numoutlets: 2, outlettype: ['', 'float'], parameter_enable: 1,
  patching_rect: [56, 70, 40, 16], presentation: 0, presentation_rect: [56, 70, 40, 16], varname: 'midi_channel',
  saved_attribute_attributes: liveAttrs('MIDI Channel', 'CH', 1, 16, 1, 0, null, 102, 'MIDI channel sent to SID SYNTH.')});
const channelPrefix = P.prepend('channel', [620, 270, 105, 20]);
connect(channel, 0, channelPrefix, 0); connect(channelPrefix, 0, controller, 0);

for (const [buttonId, command, rect] of [[resendButton, 'RESEND', [860, 246, 58, 20]], [panicButton, 'PANIC', [922, 246, 50, 20]],
  [randomButton, 'RANDOM', [976, 246, 60, 20]], [folderButton, 'SHOWFOLDER', [1040, 246, 80, 20]],
  [cancelButton, 'CANCELSAVE', [1265, 376, 80, 20]]]) {
  const message = P.message(command, rect);
  connect(buttonId, 0, message, 0); connect(message, 0, controller, 0);
}
// SAVE / STORE: the name field outputs its text first, then SAVEPATCH.
const saveTrigger = P.newobj('t b b', 1, ['bang', 'bang'], [1218, 350, 42, 20]);
const saveMessage = P.message('SAVEPATCH', [1265, 350, 76, 20]);
connect(saveButton, 0, saveTrigger, 0); connect(saveTrigger, 1, nameField, 0);
connect(saveTrigger, 0, saveMessage, 0); connect(saveMessage, 0, controller, 0);
const nameText = P.newobj('route text', 1, ['', ''], [930, 350, 70, 20]);
const namePrefix = P.prepend('patchname', [1005, 350, 118, 20]);
connect(nameField, 0, nameText, 0); connect(nameText, 0, namePrefix, 0); connect(namePrefix, 0, controller, 0);

// Stored location: Preset Bank (1-5 factory, 6 = user bank), Preset Slot,
// the user bank's name (a Stored Only pattr) and Panel Stored (0 on a fresh
// device, 1 once loaded, so a reopened set keeps its panel).
const presetBank = add({maxclass: 'live.numbox', numinlets: 1, numoutlets: 2, outlettype: ['', 'float'], parameter_enable: 1,
  patching_rect: [380, 300, 36, 19], hidden: 1, varname: 'factory_bank',
  saved_attribute_attributes: liveAttrs('Preset Bank', 'BANK', 1, 6, 1, 0, null, 100)});
const presetSlot = add({maxclass: 'live.numbox', numinlets: 1, numoutlets: 2, outlettype: ['', 'float'], parameter_enable: 1,
  patching_rect: [500, 300, 38, 19], hidden: 1, varname: 'factory_preset',
  saved_attribute_attributes: liveAttrs('Preset Slot', 'PRESET', 1, 54, 1, 0, null, 101)});
const userBankName = P.newobj('pattr sid_user_bank', 1, ['', '', ''], [1110, 400, 120, 20], {parameter_enable: 1, varname: 'sid_user_bank',
  saved_attribute_attributes: {valueof: {parameter_longname: 'User Bank Name', parameter_shortname: 'User Bank', parameter_type: 3,
    parameter_invisible: 1, parameter_initial_enable: 0, parameter_order: 203}}});
const panelStoredAttrs = liveAttrs('Panel Stored', 'STORED', 0, 1, 0, 0, null, 220, 'Set once the device has loaded, so a reopened Live Set keeps its panel.');
panelStoredAttrs.valueof.parameter_invisible = 1;
const panelStored = add({maxclass: 'live.numbox', numinlets: 1, numoutlets: 2, outlettype: ['', 'float'], parameter_enable: 1,
  patching_rect: [1180, 318, 36, 19], hidden: 1, varname: 'panel_stored', saved_attribute_attributes: panelStoredAttrs});
const presetPrefix = P.prepend('preset', [500, 270, 105, 20]);
connect(presetSlot, 0, presetPrefix, 0); connect(presetPrefix, 0, controller, 0);
for (const [source, word, rect] of [[presetBank, 'bank', [380, 270, 105, 20]], [bankMenu, 'bankpick', [420, 300, 110, 20]],
  [userBankName, 'restorebankname', [1110, 424, 150, 20]], [panelStored, 'panelstored', [1180, 342, 120, 20]]]) {
  const prefix = P.prepend(word, rect);
  connect(source, 0, prefix, 0); connect(prefix, 0, controller, 0);
}
// Picking from the slot menu stores Preset Slot (1-based) silently, then recalls.
const slotToPreset = P.newobj('+ 1', 2, ['int'], [620, 300, 34, 20]);
const slotPick = P.newobj('t i i', 1, ['int', 'int'], [660, 324, 42, 20]);
const setPresetSlot = P.prepend('set', [710, 324, 90, 20]);
connect(slotMenu, 0, slotToPreset, 0); connect(slotToPreset, 0, slotPick, 0);
connect(slotPick, 1, setPresetSlot, 0); connect(setPresetSlot, 0, presetSlot, 0);
connect(slotPick, 0, presetPrefix, 0);
// < and > step the slot menu.
for (const [buttonId, delta, x] of [[prevButton, -1, 900], [nextButton, 1, 1040]]) {
  const current = P.newobj('i 0', 2, ['int'], [x, 318, 32, 20]);
  const step = P.newobj(`${delta < 0 ? '-' : '+'} 1`, 2, ['int'], [x + 36, 318, 32, 20]);
  const limit = P.newobj('clip 0 53', 3, ['int'], [x + 72, 318, 62, 20]);
  connect(slotMenu, 0, current, 1); connect(buttonId, 0, current, 0);
  connect(current, 0, step, 0); connect(step, 0, limit, 0); connect(limit, 0, slotMenu, 0);
}

// Bank files: the Node for Max helper, and the dialog for bank names.
const bankFiles = P.newobj('node.script sid_banks.js @autostart 1', 1, ['', ''], [1110, 450, 220, 20], {varname: 'sid_bank_files'});
connect(bankFiles, 0, controller, 0);
const nameDialog = P.newobj('dialog', 2, ['', 'bang', 'bang'], [1110, 500, 50, 20]);
const dialogText = P.prepend('dialogtext', [1110, 526, 120, 20]);
const dialogCancel = P.message('dialogcancel', [1235, 526, 80, 20]);
connect(nameDialog, 0, dialogText, 0); connect(dialogText, 0, controller, 0);
connect(nameDialog, 1, dialogCancel, 0); connect(dialogCancel, 0, controller, 0);

// ---------------------------------------------------------------------------
// Controller -> panel
// ---------------------------------------------------------------------------
// Outlet 1: control values, set silently on each control and its displays.
const uiLogic = P.newobj('js sid_ui_logic.js', 1, [], [660, 270, 118, 20]);
const UI_LOGIC_KEYS = {playmode: 'mode', ring: 'ringm', pwmon: 'pwm', vibon: 'vib', tremon: 'trem', fenvon: 'fenv', motionon: 'motion',
  filtermode: 'ftype', veltarget: 'vel', presstarget: 'press', porta: 'porta', motionlength: 'len',
  wheeltarget: 'wheel', bendtarget: 'bend', keytarget: 'key', velenv: 'velenv'};
const uiLogicPrefix = {};
Object.entries(UI_LOGIC_KEYS).forEach(([key, word], i) => {
  uiLogicPrefix[key] = P.prepend(word, [790, 270 + i * 22, 100, 20]);
  connect(ui[key], 0, uiLogicPrefix[key], 0); connect(uiLogicPrefix[key], 0, uiLogic, 0);
});
const keys = Object.keys(ui);
const stateRoute = P.newobj(`route ${keys.join(' ')}`, 1, Array(keys.length + 1).fill(''), [20, 1090, 900, 20]);
connect(controller, 1, stateRoute, 0);
keys.forEach((key, i) => {
  const silent = P.prepend('set', [930, 1090 + i * 2, 82, 20]);
  connect(stateRoute, i, silent, 0); connect(silent, 0, ui[key], 0);
  if (uiLogicPrefix[key]) connect(stateRoute, i, uiLogicPrefix[key], 0);
  if (key === 'fenvattack') connect(stateRoute, i, envShape, 0);
  if (key === 'fenvdecay') connect(stateRoute, i, envShape, 1);
  if (key === 'fenvsustain') connect(stateRoute, i, sustainToUnit, 0);
  if (key === 'fenvrelease') connect(stateRoute, i, envShape, 3);
  if (key.startsWith('motionstep')) connect(stateRoute, i, stepPack, Number(key.slice(10)) - 1);
});

// Outlet 2: panel commands. Anything unmatched (slot items, "set n") goes to
// the slot menu.
const UI_COMMANDS = ['patchname', 'saveok', 'motionstep', 'passmode', 'status', 'userbank', 'bankitems', 'bankset', 'slotparam',
  'bankparam', 'savemode', 'node', 'dialoglabel', 'dialogopen', 'edited', 'arpsync', 'panelstored'];
const uiRoute = P.newobj(`route ${UI_COMMANDS.join(' ')}`, 1, Array(UI_COMMANDS.length + 1).fill(''), [815, 324, 600, 20]);
const route = (command, destination, inlet = 0) => connect(uiRoute, UI_COMMANDS.indexOf(command), destination, inlet);
connect(controller, 2, uiRoute, 0);
connect(uiRoute, UI_COMMANDS.length, slotMenu, 0);
const setter = (command, destination, rect) => { const prefix = P.prepend('set', rect); route(command, prefix); connect(prefix, 0, destination, 0); };
setter('patchname', nameField, [1128, 350, 82, 20]);
// Status messages (what the device did, problems with bank files) go to
// Max's console rather than the panel.
const statusLog = P.newobj('print SID SYNTH', 1, [], [815, 400, 100, 20]);
route('status', statusLog);
setter('arpsync', arpSyncLabel, [1090, 318, 82, 20]);
setter('bankset', bankMenu, [605, 300, 90, 20]);
setter('bankparam', presetBank, [605, 324, 90, 20]);
setter('panelstored', panelStored, [1180, 294, 82, 20]);
route('slotparam', setPresetSlot);
route('bankitems', bankMenu);
route('userbank', userBankName);
route('node', bankFiles);
route('passmode', passGate);
for (const [command, word, destination, rect] of [['dialoglabel', 'label', nameDialog, [1110, 476, 90, 20]],
  ['dialogopen', 'symbol', nameDialog, [1205, 476, 100, 20]], ['savemode', 'savemode', uiLogic, [905, 400, 110, 20]],
  ['motionstep', 'playhead', uiLogic, [1120, 324, 110, 20]]]) {
  const prefix = P.prepend(word, rect);
  route(command, prefix); connect(prefix, 0, destination, 0);
}

// EDITED: any stored-sound control lights it ("dirty 1"); a recall or save
// clears it (saveok -> "dirty 0"); a reopened set that differs from its slot
// lights it at once ("edited" -> "dirty 2", which passes the load-time gate).
const dirtyOn = P.message('dirty 1', [900, 294, 45, 20]);
const dirtyOff = P.message('dirty 0', [950, 294, 45, 20]);
const dirtyRestored = P.message('dirty 2', [1035, 318, 45, 20]);
const anySoundEdit = P.newobj('t b', 1, ['bang'], [1000, 294, 30, 20]);
const PERFORMANCE_KEY = /^(fenv|motion|vel|press|wheel|bend|key)/;
for (const key of keys) if (!PERFORMANCE_KEY.test(key)) connect(ui[key], 0, anySoundEdit, 0);
connect(anySoundEdit, 0, dirtyOn, 0); connect(dirtyOn, 0, uiLogic, 0);
route('saveok', dirtyOff); connect(dirtyOff, 0, uiLogic, 0);
route('edited', dirtyRestored); connect(dirtyRestored, 0, uiLogic, 0);

// Panel logic inputs: page tab, menus (slot changes), button presses.
const thisDevice = P.newobj('live.thisdevice', 1, ['bang', 'bang'], [660, 246, 92, 20]);
connect(thisDevice, 0, uiLogic, 0);
const pagePrefix = P.prepend('page', [790, 470, 100, 20]);
connect(m4lTab, 0, pagePrefix, 0); connect(pagePrefix, 0, uiLogic, 0);
const slotPrefix = P.prepend('slot', [900, 270, 90, 20]);
connect(slotMenu, 0, slotPrefix, 0); connect(bankMenu, 0, slotPrefix, 0); connect(slotPrefix, 0, uiLogic, 0);
[[prevButton, 'sid_prev'], [nextButton, 'sid_next'], [saveButton, 'sid_save_patch'], [cancelButton, 'sid_cancel'],
  [resendButton, 'sid_resend'], [panicButton, 'sid_panic'], [randomButton, 'sid_random'], [folderButton, 'sid_bank_folder']].forEach(([buttonId, name], i) => {
  const press = P.prepend(`press ${name}`, [1240, 300 + i * 24, 150, 20]);
  connect(buttonId, 0, press, 0); connect(press, 0, uiLogic, 0);
});

// M4L page switching: show one page's objects, hide the others.
const thispatcher = P.newobj('thispatcher', 1, ['', ''], [20, 1260, 70, 20]);
const pageSelect = P.newobj('sel 0 1 2', 1, ['bang', 'bang', 'bang', ''], [20, 1316, 72, 20]);
connect(m4lTab, 0, pageSelect, 0);
Object.keys(M4L_PAGES).forEach((active, i) => {
  const commands = [];
  for (const [page, names] of Object.entries(M4L_PAGES)) for (const name of names) commands.push(`script sendbox ${name} hidden ${page === active ? 0 : 1}`);
  const message = P.message(commands.join(', '), [100, 1316 + i * 24, 1200, 20]);
  connect(pageSelect, i, message, 0); connect(message, 0, thispatcher, 0);
});

// Load: start the 20 ms clock and show the first M4L page and the step bars
// at once. LOADED waits for live.thisdevice, which fires once Live has restored
// every parameter (a fixed delay after loadbang can arrive before the last
// stored values when Live is busy), plus a short margin.
const loadbang = P.newobj('loadbang', 1, ['bang'], [20, 1130, 60, 20]);
const afterRestore = P.newobj('del 100', 2, ['bang'], [90, 1130, 50, 20]);
const loaded = P.message('LOADED', [150, 1130, 55, 20]);
const firstPage = P.message('bang', [212, 1154, 38, 20]);
const clockOn = P.message('1', [248, 1130, 28, 20]);
connect(thisDevice, 0, afterRestore, 0); connect(afterRestore, 0, loaded, 0); connect(loaded, 0, controller, 0);
connect(afterRestore, 0, uiLogic, 0);
connect(loadbang, 0, firstPage, 0); connect(firstPage, 0, m4lTab, 0);
connect(loadbang, 0, stepPack, 0);
connect(loadbang, 0, clockOn, 0); connect(clockOn, 0, tick20, 0);
connect(loadbang, 0, divisionMessages[3], 0);

// ---------------------------------------------------------------------------
// Colours and type, all from the palette (sid_palette.js), which
// sid_ui_logic.js also uses at run time, so the two never disagree.
// ---------------------------------------------------------------------------
const PANEL_COLOURS = [['device_background', 'gutter'], ['oscillator', 'display'], ['btnbg_', 'off'], ['dot_', 'dotOff'],
  ['step_gap_', 'stepGap'], ['step_zero', 'zeroLine'], ['step_mask_', 'field'], ['step_head_', 'accent']];
for (const {box} of P.boxes) {
  if (!box.presentation_rect) continue;
  const name = box.varname || '';
  const display = PALETTE.isDisplayRect(box.presentation_rect);
  if (hiddenAtStart.has(name)) box.hidden = 1;
  if (box.maxclass === 'panel') {
    let colour = 'cell';
    for (const [part, value] of PANEL_COLOURS) if (name.includes(part)) colour = value;
    if (name.startsWith('div_')) colour = display ? 'dividerDisplay' : 'divider';
    box.bgfillcolor = PALETTE.color(colour);
    box.bordercolor = PALETTE.color(colour);
    // Step masks and playheads start clear; sid_ui_logic.js lights them.
    if (name.startsWith('step_mask_') || name.startsWith('step_head_')) { box.bgfillcolor[3] = 0; box.bordercolor[3] = 0; }
    continue;
  }
  const role = PALETTE.roleOf(box.maxclass, name);
  if (!role) continue;
  Object.assign(box, PALETTE.style(role, display, false));
  box.fontname = FONT;
  switch (role) {
    case 'title': box.fontsize = 8; box.fontface = 1; box.ignoreclick = 1; break;
    case 'caption': box.fontsize = 7.5; box.fontface = 1; box.ignoreclick = 1; break;
    case 'label': box.fontsize = box.fontsize || 8.5; box.fontface = 0; box.ignoreclick = 1; break;
    case 'dial': box.fontsize = 8.5; box.fontface = 0; break;
    case 'numbox': box.appearance = 0; box.fontsize = 8.5; box.fontface = 0; box.textjustification = 1; break;
    case 'menu': box.appearance = 0; box.fontsize = box.fontsize || 8.5; box.fontface = 0; break;
    case 'tab': box.rounded = 0; box.fontsize = box.fontsize || 8.5; box.fontface = 1; box.spacing_x = 1; box.spacing_y = 0; break;
    case 'ghost': case 'button': box.rounded = 0; box.appearance = 0; box.fontsize = box.fontsize || 8.5; box.fontface = 1; break;
    case 'square': box.rounded = 0; box.appearance = 0; break;
    case 'textedit': box.rounded = 0; box.fontsize = box.fontsize || 8.5; box.fontface = 0; break;
  }
}
// The version label is dimmed like a muted label.
Object.assign(P.boxes.find(entry => entry.box.varname === 'lbl_version').box, PALETTE.style('label', false, true));
// EDITED starts invisible (accent at zero alpha).
const edited = P.boxes.find(entry => entry.box.varname === 'lbl_dirty').box;
edited.textcolor = PALETTE.color('accent'); edited.textcolor[3] = 0;

// Max draws earlier boxes on top within a layer: button fills and dividers
// must sit above the cells, the page dots above the page tab, and the help
// zones above the text they explain.
const drawFirst = entry => /^(btnbg_|div_|dot_|step_|info_)/.test(entry.box.varname || '') ? 0 : 1;
P.boxes.sort((a, b) => drawFirst(a) - drawFirst(b));

// ---------------------------------------------------------------------------
// Write the device
// ---------------------------------------------------------------------------
const patcher = {
  fileversion: 1,
  appversion: {major: 9, minor: 1, revision: 5, architecture: 'arm64', modernui: 1},
  classnamespace: 'box', rect: [40, 80, 1450, 760], openrect: [0, 0, WIDTH, HEIGHT], bglocked: 0, openinpresentation: 1,
  default_fontsize: 10, default_fontface: 0, default_fontname: 'Ableton Sans', gridonopen: 1, gridsize: [8, 8], gridsnaponopen: 1,
  objectsnaponopen: 1, statusbarvisible: 2, toolbarvisible: 1, lefttoolbarpinned: 0, toptoolbarpinned: 0, righttoolbarpinned: 0,
  bottomtoolbarpinned: 0, toolbars_unpinned_last_save: 0, tallnewobj: 0, boxanimatetime: 200, enablehscroll: 0, enablevscroll: 0,
  devicewidth: WIDTH,
  description: 'Controller for LukHash SID SYNTH on a Commodore 64, using its default CC map.',
  digest: 'Controls and automates SID SYNTH from Ableton Live.', tags: 'MIDI C64 SID controller', title: 'Max MIDI Effect',
  boxes: P.boxes, lines: P.lines,
  // Scripts and icons are found next to the device.
  dependency_cache: ['sid_ui_logic.js', 'sid_banks.js', ...ICONS].map(name =>
    ({name, bootpath: '.', patcherrelativepath: '.', type: name.endsWith('.svg') ? 'SVG' : 'TEXT', implicit: 1})),
  latency: 0,
  project: {version: 1, creationdate: 3983337600, modificationdate: 3983337600, viewrect: [0, 0, 300, 500], autoorganize: 1,
    hideprojectwindow: 1, showdependencies: 1, autolocalize: 0, contents: {patchers: {}}, layout: {}, searchpath: {}, detailsvisible: 0,
    amxdtype: 1835887981, readonly: 0, devpathtype: 0, devpath: '.', sortmode: 0, viewmode: 0}
};
const json = writeDevice(path.join(OUT_DIR, `${DEVICE_NAME}.amxd`), patcher);
fs.writeFileSync(path.join(OUT_DIR, `${DEVICE_NAME}.maxpat`), json);
console.log(`Built ${path.relative(ROOT, OUT_DIR)}/${DEVICE_NAME}.amxd (${P.boxes.length} boxes)`);
