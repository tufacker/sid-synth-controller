/*
 * Checks a built device: files present, parameters unchanged, layout sane.
 *   npm run verify            check dist/ for the current version
 *   npm run verify -- --lock  record the current parameter table as the new reference
 *
 * The parameter table (names, order numbers, ranges, menus) is what saved Live
 * Sets and automation refer to. test/fixtures/parameters.json is the reference;
 * any difference fails here, so a rename or reorder is never accidental.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION = require('../package.json').version;
const DIR = path.join(ROOT, 'dist', `SID-SYNTH-M4L-v${VERSION}`);
const NAME = 'SID SYNTH Controller';
const PARAMETERS = path.join(ROOT, 'test', 'fixtures', 'parameters.json');

const fail = message => { console.error(`verify: ${message}`); process.exit(1); };

for (const file of [`${NAME}.amxd`, `${NAME}.maxpat`, 'README.md', 'SETUP_GUIDE.md', 'default_cc_map.csv',
  'sid_ui_logic.js', 'sid_banks.js', 'sid_folder.svg', 'sid_wave_noise.svg', 'sid_wave_pulse.svg', 'sid_wave_saw.svg', 'sid_wave_tri.svg']) {
  if (!fs.existsSync(path.join(DIR, file))) fail(`missing ${file}`);
}

const amxd = fs.readFileSync(path.join(DIR, `${NAME}.amxd`));
if (amxd.subarray(0, 4).toString() !== 'ampf') fail('the .amxd header is wrong');
if (/\/Users\/|\/home\/|[A-Z]:\\\\/.test(amxd.toString('utf8'))) fail('the .amxd contains an absolute file path');

const boxes = JSON.parse(fs.readFileSync(path.join(DIR, `${NAME}.maxpat`), 'utf8')).patcher.boxes.map(entry => entry.box);
const byName = name => boxes.find(box => box.varname === name);

// The controller script parses, and the scripts it relies on are referenced.
const controller = boxes.find(box => box.maxclass === 'v8.codebox');
if (!controller) fail('no v8.codebox controller');
try { new Function(controller.code); } catch (error) { fail(`controller code does not parse: ${error.message}`); }
for (const text of ['js sid_ui_logic.js', 'node.script sid_banks.js @autostart 1', 'live.thisdevice']) {
  if (!boxes.some(box => box.text === text)) fail(`missing object: ${text}`);
}

// Parameters.
const parameters = boxes
  .filter(box => box.parameter_enable && box.saved_attribute_attributes && box.saved_attribute_attributes.valueof)
  .map(box => {
    const v = box.saved_attribute_attributes.valueof;
    return {name: v.parameter_longname, short: v.parameter_shortname, order: v.parameter_order, type: v.parameter_type,
      min: v.parameter_mmin, max: v.parameter_mmax, initial: v.parameter_initial, enum: v.parameter_enum,
      invisible: v.parameter_invisible, unitstyle: v.parameter_unitstyle, varname: box.varname};
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
const orders = parameters.map(p => p.order);
if (new Set(orders).size !== orders.length) fail('two parameters share an order number');
if (process.argv.includes('--lock')) {
  fs.writeFileSync(PARAMETERS, JSON.stringify(parameters, null, 1) + '\n');
  console.log(`Locked ${parameters.length} parameters in ${path.relative(ROOT, PARAMETERS)}`);
} else {
  const reference = JSON.parse(fs.readFileSync(PARAMETERS, 'utf8'));
  const key = p => p.name;
  const now = new Map(parameters.map(p => [key(p), JSON.stringify(p)]));
  for (const p of reference) {
    if (!now.has(key(p))) fail(`parameter "${p.name}" was removed or renamed`);
    if (now.get(key(p)) !== JSON.stringify(p)) fail(`parameter "${p.name}" changed:\n  was ${JSON.stringify(p)}\n  now ${now.get(key(p))}`);
  }
  const added = parameters.filter(p => !reference.some(r => r.name === p.name));
  if (added.length) fail(`new parameters ${added.map(p => p.name).join(', ')}: check they are appended, then run with --lock`);
}

// Colours come only from the palette: no Live theme expressions remain.
for (const box of boxes) {
  const attrs = box.saved_attribute_attributes || {};
  for (const [key, value] of Object.entries(attrs)) {
    if (/color$/.test(key) && value && value.expression) fail(`${box.varname || box.maxclass} still uses theme colour ${key}`);
  }
}

// Every visible control sits inside one cell, and none overlap.
const CELLS = [[0, 0, 80, 169], [82, 0, 124, 84], [82, 85, 124, 84], [208, 0, 124, 169], [334, 0, 152, 84],
  [334, 85, 152, 84], [488, 0, 176, 169]];
const inCell = r => CELLS.some(c => r[0] >= c[0] && r[1] >= c[1] && r[0] + r[2] <= c[0] + c[2] && r[1] + r[3] <= c[1] + c[3]);
const INTERACTIVE = new Set(['live.dial', 'live.numbox', 'live.menu', 'live.tab', 'textedit']);
const visible = boxes.filter(box => box.presentation === 1 && INTERACTIVE.has(box.maxclass) && !box.hidden);
for (const box of visible) if (!inCell(box.presentation_rect)) fail(`${box.varname} ${JSON.stringify(box.presentation_rect)} is not inside one cell`);
for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
  const a = visible[i].presentation_rect, b = visible[j].presentation_rect;
  if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) {
    fail(`${visible[i].varname} overlaps ${visible[j].varname}`);
  }
}
for (const name of ['sid_mode_play', 'sid_filter_cutoff', 'sid_save_patch', 'btnbg_sid_save_patch', 'lbl_dirty', 'title_patch_select']) {
  if (!byName(name)) fail(`missing scripting name ${name}`);
}

// Every visible control the mouse can reach has Info View help: parameter info, or an annotation.
const CONTROLS = new Set(['live.dial', 'live.numbox', 'live.menu', 'live.tab', 'live.text', 'live.slider', 'textedit',
  'multislider', 'live.adsrui']);
for (const box of boxes) {
  if (box.presentation !== 1 || !CONTROLS.has(box.maxclass) || box.ignoreclick) continue;
  const valueof = box.saved_attribute_attributes && box.saved_attribute_attributes.valueof;
  const info = (valueof && valueof.parameter_info) || box.annotation;
  if (!info || info.length < 20) fail(`${box.varname} has no Info View help`);
}
// The version is shown on the panel.
const versionLabel = byName('lbl_version');
if (!versionLabel || versionLabel.text !== `v${VERSION}`) fail('the panel does not show the version');

console.log(`Verified ${NAME} ${VERSION}: ${boxes.length} boxes, ${parameters.length} parameters`);
