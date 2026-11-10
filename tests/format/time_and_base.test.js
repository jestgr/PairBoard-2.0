'use strict';

// Small helpers fixed on 10 Nov 2026: hours that round up to a whole hour printed as "5.60"; an empty base box
// matched every city name and became ATL. The functions are taken straight out of index.html.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// the text of one function (or one-line function) from its first line to its closing brace at the same indent
function grab(startText) {
  const a = html.indexOf(startText);
  assert.ok(a >= 0, startText + ' found');
  const line = html.slice(a, html.indexOf('\n', a)).replace(/\s*\/\/[^'"]*$/, '');   // drop a trailing comment
  if (line.trim().endsWith('}') && line.split('{').length === line.split('}').length) return line;
  const indent = /^\s*/.exec(startText)[0] + html.slice(html.lastIndexOf('\n', a) + 1, a);
  const end = html.indexOf('\n' + indent + '}', a);
  return html.slice(a, end + indent.length + 2);
}

test('decimal hours never print as x.60 / x:60', () => {
  const sb = {};
  vm.runInNewContext(grab('function decToHHMM(dec) {'), sb);
  assert.strictEqual(sb.decToHHMM(5.9999), '6.00');
  assert.strictEqual(sb.decToHHMM(5.5), '5.30');
  assert.strictEqual(sb.decToHHMM(0), '0.00');
  assert.strictEqual(sb.decToHHMM(18.95), '18.57');
  assert.strictEqual(sb.decToHHMM(-1.5), '-1.30');
  assert.strictEqual(sb.decToHHMM(null), '—');

  const sb2 = {};
  vm.runInNewContext(grab('  function decToHHMM(d) {'), sb2);
  assert.strictEqual(sb2.decToHHMM(7.9999), '8:00');
  assert.strictEqual(sb2.decToHHMM(75.25), '75:15');

  const sb3 = {};
  vm.runInNewContext(grab('  function decimalToDisplay(d) {'), sb3);
  assert.strictEqual(sb3.decimalToDisplay(2.99999), '3:00');
  assert.strictEqual(sb3.decimalToDisplay(NaN), '—');

  const sb4 = {};
  vm.runInNewContext(grab('  function dHHMM(d) {'), sb4);
  assert.strictEqual(sb4.dHHMM(4.9999), '5.00');
});

test('an empty base box is not a city', () => {
  const sb = { CITY_CODES: { ATL: 'Atlanta', NYC: 'New York', BOS: 'Boston' }, CREW_BASE_CODES: new Set(['ATL', 'NYC']) };
  vm.runInNewContext(grab('function reverseCityLookup(nameStr) {'), sb);
  assert.strictEqual(sb.reverseCityLookup(''), null);
  assert.strictEqual(sb.reverseCityLookup('   '), null);
  assert.strictEqual(sb.reverseCityLookup(null), null);
  assert.strictEqual(sb.reverseCityLookup('new york').code, 'NYC');
  assert.strictEqual(sb.reverseCityLookup('Boston').code, 'BOS');
});
