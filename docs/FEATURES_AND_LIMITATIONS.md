# Features and known limitations

## Implemented native SID SYNTH control

- Seven play modes with corrected ordering
- ARP speed and direction
- Portamento
- Pulse/Saw/Triangle combinations and exclusive Noise
- Ring modulation, hard sync, and attack click
- PWM on, width, rate, depth, cycle, and retrigger
- Filter mode, cutoff, resonance, rate, cycle, and retrigger
- Vibrato on, depth/frequency, rate, delay, type, and retrigger
- Tremolo on and rate
- Amplitude ADSR and envelope retrigger
- Program Change selection for 54 slots; the panel follows Program Changes arriving on the track
- Resend complete state (Program Change, then every CC)
- RANDOM: weighted random sounds that stay playable (envelope shapes, audible filter, Ring/Sync never together)
- Ring Mod and Hard Sync kept mutually exclusive
- Clock division readout for ARP/ARP+ Speed (`SYNC 1/16`)
- A reopened Live Set keeps its panel (edits included) and sends it to the C64 once loaded
- Panic with All Sound Off and All Notes Off
- Track MIDI, mod wheel, and pitch-bend passthrough

## Preset and bank features

- SID SYNTH's PRESETS1-5 (copied from the user's disk image) and any other `.SLO` bank, from one folder
- Local bank/preset menus
- Silent panel update during recall
- Banks are native C64 `.SLO` files in the `SID SYNTH Banks` folder of Live's User Library (create from the device; rename, delete and copy to/from the C64 in the folder yourself)
- Two-step save: SAVE, pick bank and slot, STORE
- The bank in use is remembered with the Live Set
- An EDITED marker for unsaved edits; status messages go to Max's console
- Nine-character SID-compatible patch names

## Live-side additions

### Cutoff Envelope

Note-triggered ADSR modulation of CC74 around the stored Cutoff base. Amount is bipolar. This is not stored in the C64 patch.

### Step Mod (parameters: Clocked Motion)

Eight-step Live-tempo sequencer targeting Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate, or Sustain (a fade: down fades held notes, up is heard from the next note). It offsets the stored value and restores it when disabled. Smooth (0–100 %) glides between steps on an eased curve; at 100 % it behaves as a drawable, tempo-synced LFO. A playhead shows the current step.

### Expression

Velocity, Pressure (aftertouch), mod Wheel, pitch Bend and Key tracking each map to one documented target with a bipolar amount, offsetting the stored value and restoring it afterwards. Wheel defaults to SID SYNTH's native CC1 vibrato wheel; choosing another target takes it over and stops passing CC1 to the C64. Bend always keeps bending pitch. Vel > Cutoff Env scales the Cutoff Envelope depth by velocity.

## Known protocol limitations

- No complete state readback from the C64.
- No MIDI command to save the active C64 patch to disk or commit a snapshot.
- No SysEx patch transfer.
- No C64 bank loading over MIDI; picking a bank sends the slot's sound (Program Change and every CC), not the bank.
- Custom `.MCC` maps are unsupported; use the official default mapping.
- `.INS` import/export is not implemented.
- The bank folder is fixed (`Presets/MIDI Effects/Max MIDI Effect/SID SYNTH Banks` in the User Library); banks are renamed and deleted in the folder, not from the device.

## Hardware verification status

Tested with SID SYNTH on an Ultimate 64 through TeensyROM (Sequential MIDI). Dense modulation sends many CCs; if notes start to go astray, thin it out (SID SYNTH's manual notes a C64 can only take in so much MIDI at once) and use PANIC for stuck notes.

