'use strict';

// FAR 117 screenshot reader (parseEzioText). Fixed 11 Nov 2026: OCR of the crew app's flight header
// "DL1234 : AAA-BBB" often drops the dash ("DL1234: AAABBB"), and the reader then found no flights.
// Made-up flights; the function is taken straight out of index.html.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
function grab(startText) {
  const a = html.indexOf(startText);
  assert.ok(a >= 0, startText + ' found');
  const indent = html.slice(html.lastIndexOf('\n', a) + 1, a) + /^\s*/.exec(startText)[0];
  const end = html.indexOf('\n' + indent + '}', a);
  return html.slice(a, end + indent.length + 2);
}
const sb = {};
vm.runInNewContext(grab('function parseEzioText(text) {'), sb);
const read = (t) => sb.parseEzioText(t);
const legs = (t) => JSON.parse(JSON.stringify(read(t).legs.map((l) => [l.depApt, l.arrApt, l.depLocalHHMM, l.arrLocalHHMM, l.blockMins])));   // plain arrays (the function runs in its own sandbox)

// as the phone's OCR reads the crew app's duty screen (two columns run together)
const OCR = [
  '&) DL9001: ATLMCO',
  'Rpt- 0600 09SEP Apr Rpt-',
  'Dep- 0651 09SEP Gate- E73',
  'Arr- 0924 09SEP Gate- 75 >',
  'Blk- 2:33/Turn- 1:42 Eqp/Ship- 738/3758',
  'M/U- 00:08',
  '&) DL9002: MCOLGA',
  'Dep- 1106 09SEP Gate- 64',
  'Arr- 1401 09SEP Gate- HO3 >',
  'Blk- 2:55/Turn- 16:46 Eqp/Ship- 739/3808',
  'M/U- 00:21',
].join('\n');

test('flight header without the dash (OCR dropped it) is still a flight', () => {
  assert.deepStrictEqual(legs(OCR), [
    ['ATL', 'MCO', '0651', '0924', 153],
    ['MCO', 'LGA', '1106', '1401', 175],
  ]);
  assert.strictEqual(read(OCR).schedReport, '0600');
});

test('the header forms that already worked still work', () => {
  const body = '\nDep- 0651 09SEP\nArr- 0924 09SEP\nBlk- 2:33\n';
  for (const h of ['DL9001 : ATL-MCO', 'DL9001: ATL-MCO', 'DL9001 ATL-MCO', 'DL 9001 ATL MCO', '9001 ATL-MCO', 'DL9001 : ATL–MCO']) {
    const l = legs('XX ' + h + body);
    assert.deepStrictEqual(l.map((x) => x.slice(0, 2)), [['ATL', 'MCO']], h);
  }
});

test('the other lines of the screen are not taken for flights', () => {
  const noHeaders = OCR.split('\n').filter((l) => !/^&\)/.test(l)).join('\n');
  assert.deepStrictEqual(legs(noHeaders), []);
});
