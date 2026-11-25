# Developing

Requirements: Node.js 18 or later (no npm packages), and Ableton Live 12 with
Max for Live (Max 9) to try the device.

```sh
npm run build    # write dist/SID SYNTH Controller/
npm run verify   # check the build: files, parameters, layout, no absolute paths
npm test         # run the controller and bank-helper tests against the build
npm run check    # all three
```

Never edit the generated `.amxd` or `.maxpat`; change `src/` and rebuild. The
version comes from `package.json`.

## Tests

`npm test` runs the built device's controller in Node (Max's `outlet` and the
clock are replaced) and the real bank helper against a temporary home folder.

- `controller.test.js`: MIDI out, banks, loading and restoring, Program Change,
  saving and the performance layers, one behaviour per test.
- `banks.test.js`: creating, writing, renaming and listing bank files.
- `session.test.js`: a long scripted session whose every MIDI message, control
  value and panel command must match `test/fixtures/session.json`. After an
  intended change, review the difference and record the new output with
  `npm run test:record`.

`npm run verify` fails if any Live parameter changed (name, order, range, menu
items). If the change is intended, and only appends, run
`node tools/verify_build.js --lock` to record the new table.

## Trying it in Live

Load the built `.amxd` on a spare MIDI track whose **MIDI To** is *No Output*
(so nothing reaches the hardware), or copy the dist folder into your User
Library. Live caches devices by path, so give each test build a new file name.

The Node tests cannot see the Max side (patch cords, rendering, Live's parameter
restore). Before a release, check in Live:

- a fresh device loads PRESETS1 slot 1 from the bank folder; `<` `>` step
  slots; C64 SYNC, RANDOM and PANIC flash when pressed;
- an edit lights EDITED; duplicating the device keeps the edit and reports it;
- SAVE lists your banks and STORE writes the slot; NEW BANK opens the name
  dialog; renaming the current bank's file in Finder is followed;
- each M4L page shows only its own controls, and modes mute the right controls
  (Direction outside ARP, PORTA in ARP, Envelope Retrig in POLY/ARP, waveforms
  with Ring);
- with hardware: notes, pitch bend and mod wheel pass through; Step Mod follows
  the transport.

Judge visual changes from screenshots of the exact build, both states of any
conditional control, and the rendered text rather than object coordinates
(`MODULE_STYLE_GUIDE.md` lists Live's rendering quirks).

## Releasing

1. Update `version` in `package.json` and add a `CHANGELOG.md` entry.
2. `npm run check`, then the Live checks above.
3. Zip the whole folder, not just the `.amxd`. The zip's name carries the
   version; the folder inside it does not, so people who update by replacing
   the folder keep the same path and their Live Sets keep working:

   ```sh
   cd dist && zip -rX SID-SYNTH-Controller-v<version>.zip "SID SYNTH Controller" -x '*.DS_Store'
   ```

## Banks for trying it in Live

The device embeds no presets. To have SID SYNTH's sounds while testing, copy
`PRESETS1.SLO` to `PRESETS5.SLO` from the SID SYNTH disk image into the bank
folder (the default User Library location shown; the folder button opens yours):

```sh
node tools/extract_d64.js sidsynth.d64 out/
cp out/PRESETS*.SLO ~/Music/Ableton/User\ Library/Presets/MIDI\ Effects/Max\ MIDI\ Effect/SID\ SYNTH\ Banks/
```

The tests never need them: `test/helpers.js` makes up banks.
