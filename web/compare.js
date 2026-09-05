(function (root) {
  'use strict';
  function parseExport(text) {
    const data = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('Expected a nonempty Hyperfine results array.');
    }
    if (data.results.length > 2000) throw new Error('Browser demo limit: 2,000 commands per export.');
    const values = new Map();
    for (const row of data.results) {
      if (!row || typeof row.command !== 'string' || !row.command.trim()) {
        throw new Error('Each result needs a command name.');
      }
      if (values.has(row.command)) throw new Error('Duplicate command: ' + row.command);
      if (typeof row.mean !== 'number' || !Number.isFinite(row.mean) || row.mean <= 0) {
        throw new Error('Mean times must be positive, finite seconds.');
      }
      values.set(row.command, row.mean);
    }
    return values;
  }
  function compare(before, after, threshold = 10) {
    if (!Number.isFinite(threshold) || threshold < 0) throw new Error('Budget must be a nonnegative percentage.');
    const names = [...new Set([...before.keys(), ...after.keys()])].sort();
    return names.map(command => {
      const old = before.get(command), next = after.get(command);
      const delta = old === undefined || next === undefined ? null : (next / old - 1) * 100;
      if (delta !== null && !Number.isFinite(delta)) throw new Error('Time ratio is too large to compare.');
      const status = old === undefined ? 'added' : next === undefined ? 'removed' :
        delta > threshold + 1e-9 ? 'regression' : delta < -threshold - 1e-9 ? 'improvement' : 'within-budget';
      return {command, before_seconds: old ?? null, after_seconds: next ?? null,
        delta_percent: delta === null ? null : Math.round(delta * 10000) / 10000, status};
    });
  }
  function markdown(rows) {
    const escape = value => String(value ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/`/g, '&#96;').replace(/[\r\n]/g, ' ');
    return ['| Command | Before (s) | After (s) | Change (%) | Status |',
      '|---|---:|---:|---:|---|', ...rows.map(r => '| ' +
        [r.command, r.before_seconds, r.after_seconds, r.delta_percent, r.status].map(escape).join(' | ') + ' |'),
      '', 'Compared with BenchDelta. Means only; not a statistical significance test.'].join('\n');
  }
  const api = {parseExport, compare, markdown};
  if (typeof module !== 'undefined') module.exports = api;
  else root.BenchDelta = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
