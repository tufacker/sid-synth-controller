# SID SYNTH Controller for Ableton Live: User Guide

A Max for Live MIDI effect that edits, automates and stores sounds for
LukHash's **SID SYNTH**, the Commodore 64 synthesizer, over MIDI. Every sound
setting SID SYNTH accepts over MIDI is on one panel, uses SID SYNTH's default CC
map, and can be automated in Live.

## What you need

- Ableton Live 12 Suite (or Live 12 with Max for Live, Max 9).
- SID SYNTH running on a C64 or C64 Ultimate with a MIDI interface, MIDI on in
  its menu, and its standard CC map. TeensyROM is the interface LukHash uses.
- A MIDI output from your computer that reaches that interface.

`SETUP_GUIDE.md` describes one complete working setup (TeensyROM, Ultimate 64,
a USB MIDI interface and Live).

## Install

Keep these files together in one folder and drag the `.amxd` onto a MIDI track:

- `SID SYNTH Controller.amxd`
- `sid_ui_logic.js` and `sid_banks.js`
- the `sid_*.svg` icons

Set the track's **MIDI To** to the port that reaches the C64. Notes, pitch bend,
mod wheel and everything else on the track pass through to SID SYNTH; the device
adds its own messages to the same stream. For the arpeggiator to follow Live's
tempo, turn on MIDI Clock for that output in Live's Link, Tempo & MIDI settings.

Hover over any control with Live's Info View open for a short explanation.
Section titles have help too. The version is shown small at the right of the
EDITED row. Messages about bank files (a missing bank, a name already taken) go
to Max's console.

## Sounds and banks

- **Banks** are native SID SYNTH `.SLO` files (54 sounds with 9-character
  names) in the `SID SYNTH Banks` folder of your Live User Library, under
  `Presets/MIDI Effects/Max MIDI Effect/` (by default
  `~/Music/Ableton/User Library/...` on a Mac, `Documents\Ableton\User Library\...`
  on Windows; a User Library you moved in Live's Settings is followed). The
  folder is created the first time the device loads. Any
  valid `.SLO` you put there appears in the bank menu at once. The folder button
  beside the bank menu opens it in Finder (Explorer on Windows). Copy SID SYNTH's
  own `PRESETS1.SLO` to `PRESETS5.SLO` there from your SID SYNTH disk image with
  a C64 disk tool (DirMaster, droiD64) to use the factory sounds; bank files go
  back to the C64's disk the same way. The device creates bank files but never
  renames or deletes them: do that in the folder. Rename the bank you are using
  and the device follows it; delete it and the panel keeps its sound.
- **PATCH NAME** (top left) shows the sound's name; type a new one before
  SAVE.
- **PATCH SELECT**: the bank and slot menus below the name. The bank menu lists your banks,
  and `NEW BANK…`. Picking a bank or a slot
  sends the whole sound to the C64: Program Change, then every setting, so the
  C64 plays what the panel shows whichever bank it has loaded. `<` and `>` step
  through the slots. A new device starts on PRESETS1 slot 1 if it finds it, on
  your first bank otherwise, and on 54 INIT sounds with no banks at all.
- **Saving.** Type a name in the name field and press `SAVE`. Choose one of your
  banks and a slot in the PATCH SELECT menus (the slot menu shows the sound
  you will replace),
  then press `STORE`, or `CANCEL`. The bank file is rewritten at once.
- `EDITED` means the sound differs from its slot. The bank, slot and sound are
  stored with the Live Set: reopening it restores the panel, edits included,
  and sends it to the C64.
- A Program Change arriving on the track (from a clip, say) reaches the C64 and
  the panel follows it.

## Sending to the C64

- Every change on the panel is sent at once.
- SID SYNTH holds one bank, and its screen shows names from that bank. The
  device sends Program Change for the slot number and then every setting, so
  the C64 plays the panel's sound whichever bank it has loaded, but it shows the
  name stored in that slot of its own bank. Load the same bank on the C64 as
  the one selected in the bank menu (copying a bank made in Live to the C64's
  disk first) and the names match too.
- `C64 SYNC` sends the panel's sound again: Program Change for the slot (so
  the C64 shows that slot), then every setting. Use it after restarting SID
  SYNTH or changing something with the C64's own keys.
- `RANDOM` makes a new random sound and sends it: an envelope shape (pluck,
  lead or pad), waveform, filter and modulation chosen to stay playable. It
  replaces the panel's sound (marked EDITED, named RANDOM); SAVE keeps one you
  like.
- `PANIC` sends All Sound Off and All Notes Off.

## Live-side layers

These add movement on top of the stored sound. They send ordinary SID SYNTH CCs,
offset from the stored value and restored when released, and are saved with the
Live Set rather than in the C64 sound.

- **CUT ENV**: a note-triggered ADSR on Cutoff, with a bipolar Amount.
- **STEP MOD**: eight tempo-synced steps on Cutoff, Resonance, PWM Width, PWM
  Depth, Vibrato Depth, Tremolo Rate or Sustain. `Smooth` glides between steps;
  at 100% it is a drawable, tempo-synced LFO. Its parameters are named Clocked
  Motion in Live.
- **EXPR**: Velocity, Pressure (aftertouch), Wheel, Bend and Key tracking, each
  to one target with a bipolar amount, plus velocity scaling of the cutoff
  envelope. Wheel on `VIBRATO` keeps SID SYNTH's own mod-wheel vibrato; any other
  target takes the wheel over. Bend always bends pitch as well.

Sustain as a target works as a fade: lowering it fades held notes, while raising
it is heard from the next note, because the SID envelope only falls towards the
sustain level.

## Good to know

- Values are shown in decimal. Cutoff and PWM Width use SID SYNTH's full 0-127
  MIDI range; a saved slot keeps their nearest 32-step value.
- Ring Mod and Hard Sync are mutually exclusive, as on the C64.
- In ARP and ARP+, the line beside ARPEGGIO shows the note division Speed selects
  when the C64 follows MIDI clock (for example `SYNC 1/16`).
- The device cannot read the C64's state back over MIDI. After changing a sound
  on the C64 itself, press `C64 SYNC` to bring the two back in step.
- Only SID SYNTH's standard CC map is supported (no custom `.MCC` maps), and
  single-sound `.INS` files are not supported.
