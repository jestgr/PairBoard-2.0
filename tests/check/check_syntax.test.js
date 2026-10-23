'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'check_syntax.js');
const { runChecks } = require(SCRIPT);

const GOOD_HTML = [
  '<!DOCTYPE html>',
  '<html><head>',
  '<link rel="icon" href="icons/icon.png">',
  '<link rel="manifest" href="manifest.json">',
  '</head><body>',
  '<script>',
  "  var ok = true;",
  "  var shell = './icons/icon.png';",
  '</script>',
  '<script type="application/json">{"a": 1}</script>',
  '</body></html>',
].join('\n');

const GOOD_SW = "const CACHE_VERSION = 'v1';\nconst FILES = ['./', './index.html'];\n";
const GOOD_MANIFEST = JSON.stringify({ name: 'T', icons: [{ src: 'icons/icon.png' }] });

const tempDirs = [];
test.after(() => {
  for (const d of tempDirs) fs.rmSync(d, { recursive: true, force: true });
});

// Fresh fixture app folder; `overrides` maps file name -> content (null = leave out).
function makeApp(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-check-'));
  tempDirs.push(dir);
  const files = Object.assign({
    'index.html': GOOD_HTML,
    'sw.js': GOOD_SW,
    'manifest.json': GOOD_MANIFEST,
    'icons/icon.png': 'png',
  }, overrides);
  for (const [name, content] of Object.entries(files)) {
    if (content === null) continue;
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

function runCli(dir) {
  try {
    const out = execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status, out: err.stdout + err.stderr };
  }
}

const failures = (results) => results.filter((r) => !r.ok);

test('a valid app passes', () => {
  const dir = makeApp();
  assert.deepStrictEqual(failures(runChecks(dir)), []);
  const { code, out } = runCli(dir);
  assert.strictEqual(code, 0);
  assert.match(out, /CHECK OK/);
});

test('a broken inline script fails with the index.html line number', () => {
  const html = GOOD_HTML.replace('  var ok = true;', '  var ok = true;\n  if (ok) {{');
  const dir = makeApp({ 'index.html': html });
  const { code, out } = runCli(dir);
  assert.strictEqual(code, 1);
  assert.match(out, /ERROR\s+index\.html <script #1> \(line 6\)/);
  assert.match(out, /SyntaxError/);
  assert.match(out, /CHECK FAILED/);
});

test('a broken sw.js fails', () => {
  const dir = makeApp({ 'sw.js': GOOD_SW + 'function (\n' });
  const f = failures(runChecks(dir));
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].label, 'sw.js');
  assert.match(f[0].detail, /^line 3: SyntaxError/);
});

test('missing CACHE_VERSION fails', () => {
  const dir = makeApp({ 'sw.js': "const FILES = ['./'];\n" });
  const f = failures(runChecks(dir));
  assert.deepStrictEqual(f.map((r) => r.label), ['sw.js CACHE_VERSION']);
});

test('invalid manifest.json fails', () => {
  const dir = makeApp({ 'manifest.json': '{ "name": "T", }' });
  const f = failures(runChecks(dir));
  assert.deepStrictEqual(f.map((r) => r.label), ['manifest.json']);
});

test('a referenced file that does not exist fails', () => {
  const dir = makeApp({ 'icons/icon.png': null });
  const f = failures(runChecks(dir));
  assert.ok(f.length >= 1);
  assert.ok(f.every((r) => /icons\/icon\.png/.test(r.label)), JSON.stringify(f));
  assert.match(f[0].detail, /missing/);
});

test('paths inside HTML / CSS comments are ignored', () => {
  const html = GOOD_HTML.replace('</head>',
    "<style>/* src: url('./fonts/x.woff2') */</style><!-- <img src=\"./gone.png\"> --></head>");
  const dir = makeApp({ 'index.html': html });
  assert.deepStrictEqual(failures(runChecks(dir)), []);
});

test('a missing manifest link fails', () => {
  const html = GOOD_HTML.replace('<link rel="manifest" href="manifest.json">\n', '');
  const dir = makeApp({ 'index.html': html });
  const f = failures(runChecks(dir));
  assert.deepStrictEqual(f.map((r) => r.label), ['index.html manifest link']);
  const { code, out } = runCli(dir);
  assert.strictEqual(code, 1);
  assert.match(out, /ERROR\s+index\.html manifest link/);
});

test('a commented-out manifest link fails', () => {
  const html = GOOD_HTML.replace('<link rel="manifest" href="manifest.json">',
    '<!-- <link rel="manifest" href="manifest.json"> -->');
  const f = failures(runChecks(makeApp({ 'index.html': html })));
  assert.deepStrictEqual(f.map((r) => r.label), ['index.html manifest link']);
});

test('an absolute manifest link fails (breaks on a GitHub Pages sub-path)', () => {
  const html = GOOD_HTML.replace('href="manifest.json"', 'href="/manifest.json"');
  const f = failures(runChecks(makeApp({ 'index.html': html })));
  assert.ok(f.some((r) => r.label === 'index.html manifest link'), JSON.stringify(f));
});

test('"./manifest.json" with attributes in another order passes', () => {
  const html = GOOD_HTML.replace('<link rel="manifest" href="manifest.json">',
    "<link href='./manifest.json' crossorigin='use-credentials' rel='manifest'>");
  assert.deepStrictEqual(failures(runChecks(makeApp({ 'index.html': html }))), []);
});
