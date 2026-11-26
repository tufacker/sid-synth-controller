# Architecture

The device is generated: a Node script writes the whole Max patch (every
control, colour and patch cord) from source files, so changes are reviewable as
code and the `.amxd` is never edited by hand.

```text
src/device/          runs inside Live
  sid_controller.js    the controller: sound state, MIDI, banks, performance layers (v8.codebox)
  sid_ui_logic.js      panel logic: muting, page dots, playhead, EDITED, button flashes (classic js)
  sid_palette.js       every colour, shared by the build and sid_ui_logic.js
  sid_banks.js         user bank files (Node for Max)
src/build/           runs in Node, writes dist/
  build.js             assembles and writes the device
  controls.js          one entry per Live parameter, with layout and Info View help
  patcher.js           box / patch-cord helpers and the .amxd writer
test/                  Node tests of the built controller and the bank helper (made-up banks)
tools/                 verify_build.js (checks a build), extract_d64.js (pulls files off a .d64)
```

`npm run build` writes `dist/SID SYNTH Controller/`: `SID SYNTH Controller.amxd`
(the version is shown small on the panel and in the release zip's name, never in
the device or folder name, so an installed copy keeps its path across updates), the same
patcher as `.maxpat` JSON, `sid_ui_logic.js` (with the palette prepended),
`sid_banks.js`, the waveform icons, and the user guide.

## The controller (`sid_controller.js`)

A single script in a `v8.codebox`. It owns the sound: the panel never talks to
MIDI directly.

- **In:** `set <control> <value>` from every control, plus button commands
  (`RESEND`, `PANIC`, `SAVEPATCH`...), the stored location (`bank`, `preset`,
  `restorebankname`, `panelstored`), incoming notes and controllers, clock ticks
  and the bank helper's replies. The file header lists them all.
- **Outlet 0:** MIDI. Program Change, and SID SYNTH's default CC map with its
  value encodings (`encode()`).
- **Outlet 1:** control values to show. The patch routes each one to its control
  as `set`, so a recall moves the panel without re-sending and without filling
  Live's undo history.
- **Outlet 2:** panel commands: menu contents, status messages (printed to
  Max's console), save mode, EDITED,
  bank-helper requests (`node <command>`), the bank-name dialog.

### Sounds and banks

A sound is SID SYNTH's 35-byte record (`applyRecord` / `stateToRecord`). Every
bank is a `.SLO` file in the bank folder, read and written through the Node
helper and travelling as one hex string; the device embeds no presets. SID
SYNTH's own PRESETS1-5 work once the user copies them into the folder. With no
bank selected the slots are 54 INIT sounds (the panel defaults). Recalling a slot
applies its record, shows it, and sends Program Change plus every CC, so the C64
plays what the panel shows whichever bank it has loaded.

### Loading

Live restores every stored parameter, then `live.thisdevice` fires and, 100 ms
later, the patch sends `LOADED`. Until then the controller sends nothing and
applies no slot. It then selects the stored bank once the helper has listed the
folder: PRESETS1 (or the first bank) on a fresh device; the bank named in the set
otherwise, with Preset Bank 1-5 from sets before v0.25 meaning PRESETS1-5. The
hidden Stored Only parameter **Panel Stored** tells a fresh device (0: recall its
slot) from a saved set or a duplicate (1: keep the restored panel, mark it EDITED
if it differs from its slot, send it).

### Performance layers

Cutoff Envelope, Step Mod and Expression offset one CC around its stored value
(`performanceValue`) and send only changes. The stored value stays the patch
value, so turning a layer off restores the sound. Targets share one list;
new targets are appended so stored menu values keep their meaning.

Step Mod's clock is a tempo-relative `metro` quantized to its Rate. On each
tick the patch reads Live's song position (`transport` total ticks) and
`motiontick(ticks)` turns it into a step (`MOTION_DIVISION_TICKS`, 480 per
quarter note), so the pattern is locked to the bar grid from bar 1 rather than
counted from when playback started. Stopping the transport calls
`motionreset`, which releases the target.

## The panel logic (`sid_ui_logic.js`)

Presentation only. It mutes controls that do nothing in the current mode (for
example Direction outside ARP), recolouring them from the palette rather than
using Live's `active 0`, which blends against the wrong surface. It also draws
the page dots, the Step Mod playhead and length masks, the EDITED marker, button
flashes and the save-mode button swap. It reads control values when the device
loads and follows changes through small `prepend` messages.

## The bank helper (`sid_banks.js`)

Node for Max (`node.script`), the only part that touches the file system. It
lists, reads, writes and creates `.SLO` files in
`<User Library>/Presets/MIDI Effects/Max MIDI Effect/SID SYNTH Banks`, validates their size and header, writes through a
temporary file, and watches the folder so files copied in appear at once. It
never renames or deletes; the user does that in the folder, and the controller
follows a rename of the bank in use (one file gone and one new in the same
listing). The User Library is read from the `Library.cfg` of the newest Live
version in Live's preferences folder (`UserLibrary` > `ProjectPath` +
`ProjectName`), so a library moved in Live's Settings is followed; without one,
or when that folder is missing, Live's default location is used.

## The patch

Built in `build.js` in this order: cells and titles, the program strip (bank and
slot menus, buttons, name), the controls from `controls.js`, the M4L
section (page tab, envelope editor, step bars), MIDI in/out, and the cords
between panel, controller and panel logic. A final pass colours every object
from the palette and puts button fills and overlays in front.

**MIDI path.** Track MIDI passes to `midiout` byte for byte, alongside the
controller's output. When the mod wheel is mapped to a target, the pass-through
switches to a parse-and-rebuild path that drops CC1, so SID SYNTH's own wheel
vibrato is not also triggered. A second `midiparse` feeds notes, wheel, bend,
aftertouch and Program Changes (as raw `midievent` bytes) to the controller.

**Stored state.** Every control is a Live parameter. The slot is Preset Slot,
the bank's name a Stored Only `pattr` (with Preset Bank 6), plus Panel Stored. The bank and slot menus are Hidden parameters whose
items the controller sets.

## Compatibility rules

- Parameter names, order numbers and ranges are what saved Live Sets and
  automation refer to. `controls.js` is in parameter order; append, never
  reorder; leave a `{retired}` placeholder for a removed control.
  `npm run verify` compares every parameter with `test/fixtures/parameters.json`.
- The CC map, encodings and the 35-byte record follow SID SYNTH and LukHash's
  editor (see `MIDI_PROTOCOL.md` and `PRESET_FORMAT.md`).
- Output file names (`sid_ui_logic.js`, `sid_banks.js`, the icons) are what the
  device loads from its folder.
