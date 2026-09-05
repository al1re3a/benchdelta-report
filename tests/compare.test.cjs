const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseExport, compare, markdown} = require('../web/compare.js');
const parse = values => parseExport(JSON.stringify({results: values.map(([command, mean]) => ({command, mean}))}));
test('regression and improvement', () => {
  const rows = compare(parse([['build', 1], ['test', 2]]), parse([['build', 1.25], ['test', 1.7]]));
  assert.equal(rows[0].status, 'regression'); assert.equal(rows[1].delta_percent, -15);
});
test('budget boundary and zero budget', () => {
  assert.equal(compare(parse([['x', 1]]), parse([['x', 1.1]]), 10)[0].status, 'within-budget');
  assert.equal(compare(parse([['x', 1]]), parse([['x', 1.01]]), 0)[0].status, 'regression');
});
test('added and removed commands', () => assert.deepEqual(compare(parse([['a', 1]]), parse([['b', 1]])).map(r => r.status), ['removed', 'added']));
test('invalid exports', () => {
  for (const text of ['{}', '{"results":[]}', 'null', 'bad', '{"results":[null]}']) assert.throws(() => parseExport(text));
  for (const mean of [0, -1, true, '1', null]) assert.throws(() => parseExport(JSON.stringify({results: [{command: 'a', mean}]})));
});
test('duplicate commands', () => assert.throws(() => parse([['a', 1], ['a', 2]])));
test('invalid budgets', () => { for (const budget of [-1, NaN, Infinity]) assert.throws(() => compare(new Map(), new Map(), budget)); });
test('prototype-like command names are data', () => assert.equal(compare(parse([['__proto__', 1]]), parse([['__proto__', 2]]))[0].delta_percent, 100));
test('markdown keeps command text within one cell', () => {
  const output = markdown([{command: '<a>|`\nline', before_seconds: 1, after_seconds: 2, delta_percent: 100, status: 'regression'}]);
  assert.ok(output.includes('&lt;a&gt;&#124;&#96; line')); assert.equal(output.split('\n').filter(line => line.startsWith('|')).length, 3);
});
test('UTF-8 BOM', () => assert.equal(parseExport('\uFEFF{"results":[{"command":"a","mean":1}]}').size, 1));

test('browser command count is bounded', () => {
  assert.throws(() => parse(Array.from({length: 2001}, (_, i) => ['cmd' + i, 1])));
  assert.equal(parse(Array.from({length: 2000}, (_, i) => ['cmd' + i, 1])).size, 2000);
});
test('unrepresentable ratio is rejected', () => assert.throws(() => compare(parse([['a', Number.MIN_VALUE]]), parse([['a', Number.MAX_VALUE]]))));
