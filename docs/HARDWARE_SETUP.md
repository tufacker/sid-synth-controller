# SID SYNTH on macOS and Ableton Live

## Known-working configuration

- macOS with Ableton Live 12 Suite and Max for Live
- Ultimate 64 Elite II running SID SYNTH
- TeensyROM in the cartridge port
- iConnectivity mio10 carrying Live MIDI to the TeensyROM Micro-USB device port
- SID SYNTH launched as a PRG through TeensyROM
- TeensyROM and SID SYNTH both set to **Sequential MIDI**
- Official SID SYNTH D64 mounted as Ultimate drive/device 8
- SID SYNTH Controller AMXD on the Live MIDI track

The MIDI and disk paths are separate:

```text
Ableton MIDI track
  -> SID SYNTH Controller.amxd
  -> mio10 output route
  -> TeensyROM Micro-USB device port
  -> Sequential MIDI emulation
  -> SID SYNTH on Ultimate 64

Mounted SID SYNTH D64 on Ultimate drive 8
  -> PRESETS1.SLO ... PRESETS5.SLO and user banks
```

## 1. Ultimate 64 and disk

1. Put the official SID SYNTH D64 somewhere the Ultimate 64 can access.
2. Mount it as virtual drive **8**; SID SYNTH reads its disk files from device 8.
3. Keep the D64 mounted after SID SYNTH starts.
4. If the cartridge MIDI interface is not detected, set **Cartridge Preference** to **External** in Cartridge and ROM Settings. If needed, try Writes versus Dynamic bus operation and re-enter interface selection.

The official disk contains PRESETS1.SLO through PRESETS5.SLO.

## 2. TeensyROM

1. Connect TeensyROM Micro-USB through the mio10 route used by the Mac.
2. In the TeensyROM menu press **F8**.
3. Open settings page 2, TeensyROM General.
4. Set **Special IO** to **MIDI: Sequential**.
5. Return to the browser and launch the SID SYNTH PRG.

TeensyROM stores this in EEPROM, but verify it after firmware or configuration changes.

## 3. SID SYNTH

1. Open the SID SYNTH main menu with **RUN/STOP**.
2. At menu item 01, enable MIDI and select **Sequential**.
3. Open menu item 02, **MIDI CC SETUP**.
4. Use the standard/default CC assignments.
5. Use OMNI for the simplest test, or select a channel that matches the Live device/track.

## 4. mio10

Route the selected Mac/Ableton MIDI output to TeensyROM Micro-USB.

- Do not filter notes, CC, Program Change, or MIDI Clock.
- Avoid a second parallel route to the same destination.
- Duplicate routes cause doubled notes and conflicting CC messages.

## 5. Ableton Live

1. Open **Live Settings > Link, Tempo & MIDI**.
2. Enable **Track** for the mio10 output that reaches TeensyROM.
3. Enable **Sync** if ARP/ARP+ should follow Live's clock.
4. Put the complete generated device folder in the User Library or another stable location.
5. Drag `SID SYNTH Controller.amxd` onto a MIDI track.
6. Route the track output to the same mio10 port.
7. Set monitoring to **In**, or use **Auto** and arm the track.

If using External Instrument, put this controller before it and keep only one MIDI path to TeensyROM.

No Java installation is required. If macOS blocks Max, approve it in **System Settings > Privacy & Security**, then reload the device.

## 6. Confirm the path

1. Play a note from Live.
2. Choose LP, BP, or HP in SID SYNTH.
3. Move Cutoff in the Max device and confirm an audible change.
4. Load PRESETS1.SLO on the C64.
5. Select PRESETS1 and a preset in the Max device.

The Max bank selector does not load a bank from disk. The matching `.SLO` must already be loaded on the C64. The preset selector then uses Program Change to select the matching slot.

## USER-bank workflow

1. Select USER and the desired destination slot.
2. Set the patch controls and enter a name of up to nine characters.
3. Use SAVE PATCH.
4. On first save, choose where to create/link the `.SLO` bank.
5. Add the resulting `.SLO` to a D64 as a PRG file.
6. Mount the D64 as drive 8 and load the bank in SID SYNTH.
7. Keep USER selected in Max so slot numbers correspond.

The file is a complete 54-slot bank, not a single patch.

## Troubleshooting

### Notes do not work

- Verify TeensyROM **MIDI: Sequential**.
- Verify SID SYNTH MIDI is enabled and set to Sequential.
- Verify the mio10 route and Live track output.
- Use OMNI while isolating channel issues.

### Notes work but controls do not

- Restore the official default CC map.
- Confirm Track output is enabled for the correct mio10 port.
- Remove duplicate routes.

### Wrong preset

- Load the same `.SLO` bank on the C64 that is selected in Max.
- Program Change selects a slot; it does not load a disk bank.

### Panel does not follow the C64

Expected: there is no complete patch-state readback. Recall the matching patch in Max or use C64 SYNC to make the panel authoritative.

### ARP does not sync

- Enable Sync on the correct mio10 output.
- Start Live's transport.
- Use ARP or ARP+.

### Stuck notes

- Click PANIC.
- Remove duplicate MIDI routes.
- Reduce unnecessary dense automation.
- Use TeensyROM filters for message types the setup does not need.

