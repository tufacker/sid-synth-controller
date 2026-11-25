/*
 * SID SYNTH controller: the device's brain, run by the v8.codebox in the patch.
 *
 * It keeps the sound state, turns it into SID SYNTH's MIDI (Program Change and
 * the official default CC map), recalls and stores sounds in .SLO banks (via the
 * sid_banks.js helper), and adds the Live-side performance layers (Cutoff
 * Envelope, Step Mod, Expression). It never draws anything itself: it tells the
 * patch what to show.
 *
 * Outlets
 *   0  MIDI bytes, one message per list (0xB0 cc value, 0xC0 program)
 *   1  control values to show without re-sending ("cutoff 64"); the patch sets
 *      each control silently, so a recall does not fill Live's undo history
 *   2  panel commands (menus, status messages, save mode, Node helper requests...)
 *
 * Messages in: set <control> <value>, wavebit, bank, preset, bankpick,
 * patchname, RESEND, PANIC, RANDOM, SHOWFOLDER, SAVEPATCH, CANCELSAVE, LOADED, panelstored,
 * restorebankname, dialogtext, dialogcancel, channel, note, wheel, bend,
 * pressure, midievent, fenvtick, motiontick, motionglide, motionreset, and the
 * Node helper's replies (banks, bankdata, banksaved, bankcreated, folderopened,
 * bankerror).
 */
inlets = 1;
outlets = 3;

var MIDI = 0, STATE = 1, UI = 2;

// ---------------------------------------------------------------------------
// Sound parameters and SID SYNTH's default CC map
// ---------------------------------------------------------------------------
var cc = {
  vibwheel: 1, vibfreq: 77, vibrate: 76, vibtype: 79, vibdelay: 78,
  vibretrig: 80, vibon: 81, cutoff: 74, resonance: 71,
  filterrate: 82, filtercycle: 83, filtermode: 85, filterretrig: 86,
  pwmwidth: 102, pwmrate: 103, pwmdepth: 104, pwmcycle: 105,
  pwmretrig: 106, pwmon: 107, playmode: 22, wave: 28,
  arpspeed: 31, arpdir: 23, porta: 30, ring: 25, sync: 26,
  tremrate: 14, tremon: 15, click: 27, attack: 73, decay: 75,
  sustain: 70, release: 72, envretrig: 67
};

// The order a whole sound is sent in.
var order = [
  "playmode", "arpspeed", "arpdir", "porta",
  "attack", "decay", "sustain", "release", "envretrig",
  "wave", "ring", "sync", "click", "tremon", "tremrate",
  "pwmwidth", "pwmrate", "pwmdepth", "pwmcycle", "pwmretrig", "pwmon",
  "filtermode", "cutoff", "resonance", "filterrate", "filtercycle", "filterretrig",
  "vibwheel", "vibfreq", "vibrate", "vibtype", "vibdelay", "vibretrig", "vibon"
];

var state = {
  playmode: 1, arpspeed: 8, arpdir: 1, porta: 0,
  attack: 4, decay: 8, sustain: 6, release: 0, envretrig: 0,
  wave: 0, ring: 0, sync: 0, click: 0, tremon: 0, tremrate: 17,
  pwmwidth: 120, pwmrate: 19, pwmdepth: 22, pwmcycle: 0, pwmretrig: 0, pwmon: 0,
  filtermode: 0, cutoff: 64, resonance: 0, filterrate: 16, filtercycle: 0, filterretrig: 0,
  vibwheel: 0, vibfreq: 1, vibrate: 30, vibtype: 0, vibdelay: 0, vibretrig: 0, vibon: 0
};

var midiChannel = 1;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// Panel value -> CC value. Cutoff and PWM Width use SID SYNTH's full 0-127 MIDI
// resolution; a saved .SLO slot keeps only their nearest 32-step value.
function encode(name, value) {
  var v = Math.round(value);
  if (name === "cutoff" || name === "pwmwidth" || name === "vibwheel") return clamp(value, 0, 127);
  if (name === "wave") return clamp(v, 0, 7) * 16;
  if (name === "filtermode" || name === "vibtype" || name === "pwmcycle") return clamp(v, 0, 3) * 32;
  if (name === "attack" || name === "decay" || name === "sustain" || name === "release" || name === "resonance") {
    return clamp(v, 0, 15) * 8;
  }
  if (name === "pwmrate" || name === "pwmdepth" || name === "filterrate" || name === "vibfreq" || name === "vibdelay" || name === "tremrate") {
    return clamp(v, 0, 31) * 4;
  }
  if (name === "vibrate") return (clamp(v, 1, 32) - 1) * 4;
  if (name === "filtercycle") return [0, 26, 51, 77, 102][clamp(v, 0, 4)];
  if (name === "filterretrig" || name === "pwmretrig" || name === "envretrig" || name === "arpdir") {
    return [0, 43, 86][clamp(v, 0, 2)];
  }
  if (name === "playmode") return clamp(v, 0, 6) * 19;
  if (name === "arpspeed") {
    v = clamp(v, 1, 31);
    return v <= 1 ? 0 : v * 4;
  }
  if (name === "porta" || name === "ring" || name === "sync" || name === "tremon" || name === "click" || name === "pwmon" || name === "vibon" || name === "vibretrig") {
    return v ? 127 : 0;
  }
  return clamp(v, 0, 127);
}

// ---------------------------------------------------------------------------
// Loading. Live restores every stored parameter before the patch's delayed
// LOADED message. Until then nothing is sent and no slot is applied, so a
// reopened Live Set keeps its saved panel (edits included) and sends it once.
// ---------------------------------------------------------------------------
var loading = true;
var restoring = false;      // the next recall keeps the panel instead of applying its slot
var restoredPanel = false;  // Panel Stored came back as 1: a saved set or a duplicate
var loadWave = {pulse:1, saw:0, tri:0, noise:0};

// ---------------------------------------------------------------------------
// MIDI out
// ---------------------------------------------------------------------------
function emitCC(name) {
  if (loading || !cc.hasOwnProperty(name) || !state.hasOwnProperty(name)) return;
  outlet(MIDI, 0xB0 + midiChannel - 1, cc[name], encode(name, state[name]));
}

function program(slot) {
  if (loading) return;
  outlet(MIDI, 0xC0 + midiChannel - 1, clamp(slot, 1, 54) - 1);
}

// Every CC of the sound, then the performance layers on top.
function sendAllControls() {
  for (var i = 0; i < order.length; i++) emitCC(order[i]);
  refreshPerformance(true);
}

function channel(v) {
  midiChannel = clamp(v, 1, 16);
}

// ---------------------------------------------------------------------------
// Waveform. Pulse, Saw and Triangle combine; Noise is exclusive. SID SYNTH
// stores the result as one of eight waveform values.
// ---------------------------------------------------------------------------
var waveParts = {pulse:1, saw:0, tri:0, noise:0};

function waveFromParts(p) {
  if (p.noise) return 3;
  if (p.pulse && p.saw && p.tri) return 7;
  if (p.pulse && p.saw) return 6;
  if (p.pulse && p.tri) return 5;
  if (p.saw && p.tri) return 4;
  if (p.tri) return 2;
  if (p.saw) return 1;
  return 0;
}

function syncWavePartsFromState() {
  var value = clamp(state.wave, 0, 7);
  waveParts.pulse = (value === 0 || value === 5 || value === 6 || value === 7) ? 1 : 0;
  waveParts.saw = (value === 1 || value === 4 || value === 6 || value === 7) ? 1 : 0;
  waveParts.tri = (value === 2 || value === 4 || value === 5 || value === 7) ? 1 : 0;
  waveParts.noise = value === 3 ? 1 : 0;
}

function emitWavePanelState() {
  outlet(STATE, "wavepulse", waveParts.pulse);
  outlet(STATE, "wavesaw", waveParts.saw);
  outlet(STATE, "wavetri", waveParts.tri);
  outlet(STATE, "wavenoise", waveParts.noise);
}

function wavebit(part, enabled) {
  part = String(part); enabled = enabled ? 1 : 0;
  if (loading) { if (loadWave.hasOwnProperty(part)) loadWave[part] = enabled; return; }
  if (!waveParts.hasOwnProperty(part)) return;
  if (part === "noise") {
    waveParts.noise = enabled;
    if (enabled) { waveParts.pulse = 0; waveParts.saw = 0; waveParts.tri = 0; }
    else waveParts.pulse = 1;
  } else {
    waveParts[part] = enabled;
    if (enabled) waveParts.noise = 0;
    if (!waveParts.pulse && !waveParts.saw && !waveParts.tri) waveParts.pulse = 1;
  }
  state.wave = waveFromParts(waveParts);
  emitWavePanelState();
  emitCC("wave");
}

// ---------------------------------------------------------------------------
// Sound records: the 35-byte SID SYNTH patch format inside a .SLO bank.
// ---------------------------------------------------------------------------
function recordPlayMode(record) {
  var mode = record[21];
  if (mode === 3) return record[23] ? 6 : 0;
  if (mode === 1) return 1;
  if (mode === 2) return 2;
  if (mode === 4) return 3;
  return record[22] ? 5 : 4;
}

function applyRecord(record) {
  state.wave = record[0]; state.filtermode = record[1];
  state.attack = record[2]; state.decay = record[3]; state.sustain = record[4]; state.release = record[5];
  state.pwmwidth = record[6] === 31 ? 127 : record[6] * 4;
  state.cutoff = record[7] === 31 ? 127 : record[7] * 4;
  state.resonance = record[8]; state.pwmon = record[9];
  state.pwmrate = record[10]; state.pwmdepth = record[11]; state.pwmretrig = record[12];
  state.filterretrig = record[13]; state.filtercycle = record[14]; state.filterrate = record[15];
  state.vibon = record[16]; state.vibfreq = record[17]; state.vibrate = record[18];
  state.vibtype = record[19] & 3; state.vibretrig = (record[19] & 4) ? 1 : 0; state.vibdelay = record[20];
  state.playmode = recordPlayMode(record); state.arpspeed = record[25]; state.arpdir = record[26];
  state.ring = record[27]; state.sync = record[28]; state.click = record[29]; state.porta = record[30];
  state.tremon = record[31]; state.tremrate = record[32]; state.pwmcycle = record[33]; state.envretrig = record[34];
  state.vibwheel = 0;
  syncWavePartsFromState();
}

function stateToRecord(previous) {
  var record = previous.slice(0, 35);
  while (record.length < 35) record.push(0);
  record[0] = clamp(state.wave, 0, 7); record[1] = clamp(state.filtermode, 0, 3);
  record[2] = clamp(state.attack, 0, 15); record[3] = clamp(state.decay, 0, 15);
  record[4] = clamp(state.sustain, 0, 15); record[5] = clamp(state.release, 0, 15);
  record[6] = clamp(Math.round(state.pwmwidth / 4), 0, 31);
  record[7] = clamp(Math.round(state.cutoff / 4), 0, 31);
  record[8] = clamp(state.resonance, 0, 15); record[9] = state.pwmon ? 1 : 0;
  record[10] = clamp(state.pwmrate, 0, 31); record[11] = clamp(state.pwmdepth, 0, 31);
  record[12] = clamp(state.pwmretrig, 0, 2); record[13] = clamp(state.filterretrig, 0, 2);
  record[14] = clamp(state.filtercycle, 0, 4); record[15] = clamp(state.filterrate, 0, 31);
  record[16] = state.vibon ? 1 : 0; record[17] = clamp(state.vibfreq, 0, 31);
  record[18] = clamp(state.vibrate, 1, 32); record[19] = clamp(state.vibtype, 0, 3) | (state.vibretrig ? 4 : 0);
  record[20] = clamp(state.vibdelay, 0, 31);
  record[21] = 0; record[22] = 0; record[23] = 0;
  if (state.playmode === 0) record[21] = 3;
  else if (state.playmode === 1) record[21] = 1;
  else if (state.playmode === 2) record[21] = 2;
  else if (state.playmode === 3) record[21] = 4;
  else if (state.playmode === 5) record[22] = 1;
  else if (state.playmode === 6) { record[21] = 3; record[23] = 1; }
  // record[24] has no CC destination; the slot's own byte is kept.
  record[25] = clamp(state.arpspeed, 1, 31); record[26] = clamp(state.arpdir, 0, 2);
  record[27] = state.ring ? 1 : 0; record[28] = state.sync ? 1 : 0; record[29] = state.click ? 1 : 0;
  record[30] = state.porta ? 1 : 0; record[31] = state.tremon ? 1 : 0;
  record[32] = clamp(state.tremrate, 0, 31); record[33] = clamp(state.pwmcycle, 0, 3);
  record[34] = clamp(state.envretrig, 0, 2);
  return record;
}

// Patch names: up to nine C64 characters (A-Z, 0-9, space).
var pendingPatchName = "INIT 01";

function sanitizePatchName(value) {
  var clean = String(value || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/ +/g, " ").trim();
  return (clean || ("USER " + currentPreset)).substring(0, 9);
}

function patchname() {
  pendingPatchName = sanitizePatchName(Array.prototype.slice.call(arguments).join(" "));
  outlet(UI, "patchname", pendingPatchName);
}

// ---------------------------------------------------------------------------
// Banks: native SID SYNTH .SLO files in the SID SYNTH Banks folder of Live's
// User Library (Presets/MIDI Effects/Max MIDI Effect), listed, read,
// written and created by the sid_banks.js Node helper. Requests go out as
// "node <command> ...", replies come back as banks / bankdata / banksaved /
// bankcreated / bankerror. SID SYNTH's own PRESETS1-5 banks are used the same
// way once copied into the folder. Renaming and deleting are left to the
// user, in the folder the folder button opens.
//
// .SLO layout: load address 00 C0, 54 x 35-byte records, 54 x 9-byte names
// (PETSCII screen codes: A-Z = 1-26).
//
// With no bank selected (an empty folder), the slots are 54 INIT sounds.
// ---------------------------------------------------------------------------
var BANK_BYTES = 2378;
var NAMED_BANK = 6;          // Preset Bank value meaning "the bank named by the pattr"

var currentPreset = 1;       // slot 1-54
var selBank = "";            // current bank name, "" = none (INIT sounds)
var wantedBank = "PRESETS1"; // the bank to select once the folder is listed
var storedBankName = "";     // bank name restored from the Live Set (pattr)
var bankParam = 1;           // Preset Bank as restored: 1-5 = PRESETS1-5 (sets before v0.25), 6 = named
var userBanks = [];          // bank names (file names without .SLO), sorted
var userBanksKnown = false;  // the helper has listed the folder at least once
var loadPending = false;     // LOADED arrived before the first listing
var userData = {};           // name -> [54 x {data, name}]
var userRequested = {};      // name -> read in flight
var pendingSend = false;     // a recall waiting for its bank to load should send
var saveMode = false, saveBank = "", saveSlot = 1;
var bankMenuMap = [];        // bank menu index -> {kind, name}

var NBSP = String.fromCharCode(160), ELLIPSIS = String.fromCharCode(8230);

// Live menu items are single atoms, so spaces become non-breaking spaces.
function menuText(text) { return String(text).replace(/ /g, NBSP); }
function two(n) { return (n < 10 ? "0" : "") + n; }
function slotItem(i, name) { return two(i + 1) + NBSP + menuText(name); }

// Status messages (what the device did, problems with bank files). The patch
// prints them to Max's console.
function panelStatus(text) {
  outlet(UI, "status", String(text || ""));
}

function encodeName(name) {
  var clean = sanitizePatchName(name), result = [], i, code;
  while (clean.length < 9) clean += " ";
  for (i = 0; i < 9; i++) {
    code = clean.charCodeAt(i);
    result.push(code === 32 ? 32 : (code >= 65 && code <= 90 ? code - 64 : code));
  }
  return result;
}

function decodeName(bytes, start) {
  var result = "", i, value;
  for (i = 0; i < 9; i++) {
    value = bytes[start + i];
    if (value === 32) result += " ";
    else if (value >= 1 && value <= 26) result += String.fromCharCode(64 + value);
    else if (value >= 48 && value <= 57) result += String.fromCharCode(value);
  }
  return result.replace(/ +$/g, "") || "INIT";
}

// Banks travel to and from the helper as one hex string (a single Max atom).
function slotsToHex(slots) {
  var bytes = [0x00, 0xc0], hex = "", i, j, encoded;
  for (i = 0; i < 54; i++) for (j = 0; j < 35; j++) bytes.push(clamp(slots[i].data[j], 0, 255));
  for (i = 0; i < 54; i++) {
    encoded = encodeName(slots[i].name);
    for (j = 0; j < 9; j++) bytes.push(encoded[j]);
  }
  for (i = 0; i < bytes.length; i++) hex += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
  return hex;
}

function hexToSlots(hex) {
  var bytes = [], slots = [], i;
  hex = String(hex || "");
  if (hex.length !== BANK_BYTES * 2) return null;
  for (i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  if (bytes[0] !== 0x00 || bytes[1] !== 0xc0) return null;
  for (i = 0; i < 54; i++) {
    slots.push({data:bytes.slice(2 + i * 35, 2 + (i + 1) * 35), name:decodeName(bytes, 2 + 54 * 35 + i * 9)});
  }
  return slots;
}

// The INIT sound: the panel's default values. Byte 24 has no CC destination
// (it appears to be the keyboard octave); 3 is SID SYNTH's usual value.
var INIT_RECORD = (function () {
  var blank = [], i;
  for (i = 0; i < 35; i++) blank.push(i === 24 ? 3 : 0);
  return stateToRecord(blank);
})();

// 54 INIT sounds, named INIT 01..INIT 54: a new bank, or the slots with no bank.
function templateSlots() {
  var slots = [], i;
  for (i = 0; i < 54; i++) slots.push({data:INIT_RECORD.slice(0, 35), name:"INIT " + two(i + 1)});
  return slots;
}
var initSlots = templateSlots();

function sanitizeBankName(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9 _-]/g, " ").replace(/ +/g, " ").trim().substring(0, 12).trim();
}

function findUserBank(name) {
  var key = String(name || "").toUpperCase(), i;
  for (i = 0; i < userBanks.length; i++) if (userBanks[i].toUpperCase() === key) return userBanks[i];
  return "";
}

// The current slots, or null while the selected bank is still loading.
function currentSlots() {
  if (!selBank) return initSlots;
  return userData[selBank] || null;
}

function requestUserBank(name) {
  if (!name || userData[name] || userRequested[name]) return;
  userRequested[name] = true;
  outlet(UI, "node", "read", name);
}

// ---- menus -----------------------------------------------------------------
function showBankMenu() {
  var items = ["bankitems", "_parameter_range"], selected = 0, current = saveMode ? saveBank : selBank, i;
  bankMenuMap = [];
  for (i = 0; i < userBanks.length; i++) {
    bankMenuMap.push({kind:"bank", name:userBanks[i]}); items.push(menuText(userBanks[i]));
    if (userBanks[i] === current) selected = i;
  }
  // A live.menu ignores a one-item range, so with no banks it shows NO BANKS
  // above NEW BANK.
  if (!userBanks.length) { bankMenuMap.push({kind:"none"}); items.push(menuText("NO BANKS")); }
  bankMenuMap.push({kind:"new"}); items.push(menuText("NEW BANK" + ELLIPSIS));
  outlet(UI, items);
  outlet(UI, "bankset", selected);
}

// Unmatched panel commands ("_parameter_range ...", "set n") go to the slot menu.
function showSlotMenu(slots, selectedSlot) {
  var items = ["_parameter_range"], i;
  if (!slots) for (i = 0; i < 54; i++) items.push(two(i + 1) + NBSP + "...");
  else for (i = 0; i < slots.length; i++) items.push(slotItem(i, slots[i].name));
  outlet(UI, items);
  outlet(UI, "set", selectedSlot - 1);
}

function refreshMenus() {
  showBankMenu();
  if (saveMode) showSlotMenu(saveBank ? (userData[saveBank] || null) : initSlots, saveSlot);
  else showSlotMenu(currentSlots(), currentPreset);
}

// The location is stored with the Live Set: Preset Bank (6 = named bank),
// Preset Slot, and the bank's name (a pattr, "-" for none).
function storeLocation() {
  outlet(UI, "bankparam", NAMED_BANK);
  outlet(UI, "slotparam", currentPreset);
  outlet(UI, "userbank", selBank || "-");
}

// ---------------------------------------------------------------------------
// Recall
// ---------------------------------------------------------------------------

// Shows the current slot's sound. With send, the C64 gets it too: Program
// Change (unless it already arrived from MIDI), then every CC, so it plays what
// the panel shows whichever bank it has loaded.
function recallPreset(send, skipProgram) {
  if (loading) return;
  var slots = currentSlots(), slot, i;
  if (!slots) {
    // The bank is still loading: recall when it arrives.
    if (send) pendingSend = true;
    requestUserBank(selBank);
    return;
  }
  if (restoring) { restoring = false; finishRestore(slots); return; }
  slot = slots[currentPreset - 1];
  if (send && !skipProgram) program(currentPreset);
  applyRecord(slot.data);
  for (i = 0; i < order.length; i++) {
    if (order[i] === "wave") emitWavePanelState();
    else outlet(STATE, order[i], state[order[i]]);
  }
  if (send) sendAllControls();
  if (!saveMode) showSlotMenu(slots, currentPreset);
  pendingPatchName = slot.name;
  outlet(UI, "patchname", slot.name);
  outlet(UI, "saveok");
  emitArpSync();
}

// A reopened Live Set: keep the restored panel, name the slot it came from,
// mark it EDITED if it differs from that slot, and send it to the C64.
function finishRestore(slots) {
  var slot = slots[currentPreset - 1], record = stateToRecord(slot.data), same = true, i;
  for (i = 0; i < 35; i++) if (record[i] !== slot.data[i]) { same = false; break; }
  if (!saveMode) showSlotMenu(slots, currentPreset);
  pendingPatchName = slot.name;
  outlet(UI, "patchname", slot.name);
  outlet(UI, "saveok");
  if (!same) outlet(UI, "edited");
  program(currentPreset);
  sendAllControls();
  emitArpSync();
  storeLocation();
  panelStatus(statusAfterLoad || (same ? "Sent " + two(currentPreset) + " " + slot.name + " to C64" : "Sent edited " + slot.name + " to C64"));
  statusAfterLoad = "";
}
var statusAfterLoad = "";    // shown instead of the restore's own status (a missing bank)

// Panel Stored (hidden parameter): 0 on a fresh device and set to 1 once
// loaded, so it comes back as 1 from a saved Live Set or a duplicated device.
function panelstored(value) { if (loading && value) restoredPanel = true; }

function LOADED() {
  loading = false;
  if (restoredPanel) {
    restoring = true;
    state.wave = waveFromParts(loadWave);
    syncWavePartsFromState();
  }
  outlet(UI, "panelstored", 1);
  if (userBanksKnown) selectWantedBank();
  else loadPending = true;
}

// After loading: select the bank the set used (or PRESETS1 on a fresh device).
// A fresh device without that bank takes the first one; a set whose bank is
// gone says so and does the same. No banks at all: the INIT sounds.
function selectWantedBank() {
  var found = findUserBank(wantedBank);
  if (!found && wantedBank && restoredPanel) statusAfterLoad = "Bank " + wantedBank + " not found";
  if (!found) found = userBanks.length ? userBanks[0] : "";
  selectBank(found, true);
  storeLocation();
}

function selectBank(name, send) {
  selBank = name;
  if (name) storedBankName = name;
  showBankMenu();
  if (!name || userData[name]) recallPreset(send);
  else { if (send) pendingSend = true; showSlotMenu(null, currentPreset); requestUserBank(name); }
}

// ---------------------------------------------------------------------------
// Messages from the panel
// ---------------------------------------------------------------------------

// Preset Bank parameter: 6 = the bank named by the pattr; 1-5 = PRESETS1-5
// (how sets saved before v0.25 refer to SID SYNTH's own banks).
function bank(value) {
  bankParam = clamp(value, 1, NAMED_BANK);
  wantedBank = bankParam === NAMED_BANK ? storedBankName : "PRESETS" + bankParam;
}

// The stored bank name; on load it can arrive after Preset Bank.
function restorebankname(name) {
  name = String(name || "");
  if (name === "-") name = "";
  storedBankName = name;
  if (bankParam === NAMED_BANK) wantedBank = name;
}

function preset(value) {
  value = clamp(value, 1, 54);
  if (saveMode) { saveSlot = value; showSaveTarget(); return; }
  currentPreset = value;
  if (!loading) restoring = false;
  recallPreset(true);
}

function bankpick(index) {
  restoring = false;
  var item = bankMenuMap[clamp(index, 0, bankMenuMap.length - 1)];
  if (!item || item.kind === "none") { showBankMenu(); return; }
  if (item.kind === "new") { askBankName(); showBankMenu(); return; }
  if (saveMode) {
    saveBank = item.name; showBankMenu();
    if (userData[saveBank]) { showSlotMenu(userData[saveBank], saveSlot); showSaveTarget(); }
    else { showSlotMenu(null, saveSlot); requestUserBank(saveBank); }
    return;
  }
  selectBank(item.name, true);
  storeLocation();
}

// RESEND TO C64: the slot's Program Change (so the C64 moves to that slot and
// shows its name), then every CC, so the C64 plays exactly what the panel shows.
function RESEND() {
  program(currentPreset);
  sendAllControls();
  panelStatus("Sent " + two(currentPreset) + " " + pendingPatchName + " to C64");
}

// The folder button: the helper opens the bank folder and replies "folderopened".
function SHOWFOLDER() {
  panelStatus("Opening bank folder" + ELLIPSIS);
  outlet(UI, "node", "openbanks");
}

// All Sound Off and All Notes Off.
function PANIC() {
  outlet(MIDI, 0xB0 + midiChannel - 1, 120, 0);
  outlet(MIDI, 0xB0 + midiChannel - 1, 123, 0);
  panelStatus("Sent all notes off");
}

// RANDOM: a new sound from weighted random values that keep it playable
// (an envelope shape, an audible filter, Ring and Sync never together). It is
// sent as CCs to the current slot, shown, named RANDOM and marked EDITED, so
// SAVE keeps it. Each press is seeded from the clock.
var randomSeed = 1;

function random01() {
  // mulberry32
  randomSeed = (randomSeed + 0x6D2B79F5) | 0;
  var t = randomSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function between(lo, hi) { return lo + Math.floor(random01() * (hi - lo + 1)); }
function chance(p) { return random01() < p; }
// pick([[value, weight], ...])
function pick(options) {
  var total = 0, i, r;
  for (i = 0; i < options.length; i++) total += options[i][1];
  r = random01() * total;
  for (i = 0; i < options.length; i++) { r -= options[i][1]; if (r < 0) return options[i][0]; }
  return options[options.length - 1][0];
}

function randomSound() {
  var s = {}, shape, arp, pulse;
  // Play modes: POLY, MONO, OCT, OCT+, 5TH, ARP, ARP+.
  s.playmode = pick([[1, 4], [2, 3], [4, 2], [5, 2], [3, 1], [0, 1], [6, 1]]);
  arp = s.playmode === 0 || s.playmode === 6;
  s.arpspeed = arp ? between(12, 26) : between(4, 20);
  s.arpdir = between(0, 2);
  s.porta = !arp && chance(0.2) ? 1 : 0;

  shape = pick([["pluck", 4], ["lead", 3], ["pad", 2]]);
  if (shape === "pluck") { s.attack = between(0, 1); s.decay = between(4, 10); s.sustain = between(0, 4); s.release = between(2, 8); }
  else if (shape === "lead") { s.attack = between(0, 3); s.decay = between(4, 12); s.sustain = between(8, 15); s.release = between(3, 9); }
  else { s.attack = between(6, 12); s.decay = between(6, 12); s.sustain = between(9, 15); s.release = between(8, 14); }
  s.envretrig = between(0, 2);

  // Waveforms: pulse, saw, triangle, tri+pulse, saw+pulse, noise (mostly for plucks).
  s.ring = chance(0.12) ? 1 : 0;
  s.sync = !s.ring && chance(0.15) ? 1 : 0;
  s.wave = s.ring ? 2 : pick([[0, 4], [1, 4], [2, 2], [5, 1], [6, 1], [3, shape === "pluck" ? 1 : 0.3]]);
  s.click = chance(shape === "pad" ? 0.05 : 0.35) ? 1 : 0;

  pulse = s.wave === 0 || s.wave === 5 || s.wave === 6 || s.wave === 7;
  s.pwmon = pulse && chance(0.6) ? 1 : 0;
  s.pwmwidth = between(20, 108); s.pwmrate = between(4, 24); s.pwmdepth = between(4, 28);
  s.pwmcycle = between(0, 3); s.pwmretrig = between(0, 2);

  // Filter: Off, LP, BP, HP, with a cutoff that stays audible.
  s.filtermode = pick([[0, 3], [1, 5], [2, 1], [3, 1]]);
  s.cutoff = s.filtermode === 3 ? between(8, 80) : between(32, 120);
  s.resonance = s.filtermode ? between(0, 12) : 0;
  s.filtercycle = s.filtermode && chance(0.4) ? between(1, 4) : 0;
  s.filterrate = between(4, 24); s.filterretrig = between(0, 2);

  s.vibon = chance(shape === "pluck" ? 0.15 : 0.4) ? 1 : 0;
  s.vibfreq = between(1, 8); s.vibrate = between(16, 28); s.vibdelay = between(0, 16);
  s.vibtype = pick([[0, 4], [1, 2], [2, 1], [3, 1]]); s.vibretrig = between(0, 1);

  s.tremon = chance(0.12) ? 1 : 0;
  s.tremrate = between(8, 24);
  return s;
}

function RANDOM() {
  if (loading) return;
  var sound, key, i;
  randomSeed = (Date.now() ^ Math.imul(randomSeed, 31)) | 0;
  sound = randomSound();
  for (key in sound) state[key] = sound[key];
  state.vibwheel = 0;
  syncWavePartsFromState();
  restoring = false;
  for (i = 0; i < order.length; i++) {
    if (order[i] === "wave") emitWavePanelState();
    else outlet(STATE, order[i], state[order[i]]);
  }
  sendAllControls();
  pendingPatchName = "RANDOM";
  outlet(UI, "patchname", pendingPatchName);
  outlet(UI, "edited");
  emitArpSync();
  panelStatus("Random sound sent to C64");
}

// Every MIDI message arriving on the track, as raw bytes. A Program Change
// (from a clip, say) has already passed through to the C64; the panel follows
// it: that slot in the current bank, its sound sent without a second Program
// Change.
function midievent(status, data1) {
  if (((status | 0) & 0xF0) === 0xC0) pgmin(data1);
}

function pgmin(value) {
  if (loading) return;
  if (saveMode) { panelStatus("MIDI program change ignored while saving"); return; }
  restoring = false;
  currentPreset = clamp(Math.round(value) + 1, 1, 54);
  recallPreset(true, true);
  storeLocation();
  panelStatus("MIDI program " + two(currentPreset) + " " + pendingPatchName);
}

// With MIDI clock running, ARP/ARP+ Speed selects a note division (manual,
// Clock sync): two knob steps per division, 1/1 down to 1/64 triplet.
var ARP_DIVISIONS = ["1/1","1/2","1/2T","1/2D","1/4","1/4T","1/4D","1/8","1/8T","1/8D","1/16","1/16T","1/16D","1/32","1/32T","1/64T"];

function emitArpSync() {
  var arp = state.playmode === 0 || state.playmode === 6;
  var knob = state.arpspeed <= 1 ? 0 : clamp(state.arpspeed, 1, 31);
  outlet(UI, "arpsync", arp ? "SYNC " + ARP_DIVISIONS[Math.floor(knob / 2)] : " ");
}

// ---------------------------------------------------------------------------
// Saving: SAVE enters save mode (pick a bank and slot); pressed again as STORE
// it writes the slot. CANCEL leaves save mode.
// ---------------------------------------------------------------------------
function firstFreeSlot(slots) {
  for (var i = 0; i < 54; i++) if (/^(INIT|EMPTY)/.test(slots[i].name)) return i + 1;
  return 1;
}

function showSaveTarget() {
  if (!saveBank) { panelStatus("Make a bank: NEW BANK" + ELLIPSIS); return; }
  var slots = userData[saveBank];
  if (!slots) { panelStatus("Loading " + saveBank + ELLIPSIS); return; }
  panelStatus("To " + saveBank + " " + two(saveSlot) + " (now " + slots[saveSlot - 1].name + ")");
}

function SAVEPATCH() {
  if (saveMode) { storeSlot(); return; }
  saveMode = true;
  saveBank = selBank || findUserBank(storedBankName) || (userBanks.length ? userBanks[0] : "");
  if (saveBank && saveBank === selBank) saveSlot = currentPreset;
  else saveSlot = saveBank && userData[saveBank] ? firstFreeSlot(userData[saveBank]) : 1;
  outlet(UI, "savemode", 1);
  outlet(UI, "node", "list");
  refreshMenus();
  if (saveBank) requestUserBank(saveBank);
  showSaveTarget();
}

function CANCELSAVE() {
  if (!saveMode) return;
  saveMode = false;
  outlet(UI, "savemode", 0);
  refreshMenus();
  outlet(UI, "slotparam", currentPreset);
  panelStatus("");
}

function storeSlot() {
  var slots = userData[saveBank], slot;
  if (!saveBank || !slots) { showSaveTarget(); return; }
  slot = slots[saveSlot - 1];
  slot.data = stateToRecord(slot.data);
  slot.name = sanitizePatchName(pendingPatchName);
  pendingPatchName = slot.name;
  outlet(UI, "node", "write", saveBank, slotsToHex(slots));
  panelStatus("Saving" + ELLIPSIS);
}

// NEW BANK opens Max's text dialog; its answer is dialogtext.
function askBankName() {
  outlet(UI, "dialoglabel", "New bank name (up to 12 letters or digits)");
  outlet(UI, "dialogopen", "MYBANK");
}

function dialogtext() {
  var parts = Array.prototype.slice.call(arguments), name;
  if (parts[0] === "symbol" || parts[0] === "list") parts.shift();
  name = sanitizeBankName(parts.join(" "));
  if (!name) { panelStatus("Bank name needs letters or digits"); return; }
  if (findUserBank(name)) { panelStatus("Bank " + name + " already exists"); return; }
  outlet(UI, "node", "create", name, slotsToHex(templateSlots()));
}

function dialogcancel() {}

// ---- replies from the Node helper -------------------------------------------
function banks() {
  var before = userBanks, added, gone;
  userBanks = Array.prototype.slice.call(arguments).map(String);
  userBanksKnown = true;
  if (loadPending) { loadPending = false; selectWantedBank(); return; }
  if (selBank && findUserBank(selBank)) {
    selBank = findUserBank(selBank);
    if (!userData[selBank]) requestUserBank(selBank);
  } else if (selBank) {
    // The bank's file went away. One file gone and one new in the same listing
    // is a rename in the folder: follow it. Otherwise keep the sound, say so.
    added = userBanks.filter(function (name) { return before.indexOf(name) < 0; });
    gone = before.filter(function (name) { return userBanks.indexOf(name) < 0; });
    if (added.length === 1 && gone.length === 1 && gone[0] === selBank) followRename(selBank, added[0]);
    else panelStatus("Bank " + selBank + " not found");
  }
  if (saveMode && saveBank && !findUserBank(saveBank)) saveBank = "";
  showBankMenu();
}

function bankdata(name, hex) {
  name = String(name);
  delete userRequested[name];
  var slots = hexToSlots(hex), send;
  if (!slots) { panelStatus(name + " is not a SID SYNTH bank"); return; }
  userData[name] = slots;
  if (saveMode && name === saveBank) {
    if (saveSlot === 1 && selBank !== name) saveSlot = firstFreeSlot(slots);
    showSlotMenu(slots, saveSlot); showSaveTarget();
  } else if (!saveMode && name === selBank) {
    send = pendingSend; pendingSend = false;
    recallPreset(send);
  }
}

function banksaved(name) {
  name = String(name);
  if (!saveMode || name !== saveBank) { panelStatus("Saved " + name); return; }
  saveMode = false;
  selBank = name; storedBankName = name; currentPreset = saveSlot;
  outlet(UI, "savemode", 0);
  refreshMenus();
  storeLocation();
  outlet(UI, "patchname", pendingPatchName);
  outlet(UI, "saveok");
  panelStatus("Saved " + pendingPatchName + " to " + name + " " + two(saveSlot));
}

function bankcreated(name) {
  name = String(name);
  userData[name] = templateSlots();
  if (findUserBank(name) === "") { userBanks.push(name); userBanks.sort(); }
  if (saveMode) { saveBank = name; saveSlot = 1; refreshMenus(); showSaveTarget(); }
  else { showBankMenu(); panelStatus("Created bank " + name); }
}

function followRename(oldName, newName) {
  if (userData[oldName]) { userData[newName] = userData[oldName]; delete userData[oldName]; }
  selBank = newName;
  if (storedBankName === oldName) storedBankName = newName;
  if (saveBank === oldName) saveBank = newName;
  storeLocation();
  panelStatus("Bank " + oldName + " is now " + newName);
}

function folderopened() {
  panelStatus("Bank folder: " + Array.prototype.slice.call(arguments).join(" "));
}

function bankerror() {
  var message = Array.prototype.slice.call(arguments).join(" ");
  post("SID SYNTH banks: " + message + "\n");
  panelStatus(message);
}

// ---------------------------------------------------------------------------
// Live-side performance layers. Each offsets one documented CC around the
// stored value (which stays the patch value) and restores it when released.
//   Cutoff Envelope  note-triggered ADSR on Cutoff
//   Step Mod         eight tempo-synced steps (parameters are named Clocked Motion)
//   Expression       Velocity, Pressure, Wheel, Bend and Key tracking
// ---------------------------------------------------------------------------

// Shared target list. Sustain works as a fade: lowering it fades held notes,
// raising it is heard from the next note, because the SID envelope only falls
// towards the sustain level. New targets are appended so stored menus keep
// their meaning.
var performanceTargets = ["cutoff","resonance","pwmwidth","pwmdepth","vibfreq","tremrate","sustain"];
var performanceRanges = {
  cutoff:[0,127], resonance:[0,15], pwmwidth:[0,127], pwmdepth:[0,31],
  vibfreq:[0,31], tremrate:[0,31], sustain:[0,15]
};

var filterEnv = {
  on:0, amount:16, attack:20, decay:300, sustain:35, release:300,
  level:0, stage:"idle", startLevel:0, startTime:0, held:{}
};

var motion = {
  on:0, target:0, amount:16, length:8, step:-1,
  values:[100,0,75,-25,50,-50,25,-75],
  // Smooth: 0 = hard steps; otherwise each step glides from the current
  // position to its value over smooth% of the measured step length.
  smooth:0, from:0, stepStart:0, stepMs:125, lastTick:0
};

// Targets are indexes into performanceTargets, -1 = off.
var expression = {
  velocityTarget:-1, velocityAmount:16, velocityValue:0,
  pressureTarget:-1, pressureAmount:16, pressureValue:0,
  // Wheel: -1 = SID SYNTH's own CC1 vibrato wheel (passed through); otherwise
  // the wheel is taken over and mapped like the other sources.
  wheelTarget:-1, wheelAmount:16, wheelValue:0,
  // Bend still bends pitch on SID SYNTH; a target adds a second destination.
  bendTarget:-1, bendAmount:16, bendValue:0,
  // Key tracking: last note-on, centred on C3 (MIDI 60), +/-4 octaves = full amount.
  keyTarget:-1, keyAmount:16, keyValue:0,
  // Velocity scaling of the Cutoff Envelope depth (0..100 %).
  velEnv:0, lastVelocity:127
};

var lastPerformanceValues = {};

function targetName(index) {
  return index >= 0 && index < performanceTargets.length ? performanceTargets[index] : "";
}

// Cutoff and PWM Width run 0-127; offsets are in 32-step units.
function performanceScale(name) {
  return name === "cutoff" || name === "pwmwidth" ? 4 : 1;
}

function expressionOffset(name, targetIndex, amount, inputValue) {
  return targetName(targetIndex) === name ? (clamp(inputValue, 0, 127) / 127) * amount * performanceScale(name) : 0;
}

// Same for a source already normalised to -1..1.
function bipolarOffset(name, targetIndex, amount, norm) {
  return targetName(targetIndex) === name ? clamp(norm, -1, 1) * amount * performanceScale(name) : 0;
}

function envVelocityScale() {
  var k = expression.velEnv / 100;
  return 1 - k + k * (expression.lastVelocity / 127);
}

function motionOffsetPercent() {
  if (motion.step < 0) return 0;
  var target = motion.values[motion.step], glide, t, eased;
  if (motion.smooth <= 0) return target;
  glide = motion.stepMs * motion.smooth / 100;
  t = glide <= 0 ? 1 : Math.min(1, (Date.now() - motion.stepStart) / glide);
  eased = (1 - Math.cos(Math.PI * t)) / 2;
  return motion.from + (target - motion.from) * eased;
}

// The stored value plus every layer acting on it.
function performanceValue(name) {
  var range = performanceRanges[name] || [0, 127];
  var value = Number(state[name]);
  if (name === "cutoff" && filterEnv.on) value += filterEnv.level * filterEnv.amount * envVelocityScale() * performanceScale(name);
  if (motion.on && targetName(motion.target) === name && motion.step >= 0) {
    value += (motionOffsetPercent() / 100) * motion.amount * performanceScale(name);
  }
  value += expressionOffset(name, expression.velocityTarget, expression.velocityAmount, expression.velocityValue);
  value += expressionOffset(name, expression.pressureTarget, expression.pressureAmount, expression.pressureValue);
  value += expressionOffset(name, expression.wheelTarget, expression.wheelAmount, expression.wheelValue);
  value += bipolarOffset(name, expression.bendTarget, expression.bendAmount, expression.bendValue);
  value += bipolarOffset(name, expression.keyTarget, expression.keyAmount, expression.keyValue);
  return clamp(value, range[0], range[1]);
}

// Sends a target's combined value, only when it changed unless forced.
function emitPerformance(name, force) {
  if (loading || !cc.hasOwnProperty(name)) return;
  var sent = encode(name, performanceValue(name));
  if (!force && lastPerformanceValues[name] === sent) return;
  lastPerformanceValues[name] = sent;
  outlet(MIDI, 0xB0 + midiChannel - 1, cc[name], sent);
}

function activeForTarget(name) {
  return (name === "cutoff" && filterEnv.on) ||
    (motion.on && targetName(motion.target) === name) ||
    targetName(expression.velocityTarget) === name || targetName(expression.pressureTarget) === name ||
    targetName(expression.wheelTarget) === name || targetName(expression.bendTarget) === name ||
    targetName(expression.keyTarget) === name;
}

function refreshPerformance(force) {
  var seen = {}, i;
  var names = ["cutoff", targetName(motion.target), targetName(expression.velocityTarget), targetName(expression.pressureTarget),
    targetName(expression.wheelTarget), targetName(expression.bendTarget), targetName(expression.keyTarget)];
  for (i = 0; i < names.length; i++) if (names[i] && !seen[names[i]] && activeForTarget(names[i])) {
    seen[names[i]] = 1; emitPerformance(names[i], force);
  }
}

// ---- incoming notes and controllers -----------------------------------------
function beginFilterEnvStage(stage, now) {
  filterEnv.stage = stage;
  filterEnv.startLevel = filterEnv.level;
  filterEnv.startTime = now;
}

function note(pitch, velocity) {
  pitch = clamp(pitch, 0, 127);
  velocity = clamp(velocity, 0, 127);
  if (velocity > 0) {
    filterEnv.held[pitch] = (filterEnv.held[pitch] || 0) + 1;
    if (filterEnv.on) beginFilterEnvStage("attack", Date.now());
    expression.velocityValue = velocity;
    expression.lastVelocity = velocity;
    expression.keyValue = clamp((pitch - 60) / 48, -1, 1);
    if (expression.velocityTarget >= 0) emitPerformance(targetName(expression.velocityTarget), true);
    if (expression.keyTarget >= 0) emitPerformance(targetName(expression.keyTarget), true);
  } else {
    if (filterEnv.held[pitch] > 1) filterEnv.held[pitch]--;
    else delete filterEnv.held[pitch];
    if (Object.keys(filterEnv.held).length === 0) {
      if (filterEnv.on) beginFilterEnvStage("release", Date.now());
      expression.velocityValue = 0;
      if (expression.velocityTarget >= 0) emitPerformance(targetName(expression.velocityTarget), true);
    }
  }
}

// Mod wheel (CC1). With Wheel on VIBRATO the raw CC1 reaches SID SYNTH through
// the pass-through, so only a mapped wheel acts here.
function wheel(value) {
  expression.wheelValue = clamp(value, 0, 127);
  if (expression.wheelTarget >= 0) emitPerformance(targetName(expression.wheelTarget), false);
}

// Pitch bend, 14-bit signed (-8192..8191). Pitch itself passes through.
function bend(value) {
  expression.bendValue = clamp(value / 8192, -1, 1);
  if (expression.bendTarget >= 0) emitPerformance(targetName(expression.bendTarget), false);
}

// Channel aftertouch.
function pressure(value) {
  expression.pressureValue = clamp(value, 0, 127);
  if (expression.pressureTarget >= 0) emitPerformance(targetName(expression.pressureTarget), false);
}

// ---- clocks -------------------------------------------------------------------

// Every 20 ms: advances the Cutoff Envelope.
function fenvtick() {
  if (!filterEnv.on || filterEnv.stage === "idle") return;
  var now = Date.now(), elapsed = now - filterEnv.startTime, duration, target, progress;
  if (filterEnv.stage === "attack") {
    duration = filterEnv.attack;
    progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
    filterEnv.level = filterEnv.startLevel + (1 - filterEnv.startLevel) * progress;
    if (progress >= 1) beginFilterEnvStage("decay", now);
  } else if (filterEnv.stage === "decay") {
    target = filterEnv.sustain / 100;
    duration = filterEnv.decay;
    progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
    filterEnv.level = filterEnv.startLevel + (target - filterEnv.startLevel) * progress;
    if (progress >= 1) { filterEnv.level = target; filterEnv.stage = "sustain"; }
  } else if (filterEnv.stage === "sustain") {
    filterEnv.level = filterEnv.sustain / 100;
  } else if (filterEnv.stage === "release") {
    duration = filterEnv.release;
    progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
    filterEnv.level = filterEnv.startLevel * (1 - progress);
    if (progress >= 1) { filterEnv.level = 0; filterEnv.stage = "idle"; }
  }
  emitPerformance("cutoff", false);
}

// Each Step Mod step, from a tempo-synced metro.
function motiontick() {
  if (!motion.on) return;
  var now = Date.now(), gap;
  if (motion.lastTick > 0) { gap = now - motion.lastTick; if (gap > 5 && gap < 4000) motion.stepMs = gap; }
  motion.lastTick = now;
  motion.from = motionOffsetPercent();
  motion.step = (motion.step + 1) % motion.length;
  motion.stepStart = now;
  emitPerformance(targetName(motion.target), true);
  outlet(UI, "motionstep", motion.step);
}

// Every 20 ms while Smooth glides between steps; sends only on change.
function motionglide() {
  if (!motion.on || motion.smooth <= 0 || motion.step < 0) return;
  emitPerformance(targetName(motion.target), false);
}

// Transport (re)start: begin again at step 1.
function motionreset() {
  motion.step = -1; motion.from = 0; motion.lastTick = 0;
  if (motion.on) emitPerformance(targetName(motion.target), true);
  outlet(UI, "motionstep", -1);
}

// ---- performance settings ---------------------------------------------------
function setFilterEnv(name, value) {
  if (name === "fenvon") {
    filterEnv.on = value ? 1 : 0;
    filterEnv.level = 0; filterEnv.stage = "idle"; filterEnv.held = {};
  } else if (name === "fenvamount") filterEnv.amount = clamp(value, -31, 31);
  else if (name === "fenvattack") filterEnv.attack = clamp(value, 0, 2000);
  else if (name === "fenvdecay") filterEnv.decay = clamp(value, 0, 4000);
  else if (name === "fenvsustain") filterEnv.sustain = clamp(value, 0, 100);
  else if (name === "fenvrelease") filterEnv.release = clamp(value, 0, 4000);
  emitPerformance("cutoff", true);
}

function setMotion(name, value) {
  var oldTarget = targetName(motion.target);
  if (name === "motionon") {
    motion.on = value ? 1 : 0; motion.step = -1; motion.from = 0; motion.lastTick = 0;
  } else if (name === "motiontarget") {
    motion.target = clamp(value, 0, performanceTargets.length - 1); motion.step = -1;
  } else if (name === "motionamount") motion.amount = clamp(value, -31, 31);
  else if (name === "motionsmooth") motion.smooth = clamp(value, 0, 100);
  else if (name === "motionlength") { motion.length = clamp(value, 1, 8); motion.step = -1; }
  else if (name.indexOf("motionstep") === 0) {
    motion.values[clamp(Number(name.substring(10)) - 1, 0, 7)] = clamp(value, -100, 100);
  }
  if (oldTarget) emitPerformance(oldTarget, true);
  if (motion.on) emitPerformance(targetName(motion.target), true);
}

// Target menus count OFF (or VIBRATO for Wheel) as 0, so the index is value - 1.
function setExpression(name, value) {
  var oldTarget = "", last = performanceTargets.length - 1, wasNative, nowNative;
  if (name === "veltarget") { oldTarget = targetName(expression.velocityTarget); expression.velocityTarget = clamp(value - 1, -1, last); }
  else if (name === "velamount") expression.velocityAmount = clamp(value, -31, 31);
  else if (name === "presstarget") { oldTarget = targetName(expression.pressureTarget); expression.pressureTarget = clamp(value - 1, -1, last); }
  else if (name === "pressamount") expression.pressureAmount = clamp(value, -31, 31);
  else if (name === "wheeltarget") {
    wasNative = expression.wheelTarget < 0;
    oldTarget = targetName(expression.wheelTarget);
    expression.wheelTarget = clamp(value - 1, -1, last);
    nowNative = expression.wheelTarget < 0;
    // Taking the wheel over: release SID SYNTH's wheel vibrato and block CC1 in
    // the pass-through. Handing it back: send the current wheel position.
    if (!loading && wasNative && !nowNative) outlet(MIDI, 0xB0 + midiChannel - 1, cc.vibwheel, 0);
    if (!loading && !wasNative && nowNative) outlet(MIDI, 0xB0 + midiChannel - 1, cc.vibwheel, expression.wheelValue);
    outlet(UI, "passmode", nowNative ? 1 : 2);
  }
  else if (name === "wheelamount") expression.wheelAmount = clamp(value, -31, 31);
  else if (name === "bendtarget") { oldTarget = targetName(expression.bendTarget); expression.bendTarget = clamp(value - 1, -1, last); }
  else if (name === "bendamount") expression.bendAmount = clamp(value, -31, 31);
  else if (name === "keytarget") { oldTarget = targetName(expression.keyTarget); expression.keyTarget = clamp(value - 1, -1, last); }
  else if (name === "keyamount") expression.keyAmount = clamp(value, -31, 31);
  else if (name === "velenv") { expression.velEnv = clamp(value, 0, 100); emitPerformance("cutoff", true); }
  if (oldTarget) emitPerformance(oldTarget, true);
  refreshPerformance(true);
}

// ---------------------------------------------------------------------------
// set <control> <value>: every panel control.
// ---------------------------------------------------------------------------
function set(name, value) {
  if (arguments.length < 2) return;
  name = String(name);
  value = Number(value);
  if (name.indexOf("fenv") === 0) { setFilterEnv(name, value); return; }
  // Step Mod's division only retimes the patch's metro.
  if (name === "motiondivision") return;
  if (name.indexOf("motion") === 0) { setMotion(name, value); return; }
  if (name.indexOf("vel") === 0 || name.indexOf("press") === 0 || name.indexOf("wheel") === 0 ||
      name.indexOf("bend") === 0 || name.indexOf("key") === 0) { setExpression(name, value); return; }
  if (!cc.hasOwnProperty(name)) return;
  // Ring Mod and Hard Sync are mutually exclusive on the C64 (manual, Voice
  // effects): switching one on switches the other off.
  if (!loading && (name === "ring" || name === "sync") && value) {
    var other = name === "ring" ? "sync" : "ring";
    if (state[other]) { state[other] = 0; outlet(STATE, other, 0); emitCC(other); }
  }
  state[name] = value;
  if (activeForTarget(name)) emitPerformance(name, true);
  else emitCC(name);
  if (name === "arpspeed" || name === "playmode") emitArpSync();
}
