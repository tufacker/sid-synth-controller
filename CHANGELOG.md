# Changelog

This file records the major functional and design stages. The complete set of intermediate artifacts is preserved under `archive/builds/`.

## v1.0.0 — current

First public release. Functionally the same as v0.26.0.

- Every sound setting SID SYNTH accepts over MIDI on one panel, as automatable Live parameters, using SID SYNTH's default CC map.
- Banks as native C64 `.SLO` files in the `SID SYNTH Banks` folder of Live's User Library (SID SYNTH's own PRESETS1-5 once copied there): browse, save to any slot, create banks; rename and delete them in the folder.
- The sound is stored with the Live Set and sent to the C64 when the set opens; RESEND, PANIC and RANDOM.
- Live-side layers: Cutoff Envelope, Step Mod (tempo-synced, with Smooth) and Expression (velocity, aftertouch, mod wheel, pitch bend, key tracking).
- Built from source with Node.js; `npm run check` builds, verifies and tests.
- The device is named **SID SYNTH Controller** (no version in its name); the version is shown small under the name field.
- **RESEND TO C64 is now C64 SYNC** (same action: Program Change for the slot, then every CC).
- **Program strip relaid out** as one tall cell: **PATCH NAME** and the name field at the top (so it reads as the sound's name rather than another selector), then a **PATCH SELECT** section (bank menu with folder button, slot menu, `<` `>` SAVE), then EDITED with the version, C64 SYNC, RANDOM and PANIC. The status line is gone; status messages go to Max's console, and in save mode the slot menu shows what STORE replaces.
- **Banks moved into Live's User Library**: `<User Library>/Presets/MIDI Effects/Max MIDI Effect/SID SYNTH Banks`, beside the presets of other Max MIDI effects, instead of `~/Music/SID SYNTH Banks`. The helper reads the User Library's location from Live's `Library.cfg` (newest Live version), so a library moved in Live's Settings is followed, and falls back to Live's default (`~/Music/Ableton/User Library`, `Documents\Ableton\User Library` on Windows). Banks in the old folder are not moved; copy them across.
- **RENAME BANK removed.** Rename (and delete) banks in the folder the folder button opens; when the bank in use is renamed there, the device follows it (one file gone and one new in the same listing) and stores the new name with the set. The bank menu is now your banks plus `NEW BANK…`, and the Node helper no longer has a `rename` command.
- **No yellow Max tooltips.** Buttons, menus and the name field had a Max `hint` repeating their Info View text; only the Info View text remains.
- **Folder button** beside the bank menu opens the bank folder in Finder (Explorer on Windows), via the Node helper's new `openbanks` command (not `reveal`, which `node.script` handles itself); the full path is printed to Max's console.
- **Info View help everywhere:** buttons, the name field, the step bars and envelope editor now carry Live Info View help (annotations; their old Max tooltips did not reach the Info View); section titles, the status line, EDITED and the SYNC readout explain themselves through invisible help zones (Live shows no Info View for text); and the help for Speed, the expression targets and the slot menu covers the clock-division readout, Sustain as a target and Program Change following. `npm run verify` fails if a visible control has no help.

## v0.26.0

- **RANDOM button** (bottom of the program strip, beside a narrower PANIC). It rolls a new sound from weighted random values that keep it playable: a pluck, lead or pad envelope; mostly pulse and saw (noise rarely, Ring forcing triangle); an audible filter cutoff and moderate resonance; PWM, vibrato and tremolo now and then; Ring Mod and Hard Sync never together. The sound is sent as CCs to the current slot (no Program Change), shown on the panel, named RANDOM and marked EDITED, so SAVE keeps it. Seeded from the clock on each press.
- Tested offline: 500 presses stay in every parameter's range and keep the rules, with over 490 different sounds; the session recording includes three presses. Checked in Live: the button row, panel update, muting, EDITED and status.

## v0.25.0

Prepared for open-sourcing: the device no longer contains LukHash's presets.

- **Banks come only from the bank folder.** The five factory banks are no longer embedded. Copy SID SYNTH's `PRESETS1.SLO` to `PRESETS5.SLO` from your SID SYNTH disk image into `~/Music/SID SYNTH Banks` and they appear in the bank menu like any other bank (the README describes how). As a result they are ordinary files and no longer write-protected.
- A fresh device starts on PRESETS1 slot 1 if the folder has it, otherwise on the first bank, otherwise on 54 INIT sounds (the panel defaults). Sets saved before v0.25 that used factory bank *n* find the file `PRESETSn`. A set whose bank file is gone keeps its sound, moves to the first bank and says so.
- The bank menu lists the folder's banks, `NEW BANK…` and `RENAME BANK…`; `NO BANKS` shows when the folder is empty. New banks start as 54 INIT sounds (previously copies of PRESETS1's first sound).
- `tools/extract_d64.js` keeps names that carry their own extension, so it writes `PRESETS1.SLO` rather than `PRESETS1.SLO.prg`.
- Tests use made-up banks; the recorded session and every test run without any SID SYNTH data. The build no longer needs the factory banks.
- MIT license; `.gitignore` keeps the SID SYNTH research material, local archive and working notes out of the repository.
- Checked in Live: a fresh device selects PRESETS1 slot 1 from the folder; an edited device duplicated keeps its edit and reports it.

## v0.24.0

Code restructure for open-sourcing. No feature changes; the parameter table (names, order numbers, ranges) is identical, so existing Live Sets and automation keep working.

- **One controller source.** The v0.1 seed controller and the runtime overrides grafted onto it (encode, set, emitCC, program, wavebit, RESEND, PANIC) are merged into `src/device/sid_controller.js`, a plain file instead of code inside a template string. A scripted 1,608-message session produced byte-identical MIDI, control values and panel commands before and after.
- **Generator split** into `src/build/` (`build.js`, `controls.js` with each control's final layout and help in one place, `patcher.js`, `slo.js`). Removed: the hidden library page and its view switcher, the unused debug outlet and status comment, an unused colour table, the USER pseudo-bank, `factory_banks.json`, `USER.SLO`, and the README/research notes produced by patching the v0.1 seed. The user guide is now `docs/USER_GUIDE.md`. Factory banks live in `assets/factory-banks/`.
- **Fixed: a reopened set could lose its edits.** LOADED ran a fixed 100 ms after loadbang; when Live was busy, the last restored parameter (Panel Stored) arrived later, so the slot was reapplied over the saved panel. LOADED now follows `live.thisdevice` (Live has restored every parameter). Seen and confirmed in Live with v0.23.0 too.
- **No personal paths in the device:** the dependency list referred to the build folder by absolute path; it is now relative, and `npm run verify` rejects absolute paths.
- **Tests:** `npm test` runs controller tests (load and restore, RESEND/PANIC, Program Change, Ring/Sync, waveform, ARP division, Sustain, Step Mod, Cutoff Env, saving, missing bank), bank-helper tests against a temporary folder, and the recorded session. `npm run verify` locks the parameter table in `test/fixtures/parameters.json`. `npm run check` runs build, verify and tests.
- Palette and panel logic: dead roles removed, button fills renamed `btnbg_<button>`.
- Checked in Live (track with MIDI To = No Output): fresh load, RESEND, `<` `>`, save mode listing your banks via the Node helper, CANCEL, EDITED, and duplicate restore (twice).

## v0.23.0

- **Sustain is a modulation target** for Step Mod and every EXPR source (Velocity, Pressure, Wheel, Bend, Key). It is the nearest thing to a VCA: SID SYNTH has no volume destination over MIDI. Lowering Sustain fades held notes; raising it is heard from the next note, because the SID envelope only falls towards the sustain level (manual, Envelope and Retrig). 16 steps; Amount ±16 covers the full range. Appended to the target menus, so stored targets and automation keep their meaning.
- Tested offline (aftertouch fade to 0 and back, velocity, restore when the target is cleared).

## v0.22.0

Gaps found by comparing the panel with the SID SYNTH manual and LukHash's editor manual:

- **A reopened Live Set keeps its panel.** Previously the stored slot was re-applied on load, so edits saved in a set (or a duplicated device) were lost. Now nothing is sent while Live restores the device; once loaded, the panel is kept exactly as saved, named after its slot, marked `EDITED` if it differs from that slot, and sent to the C64 (Program Change, then all 34 CCs), like LukHash's editor does when a project opens. Status: `Sent edited DELTAWING to C64`. A new hidden Stored Only parameter, `Panel Stored`, tells a saved set (1) from a freshly added device (0); a fresh device still loads PRESETS1 slot 1. Sets saved before v0.22.0 load as before.
- **Program Changes arriving on the track** (from a clip or a keyboard) still pass to the C64, and the panel now follows: it selects that slot in the current bank and sends its sound. Status: `MIDI program 03 MONTYPYTH`. Read from midiparse's raw `midievent` output, so the numbering is unambiguous. Ignored while saving.
- **Ring Mod and Hard Sync are mutually exclusive**, as on the C64: switching one on switches the other off (panel and C64).
- **Clock division readout.** In ARP/ARP+ the ARPEGGIO header shows the note division Speed selects when the C64 follows MIDI clock (`SYNC 1/16`, two knob steps per division, 1/1 to 1/64T, from the manual's table). Blank in other modes, where Speed is the glide rate.
- Tested offline (load restore with and without edits across four banks, wave restore order, fresh load, Program Change via raw bytes and channel, Ring/Sync, every division; the 15-step bank test). Checked in Live: an edited device duplicated keeps its edit, lights EDITED and reports it; a fresh device loads clean; `SYNC 1/64T` on MONTY OCT (`docs/verification/v0.22.0`). **Not checked in Live:** a Program Change from a clip (Live's clip launch panel can't be reached from a background session), and Ring/Sync clicks (Max toggles ignore background clicks).

## v0.21.2

- **RESEND also sends the slot's Program Change first**, then all 34 CCs (as picking a slot does). The C64 moves to the same slot number, so its screen shows that slot's name from the bank it has loaded, and then plays the panel's sound with any edits. Status: `Sent 06 DELTAWING to C64`.
- **Buttons flash when pressed.** `<` `>` SAVE/STORE CANCEL RESEND PANIC light orange for a moment on each press (STORE returns to orange, the rest to grey), so a click is always visible.
- Tested offline (Program Change then 34 CCs, edits kept, flash and return colours). In Live on the C64 track: RESEND shows `Sent 01 REDBERET to C64` and the button returns to grey; the 180 ms flash is too quick for a background screenshot; confirmed by eye in Live.

## v0.21.1

- **RESEND and PANIC now confirm in the status line** (`Sent DELTAWING to C64`, `Sent all notes off`). They always worked, and RESEND never needed a save, but their only message went to a status area not shown on the panel, so a press looked like nothing happened. MIDI output is unchanged: RESEND sends all 34 CCs, PANIC sends CC120 and CC123. The RESEND tooltip now says it sends the panel sound with no save needed.
- Tested offline (34 CCs on the channel, status text) and in Live on the C64 track: RESEND shows `Sent REDBERET to C64` (`docs/verification/v0.21.1`). Panel layout unchanged.

## v0.21.0

User banks are real C64 `.SLO` files, and saving is a two-step pick-and-store:

- **Your banks** are native SID SYNTH `.SLO` files (54 slots, 9-character names, byte-for-byte the C64 format) in `~/Music/SID SYNTH Banks`. The bank menu lists PRESETS1–5 (read-only), every valid `.SLO` in that folder, `NEW BANK…` and, when one of your banks is selected, `RENAME BANK…`. Files you copy into the folder appear without reloading. Moving files to and from the C64 is left to you; the device never deletes a file.
- **Saving:** type the name, press `SAVE`. The panel switches to save mode: `<` `>` give way to `CANCEL`, SAVE becomes an orange `STORE`, the bank menu lists only your banks (plus `NEW BANK…`), the slot menu shows that bank's slots, and the status line says what will be replaced (e.g. `To MYBANK 05 (now INIT 05)`). `STORE` rewrites the bank file at once and selects the saved slot. With no banks yet, save mode offers `NEW BANK…` first.
- **Picking a bank** now loads its current slot and sends the whole sound (Program Change plus CCs), like picking a slot. The C64 plays what the panel shows whichever bank it has loaded, so the old "load this bank on the C64" reminder is gone.
- **Live Set recall:** the bank in use is remembered (Preset Bank 6 + a Stored Only `User Bank Name`). If that file is gone the device falls back to PRESETS1 and says so; sets from before user banks (old USER) fall back too.
- **File work runs in a Node for Max helper** (`sid_banks.js`, `node.script`): list, read, write (via a temporary file, so a failed write never leaves half a bank), create, rename, and a folder watch. New-bank and rename names use Max's `dialog` (up to 12 letters, digits, spaces, `-` or `_`).
- **Panel:** the BANK FILE menu and `SAVE Unn` are gone. The name field moves up under `<` `>` `SAVE`; the PATCH cell has `EDITED`, a two-line status line, RESEND and PANIC. Fixed: the status line was never connected (since v0.20.0); a one-item list is ignored by a Live menu, so save mode with no banks shows `NO BANKS` above `NEW BANK…`.
- Tested offline end to end (controller code plus the real Node helper against a temporary folder): create, save-mode targeting, store, file contents, browse, rename, Live Set reload, missing bank, old-USER fallback, dropped-in files, cancel. Checked in Live: browse layout, the helper running (it created the bank folder), and save mode's look (via a preview). **Not checked in Live:** clicking through NEW BANK (the dialog), STORE, RENAME and reopening a set; Live's menus and dialogs cannot be operated from a background session.

## v0.20.0

Preset section (BANK / PATCH cells) workflow pass:

- **Status line** under the patch name shows the last action or reminder: `Saved to U03`, `Saved MYBANK.SLO`, `Opened MYBANK.SLO`, `Load PRESETS2.SLO` (after a bank change, as a reminder to load that bank on the C64), `Pick a bank file`, `Save failed`, `Not a SID bank`. Previously these messages went to a hidden page, so failures were silent. Full error details also go to the Max console.
- **SAVE names its destination.** It is now a plain button labelled `SAVE U01`–`SAVE U54`: the USER slot with the selected slot number, whichever bank is shown. Factory banks are never written. `<` and `>` are slightly narrower to make room.
- **EDITED marker.** An orange `EDITED` beside "Name" shows unsaved edits; SAVE no longer doubles as that light. Values reported while the device loads are ignored, so a freshly loaded device is not marked edited.
- **USER bank kept with the Live Set.** A Stored Only blob parameter (`pattr sid_user_bank`, "User Bank Data") holds all 54 USER slots, their names and the linked `.SLO` location, so reopening or duplicating the device brings the bank back without reopening the file.
- **Live menus.** The bank, slot and BANK FILE selectors are `live.menu` objects like MODE (Hidden parameters, not stored, no initial output); the stored bank and slot are still the Preset Bank / Preset Slot parameters. Slot names are single menu items (their spaces are non-breaking).
- `tools/verify_build.js` now also checks that the embedded controller code parses. A broken escape in this release slipped past the old checks and was caught by the offline test.
- MIDI is unchanged: Program Change and recall CCs work as before.
- Verified offline (SAVE label, status messages, blob store/restore round trip, echo guard, menu items). Checked in Live: menus, `SAVE U01` → `SAVE U02` after `>`, status line and EDITED rendering (via a preview). **Not yet checked in Live:** choosing a bank from the menu (including the USER bank's slot names), SAVE / OPEN / SAVE AS with real files, and the bank coming back after reopening a set. Live's menus cannot be operated from a background session.

## v0.19.2

- **Wheel slider removed.** The Vibrato Wheel control and its Live parameter are gone. In SID SYNTH, WHEEL is only an on-screen copy of the mod wheel (CC1, vibrato depth, never saved), and your keyboard's wheel does the same job. Choose what the wheel does in the EXPR page's Wheel row; with it on `VIBRATO`, the keyboard's CC1 still passes straight to the C64 as before.
- The other parameters keep their order numbers (the removed slot is skipped), so existing mappings don't shift. Automation lanes drawn for Vibrato Wheel in old sets will no longer have a target.
- The EXPR rows are evenly spaced (20 px pitch: Velocity, Pressure, Wheel, Bend, Key, Vel > Cutoff Env), and the Position label is gone.
- Offline test: wheel takeover, keyboard wheel movement, handback, bend and key tracking produce the same CCs as v0.19.1. Checked in Live on the EXPR page.

## v0.19.1

- **Clearer Wheel row on the EXPR page.** The bar under the Wheel row now has a **Position** label: it shows where the mod wheel is (CC1, 0–127), and is not a setting.
- **Unused Amounts dim.** Each expression Amount box fades while its source has no target: Velocity, Pressure, Bend or Key set to `OFF`, or Wheel on `VIBRATO`, where SID SYNTH's own wheel vibrato applies and Amount has no effect. The boxes stay editable, like other faded controls.
- Presentation only: no MIDI, CC or parameter changes. Checked in Live on the EXPR page, with Velocity → Cutoff active and the other sources idle.

## v0.19.0

- **New expression sources** on the EXPR page, using the same target-and-amount model as Velocity and Pressure (an offset around the stored value, restored afterwards):
  - **Wheel → target.** The default is `VIBRATO`, SID SYNTH's native CC1 wheel, which behaves exactly as before. Any other target takes the wheel over: native wheel vibrato is released (CC1 0) and incoming MIDI switches to a parse/rebuild pass-through (`midiparse`/`midiformat @hires 2`, 14-bit bend preserved) that drops only CC1. The on-screen Wheel bar drives the same source.
  - **Bend → target.** Pitch bend still bends pitch; the target is a second, bipolar destination.
  - **Key → target.** Tracks the last note played, centred on C3, with full Amount four octaves away.
  - **Vel > Cutoff Env.** Scales the Cutoff Envelope depth by note velocity (0–100 %).
- With Wheel on `VIBRATO` (the default), incoming MIDI still passes byte-for-byte through the original path.
- Renamed on the panel only: the tabs are now **CUT ENV · STEP MOD · EXPR** across the full width (the M4L badge is gone), and Clocked Motion is shown as **STEP MOD**. Parameter names are unchanged, so saved automation and mappings still work.
- The on-screen Wheel no longer dims with Vibrato, because it can drive other targets.
- Verified offline by running the generated controller code: wheel handover and handback, bend, key tracking and velocity-scaled envelope all produce the expected CCs. The EXPR page layout was checked in Live. Not yet played from a real keyboard.

## v0.18.0

- **New: Clocked Motion Smooth (0–100 %).** At 0 % Motion steps exactly as before. Above 0 %, each step glides from the current position to its value over that share of the measured step length, on a cosine (eased) curve; at 100 % the steps join into one continuous, tempo-synced wave. The step length is measured from the clock ticks. The glide updates on the existing 20 ms timer, and a CC is sent only when the encoded value changes, so MIDI traffic stays bounded.
- `emitPerformance` now de-duplicates on the encoded CC value rather than the raw float. This only removes repeat sends of an identical CC.
- The new parameter is appended after all existing ones, so existing parameter order, automation and C64 mappings are unchanged. It is a Live-side feature and is not stored in the C64 sound.
- The glide was verified offline by running the generated controller code with a simulated clock (0 %: hard steps; 50 %: glide finishes mid-step; 100 %: full-step glide). Its look was checked in Live; it still needs listening to with the transport running.

## v0.17.5

- Clocked Motion playhead. The current step's number turns orange and a 2 px orange bar lights above its column; it clears on transport reset and while Motion is off. The controller already sent `motionstep` on every tick, but the route never listed it, so the message fell through to the slot menu, which ignored it. It is now routed to `sid_ui_logic.js`. There is no change to MIDI output.
- Not yet seen moving in Live: that needs the transport running, which was left to the user.

## v0.17.4

- The ENVELOPE and Cutoff Env knob rows share one baseline (y 110, h 52) and one width (34 px), so their names, rings and values line up when both are on screen. The four ENVELOPE knobs are evenly spaced at a 38 px pitch.
- Cutoff, Reso and PWM Width (the large knob style) moved down 3 units and share one height (66), so all three rings are the same size and sit centred in their cells.

## v0.17.3

- Vertically centred both envelope knob rows. `live.dial` draws its name, ring and value at the top of its box, so the extra height left them sitting high with empty space below. ENVELOPE dials are now at y 111 (h 54), and the ENV-page dials at y 108 (h 50), giving equal space above the labels and below the values.

## v0.17.2 (full comparison pass against the v3 mock)

- **Lock rules corrected from the SID SYNTH manual.** Speed is the shared arpeggio rate and portamento glide time, so it is no longer locked outside ARP. It only fades (and stays editable) when the mode isn't ARP/ARP+ and PORTA is off. Envelope Retrig now locks in POLY, ARP and ARP+, matching the C64's own greying.
- Value arcs (all knobs), the step bars and the Wheel bar are now teal (#00BCCC), as in the mock, so orange marks only selected or on states.
- Button and tab text is bold, as in the mock (PORTA, Ring/Sync/Click, `<` `>` SAVE, RESEND, PANIC, DN/UP/ALT, ENV/MOTION/EXPR). Page-tab text is 7.5 pt and the status dots are 5 px.
- MOTION page: the step numbers 1–8 now sit in their own row above the bars, which start at y 74. There are 1 px gaps between the columns and a zero line, and steps beyond Len are darkened so the pattern length is visible. The value row no longer wraps two-digit negative values.
- The ARPEGGIO rule and the OSCILLATOR/PWM divider are now visible. The bank file menu reads "BANK FILE".

## v0.17.1

- PORTA is now locked (dimmed, ignores clicks) in ARP and ARP+, where SID SYNTH ignores portamento. Its stored value is unchanged, so automation and preset recall are unaffected.

## v0.17.0 (Claude takeover: whole-panel style system)

- **Fixed RESEND TO C64 and PANIC, which had never worked.** The buttons sent a bang straight into the controller, which only handles the named `RESEND` and `PANIC` messages. Each button now triggers its named command. MIDI CC wiring, ranges and parameters are unchanged.
- Replaced roughly 250 lines of per-control colour overrides with one palette module, `src/sid_palette.js`. The generator and `sid_ui_logic.js` both use it: the build prepends it to the dist copy of the UI script. Colours are now set directly (no Live theme expressions), so the device renders like the Claude v3 mock in any Live theme.
- Muted and locked sections now dim as a unit: fields, values, labels, knob arcs, needles and knob names, matching the mock's 35% opacity. `active 0` is no longer used anywhere. Faded controls stay editable; only locked ones ignore clicks.
- Momentary buttons (`<`, `>`, RESEND, PANIC) are now square. Live draws a mode-0 `live.text` as a pill whatever its `rounded` value, so each button is transparent over a square panel.
- The ENV / MOTION / EXPR selector is now one native `live.tab` (square segments, only the selected one orange). It replaces three pill buttons plus overlays whose selected state never drew.
- The page status dots now draw. They were 4 px `live.text` objects, which Live never renders; they are now small round panels coloured by the UI script.
- Every above-field label is now 12 px above its field, so its text clears the field. This fixes the FILTER Rate/Cycle/Retrig labels that were hidden under their fields, and the crowded Vibrato, Motion, Expression and Name labels.
- Envelope dials moved up to the mock position (y 99), so they no longer touch the device's bottom edge. Section titles are aligned to their controls, and the ENVELOPE header is in line with the other bottom-row headers.
- The Name field is square, and the Cutoff Env Attack/Decay/Release readouts show whole milliseconds ("20 ms").
- The verifier now rejects any leftover theme colour, any visible control outside one cell, and any two overlapping visible controls.
- Verified in Live 12 at 110% display zoom in these states: default POLY/filter OFF/ENV page; ARP + Ring on + PWM off + Tremolo on; filter LP + Cutoff Env on; MOTION page; EXPR page. The captures are in `docs/verification/v0.17.0/`.

## v0.16.16

- Corrected PWM header alignment from the rendered screenshot rather than matching object rectangles.
- Mirrored the accepted Vibrato/Tremolo geometry: title rect 7 px right and 3 px above the 9×9 toggle, with both ending at the same y position.
- Removed the unwanted light resting borders around PWM Rate and Depth; the light frame now appears only on focus.
- Changed the PWM Width dial arm from orange to neutral white while retaining the orange value arc.
- Expanded the reusable style and test guides with the screenshot-validated rules from this pass: optical glyph alignment, neutral dial needles, dark resting field borders, testing both toggle states, and no visual completion claim before inspecting the exact Live build.

## v0.16.15

- Raised the PWM title and its 9×9 toggle together to create a cleaner, uniform gap above the Width dial.
- Raised the PWM title/toggle header; screenshot review in v0.16.16 then corrected its optical alignment.
- Added a visible Live LCD frame to the PWM toggle so the square remains readable when off.
- Verified the revised header and both toggle states in Ableton Live beside Drift.

## v0.16.14

- Normalized all four waveform cells to the same 28×32 presentation size.
- Optically centered the waveform symbols and simplified the Noise trace so its density matches the other symbols.
- Normalized Ring, Sync, and Click to the same 37×15 size, spacing, and 8.5 pt typography.
- Right-aligned the four PWM labels against an identical 34×14 field stack with a consistent 17 px pitch.
- Made PWM Rate, Depth, Cycle, and Retrig use neutral white active values and arrows instead of the orange selection color; muted states remain gray.
- Loaded v0.16.14 beside v0.16.13 and Drift in Live and verified the rendered OSCILLATOR/PWM section from a screenshot.

## v0.16.12

- Replaced the `live.menu` LCD four-corner focus ornament with the continuous Live focus frame used by Drift.
- Applied the same focus treatment to Mode, Vibrato Type, and Vibrato Retrig.
- Loaded the device beside Drift and captured each focused menu in Live to verify the rendered border rather than relying on patch attributes alone.

## v0.16.11

- Fixed muted Mode/Arpeggio/Vibrato/Tremolo fields by keeping the Live controls visually active while blocking unavailable interaction with `ignoreclick`.
- Applied explicit active field `#2E2E2E`, muted field `#555555`, active value `#F7F7F7`, and muted value `#939393` colors.
- Verified the result in Live in POLY and ARP states; rendered muted Speed pixels measure approximately `#555555`, and only the selected ARP direction is accented.
- Moved the Tremolo Rate label to a one-pixel layout gap from its value box.

## v0.16.10

- Configured separate active and inactive field colors for the compact Mode/Vibrato/Tremolo column.
- Measured Claude mock colors: active field `#2E2E2E`, muted field `#555555`, muted value target `#939393`.
- Verified in Live and identified native disabled-object compositing as the cause of the mismatch later fixed in v0.16.11.

## v0.16.x — Claude v3 layout implementation

- Rebuilt the presentation around the supplied Claude v3 panel.
- Added compact M4L tabs for ENV, MOTION, and EXPR.
- Consolidated native controls into a shorter two-row device.
- Added waveform SVG symbols and compact oscillator buttons.
- Reworked Mode, Arpeggio, Vibrato, and Tremolo alignment and control-state styling.
- Added Live Info View descriptions derived from the official manual.

## v0.15.x — compact panel and expression work

- Grouped Vibrato and Tremolo behavior.
- Added Clocked Motion and expression-oriented controls.
- Standardized decimal value display.
- Continued Drift- and Bass-inspired spacing and typography work.

## v0.14.x — native-style visual redesign

- Adopted Ableton-style surface cells, typography, field treatments, and compact control grouping.
- Added waveform icons, oscillator naming, filter organization, and panel dividers.
- Used Drift, Bass, Analog, Operator, Wavetable, Step Arp, and Expression Control as visual references.

## v0.10–v0.13 — preset and UI-state development

- Embedded the five factory banks and their 270 names.
- Added local preset recall that updates the panel without flooding Live's Undo history.
- Implemented contextual locking and fading through `sid_ui_logic.js`.
- Added writable USER-bank logic and native `.SLO` export/import behavior.
- Added filter envelope modulation.

## v0.3–v0.9 — functional editor expansion

- Corrected play-mode and arpeggiator mappings.
- Added bank-aware preset selection, local control recall, resend, and panic.
- Replaced large button matrices with menus and combinable waveform toggles.
- Added factory preset names recovered from the supplied D64.

## v0.1–v0.2 — protocol proof of concept

- Recovered the official default CC map and native value encodings from official documentation, screenshots, and static inspection of the Windows editor/VST3.
- Built the initial Max for Live MIDI controller.
- Confirmed that the design uses ordinary MIDI rather than a patch-state SysEx protocol.

