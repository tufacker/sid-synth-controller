# MIDI protocol and controller map

## Transport model

SID SYNTH uses ordinary MIDI messages:

- Note On/Off
- Control Change
- Program Change
- Pitch Bend
- MIDI Clock for ARP/ARP+

No patch-state SysEx protocol was documented or found. Static inspection of the supplied standalone editor showed short-message MIDI output and no long-message API path. SID SYNTH ignores SysEx for this purpose.

The Max device passes incoming track MIDI through and adds its controller messages to the same stream.

## Default CC map

The device assumes SID SYNTH's official default `.MCC` mapping.

| Destination | CC | Native range | CC encoding |
| --- | ---: | --- | --- |
| Vibrato Wheel | 1 | 0–127 | direct |
| Vibrato Frequency | 77 | 0–31 | value × 4 |
| Vibrato Rate | 76 | 1–32 | (value − 1) × 4 |
| Vibrato Type | 79 | 0–3 | value × 32 |
| Vibrato Delay | 78 | 0–31 | value × 4 |
| Vibrato Retrig | 80 | 0–1 | 0, 127 |
| Vibrato On | 81 | 0–1 | 0, 127 |
| Filter Cutoff | 74 | 0–127 | direct; `.SLO` quantizes to 32 steps |
| Filter Resonance | 71 | 0–15 | value × 8 |
| Filter Rate | 82 | 0–31 | value × 4 |
| Filter Cycle | 83 | 0–4 | 0, 26, 51, 77, 102 |
| Filter Mode | 85 | 0–3 | value × 32 |
| Filter Retrig | 86 | 0–2 | 0, 43, 86 |
| PWM Width | 102 | 0–127 | direct; `.SLO` quantizes to 32 steps |
| PWM Rate | 103 | 0–31 | value × 4 |
| PWM Depth | 104 | 0–31 | value × 4 |
| PWM Cycle | 105 | 0–3 | value × 32 |
| PWM Retrig | 106 | 0–2 | 0, 43, 86 |
| PWM On | 107 | 0–1 | 0, 127 |
| Play Mode | 22 | 0–6 | value × 19 |
| Waveform | 28 | 0–7 | value × 16 |
| ARP Speed | 31 | 1–31 | 1 → 0; otherwise value × 4 |
| ARP Direction | 23 | 0–2 | 0, 43, 86 |
| Portamento | 30 | 0–1 | 0, 127 |
| Pitch-bend CC destination | 24 | 0–127 | unused; real Pitch Bend passes through |
| Ring Modulation | 25 | 0–1 | 0, 127 |
| Hard Sync | 26 | 0–1 | 0, 127 |
| Tremolo Rate | 14 | 0–31 | value × 4 |
| Tremolo On | 15 | 0–1 | 0, 127 |
| Attack Click | 27 | 0–1 | 0, 127 |
| Attack | 73 | 0–15 | value × 8 |
| Decay | 75 | 0–15 | value × 8 |
| Sustain | 70 | 0–15 | value × 8 |
| Release | 72 | 0–15 | value × 8 |
| Envelope Retrig | 67 | 0–2 | 0, 43, 86 |
| Preset Select destination | 29 | 0–127 | not used; Program Change selects slots |

The machine-readable copy is `dist/SID-SYNTH-M4L-v0.16.16/default_cc_map.csv`.

## Play-mode order

The corrected editor order is:

```text
0 ARP
1 POLY
2 MONO
3 5THS
4 OCT
5 OCT+
6 ARP+
```

This ordering corrected the earlier off-by-one/misaligned ARP behavior.

## Waveform encoding

The native waveform field has eight states:

```text
0 Pulse
1 Saw
2 Triangle
3 Noise
4 Triangle + Saw
5 Triangle + Pulse
6 Saw + Pulse
7 Triangle + Saw + Pulse
```

The UI presents Pulse, Saw, and Triangle as independent combinable toggles. Noise is exclusive. Ring modulation forces Triangle because that is how the SID ring-modulation output is produced.

## Preset selection

The device uses MIDI Program Change values 0–53 for SID slots 1–54. Program Changes arriving on the track pass through to the C64 and the panel follows them (read as raw bytes from midiparse's `midievent` outlet). The assignable CC29 `PRESET SELECT` destination is not used because Program Change is explicitly documented and unambiguous.

## MIDI clock

Only ARP and ARP+ follow incoming MIDI clock. Enable **Sync** for the correct mio10 output in Live. SID SYNTH's native Filter, PWM, Vibrato, and Tremolo rates are free-running; the Max device therefore implements a separate Clocked Motion sequencer rather than pretending those native rates are tempo-synced.

## Readback limitation

There is no complete patch readback from SID SYNTH. Changes made on the C64 cannot update the Max panel. The panel becomes authoritative when it recalls a patch, sends C64 SYNC, or finishes loading (a reopened Live Set sends its saved panel).

