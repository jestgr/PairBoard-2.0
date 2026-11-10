'use strict';

// PB.reserve — the Reserve module's own state and functions, by name (used by the Android app).
// Runs the Reserve module straight out of index.html with a stand-in PB (no browser), then checks
// the doorway is there and that the Structure numbers are the ones in the proration tables.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// The module is one (function() { … })(); between these two banner comments.
function reserveModuleSource() {
  const start = html.indexOf('// RESERVE MODULE — 4 tabs');
  const end = html.indexOf('// PDF / BID PACKAGE VIEWER MODULE');
  assert.ok(start > 0 && end > start, 'Reserve module banners found in index.html');
  const from = html.indexOf('(function() {', start);
  const to = html.lastIndexOf('})();', end) + '})();'.length;
  return html.slice(from, to);
}

// Fresh copy of the module each time: its absence-day inputs are module state.
function loadReserve(appState) {
  const registered = [];
  const sandbox = {
    PB: {
      modules: { register: (m) => registered.push(m) },
      storage: { get: (k, fallback) => fallback, set: () => {} },
    },
    document: { getElementById: () => null },
    console,
  };
  sandbox.window = sandbox;
  sandbox._appStateRef = appState || {};
  vm.runInNewContext(reserveModuleSource(), sandbox, { filename: 'index.html#reserve' });
  return { reserve: sandbox.PB.reserve, registered };
}

// Objects made inside the module's sandbox have that sandbox's prototypes; copy before comparing.
const plain = (x) => JSON.parse(JSON.stringify(x));

const DEC = { bidPeriodStart: '2026-12-01', bidPeriodEnd: '2026-12-31', bidPeriodDays: 31 };
const NOV = { bidPeriodStart: '2026-11-01', bidPeriodEnd: '2026-11-30', bidPeriodDays: 30 };

test('PB.reserve exposes the module state and functions', () => {
  const { reserve, registered } = loadReserve();
  assert.deepStrictEqual(registered.map((m) => m.id), ['reserve']);
  assert.ok(reserve, 'PB.reserve is set');
  for (const name of ['bidPeriodDays', 'buildDayList', 'parseResRule', 'validateReserveRules',
    'deriveGuaranteeFromALV', 'calcReserveStructure', 'renderCategoryCard', 'renderStructure',
    'renderStructureBody', 'renderSim', 'renderPayTab', 'calcPayTab', 'renderRawTab', 'calcRawTab']) {
    assert.strictEqual(typeof reserve[name], 'function', name);
  }
  assert.deepStrictEqual(Object.keys(reserve.state.inputs), ['vac', 'cq', 'qual', 'alp', 'leave', 'other']);
  assert.deepStrictEqual(Object.keys(reserve.state.days), ['xday', 'vac', 'cq', 'qual', 'alp', 'leave', 'other']);
  assert.deepStrictEqual(plain(reserve.dayTypes.map((t) => t.k)), ['xday', 'vac', 'cq', 'qual', 'alp', 'leave', 'other']);
});

test('Structure: 30-day period, guarantee under 75:00, no absences', () => {
  const { reserve } = loadReserve();
  const c = reserve.calcReserveStructure(Object.assign({ resGuarantee: '72:33' }, NOV));
  assert.strictEqual(c.prorationCol, 0);          // 30-day / 72
  assert.strictEqual(c.xdays, 13);                // table row 30, column 0
  assert.strictEqual(c.onCallDays, 17);           // 30 − 13
  assert.strictEqual(c.shortCallDays, 6);
  assert.strictEqual(c.source, 'pwa');
  assert.strictEqual(reserve.state.calc, c);      // same object the X-Day Sim reads
});

test('Structure: 31-day period, guarantee 75:00 or more, extra X-day', () => {
  const { reserve } = loadReserve();
  const base = Object.assign({ resGuarantee: '76:00' }, DEC);
  const c = reserve.calcReserveStructure(base);
  assert.deepStrictEqual([c.prorationCol, c.xdays, c.onCallDays, c.shortCallDays], [3, 13, 18, 6]);
  const extra = reserve.calcReserveStructure(Object.assign({ extraXDay: true }, base));
  assert.deepStrictEqual([extra.xdays, extra.onCallDays], [14, 17]);
});

test('Structure: vacation days shorten the period used for proration', () => {
  const { reserve } = loadReserve();
  reserve.state.inputs.vac = 7;
  const c = reserve.calcReserveStructure(Object.assign({ resGuarantee: '74:30' }, DEC));
  assert.strictEqual(c.daysFor12M, 24);           // 31 − 7
  assert.deepStrictEqual([c.prorationCol, c.xdays, c.onCallDays, c.shortCallDays], [1, 11, 13, 5]);
  assert.strictEqual(c.allow.vac, 7);
});

test('Structure: needs a guarantee', () => {
  const { reserve } = loadReserve();
  assert.strictEqual(reserve.calcReserveStructure(Object.assign({}, DEC)), null);
});

test('helpers: rule parsing, guarantee from ALV, bid period length, day list', () => {
  const { reserve } = loadReserve();
  assert.deepStrictEqual(plain(reserve.parseResRule('3-99-5')), { minWorkRow: 3, maxWork: 99, maxXBlocks: 5 });
  assert.strictEqual(reserve.parseResRule(''), null);
  assert.strictEqual(reserve.deriveGuaranteeFromALV('76:30'), '74:30');
  assert.strictEqual(reserve.deriveGuaranteeFromALV('73:00'), '72:00');   // never under 72:00
  assert.strictEqual(reserve.bidPeriodDays({ bidPeriodStart: '2026-11-01', bidPeriodEnd: '2026-11-30' }), 30);
  const days = reserve.buildDayList(DEC);
  assert.strictEqual(days.length, 31);
  assert.strictEqual(days[0].key, '2026-12-01');
  assert.strictEqual(days[30].key, '2026-12-31');
});

test('rule check: a one-day work run between X-days breaks "min 3 in a row"', () => {
  const s = Object.assign({ resGuarantee: '74:30', resRule: '3-99-5' }, DEC);
  const { reserve } = loadReserve(s);
  assert.deepStrictEqual(plain(reserve.validateReserveRules(s)), { ok: true, errors: [] });
  reserve.state.days.xday.add('2026-12-05');
  reserve.state.days.xday.add('2026-12-07');
  const v = reserve.validateReserveRules(s);
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.errors.length, 1);
  assert.match(v.errors[0], /^Work run on days 6–6 is 1 day, minimum is 3\./);
});
