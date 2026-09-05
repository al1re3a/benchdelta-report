'use strict';
const samples = {
  before: {results: [{command: 'build', mean: 1}, {command: 'test', mean: 2}]},
  after: {results: [{command: 'build', mean: 1.25}, {command: 'test', mean: 1.7}]}
};
let data = {}, rows = [], valid = false, usingSample = true;
const versions = {before: 0, after: 0};
const $ = id => document.getElementById(id);
function notice(text) { $('notice').textContent = text; $('notice').hidden = !text; }
function draw() {
  valid = false; $('error').hidden = true; $('rows').replaceChildren();
  $('copy').disabled = true; $('download').disabled = true;
  try {
    if (!data.before || !data.after) throw new Error('Choose both valid JSON files to compare.');
    if (!$('budget').value.trim()) throw new Error('Enter a regression budget.');
    rows = BenchDelta.compare(data.before, data.after, Number($('budget').value));
    for (const row of rows) {
      const tr = document.createElement('tr');
      const values = [row.command, row.before_seconds === null ? '—' : row.before_seconds.toFixed(4) + 's',
        row.after_seconds === null ? '—' : row.after_seconds.toFixed(4) + 's',
        row.delta_percent === null ? '—' : (row.delta_percent > 0 ? '+' : '') + row.delta_percent.toFixed(2) + '%'];
      for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      const td = document.createElement('td'), tag = document.createElement('span');
      tag.className = 'status ' + row.status; tag.textContent = row.status.replaceAll('-', ' '); td.append(tag); tr.append(td); $('rows').append(tr);
    }
    const regressions = rows.filter(r => r.status === 'regression').length;
    $('summary').textContent = `${rows.length} commands · ${regressions} over budget`;
    valid = true; $('copy').disabled = false; $('download').disabled = false;
  } catch (error) { $('summary').textContent = 'Comparison unavailable'; $('error').textContent = error.message; $('error').hidden = false; }
}
function loadSample() {
  usingSample = true;
  for (const side of ['before', 'after']) { versions[side]++; data[side] = BenchDelta.parseExport(JSON.stringify(samples[side])); $(side).value = ''; $(side + '-name').textContent = 'Example ' + (side === 'before' ? 'baseline' : 'candidate'); }
  $('source-label').textContent = 'Synthetic sample loaded'; notice(''); draw();
}
for (const side of ['before', 'after']) {
  $(side).addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    if (usingSample) {
      data = {}; usingSample = false;
      for (const input of ['before', 'after']) $(input + '-name').textContent = 'Choose a local JSON file';
    }
    const version = ++versions[side]; data[side] = null;
    $(side + '-name').textContent = file.name; $('source-label').textContent = 'Local file selection'; notice(''); draw();
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('Browser demo limit: 4 MiB per JSON file. Use the CLI for larger files.');
      const parsed = BenchDelta.parseExport(await file.text());
      if (versions[side] !== version) return;
      data[side] = parsed; draw();
      notice('Confirm that both selections are your intended baseline and candidate. Files are processed only in this page.');
    } catch (error) {
      if (versions[side] !== version) return;
      $('error').hidden = false; $('error').textContent = error.message;
    }
  });
}
$('budget').addEventListener('input', () => { notice(''); draw(); });
$('sample').addEventListener('click', loadSample);
$('copy').addEventListener('click', async () => {
  if (!valid) return;
  try { await navigator.clipboard.writeText(BenchDelta.markdown(rows)); notice('Markdown copied. Review command names before posting.'); }
  catch { notice('Clipboard unavailable in this browser. Download the JSON report instead.'); }
});
$('download').addEventListener('click', () => {
  if (!valid) return;
  const blob = new Blob([JSON.stringify({threshold_percent: Number($('budget').value), rows}, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'benchdelta-comparison.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
loadSample();

// Optional imperative WebMCP interface; all parsing still happens in this page.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), {once: true});
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'compare_benchmark_exports',
      title: 'Compare two Hyperfine exports',
      description: 'Validate two JSON strings and show their before/after comparison in this page. No network upload or benchmark execution.',
      inputSchema: {type: 'object', properties: {before_json: {type: 'string'}, after_json: {type: 'string'}, budget_percent: {type: 'number', minimum: 0}}, required: ['before_json', 'after_json'], additionalProperties: false},
      annotations: {readOnlyHint: false, untrustedContentHint: true},
      execute(input) {
        if (!input || typeof input.before_json !== 'string' || typeof input.after_json !== 'string') throw new Error('Two JSON strings are required.');
        if (new TextEncoder().encode(input.before_json).length > 4 * 1024 * 1024 || new TextEncoder().encode(input.after_json).length > 4 * 1024 * 1024) throw new Error('JSON exceeds 4 MiB.');
        const before = BenchDelta.parseExport(input.before_json), after = BenchDelta.parseExport(input.after_json);
        const budget = input.budget_percent === undefined ? 10 : input.budget_percent;
        const result = BenchDelta.compare(before, after, budget);
        data = {before, after}; usingSample = false;
        for (const side of ['before', 'after']) {versions[side]++; $(side).value = ''; $(side + '-name').textContent = 'Agent-provided ' + side;}
        $('budget').value = budget; $('source-label').textContent = 'Agent-provided JSON'; notice(''); draw();
        return {commands: result.length, regressions: result.filter(r => r.status === 'regression').length, rows: result.slice(0, 20), truncated: result.length > 20};
      }
    }, {signal: lifecycle.signal})).catch(() => {});
  } catch { /* The normal interface remains available if registration is unsupported. */ }
}
