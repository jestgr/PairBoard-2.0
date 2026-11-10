'use strict';

// PB.bid — a PBS bid as data, printed in PBS syntax. Runs the module straight out of index.html (no browser).
// The bids here are made up. A real bid is personal: if one is saved outside git (PB_TEST_BID, or the path
// below) the last test also checks it reads in and prints back character for character; otherwise it skips.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

function loadBid() {
  const start = html.indexOf('// PBS BID DOCUMENT — bid lines as data');
  const end = html.indexOf('// FILTER BUILDER — Avoid/Award mode filters');
  assert.ok(start > 0 && end > start, 'PBS BID DOCUMENT module found in index.html');
  const from = html.indexOf('(function() {', start);
  const to = html.lastIndexOf('})();', end) + '})();'.length;
  const sandbox = { PB: {}, console };
  vm.runInNewContext(html.slice(from, to), sandbox, { filename: 'index.html#bid' });
  return sandbox.PB.bid;
}

const bid = loadBid();
const plain = (x) => JSON.parse(JSON.stringify(x));   // sandbox objects have the sandbox's prototypes

// Same shape as a real two-group bid: Reserve first, then a Pairing group with stacked Ifs and stoppers.
const SAMPLE = {
  version: 1,
  groups: [
    { type: 'reserve', lines: [
      { kind: 'prefer-off', dates: ['2027-01-09', '2027-01-08', '2027-01-23', '2027-01-01'] },
    ] },
    { type: 'pairing', lines: [
      { kind: 'prefer-off', dates: ['2027-01-09', '2027-01-23', '2027-01-08'] },
      { kind: 'set-condition', cond: 'min-credit-window' },
      { kind: 'set-condition', cond: 'min-base-layover', value: '20:00' },
      { kind: 'avoid', conditions: [{ prop: 'checkin-station', value: ['AAA'] }, { prop: 'checkin-time', op: '<', value: '08:00' }] },
      { kind: 'avoid', conditions: [{ prop: 'checkin-station', value: ['BBB'] }, { prop: 'checkin-time', op: '<', value: 410 }] },
      { kind: 'avoid', conditions: [{ prop: 'carry-out-credit', op: '>', value: 1 }] },
      { kind: 'avoid', conditions: [{ prop: 'length', op: '>', value: 4 }] },
      { kind: 'award', conditions: [{ prop: 'checkin-station', value: ['BBB'] }, { prop: 'checkin-time', op: '>', value: '05:50' }, { prop: 'length', op: '<', value: 4 }] },
      { kind: 'avoid', conditions: [{ prop: 'credit', op: '>', value: '000:01' }] },
      { kind: 'award', conditions: [{ prop: 'time-off-before', value: '30:00' }, { prop: 'length', op: '>', value: 1 }] },
      { kind: 'avoid', conditions: [{ prop: 'credit', op: '>', value: 1 }] },
    ] },
  ],
};

const SAMPLE_TEXT = [
  '1. Reserve Bid Group',
  '2. Prefer Off Jan 9, 2027, Jan 8, 2027, Jan 23, 2027, Jan 1, 2027',
  '3. Pairing Bid Group',
  '4. Prefer Off Jan 9, 2027, Jan 23, 2027, Jan 8, 2027',
  '5. Set Condition Minimum Credit Window',
  '6. Set Condition Minimum Base Layover 020:00',
  '7. Avoid Pairings If Pairing Check-In Station AAA If Pairing Check-In Time < 08:00',
  '8. Avoid Pairings If Pairing Check-In Station BBB If Pairing Check-In Time < 06:50',
  '9. Avoid Pairings If Pairing Carry-Out Credit > 000:01',
  '10. Avoid Pairings If Pairing Length > 4 Days',
  '11. Award Pairings If Pairing Check-In Station BBB If Pairing Check-In Time > 05:50 If Pairing Length < 4 Days',
  '12. Avoid Pairings If Pairing Credit > 000:01',
  '13. Award Pairings If Time Off Before 030:00 If Pairing Length > 1 Days',
  '14. Avoid Pairings If Pairing Credit > 000:01',
];

test('a bid prints in PBS syntax, numbered across bid groups, in the order given', () => {
  const out = bid.render(SAMPLE);
  assert.strictEqual(out.typed, SAMPLE_TEXT.join('\n'));
  assert.strictEqual(out.count, 14);
  assert.deepStrictEqual(plain(out.problems), []);
});

test('the system "Award Pairings" line is shown unnumbered and never counted', () => {
  const out = bid.render(SAMPLE);
  const system = out.rows.filter((r) => r.n == null);
  assert.deepStrictEqual(plain(system.map((r) => [r.text, r.group, r.kind])), [['Award Pairings', 1, 'system']]);
  assert.ok(out.text.endsWith('\n    Award Pairings'));
  assert.ok(!/\d+\. Award Pairings$/m.test(out.text), 'not a numbered line');

  // Clear Schedule replaces it.
  const cleared = plain(SAMPLE);
  cleared.groups[1].lines.push({ kind: 'clear-schedule' });
  cleared.groups.push({ type: 'reserve', lines: [] });
  const out2 = bid.render(cleared);
  assert.strictEqual(out2.rows.filter((r) => r.n == null).length, 0);
  assert.ok(out2.typed.includes('15. Clear Schedule and Start Next Bid Group\n16. Reserve Bid Group'));
  assert.deepStrictEqual(plain(out2.problems), []);
});

test('Prefer Off keeps the order given: dates, days, ranges and options', () => {
  const t = (l) => bid.lineText(Object.assign({ kind: 'prefer-off' }, l));
  assert.strictEqual(t({ dates: ['2026-12-25', '2026-12-24', '2026-12-04'] }), 'Prefer Off Dec 25, 2026, Dec 24, 2026, Dec 4, 2026');
  assert.strictEqual(t({ days: ['Saturday', 'Sunday'] }), 'Prefer Off Saturday, Sunday');
  assert.strictEqual(t({ days: [0, 6] }), 'Prefer Off Sunday, Saturday');
  assert.strictEqual(t({ range: { start: '2026-12-24', end: '2026-12-26' }, allOrNothing: true }), 'Prefer Off Dec 24, 2026 - Dec 26, 2026 All or Nothing');
  assert.strictEqual(t({ range: { start: '2026-12-24', end: '2026-12-26', reverse: true } }), 'Prefer Off Dec 24, 2026 - Dec 26, 2026 Reverse Range Priority');
  assert.strictEqual(t({ dates: ['2026-12-25'], esn: true }), 'Prefer Off Dec 25, 2026 Else Start Next Bid Group');
  assert.strictEqual(t({ days: ['Saturday', 'Sunday'], minimum: 3, esn: true }), 'Prefer Off Saturday, Sunday Minimum 3 Else Start Next Bid Group');
});

test('conditions: lists, operators, Any / Every, Not, Between, Limit', () => {
  const line = (kind, conditions, extra) => bid.lineText(Object.assign({ kind, conditions }, extra));
  assert.strictEqual(line('award', [{ prop: 'layover-in', value: ['bos', 'SFO'], anyEvery: 'any' }]), 'Award Pairings If Any Layover In BOS, SFO');
  assert.strictEqual(line('award', [{ prop: 'duty-legs', op: '=', value: 2, anyEvery: 'every' }]), 'Award Pairings If Every Duty Legs = 2 Legs');
  assert.strictEqual(line('avoid', [{ prop: 'duty-legs', op: '>', value: 3, anyEvery: 'any' }]), 'Avoid Pairings If Any Duty Legs > 3 Legs');
  assert.strictEqual(line('avoid', [{ prop: 'redeye' }, { prop: 'layover-in', value: ['XYZ'] }]), 'Avoid Pairings If Redeye If Layover In XYZ');
  assert.strictEqual(line('award', [{ prop: 'redeye', not: true }]), 'Award Pairings If Not Redeye');
  assert.strictEqual(line('award', [{ prop: 'length', op: '=', value: 4 }], { limit: 3 }), 'Award Pairings If Pairing Length = 4 Days Limit 3');
  assert.strictEqual(line('award', [{ prop: 'length', op: 'between', value: 2, value2: 4 }]), 'Award Pairings If Pairing Length Between 2 And 4 Days');
  assert.strictEqual(line('avoid', [{ prop: 'checkout-time', op: 'between', value: '18:00', value2: '23:59' }]), 'Avoid Pairings If Pairing Check-Out Time Between 18:00 And 23:59');
  assert.strictEqual(line('avoid', [{ prop: 'avg-daily-credit', op: '<', value: 315 }]), 'Avoid Pairings If Average Daily Credit < 005:15');
  assert.strictEqual(line('award', [{ prop: 'departing-on', value: [1, 4] }]), 'Award Pairings If Departing On Monday, Thursday');
  assert.strictEqual(line('award', [{ prop: 'departing-on', value: ['2027-07-04'] }]), 'Award Pairings If Departing On Jul 4, 2027');
  assert.strictEqual(line('avoid', [{ prop: 'landings-in', value: ['SNN'], countingDeadhead: true }]), 'Avoid Pairings If Landings In SNN Counting Deadhead Legs');
  assert.strictEqual(line('avoid', [{ prop: 'length', op: '>', value: 3 }], { esn: true }), 'Avoid Pairings If Pairing Length > 3 Days Else Start Next Bid Group');
  assert.strictEqual(line('award', []), 'Award Pairings');
});

test('times: minutes or text in, HH:MM clock and HHH:MM duration out', () => {
  assert.strictEqual(bid.clock(350), '05:50');
  assert.strictEqual(bid.clock('5:50'), '05:50');
  assert.strictEqual(bid.duration(1), '000:01');
  assert.strictEqual(bid.duration('20:00'), '020:00');
  assert.strictEqual(bid.duration(315), '005:15');   // 5.25 h is 005:15, never "5.25:00"
  assert.strictEqual(bid.mins('abc'), null);
  assert.strictEqual(bid.pbsDate('2026-12-04'), 'Dec 4, 2026');
  assert.strictEqual(bid.isoDate('Dec 4, 2026'), '2026-12-04');
});

test('a typed bid reads back into the same data and prints back the same', () => {
  const read = bid.parse(SAMPLE_TEXT.join('\n') + '\n    Award Pairings\n# a note\n');
  assert.strictEqual(bid.render(read).typed, SAMPLE_TEXT.join('\n'));
  assert.deepStrictEqual(plain(read.groups.map((g) => [g.type, g.lines.length])), [['reserve', 1], ['pairing', 11]]);
  assert.deepStrictEqual(plain(read.groups[1].lines[3]), {
    kind: 'avoid',
    conditions: [{ prop: 'checkin-station', value: ['AAA'] }, { prop: 'checkin-time', op: '<', value: 480 }],
  });
  assert.strictEqual(read.groups[1].lines.filter((l) => l.kind === 'raw').length, 0);
  for (const text of [
    'Prefer Off Saturday, Sunday Minimum 3 Else Start Next Bid Group',
    'Prefer Off Dec 24, 2026 - Dec 26, 2026 All or Nothing',
    'Set Condition Pattern Between 4 and 5 Days On, with 2 Days Off',
    'Award Pairings If Any Layover In BOS, SFO If Pairing Length = 4 Days Limit 2',
    'Avoid Pairings If Redeye Else Start Next Bid Group',
    'Clear Schedule and Start Next Bid Group',
  ]) {
    const l = bid.parseLine(text);
    assert.notStrictEqual(l.kind, 'raw', text);
    assert.strictEqual(bid.lineText(l), text);
  }
});

test('a line it does not understand is kept word for word, with a warning', () => {
  const read = bid.parse('1. Pairing Bid Group\n2. Set Condition Slide Vacation SVAC Nov 3, 2026 7 Days\n3. Award Pairings If Line Check Airmen');
  assert.deepStrictEqual(plain(read.groups[0].lines), [
    { kind: 'raw', text: 'Set Condition Slide Vacation SVAC Nov 3, 2026 7 Days' },
    { kind: 'raw', text: 'Award Pairings If Line Check Airmen' },
  ]);
  const out = bid.render(read);
  assert.strictEqual(out.typed, '1. Pairing Bid Group\n2. Set Condition Slide Vacation SVAC Nov 3, 2026 7 Days\n3. Award Pairings If Line Check Airmen');
  assert.deepStrictEqual(plain(out.problems.map((p) => [p.level, p.n])), [['warn', 2], ['warn', 3]]);
});

test('the PBS rules are checked', () => {
  const problems = (groups) => plain(bid.validate({ version: 1, groups }).map((p) => p.level + ' ' + p.n + ': ' + p.text));
  const has = (list, n, word) => assert.ok(list.some((t) => t.includes(' ' + n + ': ') && t.includes(word)), word + ' @' + n + ' in ' + JSON.stringify(list));
  const award = { kind: 'award', conditions: [{ prop: 'length', op: '=', value: 3 }] };

  has(problems([]), 'null', 'no bid group');
  // Reserve group: only Prefer Off and the reserve Set Conditions
  let p = problems([{ type: 'reserve', lines: [{ kind: 'set-condition', cond: 'pattern', value: { min: 4, max: 5, off: 2 } }, award, { kind: 'set-condition', cond: 'min-credit-window' }] }]);
  has(p, 3, 'Reserve Bid Group only takes'); has(p, 4, 'Reserve Bid Group only takes');
  assert.ok(!p.some((t) => t.includes(' 2: ')), 'Pattern is fine in a Reserve group');
  // Clear Schedule: Pairing group only, last line, never in the last group
  p = problems([{ type: 'pairing', lines: [{ kind: 'clear-schedule' }, award] }]);
  has(p, 2, 'last line of its group'); has(p, 2, 'last bid group');
  p = problems([{ type: 'reserve', lines: [{ kind: 'clear-schedule' }] }, { type: 'pairing', lines: [] }]);
  has(p, 2, 'only works in a Pairing Bid Group');
  // Else Start Next: restrictions only, and above the plain restrictions
  p = problems([{ type: 'pairing', lines: [
    { kind: 'avoid', conditions: [{ prop: 'redeye' }] },
    { kind: 'prefer-off', dates: ['2026-12-25'], esn: true },
    Object.assign({ esn: true }, award),
  ] }, { type: 'pairing', lines: [] }]);
  has(p, 3, 'belong above'); has(p, 4, 'only goes on Prefer Off, Avoid and Set Condition');
  // Order: Set Condition / Prefer Off / Avoid below an Award — but a stopper below an Award is the point
  p = problems([{ type: 'pairing', lines: [award, { kind: 'set-condition', cond: 'min-credit-window' },
    { kind: 'prefer-off', days: ['Sunday'] }, { kind: 'avoid', conditions: [{ prop: 'redeye' }] }, bid.stopper()] }]);
  has(p, 3, 'above the Award'); has(p, 4, 'does not protect'); has(p, 5, 'does not take back');
  assert.ok(!p.some((t) => t.includes(' 6: ')), 'no warning on a stopper');
  // Conditions: property, operator, value
  p = problems([{ type: 'pairing', lines: [
    { kind: 'avoid', conditions: [{ prop: 'nope', value: 1 }] },
    { kind: 'avoid', conditions: [{ prop: 'checkin-time', op: '>=', value: '08:00' }] },
    { kind: 'avoid', conditions: [{ prop: 'checkin-time', op: '<', value: '25:00' }] },
    { kind: 'avoid', conditions: [{ prop: 'checkin-station', value: [] }] },
    { kind: 'avoid', conditions: [{ prop: 'time-off-before', op: '>', value: '30:00' }] },
    { kind: 'avoid', conditions: [{ prop: 'length', op: '>', value: 3, anyEvery: 'any' }] },
    { kind: 'avoid', conditions: [] },
    { kind: 'set-condition', cond: 'min-base-layover' },
    { kind: 'prefer-off' },
    { kind: 'avoid', conditions: [{ prop: 'redeye' }], limit: 1 },
  ] }]);
  has(p, 2, 'Unknown pairing property'); has(p, 3, 'takes <, >, between'); has(p, 4, 'clock time');
  has(p, 5, 'needs a value'); has(p, 6, 'takes no operator'); has(p, 7, 'no Any / Every');
  has(p, 8, 'at least one If'); has(p, 9, 'needs a time'); has(p, 10, 'needs dates'); has(p, 11, 'Limit only');
  // 200 lines
  const many = []; for (let i = 0; i < 200; i++) many.push(award);
  has(problems([{ type: 'pairing', lines: many }]), 'null', 'at most 200');
});

test('a stopper is recognised, and only a stopper', () => {
  assert.strictEqual(bid.lineText(bid.stopper()), 'Avoid Pairings If Pairing Credit > 000:01');
  assert.strictEqual(bid.isStopper(bid.stopper()), true);
  assert.strictEqual(bid.isStopper({ kind: 'avoid', conditions: [{ prop: 'credit', op: '>', value: '020:00' }] }), false);
  assert.strictEqual(bid.isStopper({ kind: 'avoid', conditions: [{ prop: 'carry-out-credit', op: '>', value: 1 }] }), false);
  assert.strictEqual(bid.isStopper({ kind: 'award', conditions: [{ prop: 'credit', op: '>', value: 1 }] }), false);
});

test('the catalog says what PairBoard can test itself and where each wording comes from', () => {
  const cat = plain(bid.catalog());
  const by = Object.fromEntries(cat.properties.map((p) => [p.id, p]));
  assert.strictEqual(by['time-off-before'].browse, false);   // depends on the line PBS is building
  assert.strictEqual(by['checkin-station'].browse, true);
  assert.strictEqual(by['checkin-station'].seen, 'bid');
  for (const p of cat.properties) assert.ok(['bid', 'handbook', 'assumed'].includes(p.seen), p.id);
  assert.strictEqual(new Set(cat.properties.map((p) => p.pbs)).size, cat.properties.length, 'no two properties print the same');
  assert.strictEqual(cat.maxLines, 200);
});

const REAL = process.env.PB_TEST_BID || '/home/dev/data/pairboard-android/test-bids/jeff-dec-2026.txt';
test('a real bid kept outside git reads in and prints back character for character', { skip: !fs.existsSync(REAL) && 'no real bid on this machine' }, () => {
  const typed = fs.readFileSync(REAL, 'utf8').split(/\r?\n/).filter((l) => /^\d+\. /.test(l));
  assert.ok(typed.length > 0);
  const read = bid.parse(typed.join('\n'));
  const out = bid.render(read);
  assert.strictEqual(out.typed, typed.join('\n'));
  assert.strictEqual(out.count, typed.length);
  const raw = read.groups.flatMap((g) => g.lines).filter((l) => l.kind === 'raw');
  assert.deepStrictEqual(plain(raw), [], 'every line understood as data');
  assert.deepStrictEqual(plain(out.problems), []);
});
