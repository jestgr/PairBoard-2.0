'use strict';

// FILTER MATCHING — the code that decides which trips a filter removes or marks, stacked Ifs included.
// Runs the block straight out of index.html (no browser) against made-up pairings. The helpers that read a
// parsed pairing (check-in time, layovers…) are replaced here by simple stand-ins.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

function load(filters) {
  const start = html.indexOf('// FILTER MATCHING — does a pairing match');
  const endFn = html.indexOf('function applyOccurrenceFilters(startDays, p) {');
  const end = html.indexOf('  return surviving;\n}\n', endFn) + '  return surviving;\n}\n'.length;
  assert.ok(start > 0 && endFn > start && end > endFn, 'FILTER MATCHING block found in index.html');
  const pad = (n) => String(n).padStart(2, '0');
  const sandbox = {
    console,
    appState: { occurrenceFilters: filters || [], bidPeriodStart: '2027-01-01', bidPeriodEnd: '2027-01-31' },
    pairingCheckInMins: (p) => p.ci, pairingCheckOutMins: (p) => p.co,
    pairingCheckInStation: (p) => p.ciStation, pairingCheckOutStation: (p) => p.coStation,
    pairingWorkStartStation: (p) => p.ciStation, pairingWorkEndStation: (p) => p.coStation,
    pairingLayovers: (p) => p.layovers || [],
    pairingMaxDutyLegs: (p) => Math.max.apply(null, p.tripDays.map((d) => d.legs.length)),
    pairingTotalLegs: (p) => p.tripDays.reduce((n, d) => n + d.legs.length, 0),
    computeOccurrences: (p) => p.starts,
    getBidPeriodYearMonth: () => ({ year: 2027, month: 0 }),
    parseBPDate: (s) => { const m = s.split('-'); return new Date(+m[0], +m[1] - 1, +m[2]); },
    localDKey: (y, mo, d) => y + '-' + pad(mo + 1) + '-' + pad(d),
  };
  vm.runInNewContext('// ' + html.slice(start, end), sandbox, { filename: 'index.html#filters' });
  return sandbox;
}

// January 2027: the 1st is a Friday. `starts` = days of the month the trip departs.
function trip(number, o) {
  const days = o.days || 1;
  const tripDays = [];
  for (let i = 0; i < days; i++) {
    tripDays.push({ legs: (o.legs || [['AAA', 'BBB'], ['BBB', 'AAA']]).map((l) => ({ depCity: l[0], arrCity: l[1], isDH: !!l[2] })),
                    layoverCity: i < days - 1 ? (o.layoverStations || ['CCC'])[0] : null });
  }
  return Object.assign({
    number, days, creditHours: 5 * days, blockHours: 4 * days, tafbHours: 24 * days - 12,
    ci: 480, co: 1020, ciStation: 'AAA', coStation: 'AAA',
    layoverStations: days > 1 ? ['CCC'] : [], layovers: [], containsDH: false, containsRedeye: false,
    tripDays, starts: [4, 5, 6, 7, 8],
  }, o, { days, tripDays: o.tripDays || tripDays });
}

const TRIPS = () => [
  trip('1001', { days: 1, ci: 300 }),                                            // early day trip from AAA
  trip('1002', { days: 1, ci: 600 }),                                            // late day trip from AAA
  trip('1003', { days: 3, ci: 300, ciStation: 'BBB', layoverStations: ['CCC'] }),  // early 3-day from BBB
  trip('1004', { days: 3, ci: 600, ciStation: 'BBB', layoverStations: ['DDD'] }),  // late 3-day from BBB
  trip('1005', { days: 4, ci: null, containsDH: true, tafbHours: 0 }),             // no check-in time known
];

const kept = (sb, filters) => TRIPS().filter((p) => filters.every((f) => sb.pairingFilterKeeps(p, f))).map((p) => p.number);
const AVOID = (type, subtype, params, and) => Object.assign({ type, subtype, mode: 'avoid', params }, and ? { and } : {});
const AWARD = (type, subtype, params, and) => Object.assign({ type, subtype, mode: 'award', params }, and ? { and } : {});

test('a single filter keeps or removes as it always has', () => {
  const sb = load();
  assert.deepStrictEqual(kept(sb, [AVOID('pairing-length', 'gt', { value: 2 })]), ['1001', '1002']);
  assert.deepStrictEqual(kept(sb, [AVOID('station', 'checkin', { stations: ['bbb'] })]), ['1001', '1002', '1005']);
  // a trip with no check-in time is kept either way
  assert.deepStrictEqual(kept(sb, [AVOID('pairing', 'checkin-time', { op: 'before', mins: 480 })]), ['1002', '1004', '1005']);
  // commutable has always meant "keep only these", whatever its mode says
  assert.deepStrictEqual(kept(sb, [AVOID('commutable', undefined, { checkInAfter: 540 })]), ['1002', '1004', '1005']);
  // the old spellings of "avoid" still work
  assert.deepStrictEqual(kept(sb, [{ type: 'layovers-in', subtype: 'avoid', mode: 'x', params: { cities: ['ccc'] } }]), ['1001', '1002', '1004']);
  assert.deepStrictEqual(kept(sb, [{ type: 'layover', subtype: 'station', mode: 'x', params: { stations: ['CCC'], op: 'exclude' } }]), ['1001', '1002', '1004']);
  assert.deepStrictEqual(kept(sb, [{ type: 'credit', subtype: 'min', mode: 'x', params: { min: 15, opMode: 'avoid' } }]), ['1001', '1002']);
  // an Award filter removes nothing
  assert.deepStrictEqual(kept(sb, [AWARD('pairing-length', 'gt', { value: 2 })]).length, 5);
  // an unknown type removes nothing
  assert.deepStrictEqual(kept(sb, [AVOID('made-up', undefined, {})]).length, 5);
});

test('a stacked Avoid removes only the trips where every If is true', () => {
  const sb = load();
  // Avoid Pairings If Check-In Station BBB If Check-In Time < 08:00
  const f = AVOID('station', 'checkin', { stations: ['BBB'] }, [{ type: 'pairing', subtype: 'checkin-time', params: { op: 'before', mins: 480 } }]);
  assert.deepStrictEqual(kept(sb, [f]), ['1001', '1002', '1004', '1005']);
  // three Ifs
  f.and.push({ type: 'layovers-in', params: { cities: ['DDD'] } });
  assert.deepStrictEqual(kept(sb, [f]).length, 5);
  // an If that cannot be told (no check-in time) is not "true": the trip stays
  const g = AVOID('pairing-length', 'gt', { value: 3 }, [{ type: 'pairing', subtype: 'checkin-time', params: { op: 'before', mins: 1440 } }]);
  assert.deepStrictEqual(kept(sb, [g]).length, 5);
  // a stacked Award removes nothing
  assert.deepStrictEqual(kept(sb, [AWARD('station', 'checkin', { stations: ['BBB'] }, f.and)]).length, 5);
});

test('extra Ifs read as plain tests: no mode, no "avoid" spelling', () => {
  const sb = load();
  // Avoid Pairings If Pairing Length > 2 If Deadhead … none of the 3-days has one; the 4-day does
  const f = AVOID('pairing-length', 'gt', { value: 2 }, [{ type: 'pairing', subtype: 'has-dh', params: { value: true } }]);
  assert.deepStrictEqual(kept(sb, [f]), ['1001', '1002', '1003', '1004']);
  // a first If that used to mean "keep only" (commutable) is a plain test once stacked
  const g = AVOID('commutable', undefined, { checkInAfter: 540 }, [{ type: 'pairing-length', subtype: 'exact', params: { value: 1 } }]);
  assert.deepStrictEqual(kept(sb, [g]), ['1001', '1003', '1004', '1005']);
});

test('Award filters mark each trip with the FIRST one it matches, top-down', () => {
  const sb = load();
  const filters = [
    AVOID('pairing-length', 'gt', { value: 3 }),
    AWARD('station', 'checkin', { stations: ['BBB'] }, [{ type: 'pairing', subtype: 'checkin-time', params: { op: 'after', mins: 480 } }]),
    AWARD('pairing-length', 'exact', { value: 3 }),
    AWARD('pairing', 'checkin-time', { op: 'before', mins: 480 }),
  ];
  const trips = TRIPS();
  assert.strictEqual(sb.awardRanks(trips, filters, null), 3);
  const got = trips.map((p) => [p.number, p._awardLine, p._awardScore]);
  assert.deepStrictEqual(got, [
    ['1001', 4, 1],     // early: only the last Award
    ['1002', 0, 0],     // nothing asks for it
    ['1003', 3, 2],     // 3-day (and early, but the 3-day line comes first)
    ['1004', 2, 3],     // BBB and late: the first Award line
    ['1005', 0, 0],
  ]);
  // no Award filters: nothing marked
  assert.strictEqual(sb.awardRanks(trips, [filters[0]], null), 0);
  assert.ok(trips.every((p) => p._awardScore === 0 && p._awardLine === 0));
});

test('a stacked filter with a day If removes departures, not the whole trip', () => {
  // Avoid Pairings If Check-In Station BBB If Departing On Monday, Tuesday   (Jan 4 2027 is a Monday)
  const f = AVOID('station', 'checkin', { stations: ['BBB'] }, [{ type: 'pairing-dow', params: { dows: [1, 2] } }]);
  const sb = load([f]);
  const [a, , c] = TRIPS();
  assert.ok(sb.pairingFilterKeeps(c, f), 'the trip itself stays listed');
  assert.deepStrictEqual(Array.from(sb.applyOccurrenceFilters(c.starts, c)).sort(), [6, 7, 8]);
  assert.deepStrictEqual(Array.from(sb.applyOccurrenceFilters(a.starts, a)).sort(), [4, 5, 6, 7, 8], 'other stations untouched');
  // alone, the day filter takes those departures from every trip
  const sb2 = load([AVOID('pairing-dow', undefined, { dows: [1, 2] })]);
  assert.deepStrictEqual(Array.from(sb2.applyOccurrenceFilters(a.starts, a)).sort(), [6, 7, 8]);
});

test('a stacked Award with a day If marks only trips that still have such a departure', () => {
  const f = AWARD('pairing-length', 'exact', { value: 3 }, [{ type: 'pairing-dow', params: { dows: [1] } }]);
  const sb = load([f]);
  const trips = TRIPS();
  const alive = new Map(trips.map((p) => [p.number, new Set(p.number === '1003' ? [6, 7] : p.starts)]));
  sb.awardRanks(trips, [f], alive);
  assert.deepStrictEqual(trips.filter((p) => p._awardLine).map((p) => p.number), ['1004']);
});
