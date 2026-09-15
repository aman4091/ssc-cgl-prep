// CA Revision scheduler ke tests — interval ki chhat wahi jagah hai jahan
// galti chupke se hoti hai, isliye use har din ke liye jaancha jata hai.
//   node scripts/test-ca-srs.mjs
// lib/carevision/srs.js ek ESM .js hai aur package.json "type" nahi batata,
// isliye test-sync.mjs ki tarah use temp .mjs mein copy karke import karte hain.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../lib/carevision/srs.js", import.meta.url), "utf8");
const tmp = join(mkdtempSync(join(tmpdir(), "casrs-")), "srs.mjs");
writeFileSync(tmp, src);
const { review, intervalCap, daysUntil, addDays, isDue, EXAM_DAY } = await import(pathToFileURL(tmp).href);

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; } catch (e) { console.error("FAIL", name, "\n ", e.message); process.exitCode = 1; }
}

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
  // Pakka card jo roz sahi aata hai: 4 din baaki hone ke baad har din aata hai.
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

console.log(`${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
