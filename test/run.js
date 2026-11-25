// Runs every test/*.test.js against the built device: npm test (after npm run build).
const fs = require('fs');
const path = require('path');

(async () => {
  let failed = 0, passed = 0;
  for (const file of fs.readdirSync(__dirname).filter(name => name.endsWith('.test.js')).sort()) {
    console.log(file);
    for (const [name, test] of Object.entries(require(path.join(__dirname, file)))) {
      try {
        await test();
        passed++;
        console.log(`  ok    ${name}`);
      } catch (error) {
        failed++;
        console.log(`  FAIL  ${name}\n        ${error.message.split('\n').join('\n        ')}`);
      }
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  // The bank helper watches its folder; end explicitly.
  process.exit(failed ? 1 : 0);
})();
