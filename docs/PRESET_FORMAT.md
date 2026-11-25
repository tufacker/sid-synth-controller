# SID SYNTH preset and bank format

## Native file types

The official editor documents:

- `.INS` — one sound
- `.SLO` — a 54-slot sound bank with names
- `.MCC` — MIDI controller mapping

This project implements `.SLO`. `.INS` and arbitrary `.MCC` import are not implemented.

## SLO layout

A native bank is exactly **2,378 bytes**:

```text
offset  length  purpose
0       2       C64 PRG load address: 00 C0
2       1890    54 × 35-byte sound records
1892    486     54 × 9-byte PETSCII names
```

Calculation:

```text
2 + (54 × 35) + (54 × 9) = 2378
```

The D64 version is stored as a PRG and occupies ten Commodore disk blocks.

## Names

Each slot name is nine bytes. The current encoder:

- converts to uppercase;
- permits A–Z, 0–9, and spaces;
- replaces unsupported characters with spaces;
- trims/collapses spaces;
- truncates or pads to exactly nine bytes;
- encodes A–Z as PETSCII values 1–26, digits as ASCII/PETSCII digit bytes, and spaces as `0x20`.

## Sound record

The 35-byte record mapping recovered from the supplied banks and editor behavior is implemented in `stateToRecord()` and `applyFactoryRecord()` inside the generator's embedded controller extension.

| Byte | Meaning |
| ---: | --- |
| 0 | Waveform combination |
| 1 | Filter mode |
| 2–5 | Attack, Decay, Sustain, Release |
| 6 | PWM Width, stored 0–31 |
| 7 | Filter Cutoff, stored 0–31 |
| 8 | Resonance |
| 9 | PWM On |
| 10 | PWM Rate |
| 11 | PWM Depth |
| 12 | PWM Retrig |
| 13 | Filter Retrig |
| 14 | Filter Cycle |
| 15 | Filter Rate |
| 16 | Vibrato On |
| 17 | Vibrato Frequency/depth |
| 18 | Vibrato Rate |
| 19 | Vibrato Type in low bits; Retrig flag in bit 2 |
| 20 | Vibrato Delay |
| 21–23 | Native play-mode flags used to reconstruct seven UI modes |
| 24 | Undocumented/preserved from the previous record |
| 25 | ARP Speed |
| 26 | ARP Direction |
| 27 | Ring Modulation |
| 28 | Hard Sync |
| 29 | Attack Click |
| 30 | Portamento |
| 31 | Tremolo On |
| 32 | Tremolo Rate |
| 33 | PWM Cycle |
| 34 | Envelope Retrig |

Byte 24 has not been assigned a confirmed musical meaning. When saving, the code starts from the previous slot record and preserves unmapped bytes.

## High-resolution MIDI versus stored resolution

Cutoff and PWM Width are sent over MIDI as full 0–127 values for smooth automation. `.SLO` stores only 0–31, so saving quantizes each value using `round(value / 4)` and clamps it to 0–31. On recall, stored value 31 becomes 127; other values become `value × 4`.

## USER workflow

- Every bank is a file in the bank folder; the device embeds none.
- A new bank holds 54 INIT records (the panel's default values; byte 24, which has no CC, is 3).
- SAVE, then STORE, replaces the chosen slot's record and nine-character name.
- The whole 54-slot bank is then written back to its `.SLO` file.
- The Max device cannot save the patch to C64 disk over MIDI; the resulting file must be placed into a D64 as a PRG and loaded in SID SYNTH.

