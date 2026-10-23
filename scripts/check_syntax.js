#!/usr/bin/env node
// ============================================================
// PairBoard pre-ship check
//   • every inline <script> in index.html parses (plus sw.js)
//   • manifest.json is valid JSON
//   • local files referenced by index.html / sw.js / manifest exist
//   • sw.js defines CACHE_VERSION
//
// Usage:  node scripts/check_syntax.js [appDir]   (default: repo root)
// Exits 1 if any check fails. Node built-ins only.
// ============================================================

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Script types that run as classic JS. Anything else (JSON, templates) is not JS.
const JS_TYPES = ['', 'text/javascript', 'application/javascript'];
const JSON_TYPES = ['application/json', 'application/ld+json', 'importmap'];

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// Compile without running. Returns null if OK, else "line N: message".
function parseError(code, filename, lineOffset) {
  try {
    new vm.Script(code, { filename, lineOffset });
    return null;
  } catch (err) {
    const m = String(err.stack).match(new RegExp(escapeRe(filename) + ':(\\d+)'));
    const line = m ? m[1] : '?';
    return 'line ' + line + ': ' + err.name + ': ' + err.message;
  }
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// All <script> blocks: { attrs, type, code, line (1-based line where the code starts) }.
function extractScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const typeMatch = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i);
    const codeStart = m.index + m[0].indexOf('>') + 1;
    out.push({
      attrs: attrs.trim(),
      type: typeMatch ? typeMatch[1].toLowerCase() : '',
      hasSrc: /\bsrc\s*=/i.test(attrs),
      code: m[2],
      line: lineAt(html, codeStart),
    });
  }
  return out;
}

// Local paths like './icons/x.png' or './vendor/tesseract/' quoted in the text.
// HTML comments and CSS /* */ comments inside <style> are ignored (commented-out hooks).
function extractLocalRefs(text, isHtml) {
  let src = text;
  if (isHtml) {
    src = src.replace(/<!--[\s\S]*?-->/g, '');
    src = src.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (all, open, css, close) => open + css.replace(/\/\*[\s\S]*?\*\//g, '') + close);
  }
  const refs = new Set();
  const re = /['"`](\.\/[^'"`\s]*)['"`]/g;
  let m;
  while ((m = re.exec(src))) refs.add(m[1]);
  if (isHtml) {
    // Plain relative src/href attributes, e.g. <link href="icons/x.png">
    const attrRe = /\b(?:src|href)\s*=\s*"([^"]+)"/gi;
    while ((m = attrRe.exec(src))) {
      const v = m[1];
      if (/^(?:[a-z]+:|\/\/|#|\.\/)/i.test(v) || /['+${}]/.test(v)) continue;
      refs.add(v);
    }
  }
  return [...refs];
}

function runChecks(appDir) {
  const results = []; // { ok: bool, label, detail }
  const pass = (label) => results.push({ ok: true, label });
  const fail = (label, detail) => results.push({ ok: false, label, detail });
  const refs = new Map(); // ref -> first source file

  const read = (name) => {
    const p = path.join(appDir, name);
    if (!fs.existsSync(p)) { fail(name, 'file not found'); return null; }
    return fs.readFileSync(p, 'utf8');
  };

  // ── index.html scripts ─────────────────────────────────────
  const html = read('index.html');
  if (html !== null) {
    const scripts = extractScripts(html);
    let n = 0;
    for (const s of scripts) {
      n++;
      const label = 'index.html <script #' + n + '> (line ' + s.line + ')';
      if (s.hasSrc && !s.code.trim()) continue; // external file, covered by ref check
      if (JSON_TYPES.includes(s.type)) {
        try { JSON.parse(s.code); pass(label + ' JSON'); }
        catch (err) { fail(label, 'invalid JSON: ' + err.message); }
      } else if (JS_TYPES.includes(s.type)) {
        const err = parseError(s.code, 'index.html', s.line - 1);
        if (err) fail(label, err); else pass(label);
      } else if (s.type === 'module') {
        fail(label, 'type="module" scripts are not supported by this check yet');
      }
      // other types (e.g. text/template) are not code — skipped
    }
    if (n === 0) fail('index.html', 'no <script> blocks found');
    for (const r of extractLocalRefs(html, true)) if (!refs.has(r)) refs.set(r, 'index.html');
  }

  // ── sw.js ──────────────────────────────────────────────────
  const sw = read('sw.js');
  if (sw !== null) {
    const err = parseError(sw, 'sw.js', 0);
    if (err) fail('sw.js', err); else pass('sw.js');
    const v = sw.match(/\bCACHE_VERSION\s*=\s*(['"`])([^'"`]+)\1/);
    if (v) pass('sw.js CACHE_VERSION = ' + v[2]);
    else fail('sw.js CACHE_VERSION', 'no `CACHE_VERSION = \'...\'` found');
    for (const r of extractLocalRefs(sw, false)) if (!refs.has(r)) refs.set(r, 'sw.js');
  }

  // ── manifest.json ──────────────────────────────────────────
  const manifestText = read('manifest.json');
  if (manifestText !== null) {
    let manifest = null;
    try { manifest = JSON.parse(manifestText); pass('manifest.json is valid JSON'); }
    catch (err) { fail('manifest.json', 'invalid JSON: ' + err.message); }
    if (manifest) {
      for (const icon of manifest.icons || []) {
        if (icon && typeof icon.src === 'string' && !/^[a-z]+:/i.test(icon.src) && !refs.has(icon.src)) {
          refs.set(icon.src, 'manifest.json');
        }
      }
    }
  }

  // ── referenced files exist ─────────────────────────────────
  for (const [ref, from] of [...refs].sort()) {
    const clean = ref.split(/[?#]/)[0];
    const p = path.join(appDir, clean);
    if (fs.existsSync(p)) pass('ref ' + ref);
    else fail('ref ' + ref, 'referenced in ' + from + ' but missing');
  }

  return results;
}

function main() {
  const appDir = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const results = runChecks(appDir);
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    if (r.ok) console.log('OK     ' + r.label);
    else console.error('ERROR  ' + r.label + ' — ' + r.detail);
  }
  const passed = results.length - failed.length;
  if (failed.length) {
    console.error('\nCHECK FAILED: ' + failed.length + ' error(s), ' + passed + ' OK');
    process.exitCode = 1;
  } else {
    console.log('CHECK OK: ' + passed + ' checks passed (' + appDir + ')');
  }
}

if (require.main === module) main();

module.exports = { runChecks, extractScripts, extractLocalRefs };
