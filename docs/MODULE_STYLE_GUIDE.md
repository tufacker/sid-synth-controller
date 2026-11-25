# Ableton Live module style guide

## Purpose

This guide turns the accepted SID SYNTH panel decisions into a repeatable method for reviewing and redesigning additional Max for Live modules. It covers presentation, visual state, control choice, density, alignment, and verification.

It does not authorize changes to MIDI mappings, parameter ranges, automation names, preset formats, or device behavior. When styling an existing module, preserve its function unless a separate functional change is explicitly approved.

## Reference hierarchy

Use these references in order:

1. The approved module mockup for exact layout, proportions, hierarchy, and color relationships.
2. Ableton Drift for native control behavior, typography, focus, selected states, disabled states, and spacing rhythm.
3. Ableton Bass for compact value fields, dense grouping, and efficient use of vertical space.
4. Other stock Live or Max for Live devices only when the first three do not answer the question.

Do not invent a new visual treatment when the mockup or Drift already supplies one. If neither answers a material design decision, ask before choosing.

## Core principles

### 1. Live-native before decorative

The device should look like part of Live, not like a separate desktop application embedded in Live. Prefer standard `live.*` controls, Ableton typography, Live theme roles, square geometry, and restrained use of the accent color.

### 2. Compact does not mean cramped

Save space by choosing the right control type and by sharing optional regions, not by squeezing labels into controls or allowing elements to collide. A dense module still needs consistent baselines, gutters, and breathing room.

### 3. Hierarchy determines control size

Primary sound-shaping controls receive the largest knobs. Frequently read but secondary values use compact number fields, menus, or short sliders. Binary and discrete choices use toggles, tabs, or menus. Do not give every parameter a large knob.

### 4. One visual language per control family

Menus, value boxes, buttons, labels, and muted states must be consistent within a module. A user should not have to infer whether two visually different boxes behave the same way.

### 5. Rendered Live output is the source of truth

Patch coordinates, theme-token names, and serialized colors are not visual proof. Every presentation revision must be loaded in Live, exercised in representative states, and inspected from a screenshot.

## Layout system

### Panel architecture

- Keep the main synthesis or processing path visible in one compact panel whenever possible.
- Put optional Live-side modulators, expression tools, or advanced pages into one reusable tabbed region.
- Keep browsing or preset context in a narrow left column when the module needs it.
- Do not duplicate host-level configuration such as MIDI channel selection when Live already supplies it.
- Do not leave a control floating between sections. Every visible object belongs to a clearly bounded cell or shared header.

The SID SYNTH reference uses a 664 × 169 device with two 84 px rows and 1–2 px gutters. Its column widths are 80, 124, 124, 152, and 176 px. Future modules do not have to copy those exact widths, but should use the same fixed-grid method.

### Section cells

- Build the panel from explicit section cells.
- Use the Live surface color for normal cells.
- Let 1–2 px of the device background show between cells as the gutter.
- Use a darker display surface only for a deliberate display or icon cluster, and only when contrast remains comparable to Drift.
- Use independent dividers for top and bottom rows. A separator must not force unrelated sections to share the same width or control spacing.
- Avoid decorative outer frames. The cell surfaces and gutters should define the structure.

### Section headers

- Section titles are 8 pt, bold, uppercase, and aligned to the section grid.
- Titles must be bright enough to read against the Live surface; they should not disappear into the background.
- A section on/off control is a 9 × 9 square with no text, placed immediately left of the title.
- The title begins only a few pixels after the toggle and aligns optically with it in the rendered panel.
- Treat a subsection toggle and title as one header unit, but do not give their object rectangles identical coordinates: `live.comment` has internal text padding. In the accepted compact header, the title rectangle begins 7 px to the right and 3 px above the 9×9 toggle; the rendered glyph then aligns with the square.
- Place the combined header high enough to leave a clear, uniform gap above the first dial or field below.
- Do not spend a second line on a section title if it can sit in the header row.
- Place compact mode tabs in the header row when this prevents them from crowding the main controls.

### Alignment and spacing

- Establish shared x positions for labels, fields, and control centers before placing individual objects.
- A label aligns with the left edge of the field beneath it.
- A label placed beside a field sits only a few pixels away and shares its vertical center.
- Related fields share the same height and baseline.
- Knobs in one row have uniform center-to-center spacing.
- ADSR controls use equal sizes and spacing.
- Vertically center knob groups inside their cells; do not pin them against the title or value row.
- Keep labels clear of knob arcs and values.
- Keep section controls inside their cells at all zoom levels.
- Check the rendered result for clipped text, overlaps, uneven gaps, or truncated values.

## Typography

| Role | Treatment |
| --- | --- |
| Typeface | Ableton Sans Medium |
| Section title | 8 pt, bold, uppercase |
| Small header caption | 7–7.5 pt, bold, uppercase |
| Control label | 8.5 pt, regular, Title Case |
| Field/menu value | 8–8.5 pt, regular |
| Primary displayed value | 9 pt where space permits |
| Non-interactive explanatory caption | 7.5–8 pt, muted |

Additional rules:

- Use Title Case for control labels: `Speed`, `Cutoff`, `Freq`, `Rate`, `Retrig`.
- Use native or approved abbreviations only when space requires them.
- Prefer `PORTA`, `Ring`, `Sync`, and `Click` over inconsistent or overly technical variants.
- Menu text is neutral light text. Orange is reserved for active selection or modulation status.
- Left-align menu text and labels unless the reference explicitly centers them.
- Remove redundant text when an icon is self-explanatory and accessible through Info View.

## Color system

Use semantic roles, not isolated colour choices. Since v0.17.0, every colour comes from one palette module (`src/device/sid_palette.js`) that maps a role and state to direct RGBA values. The generator and the runtime UI script share it, so the built patch and the live dimming can't disagree. Do not mix Live theme expressions with direct colours: the earlier mix of theme tokens and per-control overrides was the main cause of inconsistent rendering.

| Role | Accepted target or behavior |
| --- | --- |
| Main cell surface | approximately `#6B6B6B`, or matching Live surface token |
| Active field interior | `#2E2E2E` |
| Muted field interior | `#555555` |
| Active text/value | approximately `#E8E8E8`–`#F7F7F7` |
| Muted value | approximately `#939393` |
| Accent/selection | Live theme selection orange |
| Focus | Live continuous white focus frame |
| Divider/gutter | Live surface frame/device background |

Rules:

- Use the accent color only for selected, enabled, or actively modulating states.
- Unselected button text is neutral light text, including controls inside darker areas.
- Number fields and dropdowns in the same family use the same surface, border, and foreground treatment.
- Muted controls remain legible and distinct from both active controls and the surrounding panel.
- Muted and locked colours are derived, not chosen: each colour is mixed at 35% over its cell surface (the mock's opacity). Field, value, label, knob arc, needle and knob name all dim together.
- Never use `active 0` to dim a Live object. Live composites the whole object against the wrong surface. Recolour it, and use `ignoreclick` only for locks.

## Control selection

| Parameter role | Preferred control |
| --- | --- |
| Primary continuous sound control | `live.dial` |
| ADSR stages | Equal-size `live.dial` controls |
| Secondary continuous value | Compact `live.numbox` or short horizontal value slider |
| Discrete multi-choice setting | `live.menu` |
| Small mutually exclusive group | `live.tab` |
| Binary state | Square `live.text` toggle |
| Reusable feature pages | Uniform tab buttons with status indicators |
| Waveform selection | Equal-size graphic toggles or picture tab |
| Step sequence | Compact bipolar bar editor with hidden automatable parameters |

### Dials

- Use large dials for primary parameters such as Cutoff, Resonance, Width, or the main envelope.
- Use a smaller, uniform dial size for secondary modulation envelopes.
- Keep arc color, track color, label color, and value color consistent across a dial family.
- The indicator arm/needle of an enabled dial is neutral white. The Live accent may show the value arc, but must not recolor the needle unless the approved reference explicitly does so.
- Do not let the dial's built-in number collide with labels. For high-resolution controls, a separate value comment may be clearer.

### Number fields and short sliders

- Use compact fields for Speed, Rate, Depth, Delay, and similar secondary values.
- Give fields fixed widths based on their content, not the remaining column width.
- Stack related fields vertically when that saves width and improves scanning.
- Use the Bass pattern: label above or immediately left, value in a compact dark field.
- On a dark display surface, a compact numeric field's resting border should match the field/display surface; reserve the light frame for actual keyboard or pointer focus.

### Menus

- Use fixed widths and consistent heights, normally 13–15 px in the compact layout.
- Do not stretch a menu merely to fill a cell.
- Ensure the longest approved item is fully readable.
- Menu text, arrows, background, and borders must match other menus in the same visual family.
- For menus that should match Drift, use the default `live.menu` appearance and Live focus frame rather than the LCD appearance.

### Buttons and tabs

- Interactive buttons are square: `rounded 0`.
- **Live draws a momentary (mode 0) `live.text` as a pill whatever its `rounded` value.** For a square momentary button, make the `live.text` transparent and draw the fill with a panel behind it. Toggles (mode 1) honour `rounded 0`.
- A momentary `live.text` outputs a bang. If the receiver expects a named message, translate the bang into that message rather than wiring the button straight in.
- Use a native `live.tab` for page selectors. Set its resting and focus border to the segment fill, so clicking never outlines the group.
- Avoid pill-shaped RESEND, PANIC, or action buttons.
- Only the selected button or tab segment receives the accent state.
- A focus state belongs only to the focused control, not every button in its group.
- Uniform tab segments use equal widths and share one baseline.
- Optional-page tabs may include a small status dot that remains visible in selected and unselected states.
- Rounded treatment is reserved for a small non-interactive badge such as `M4L`, not ordinary controls.

### Waveform and icon controls

- Use waveform graphics instead of redundant `PUL`, `SAW`, `TRI`, and `NOI` text when the symbols are clear.
- Center each graphic in an equal visual footprint.
- Pulse, Saw, and Triangle may be combinable; Noise may be exclusive when required by function.
- Keep Noise the same apparent size as the other waveform buttons.
- Keep off-state outlines and text neutral. Use the accent only for selected waveforms.
- Keep related action buttons such as Ring, Sync, and Click equal in height, border treatment, capitalization, and spacing.
- In the accepted SID SYNTH OSCILLATOR cell, waveform buttons are exactly 28×32 with one-pixel gaps. Ring, Sync, and Click are exactly 37×15 with two-pixel gaps and 8.5 pt text.
- Simplify a visually dense symbol rather than shrinking it. The accepted Noise trace uses fewer peaks so its apparent weight matches the other three waveforms.
- In the accepted PWM stack, every field is 34×14 with a 17 px row pitch. Right-aligned labels end three pixels before the fields, and active values/arrows are neutral white rather than accent orange.
- The PWM Rate and Depth boxes use the same dark surface for their resting border and interior. A light border is a focus indication, not a permanent outline.
- The PWM Width dial keeps its orange value arc but uses the same neutral-white indicator arm as the other enabled dials.

## Active, muted, selected, and focus states

### Active

- Active fields use the dark active surface and bright neutral value text.
- Enabled toggles or selected segments use the Live accent.

### Muted but visible

- Muted fields use `#555555` and muted values near `#939393`.
- Labels fade with their controls.
- Section titles and the section's on/off toggle remain readable.
- Do not allow a muted field to blend into the section surface.

### Locked

- Locked controls use the same visual treatment as muted controls but do not accept input.
- In Max, keep the object visually active and use `ignoreclick` for the lock when native disabling composites the wrong color.
- Preserve automation and parameter values while locked.

### Selected groups

- Exactly one segment is accented in a mutually exclusive group.
- Non-selected segments remain neutral; they do not receive white outlines merely because another segment has focus.
- A forced selection must still show the single correct selected segment.

### Focus

- The focused dropdown receives one continuous white frame, matching Drift.
- Do not use detached four-corner focus ornaments.
- Do not draw focus on every member of a grouped control.
- Test focus on every menu in the family, not just the first example.

## Max for Live rendering facts (verified in Live 12)

- **Label offset:** `live.comment` text renders about 4 px below the top of its box. For a label above a field, set the label's y to the field's y minus 12 for a clean 2 px gap. For a side label, use the field's own y.
- **Draw order:** within a layer, Max draws earlier boxes on top of later ones. An overlay or fill that must sit above a cell panel, or a dot that must sit above a tab, has to come earlier in the box list.
- **Minimum size:** Live does not draw a `live.text` of about 4 px. Use a small rounded `panel` with `ignoreclick 1` for status dots.
- **Custom units:** `parameter_unitstyle 9` with `parameter_units '%.0f ms'` gives "20 ms". `'%.0f %%'` renders only "%", so keep Live's Percent style for percentages.
- **Dial content is top-anchored:** a standard `live.dial` draws its name, ring and value at the top of its box, and extra height only adds empty space below. Centre a dial row by moving its y, not by making the box taller, and check the gap above the labels against the gap below the values in the render.
- **Cross-cell alignment:** knob rows that can be seen side by side (for example ENVELOPE and the ENV page) use the same y, height and width, so their names, rings and values share baselines.
- **Large dial style:** `live.dial` appearance 3 sizes its ring from the box height and ignores the width; in a 37 px column the rings overlap. Use it only where the box is about as wide as it is tall minus the name and value rows.
- **Lock rules come from the instrument manual,** not from the mock: a control that looks mode-specific (for example SID SYNTH's Speed) can be shared across modes.
- **Inspection:** Live's own window captures are true pixels at the current display zoom. Zoom into regions; don't change the user's display zoom.

## Reusable module patterns

### Compact mode/performance column

- Put the main mode menu at the top.
- Put closely related actions such as Portamento beside it.
- Give contextual controls a compact subheader and fixed-size fields.
- Combine related modulation families such as Vibrato and Tremolo in the same cell when this improves scanning.
- Keep section toggles, titles, labels, fields, and footer rows on the same left grid.

### Filter section

- Keep filter mode and primary filter controls in the same section.
- Put the filter-type selector in the header or narrow edge when this creates room for the knobs.
- Keep Cutoff and Resonance visually dominant.
- Stack Rate, Cycle, and Retrig in a compact secondary column.
- When Filter is Off, fade the dependent labels and controls together.

### Envelope sections

- Keep the full ADSR group together.
- Use equal controls and equal spacing.
- Distinguish the main amplitude envelope from a modulation envelope through section title, size hierarchy, and location.
- Remove explanatory copy that consumes space once Info View supplies the same information.

### Optional Live-side tools

- Place Live-only additions in a reusable tabbed region rather than widening the entire device.
- Use uniform tabs with visible active state and optional status indicators.
- Switching pages changes only presentation; hidden parameters remain stored and automatable.
- Mark the region with a small `M4L` tag when useful.

### Preset/context column

- Put Bank above Patch/Slot.
- Use readable names such as `01 REDBERET`, without unnecessary punctuation.
- Keep previous, next, and save actions on one compact row when all are functional.
- Remove unused library pages and host-level routing fields.
- Keep action buttons visually consistent with the rest of the device.

## Accepted design findings and resulting rules

This table records the design issues reported during the SID SYNTH work and the accepted reusable resolution. It intentionally excludes protocol, mapping, preset, and implementation-debugging issues.

| Reported design issue | Accepted resolution and future rule |
| --- | --- |
| The panel looked homemade and unlike stock Live devices. | Use Live theme roles, Ableton Sans Medium, square `live.*` controls, restrained accent, and Drift as the behavior reference. |
| Knobs and buttons consumed too much space. | Reserve large dials for primary controls; convert secondary values to compact fixed-size fields or menus. |
| Native synth controls were split across pages. | Keep the core sound path on one panel; reserve paging for optional Live-side tools. |
| Section boundaries and titles were unclear. | Use explicit Live-surface cells, 1–2 px gutters, and aligned 8 pt bold uppercase titles. |
| Section headers and controls were too dim. | Use bright neutral title/control text and verify contrast in Live; reserve orange for active states. |
| The dark control area had inconsistent label colors. | Use neutral light text for all off-state labels and controls, even on a darker display surface. |
| Dropdowns and horizontal fields were unnecessarily wide. | Assign fixed widths based on content and arrange them on a shared grid. |
| Labels, boxes, and knobs did not share baselines or edges. | Define label and control anchors first; align labels to fields and use uniform row spacing. |
| Vertical spacing was bunched and uneven. | Vertically center groups, preserve breathing room, and use independent row dividers. |
| A control appeared to float between sections. | Every object belongs to a specific cell or shared header; no overlap across boundaries. |
| Waveform buttons had different sizes and redundant text. | Use centered waveform graphics in equal footprints and remove redundant text labels. |
| Related buttons used inconsistent names and styles. | Use concise Title Case names such as Ring, Sync, and Click with equal geometry and border treatment. |
| Filter controls collided with labels. | Preserve knob/value clearance and move the compact type selector or secondary stack out of the knob path. |
| The two envelope groups looked identical or crowded. | Use section naming, size hierarchy, location, and uniform spacing to distinguish them. |
| Vibrato and Tremolo consumed separate space despite being related. | Combine them in one modulation cell and use compact fields for their secondary values. |
| Section titles did not align with their on/off squares. | Place the 9 × 9 toggle immediately left of the title and align the rendered title glyph—not merely the object rectangle—with the square. In the accepted compact header, the title rectangle starts 7 px right and 3 px above the toggle. |
| Tremolo Rate label sat too far from its value. | Side labels remain within a few pixels of their field and share its vertical center. |
| Dropdown text used orange when not selected. | Unselected menu text is neutral light; only active selection uses orange. |
| Dropdowns and value boxes used different surfaces. | Treat them as one field family with matching active and muted backgrounds. |
| Muted fields blended into the panel. | Use explicit muted field `#555555` and muted value `#939393`, with labels faded in the same state. |
| Multiple buttons showed a white outline after one was clicked. | Focus only the selected/focused control; never the entire group. |
| Dropdown focus used detached corner ornaments. | Use the default menu appearance and one continuous Live focus frame on every related dropdown. |
| M4L tabs differed in size or lacked status. | Use equal tab segments, one active segment, and small per-page activity indicators. |
| Descriptive copy consumed valuable panel height. | Put detailed guidance in Live Info View; keep only essential labels and compact badges on the panel. |
| The panel grew too wide as new features were added. | Reuse a fixed optional-feature region through tabs instead of appending columns. |
| Color choices followed token names but not the rendered reference. | Inspect and, when needed, sample the Live screenshot; rendered pixels decide acceptance. |
| A dial needle used the accent while comparable enabled dials used white. | Keep the indicator arm neutral white and reserve the accent for the value arc or selected state. |
| Compact numeric boxes showed light borders at rest. | Match the resting border to the dark field surface; show the light continuous frame only while the individual field is focused. |
| Source coordinates appeared aligned but rendered text was not. | Account for each Max object's internal padding and accept alignment only from the Live screenshot. |
| Each fix to one control's colours broke another (v0.9–v0.16). | One palette module drives both the build and the runtime state colours; no per-control overrides. |
| Off sections dimmed only partly (arcs grey, names and values bright). | Derive every muted colour from the same 35% mix and repaint all parts of the object. |
| Momentary buttons stayed pills despite `rounded 0`. | Use a transparent button over a square panel. |
| Labels hid under their fields (FILTER) or touched them. | Put the label 12 px above the field's y. |
| Page tabs never showed their selected state; status dots never drew. | Use a native `live.tab`, and panel dots placed earlier in the draw order. |

## Review workflow for the next module

### Phase 1: inventory

1. List every visible parameter, action, status indicator, and optional page.
2. Mark each parameter as primary, secondary, discrete, binary, or display-only.
3. Record all active, muted, locked, selected, and focus states.
4. Identify host-level controls that do not belong in the module.

### Phase 2: wireframe

1. Choose the reference mock and stock Live comparison device.
2. Draw fixed section cells and gutters.
3. Place primary controls first.
4. Convert secondary parameters to compact fields or menus.
5. Move optional tools into a shared tabbed region.
6. Check that every object belongs to one cell.

### Phase 3: style pass

1. Apply the typography table.
2. Apply the semantic color roles.
3. Standardize field heights and menu widths.
4. Standardize buttons, tabs, and focus behavior.
5. Add Info View annotations so the panel itself can remain concise.

### Phase 4: state pass

1. Exercise every enable/disable condition.
2. Confirm labels fade with their controls.
3. Confirm locked controls cannot be edited.
4. Confirm selected groups accent only one segment.
5. Focus every dropdown in each family and inspect its frame.

### Phase 5: Live verification

1. Build the exact revision that will be delivered and load that exact build in Live beside Drift or the chosen stock reference.
2. Capture the default state and every materially different visual state, including both sides of any edited on/off control.
3. Inspect the actual screenshot at useful zoom for alignment, clipping, spacing, contrast, borders, needle colors, and focus. Do not substitute patch coordinates or accessibility values for this inspection.
4. Compare the edited region directly with the approved mock and the relevant stock Live control.
5. Sample rendered pixels when a color is disputed.
6. Correct discrepancies and repeat the build/load/screenshot cycle.
7. Do not report a presentation fix as complete until the final rendered screenshot has been inspected.

## Module acceptance checklist

### Structure

- [ ] Core controls are available in one compact panel.
- [ ] Optional features share a reusable tabbed region.
- [ ] Every control belongs to a clearly defined cell.
- [ ] Gutters and dividers are consistent and independent.

### Typography and labels

- [ ] Ableton Sans Medium is used throughout.
- [ ] Section titles, captions, labels, and values follow the size hierarchy.
- [ ] Labels use Title Case and approved abbreviations.
- [ ] No text is clipped or needlessly repeated.

### Controls

- [ ] Primary controls use the largest dials.
- [ ] Secondary values use compact fixed-size fields.
- [ ] Related fields share height, surface, and baseline.
- [ ] Waveform/icon buttons have equal visual footprints.
- [ ] Buttons and tabs are square and consistent.

### States

- [ ] Active, muted, locked, selected, and focused states are visually distinct.
- [ ] Muted fields use the accepted field/value contrast.
- [ ] Only the selected segment is accented.
- [ ] Only the focused control receives the focus frame.
- [ ] Every related dropdown uses the continuous Live focus frame.
- [ ] Enabled dial needles are neutral white unless the approved reference specifies otherwise.
- [ ] Compact dark fields have no light resting outline.

### Verification

- [ ] The module was loaded and exercised in Live.
- [ ] Screenshots were captured from the exact deliverable build after the revision.
- [ ] Every edited on/off section was checked in both states.
- [ ] The rendered module was compared directly with the approved mock and Drift.
- [ ] Alignment was judged from rendered glyphs and controls, not object coordinates.
- [ ] Color disputes were resolved from rendered pixels.
- [ ] Functional wiring and parameter ranges remained unchanged during the style pass.

