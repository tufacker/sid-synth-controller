# Notes for Claude

SID SYNTH Controller: a Max for Live MIDI effect for LukHash's SID SYNTH on the
C64. Start with `README.md`, then `docs/ARCHITECTURE.md` and
`docs/DEVELOPING.md`. If a private `CLAUDE_HANDOFF.md` exists in this folder,
read it first: it has the maintainer's standing rules and the current state.

## Working rules

- The device is generated. Change `src/` and run `npm run check` (build,
  verify, tests). Never edit the `.amxd` or `.maxpat` in `dist/`.
- Don't change CC numbers, value ranges or encodings, Live parameter names or
  order, or the `.SLO` layout unless asked. Parameters are only appended
  (`src/build/controls.js`). `npm run verify` fails on any parameter change.
- After an intended change to MIDI or panel output, review the session test's
  difference before recording it with `npm run test:record`.
- Visual changes count as done only when a screenshot of the exact build in
  Live shows them.

## Keep the changelog current

Every change that a user could notice, or that a maintainer needs to know,
gets a `CHANGELOG.md` entry in the same commit, under `## Unreleased` at the
top. Follow "Keeping the changelog" in `docs/DEVELOPING.md`:

- one bullet per change: a short bold phrase, then the effect for the user,
  then the technical detail if it matters later;
- say when saved Live Sets, automation or banks are affected, and how;
- say what was verified (offline tests, in Live, with the C64) and what wasn't;
- never rewrite released sections except to correct them;
- at a release, rename `## Unreleased` to `## v<version> — current` (matching
  `package.json` and the git tag) and drop `— current` from the previous one.

Before finishing any task that changed the device, the build, packaging or
user-facing docs, check that the changelog says so.
