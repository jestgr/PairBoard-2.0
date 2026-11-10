'use strict';

// PB.bid.linesFromFilter — a PairBoard filter written as PBS bid lines. The line must mean what the filter
// does while browsing; PBS has only <, >, = and Between, so "at least" / "at most" move one step out.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const start = html.indexOf('// PBS BID DOCUMENT — bid lines as data');
const end = html.indexOf('// FILTER BUILDER — Avoid/Award mode filters');
const sandbox = { PB: {}, console };
vm.runInNewContext(html.slice(html.indexOf('(function() {', start), html.lastIndexOf('})();', end) + 5), sandbox, { filename: 'index.html#bid' });
const bid = sandbox.PB.bid;

const text = (f) => Array.from(bid.linesFromFilter(f).lines, (l) => bid.lineText(l));
const F = (mode, type, subtype, params, and) => Object.assign({ type, subtype, mode, params }, and ? { and } : {});

test('one filter, one line', () => {
  assert.deepStrictEqual(text(F('avoid', 'pairing-length', 'gt', { value: 4 })), ['Avoid Pairings If Pairing Length > 4 Days']);
  assert.deepStrictEqual(text(F('award', 'station', 'checkin', { stations: ['aaa', 'bbb'] })), ['Award Pairings If Pairing Check-In Station AAA, BBB']);
  assert.deepStrictEqual(text(F('avoid', 'pairing', 'checkin-time', { op: 'before', mins: 410 })), ['Avoid Pairings If Pairing Check-In Time < 06:50']);
  assert.deepStrictEqual(text(F('avoid', 'pairing', 'has-redeye', { value: true })), ['Avoid Pairings If Redeye']);
  assert.deepStrictEqual(text(F('avoid', 'carry-out', undefined, {})), ['Avoid Pairings If Pairing Carry-Out Credit > 000:01']);
});

test('"at least" and "at most" become > and < one step out', () => {
  assert.deepStrictEqual(text(F('award', 'credit', 'min', { min: 20 })), ['Award Pairings If Pairing Credit > 019:59']);
  assert.deepStrictEqual(text(F('avoid', 'credit', 'max', { max: 12.5 })), ['Avoid Pairings If Pairing Credit < 012:31']);
  assert.deepStrictEqual(text(F('avoid', 'legs', 'total-legs', { op: 'max', value: 2 })), ['Avoid Pairings If Total Legs In Pairing < 3 Legs']);
  assert.deepStrictEqual(text(F('avoid', 'legs', 'duty-legs', { op: 'gt', value: 3 })), ['Avoid Pairings If Any Duty Legs > 3 Legs']);
  assert.deepStrictEqual(text(F('award', 'legs', 'duty-legs', { op: 'max', value: 2 })), ['Award Pairings If Every Duty Legs < 3 Legs']);
});

test('stacked Ifs go on one line, in order', () => {
  const f = F('award', 'station', 'checkin', { stations: ['BBB'] }, [
    { type: 'pairing', subtype: 'checkin-time', params: { op: 'after', mins: 350 } },
    { type: 'pairing-length', subtype: 'lt', params: { value: 4 } },
  ]);
  assert.deepStrictEqual(text(f), ['Award Pairings If Pairing Check-In Station BBB If Pairing Check-In Time > 05:50 If Pairing Length < 4 Days']);
});

test('commutable alone is two Avoid lines; Prefer Off is a Prefer Off line', () => {
  assert.deepStrictEqual(text(F('avoid', 'commutable', undefined, { checkInAfter: 540, checkOutBefore: 1080 })),
    ['Avoid Pairings If Pairing Check-In Time < 09:00', 'Avoid Pairings If Pairing Check-Out Time > 18:00']);
  const po = bid.linesFromFilter(F('avoid', 'prefer-off', 'dates', { dates: ['2027-01-09', '2027-01-08'] })).lines;
  assert.strictEqual(po.length, 1);
  assert.strictEqual(po[0].kind, 'prefer-off');
  assert.deepStrictEqual(Array.from(po[0].dates), ['2027-01-09', '2027-01-08'], 'date order kept: it is the priority');
});

test('a filter PBS cannot say gives a note, not a wrong line', () => {
  const r = bid.linesFromFilter(F('avoid', 'pairing', 'has-dh-position', { pos: 'front', op: 'avoid' }));
  assert.strictEqual(r.lines.length, 0);
  assert.strictEqual(r.notes.length, 1);
});

test('every line made from a filter passes the bid checks', () => {
  const filters = [
    F('avoid', 'pairing-length', 'gt', { value: 4 }),
    F('avoid', 'block-time', 'avg-daily', { op: 'range', min: 4, max: 6 }),
    F('avoid', 'layover', 'duration', { op: 'lt', val: 12 }),
    F('avoid', 'landings-in', undefined, { stations: ['ccc'] }),
    F('award', 'layovers-in', 'prefer', { cities: ['DDD'], match: 'every' }),
    F('award', 'pairing', 'tafb', { op: 'min', min: 60 }),
  ];
  const lines = filters.reduce((all, f) => all.concat(bid.linesFromFilter(f).lines), []);
  const out = bid.render({ version: 1, groups: [{ type: 'pairing', lines }] });
  assert.deepStrictEqual(Array.from(out.problems).filter((p) => p.level === 'error'), []);
  out.rows.filter((r) => r.n && r.kind !== 'group').forEach((r) => assert.deepStrictEqual(JSON.parse(JSON.stringify(bid.parseLine(r.text))).kind, r.kind, r.text));
});

// ---- fromFilters: the whole bid from the filter list + the report options ----
const LIST = [
  F('avoid', 'prefer-off', 'dates', { dates: ['2027-01-09', '2027-01-08'] }),
  F('avoid', 'station', 'checkin', { stations: ['AAA'] }, [{ type: 'pairing', subtype: 'checkin-time', params: { op: 'before', mins: 480 } }]),
  F('avoid', 'carry-out', undefined, {}),
  F('award', 'station', 'checkin', { stations: ['BBB'] }, [{ type: 'pairing-length', subtype: 'lt', params: { value: 4 } }]),
  F('award', 'pairing-length', 'exact', { value: 1 }),
];
const bidText = (filters, options) => {
  const r = bid.fromFilters(filters, options);
  const out = bid.render(r.bid);
  return { lines: out.text.split('\n'), notes: Array.from(r.notes), problems: Array.from(out.problems) };
};

test('with no options the bid is the filters, in order, and nothing else', () => {
  const r = bidText(LIST);
  assert.deepStrictEqual(r.lines, [
    '1. Pairing Bid Group',
    '2. Prefer Off Jan 9, 2027, Jan 8, 2027',
    '3. Avoid Pairings If Pairing Check-In Station AAA If Pairing Check-In Time < 08:00',
    '4. Avoid Pairings If Pairing Carry-Out Credit > 000:01',
    '5. Award Pairings If Pairing Check-In Station BBB If Pairing Length < 4 Days',
    '6. Award Pairings If Pairing Length = 1 Days',
    '    Award Pairings',
  ]);
  assert.deepStrictEqual(r.notes, []);
  assert.deepStrictEqual(r.problems, []);
});

test('Reserve then Pairings, minimum credit with stoppers, Set Conditions under Prefer Off', () => {
  const r = bidText(LIST, { groups: 'reserve-pairing', creditWindow: 'min', minBaseLayover: '20:00', stoppers: true,
                            consecutiveDaysOff: 3, pattern: { min: 3, max: 4, off: 3 } });
  assert.deepStrictEqual(r.lines, [
    '1. Reserve Bid Group',
    '2. Prefer Off Jan 9, 2027, Jan 8, 2027',
    '3. Set Condition Consecutive Days Off 3',
    '4. Set Condition Pattern Between 3 and 4 Days On, with 3 Days Off',
    '5. Pairing Bid Group',
    '6. Prefer Off Jan 9, 2027, Jan 8, 2027',
    '7. Set Condition Minimum Credit Window',
    '8. Set Condition Minimum Base Layover 020:00',
    '9. Avoid Pairings If Pairing Check-In Station AAA If Pairing Check-In Time < 08:00',
    '10. Avoid Pairings If Pairing Carry-Out Credit > 000:01',
    '11. Award Pairings If Pairing Check-In Station BBB If Pairing Length < 4 Days',
    '12. Avoid Pairings If Pairing Credit > 000:01',
    '13. Award Pairings If Pairing Length = 1 Days',
    '14. Avoid Pairings If Pairing Credit > 000:01',
    '    Award Pairings',
  ]);
  assert.deepStrictEqual(r.notes, []);
  assert.deepStrictEqual(r.problems, []);
});

test('Clear Schedule only ends a Pairing group that is not the last group', () => {
  const first = bidText(LIST, { groups: 'pairing-reserve', cssn: true });
  assert.strictEqual(first.lines[6], '7. Clear Schedule and Start Next Bid Group');
  assert.strictEqual(first.lines[7], '8. Reserve Bid Group');
  assert.ok(!first.lines.includes('    Award Pairings'), 'no system Award Pairings after a cleared schedule');
  assert.deepStrictEqual(first.problems, []);
  const last = bidText(LIST, { groups: 'pairing', cssn: true });
  assert.ok(!last.lines.some((l) => /Clear Schedule/.test(l)));
  assert.strictEqual(last.notes.length, 1);
});

test('a Reserve-only bid keeps just Prefer Off and says so', () => {
  const r = bidText(LIST, { groups: 'reserve' });
  assert.deepStrictEqual(r.lines, ['1. Reserve Bid Group', '2. Prefer Off Jan 9, 2027, Jan 8, 2027']);
  assert.strictEqual(r.notes.length, 1);
});

test('notes tell what could not be done', () => {
  assert.ok(bidText([LIST[1]], { stoppers: true, creditWindow: 'min' }).notes[0].includes('no'), 'stoppers without Award lines');
  assert.strictEqual(bidText(LIST, { stoppers: true }).notes.length, 1, 'stoppers without Minimum Credit Window');
  const n = bidText(LIST.concat([F('avoid', 'pairing', 'has-dh-position', { pos: 'front', op: 'avoid' })])).notes;
  assert.ok(n[0].startsWith('Filter #6:'));
});

test('no filters: Set Conditions still print, the filter list is not changed', () => {
  const r = bidText([], { creditWindow: 'max' });
  assert.deepStrictEqual(r.lines, ['1. Pairing Bid Group', '2. Set Condition Maximum Credit Window', '    Award Pairings']);
  const before = JSON.stringify(LIST);
  bid.fromFilters(LIST, { stoppers: true, groups: 'reserve-pairing' });
  assert.strictEqual(JSON.stringify(LIST), before);
});
