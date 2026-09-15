// CA Revision scheduler + daily plan ke tests — interval ki chhat aur roz ka
// target wahi jagah hain jahan galti chupke se hoti hai.
//   node scripts/test-ca-srs.mjs
// lib/carevision/*.js ESM .js hain aur package.json "type" nahi batata, isliye
// test-sync.mjs ki tarah temp .mjs mein copy karke import karte hain.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const dir = mkdtempSync(join(tmpdir(), "casrs-"));
const copy = (name) => {
  const src = readFileSync(new URL(`../lib/carevision/${name}.js`, import.meta.url), "utf8")
    .replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"');
  writeFileSync(join(dir, `${name}.mjs`), src);
  return pathToFileURL(join(dir, `${name}.mjs`)).href;
};
const { review, intervalCap, daysUntil, addDays, isDue, EXAM_DAY } = await import(copy("srs"));
const { todayPlan, planDays, passOf, sortForStudy, dayState } = await import(copy("plan"));

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; } catch (e) { console.error("FAIL", name, "\n ", e.message); process.exitCode = 1; }
}

// ------------------------------------------------------------------ SRS

test("daysUntil counts calendar days to the exam", () => {
  assert.equal(daysUntil("2026-09-14"), 17);
  assert.equal(daysUntil("2026-09-30"), 1);
  assert.equal(daysUntil(EXAM_DAY), 0);
  assert.equal(daysUntil("2026-10-03"), -2);
});

test("daysUntil ignores DST / month edges", () => {
  assert.equal(daysUntil("2026-08-31", "2026-09-01"), 1);
  assert.equal(daysUntil("2026-02-28", "2026-03-01"), 1);
  assert.equal(addDays("2026-09-30", 1), "2026-10-01");
});

test("cap = max(1, floor(daysLeft / 3))", () => {
  const want = { 17: 5, 16: 5, 15: 5, 14: 4, 9: 3, 6: 2, 5: 1, 4: 1, 3: 1, 2: 1, 1: 1, 0: 1, [-3]: 1 };
  for (const [left, cap] of Object.entries(want)) {
    const today = addDays(EXAM_DAY, -Number(left));
    assert.equal(intervalCap(today), cap, `daysLeft ${left}`);
  }
});

test("a mature card never gets more than the cap", () => {
  const s = { e: 250, i: 30, n: 5, l: 0, d: "2026-09-14", t: "2026-09-01" };
  const r = review(s, true, "2026-09-14");        // SM-2 alone: 75 days
  assert.equal(r.i, 5);
  assert.equal(r.d, "2026-09-19");
});

test("wrong answer resets to 1 day, ease drops, lapse counted", () => {
  const s = { e: 250, i: 5, n: 4, l: 0, d: "2026-09-14", t: "2026-09-09" };
  const r = review(s, false, "2026-09-14");
  assert.equal(r.i, 1);
  assert.equal(r.n, 0);
  assert.equal(r.l, 1);
  assert.equal(r.e, 230);
  assert.equal(r.d, "2026-09-15");
});

test("ease never falls below 1.3", () => {
  let s = null;
  for (let k = 0; k < 20; k++) s = review(s, false, "2026-09-14");
  assert.equal(s.e, 130);
});

test("new card: 1 day, then 6 days (capped by the exam)", () => {
  const a = review(null, true, "2026-08-01");      // 61 days left, cap 20
  assert.equal(a.i, 1);
  const b = review(a, true, "2026-08-02");
  assert.equal(b.i, 6);
  const c = review(null, true, "2026-09-14");
  const d = review(c, true, "2026-09-15");        // 16 days left, cap 5
  assert.equal(d.i, 5);
});

test("no card is ever scheduled after the exam (every day, every history)", () => {
  for (let left = 30; left >= 1; left--) {
    const today = addDays(EXAM_DAY, -left);
    for (const s of [null,
      { e: 250, i: 1, n: 1, l: 0 },
      { e: 300, i: 40, n: 9, l: 0 },
      { e: 130, i: 3, n: 2, l: 4 }]) {
      for (const good of [true, false]) {
        const r = review(s, good, today);
        assert.ok(r.d <= EXAM_DAY, `left ${left} good ${good} -> ${r.d}`);
        assert.ok(r.d > today, "always at least tomorrow");
        assert.ok(r.i >= 1 && r.i <= intervalCap(today));
      }
    }
  }
});

test("as the exam nears the whole deck collapses into daily review", () => {
  let s = { e: 280, i: 20, n: 8, l: 0 };
  let today = "2026-09-20";
  const gaps = [];
  while (daysUntil(today) >= 1) {
    s = review(s, true, today);
    gaps.push([daysUntil(today), s.i]);
    today = s.d;
    if (today === EXAM_DAY) break;
  }
  for (const [left, i] of gaps) if (left <= 5) assert.equal(i, 1, `left ${left}`);
});

test("isDue compares day keys", () => {
  assert.equal(isDue(null, "2026-09-14"), false);
  assert.equal(isDue({ d: "2026-09-14" }, "2026-09-14"), true);
  assert.equal(isDue({ d: "2026-09-15" }, "2026-09-14"), false);
});

// ----------------------------------------------------------------- plan

const deck = (n1, n2) => [
  ...Array.from({ length: n1 }, (_, i) => ({ id: `p1-${i}`, priority: 1, part: "I", section: `S${i % 3}` })),
  ...Array.from({ length: n2 }, (_, i) => ({ id: `p2-${i}`, priority: 2, part: "D", section: "T" })),
];
const START = "2026-09-15";

test("plan runs from day 1 to the day before the exam; passes at 7 / 13", () => {
  const days = planDays(START);
  assert.equal(days.length, 16);
  assert.equal(days[0].key, START);
  assert.equal(days.at(-1).key, "2026-09-30");
  assert.deepEqual([passOf(1), passOf(7), passOf(8), passOf(13), passOf(14), passOf(16)], [1, 1, 2, 2, 3, 3]);
});

test("pass 1 spreads priority-1 over the 7 days", () => {
  const p = todayPlan({ cards: deck(700, 100), srs: {}, stars: {}, log: {}, today: START, start: START });
  assert.equal(p.pass, 1);
  assert.equal(p.newTarget, 100);
  assert.equal(p.fresh.length, 100);
  assert.ok(p.fresh.every((c) => c.priority === 1));
});

test("the target stays put through the day as cards are seen", () => {
  const cards = deck(700, 0);
  const srs = {};
  for (const c of cards.slice(0, 40)) srs[c.id] = { d: "2026-09-16", t: START };
  const p = todayPlan({ cards, srs, stars: {}, log: { [START]: { r: 40, g: 30, nw: 40 } }, today: START, start: START });
  assert.equal(p.newTarget, 100);
  assert.equal(p.newLeft, 60);
});

test("a missed day spreads over the days left in the pass", () => {
  const p = todayPlan({ cards: deck(700, 0), srs: {}, stars: {}, log: {}, today: "2026-09-17", start: START });
  assert.equal(p.dayNo, 3);
  assert.equal(p.newTarget, 140);    // 700 / 5
});

test("pass 2 serves leftover priority-1 before priority-2", () => {
  const p = todayPlan({ cards: deck(10, 60), srs: {}, stars: {}, log: {}, today: "2026-09-22", start: START });
  assert.equal(p.pass, 2);
  assert.equal(p.newTarget, 12);     // 70 / 6
  assert.ok(p.fresh.slice(0, 10).every((c) => c.priority === 1));
});

test("pass 3: no new cards; due + starred only", () => {
  const cards = deck(5, 5);
  const srs = { "p1-0": { d: "2026-09-28", t: "2026-09-27" }, "p1-1": { d: "2026-09-30", t: "2026-09-27" } };
  const stars = { "p1-1": 1, "p2-0": 1 };
  const p = todayPlan({ cards, srs, stars, log: {}, today: "2026-09-28", start: START });
  assert.equal(p.pass, 3);
  assert.equal(p.newTarget, 0);
  assert.deepEqual(p.queue.map((c) => c.id), ["p1-0", "p1-1", "p2-0"]);
});

test("Read locks at 4 days left", () => {
  const at = (today) => todayPlan({ cards: [], srs: {}, stars: {}, log: {}, today, start: START }).readLocked;
  assert.equal(at("2026-09-26"), false);   // 5 left
  assert.equal(at("2026-09-27"), true);    // 4 left
});

test("study order never repeats a section back to back when others remain", () => {
  const q = sortForStudy(deck(9, 0));
  for (let i = 1; i < q.length; i++) assert.notEqual(q[i].section, q[i - 1].section);
});

test("dayState: done only when the new-card target was met", () => {
  assert.equal(dayState(undefined), "empty");
  assert.equal(dayState({ r: 30, nw: 20, tg: 40 }), "partial");
  assert.equal(dayState({ r: 60, nw: 40, tg: 40 }), "done");
});

console.log(`${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
