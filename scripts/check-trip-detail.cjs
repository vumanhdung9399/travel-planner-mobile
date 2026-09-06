const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/tripDetail.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const context = { exports: {}, Date };
vm.runInNewContext(compiled.outputText, context);
const { resolveTripDetailTab: tab, timelineClock: clock, nearestTimelineDay: day } = context.exports;
for (const section of ['expenses', 'fund', 'balance']) {
  assert.equal(tab(section, false).section, 'finance');
  assert.equal(tab(section, false).finance, section);
}
assert.equal(tab('tasks', false).section, 'tasks');
assert.equal(tab('timeline', false).section, 'timeline');
assert.equal(tab('leader', false).section, 'info');
assert.equal(tab('leader', true).section, 'leader');
assert.equal(tab('unknown', true).section, 'info');
assert.equal(tab(undefined, true).section, 'info');
assert.equal(clock('08:30'), '08:30');
assert.equal(clock('18:45:00'), '18:45');
assert.equal(clock('2026-09-05T09:15:00'), '09:15');
assert.equal(clock('invalid'), '');
assert.equal(day([1, 3], 2, 4), 1); // nearest-day tie uses the earlier day, like FE
assert.equal(day([2, 3], -1, 4), 2); // before departure
assert.equal(day([1, 2, 3], 9, 4), 3); // after returning
assert.equal(day([], 9, 4), 4);
assert.equal(day([0, 8, NaN, 2], 3, 4), 2);
console.log('Trip detail: 21 routing, permission, clock and preview checks passed');
