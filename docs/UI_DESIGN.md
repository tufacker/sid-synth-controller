# UI design specification

This file records the SID SYNTH-specific presentation. For the reusable rules and review checklist to apply to other modules, see [Ableton Live module style guide](MODULE_STYLE_GUIDE.md).

## Governing references

When a presentation decision is needed, use these references in order:

1. The original panel mock-up and its annotated specification (not included in the repository) for exact layout, proportions, color relationships, and tab structure.
2. Ableton Drift for native control behavior, typography, disabled states, compact alignment, button focus, and device-bar conventions.
3. Ableton Bass for dense grouping, small horizontal value fields, compact menus, and economical use of vertical space.

Analog, Operator, Wavetable, Step Arp, and Expression Control were also reviewed for general Live conventions. If the mock-up and Drift do not answer a discretionary question, ask before inventing a new style.

## Core layout decisions

- One compact two-row synth panel rather than splitting native synthesis controls across pages.
- Program/bank selection at the far left.
- Mode and performance controls grouped in a narrow column.
- Oscillator controls use waveform graphics rather than redundant PUL/SAW/TRI/NOI labels.
- Pulse, Saw, and Triangle buttons are equal size and combinable; Noise is exclusive.
- Filter and native motion controls share a compact section.
- Vibrato and Tremolo are visually related.
- The amplitude envelope and Cutoff Envelope remain distinct.
- Live-only additions reuse one region through ENV, MOTION, and EXPR tabs.
- M4L tabs have uniform sizes and clear active indicators.
- Live Info View descriptions explain every relevant control.

## Typography

- Ableton Sans Medium
- Labels use Live-like sizing and Title Case where appropriate.
- Section titles are compact, bright enough to read, and aligned to the same left grid as their toggles/fields.
- Avoid arbitrary all-caps control labels where the reference uses Title Case.

## Color measurements

Measured from the Mode/Vibrato/Tremolo mock-up:

| Role | Target |
| --- | --- |
| Main cell surface | `#6B6B6B` |
| Active data field | `#2E2E2E` |
| Muted/inactive data field | `#555555` |
| Muted value target | approximately `#939393` |
| Active light text | approximately `#E8E8E8`–`#F7F7F7` |
| Selection/accent | Live orange; mock examples around `#FF9C39` or muted tan depending on state |

Theme tokens should be used only when they resolve to the intended visual role. A token name is not proof that the rendered result matches the mock.

## Disabled-state rule

The desired result is visible in the mock:

- controls remain legible;
- inactive fields have a distinct `#555555` background;
- labels and values become muted;
- the selected ARP direction remains the only highlighted segment;
- unavailable controls must not be editable.

### v0.16.11 implementation

`sid_ui_logic.js` leaves the affected Live objects visually active and blocks unavailable interaction with `ignoreclick`. It explicitly applies `#555555` to muted fields and `#939393` to muted values, then restores `#2E2E2E` and `#F7F7F7` in the active state. This avoids Live's whole-object disabled compositing while preserving the required lock behavior.

The segmented ARP direction keeps only the selected segment accented. The implementation was verified from rendered Live screenshots in both POLY and ARP states, not from serialized attributes alone.

### v0.16.12 focus treatment

Mode, Vibrato Type, and Vibrato Retrig use the default `live.menu` appearance with `live_focus_frame`. The LCD appearance is intentionally avoided in this column because it draws the four detached corner marks seen in the earlier build. Each menu was focused and captured separately in Live beside Drift.

### v0.16.14 OSCILLATOR/PWM treatment

The four waveform buttons share one exact 28×32 cell size. Their SVG paths are optically centered, and the Noise trace uses fewer peaks so it has the same visual weight as Pulse, Saw, and Triangle. Ring, Sync, and Click share one 37×15 size, one type size, and consistent two-pixel gaps.

PWM Rate, Depth, Cycle, and Retrig form one right-aligned stack: labels end three pixels before identical 34×14 fields, and every row advances 17 pixels. Active field values and arrows are neutral white; orange is reserved for selection and active-state accents. Disabled fields retain the established muted gray treatment.

### v0.16.15 PWM header treatment

PWM's title and 9×9 toggle were raised as one header unit, but screenshot review showed that identical object coordinates did not produce optical alignment because `live.comment` adds internal text padding. This was corrected in v0.16.16 using the accepted Vibrato/Tremolo geometry.

### v0.16.16 PWM optical alignment and field finish

PWM now mirrors the accepted compact-header geometry: the title rectangle begins seven pixels to the right and three pixels above the 9×9 toggle. This makes the rendered glyph—not merely its object rectangle—align with the square, while both elements end at y=97 and leave a three-pixel gap before the Width dial. Rate and Depth use flat dark resting borders with a light frame only on focus. Width retains its orange value arc but uses the same white indicator arm as every other enabled dial.

These are reusable presentation rules, not PWM exceptions: subsection headers are aligned by rendered appearance after Max object padding, compact dark value fields do not carry a light outline at rest, and an enabled dial's indicator arm remains neutral white while the accent is reserved for its value arc.

### v0.17.0 whole-panel style system

- **Colours:** every colour is a direct value from `src/device/sid_palette.js`, using the mock-up values. Cell `#6B6B6B`, display `#565656`, gutter `#383838`, field `#2E2E2E`, off button `#5B5B5B` (`#474747` in the display), accent `#FF9C39`, on-accent text `#161616`, title `#F6F6F6`, label `#E4E4E4`, value `#F7F7F7`, button text `#CFCFCF`, knob track `#3C3C3C`, graph `#00BCCC`.
- **Muted and locked:** each colour is mixed at 35% over its cell surface. For example, a muted field is about `#565656` with a value of about `#9C9C9C`, and the accent becomes a muted tan. Labels, values, knob arcs, needles, knob names, the ADSR graph and the step bars all follow the same rule.
- **Buttons:** C64 SYNC/RANDOM/PANIC/`<`/`>` are transparent momentary buttons over square `btnbg_*` panels. PORTA, Ring, Sync, Click and the waveforms are square toggles.
- **ENV / MOTION / EXPR:** one native `live.tab` (`sid_m4l_page`) with three panel status dots (`dot_fenv`, `dot_motion`, `dot_expression`) coloured by `sid_ui_logic.js`. On a grey segment a dot is orange when that page's feature is active and dark when not. On the selected orange segment it is ink when active and a darker orange when not.
- **Label geometry:** labels sit 12 px above their field; side labels share the field's y. FILTER uses fields at y 22/46/70 with labels at 10/34/58. The Envelope dials are at y 99.

### v0.17.1 PORTA lock

PORTA joins the lock rules: in ARP and ARP+ it is muted and ignores clicks, because SID SYNTH ignores portamento in those modes. The parameter value is untouched.

### v0.17.2 comparison pass

- Value arcs, step bars and the Wheel bar use the mock teal (`arc`/`graph` #00BCCC). Orange is reserved for selection and on states.
- Buttons and tabs use bold text.
- MOTION: step numbers in their own row (y 61), bars at [492,74,168,70], 1 px `step_gap_*` panels, a `step_zero` line at y 109, and `step_mask_*` panels that `sid_ui_logic.js` darkens (field colour at 62% alpha) for steps beyond Len. Value labels are 27 px wide at 8 pt.
- Lock rules follow the manual: Speed is shared arpeggio rate/glide time (fades only outside ARP with PORTA off); Dir and the ARPEGGIO caption lock outside ARP/ARP+; PORTA locks in ARP/ARP+; Envelope Retrig locks in POLY, ARP and ARP+.

### v0.17.3 envelope rows

ENVELOPE dials are at [x,111,37,54] and the ENV-page dials at [x,108,34,50], placed from measured render gaps (equal space above the labels and below the values).

### v0.17.4 knob alignment

- Standard knobs: ENVELOPE `[336+38i,110,34,52]` and the ENV page `[490+34i,110,34,52]` share one baseline and size.
- Large knobs: Cutoff `[336,17,50,66]`, Reso `[386,17,48,66]` and PWM Width `[210,103,52,66]` share one height, so their rings match.

### v0.17.5 Clocked Motion playhead

`route ... motionstep` sends the controller's 0-based step (-1 on reset) to `sid_ui_logic.js` as `playhead`. The current step's `lbl_motion_index_N` turns accent orange and its `step_head_N` panel (a 2 px bar at y 72) lights; both clear while Motion is off.

### v0.18.0 Smooth control

`sid_motion_smooth` (integer 0–100 %) sits in the MOTION title row at [624,21,36,13], with a right-aligned "Smooth" label; the title is shortened to 80 px. It fades with the rest of the page when Motion is off.

### v0.19.0 EXPR page and tabs

- Tabs `sid_m4l_page` are [492,3,168,13] with the items CUT ENV · STEP MOD · EXPR, and dots at x 495/551/607. The M4L badge has been removed.
- Program strip: one tall cell [0,0,80,169]. `PATCH NAME` title [2,1,76,12] over the name field [4,14,72,15]; a divider [4,33,72,1] and `PATCH SELECT` title [2,34,76,12] over the bank menu [4,49,56,15] with the folder button [62,49,14,15] and the slot menu [4,66,72,15] (both `live.menu`, Hidden parameters, items set by the controller); `<` [4,83,16,15], `>` [21,83,16,15], `SAVE`/`STORE` [39,83,37,15], with `CANCEL` [4,83,33,15] (7 pt) replacing `<` `>` in save mode and STORE's fill turning accent. `EDITED` (`lbl_dirty`, accent, left) [2,110,40,13] with the dim version `lbl_version` [42,110,36,13]; C64 SYNC [4,131,72,15]; RANDOM [4,150,35,15] and PANIC [41,150,35,15] (7 pt). There is no status line: status messages go to Max's console. A live.menu ignores a one-item range, so lists always have at least two items.
- EXPR rows (label x 490, target menu [536,y,84,14], amount [624,y,36,14]): Velocity y 45, Pressure 65, Wheel 85, Bend 105, Key 125 (20 px pitch). There is no on-screen wheel: the Vibrato Wheel control was removed in v0.19.2 because the keyboard's mod wheel does the same job. Each Amount box fades while its source has no target (OFF, or VIBRATO for Wheel). Vel > Cutoff Env is a label plus a percentage box at y 145.

## Focus-border rule

Grouped buttons must not all display a white focus border when one tab is clicked. Only the clicked/selected button should show selection, matching Drift's LFO/Mod behavior. Keep `focusbordercolor` and tab/button group attributes consistent.

Dropdown focus uses a single continuous white frame around only the focused menu. Do not use the LCD four-corner ornament for Mode or the Vibrato menus.

## Alignment rules

- Use a shared horizontal grid for labels and fields.
- Vibrato and Tremolo titles align immediately to the right of their 9×9 toggles.
- Labels align with the left edge of the field beneath them.
- Related rows use consistent vertical rhythm.
- Numeric fields and dropdowns within the same control family share height, surface color, and text treatment.
- Do not evaluate alignment from patch coordinates alone; verify the rendered result in Live.

## Screenshot requirement

Every UI revision must be built, loaded into Live, and screenshotted from the exact deliverable build. Compare the relevant region at a useful zoom against both the mock-up and Drift, exercise both states of edited toggles, and inspect the rendered image before reporting success. Patch coordinates, theme attributes, and accessibility values are supporting evidence only; none replace the screenshot.

