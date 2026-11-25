#!/bin/bash
# Install the current build into the default Live User Library under a unique
# test name, so Live (which caches devices by path) loads the new build.
#   npm run build && tools/devinstall.sh 56      -> Imported/SID SYNTH dev/SIDdev56.amxd
# Load it on a MIDI track whose MIDI To is No Output, test, then delete it.
set -euo pipefail
N="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/dist/SID SYNTH Controller"
DEST="$HOME/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/Imported/SID SYNTH dev"
if [ -z "$N" ] || [ ! -d "$SRC" ]; then
  echo "usage: npm run build && tools/devinstall.sh <number>" >&2
  exit 1
fi
mkdir -p "$DEST"
cp -p "$SRC"/sid_ui_logic.js "$SRC"/sid_banks.js "$SRC"/sid_*.svg "$DEST"/
cp -p "$SRC/SID SYNTH Controller.amxd" "$DEST/SIDdev$N.amxd"
echo "installed SIDdev$N in $DEST"
