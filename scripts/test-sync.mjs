// Sync ka regression test — `npm run test:sync`.
//
// Ye tests repo mein isliye hain (scratchpad mein nahi): sync ki galti chupi
// rehti hai — data aaj nahi, do din baad gayab milta hai — aur use pakadne ka
// koi UI nahi. Sync chhedne se PEHLE aur BAAD mein ye chalao.
//
// lib/syncitems.js ESM hai par package CommonJS, isliye source ko ek temp .mjs
// mein copy karke import karte hain.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const src = readFileSync(new URL("../lib/syncitems.js", import.meta.url), "utf8");
const tmp = join(mkdtempSync(join(tmpdir(), "syncitems-")), "syncitems.mjs");
writeFileSync(tmp, src);
const { shred, rebuild, reconcileStore, hashRecords } = await import(pathToFileURL(tmp).href);

const J = JSON.stringify;
let pass = 0, fail = 0;
function t(name, got, want) {
  if (J(got) === J(want)) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + "\n       got  " + J(got) + "\n       want " + J(want)); }
}
// Ek device ki "pichhli sync ki yaad" — jo uske paas tab tha.
const sentOf = (json) => hashRecords(shred(json));
// Cloud ke rows, jaise pullSince() se aate hain.
const rowsOf = (json) => [...shred(json)].map(([item_id, data]) => ({ item_id, data, deleted: false }));

console.log("\n1) ASLI HAADSA — purana device doosre ka naya data uda hi nahi sakta");
{
  // Kal dono ke paas 1 question tha. Aaj computer par 1000 aur add hue.
  const q = (n) => ({ question: "Q" + n, options: ["a", "b", "c", "d"], answer: 0 });
  const yday = J({ modern: [q(0)] });
  const cloudNow = J({ modern: Array.from({ length: 1001 }, (_, i) => q(i)) });

  // Purana device: uske paas ab bhi kal wali copy hai, aur usne apna alag topic banaya.
  const oldLocal = J({ modern: [q(0)], polity: [q(9000)] });
  const r = reconcileStore(oldLocal, sentOf(yday), rowsOf(cloudNow));

  const after = JSON.parse(r.nextJson);
  t("1000 naye question purane device par aa gaye", after.modern.length, 1001);
  t("purane device ka apna topic bhi bacha", after.polity.map((x) => x.question), ["Q9000"]);
  t("purane device ne EK BHI delete nahi bheja", r.toSend.filter((x) => x.deleted).length, 0);
  t("usne sirf apna naya topic bheja", r.toSend.map((x) => x.item_id.split("/")[0]), ["M:polity"]);
}

console.log("\n2) Bilkul naya/khaali device: sab kuch utaarta hai, bhejta kuch nahi");
{
  const cloud = J([{ id: "a", n: 1 }, { id: "b", n: 2 }]);
  const r = reconcileStore(null, {}, rowsOf(cloud));
  t("dono records aa gaye", JSON.parse(r.nextJson).map((x) => x.id), ["a", "b"]);
  t("bhejne ko kuch nahi", r.toSend, []);
}

console.log("\n3) Storage saaf ho gaya (Safari 7-din / clear site data) -> delete NAHI bhejta");
{
  // sent aur data ek hi jagah (IndexedDB) rehte hain, isliye dono saath jaate hain.
  const r = reconcileStore(null, {}, rowsOf(J([{ id: "a" }, { id: "b" }])));
  t("zero delete", r.toSend.filter((x) => x.deleted).length, 0);
  t("data wapas aa gaya", JSON.parse(r.nextJson).length, 2);
}

console.log("\n4) DELETE vs GAYAB — ab ye do alag cheezein hain");
{
  const before = J([{ id: "a" }, { id: "b" }]);
  const after = J([{ id: "a" }]);                       // b ab nahi hai

  // (a) User ne delete dabaya -> bigstore ne likhte waqt khabar darj ki
  const withNews = reconcileStore(after, sentOf(before), [], ["L#b"]);
  t("khabar hai -> delete bheja gaya", withNews.toSend, [{ item_id: "L#b", deleted: true, data: null }]);
  t("koi missing nahi", withNews.missing, []);

  // (b) Wahi tasveer, par delete hua hi nahi (IDB row kharab / write fail)
  const noNews = reconcileStore(after, sentOf(before), [], []);
  t("khabar nahi -> EK BHI delete nahi bheja", noNews.toSend, []);
  t("balki 'missing' bata diya", noNews.missing, ["L#b"]);
}

console.log("\n5) Delete cloud se aaya -> local par bhi lagta hai");
{
  const both = J([{ id: "a" }, { id: "b" }]);
  const r = reconcileStore(both, sentOf(both), [{ item_id: "L#b", deleted: true, data: null }]);
  t("b hat gaya", JSON.parse(r.nextJson).map((x) => x.id), ["a"]);
  t("bhejne ko kuch nahi", r.toSend, []);
}

console.log("\n6) Jis record ko HUMNE badla, uspar hamari chalti hai (aur wo push hota hai)");
{
  const base = J([{ id: "a", n: 1 }]);
  const mine = J([{ id: "a", n: 99 }]);                 // humne badla
  const theirs = [{ item_id: "L#a", data: { id: "a", n: 5 }, deleted: false }];
  const r = reconcileStore(mine, sentOf(base), theirs);
  t("hamara wala raha", JSON.parse(r.nextJson)[0].n, 99);
  t("aur wahi bheja gaya", r.toSend.map((x) => x.data.n), [99]);
}

console.log("\n7) Do device, ek hi store, ALAG records -> dono bachte hain");
{
  const base = J([{ id: "a" }]);
  const mine = J([{ id: "a" }, { id: "mine" }]);
  const r = reconcileStore(mine, sentOf(base), [{ item_id: "L#theirs", data: { id: "theirs" }, deleted: false }]);
  t("dono naye records saath", JSON.parse(r.nextJson).map((x) => x.id), ["a", "mine", "theirs"]);
  t("sirf apna wala bheja", r.toSend.map((x) => x.item_id), ["L#mine"]);
}

console.log("\n8) shred/rebuild: har shakl wapas wahi banni chahiye");
{
  const cases = {
    "id wali list": J([{ id: "x", v: 1 }, { id: "y", v: 2 }]),
    "bina id ki list": J([3, "a", { z: 1 }]),
    "map": J({ a: 1, b: "two" }),
    "map ke andar list": J({ modern: [{ id: "q1" }, { id: "q2" }], polity: [] }),

    "scalar": J(42),
  };
  for (const [name, json] of Object.entries(cases)) {
    const back = rebuild(shred(json));
    t(name, back === null ? null : JSON.parse(back), JSON.parse(json));
  }
  // Khaali container records se banta hi nahi (records se pata nahi chalta ki
  // wo [] tha ya {}), isliye reconcile use chhedta nahi — churn nahi hota.
  const r = reconcileStore(J([]), {}, []);
  t("khaali list waise hi rehti hai", [r.nextJson, r.changed], ["[]", false]);
}

console.log("\n9) gktricks/PYQ ki asli shakl — question par id nahi hoti");
{
  const q = (n) => ({ question: "Q" + n, options: ["a", "b"], answer: 0 });
  const json = J({ modern: [q(1), q(2)] });
  const recs = shred(json);
  t("har question apna record", recs.size, 2);
  t("record id mein topic bhi hai", [...recs.keys()].every((k) => k.startsWith("M:modern/L~")), true);
  t("wapas wahi bana", JSON.parse(rebuild(recs)), JSON.parse(json));
}

console.log("\n10) Poora store gayab — khabar ke bina cloud par kuch nahi hota");
{
  const before = J([{ id: "a" }, { id: "b" }]);
  const idsOf = (json) => [...shred(json).keys()];
  const r = reconcileStore(null, sentOf(before), [], []);
  t("cloud ko kuch nahi bheja", r.toSend, []);
  t("dono missing bataye", r.missing.sort(), ["L#a", "L#b"]);
  // Khud clear kiya ho to khabar hoti hai, aur tab delete jata hai.
  const cleared = reconcileStore(null, sentOf(before), [], idsOf(before));
  t("khabar ho to dono delete gaye", cleared.toSend.map((x) => x.item_id).sort(), ["L#a", "L#b"]);
}

console.log("\n11) Kuch nahi badla -> na likhna, na bhejna");
{
  const json = J([{ id: "a" }, { id: "b" }]);
  const r = reconcileStore(json, sentOf(json), []);
  t("local same", r.changed, false);
  t("bhejne ko kuch nahi", r.toSend, []);
}

console.log("\n12) CHOKE POINT: storeSet khud delete ki khabar darj karta hai");
{
  // bigstore browser ka code hai — ek chhota localStorage stub kaafi hai.
  const mem = new Map();
  globalThis.window = globalThis;
  globalThis.localStorage = {
    get length() { return mem.size; },
    key: (i) => [...mem.keys()][i] ?? null,
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
  const bsrc = readFileSync(new URL("../lib/bigstore.js", import.meta.url), "utf8")
    .replace('from "./syncitems"', `from ${J(pathToFileURL(tmp).href)}`);
  const btmp = join(mkdtempSync(join(tmpdir(), "bigstore-")), "bigstore.mjs");
  writeFileSync(btmp, bsrc);
  const bs = await import(pathToFileURL(btmp).href);

  const K = "cgl.userpyq.topics";
  bs.storeSet(K, J([{ id: "a" }, { id: "b" }, { id: "c" }]));
  t("naya store likhne par koi tombstone nahi", bs.getTombstones()[K], undefined);

  bs.storeSet(K, J([{ id: "a" }, { id: "c" }]));               // user ne b hataya
  t("hataye gaye record ki khabar darj hui", bs.getTombstones()[K], ["L#b"]);

  bs.storeSet(K, J([{ id: "a" }, { id: "c" }, { id: "d" }]));  // naya add
  t("add karne se khabar nahi badli", bs.getTombstones()[K], ["L#b"]);

  // Sync jab cloud se aaya delete local par lagata hai to khabar darj NAHI honi
  // chahiye — warna wo delete apna hi tombstone bana kar hamesha ghoomta rahega.
  bs.setTombstoneCapture(false);
  bs.storeSet(K, J([{ id: "a" }, { id: "d" }]));
  bs.setTombstoneCapture(true);
  t("sync ke apne write se khabar nahi bani", bs.getTombstones()[K], ["L#b"]);

  bs.clearTombstones({ [K]: ["L#b"] });                        // push ho gaya
  t("bhejne ke baad khabar hat gayi", bs.getTombstones()[K], undefined);
}

console.log("\n13) RELOAD LOOP se bachao: bina naye rows ke sync kuch likhe hi na");
{
  // Agar koi store har sync par "badla hua" dikhne lage, to SyncManager har baar
  // page reload karta hai aur app haath hi nahi aati. Ek baar aisa ho chuka hai
  // (settings ke sync fields ki wajah se), isliye har shakl ka round-trip yahan
  // pinned hai: local == sent, koi row nahi -> changed false, toSend khaali.
  const shapes = {
    "settings jaisa object": J({ theme: "dark", model: "x", nested: { a: 1 } }),
    "quizzes jaisi list": J([{ id: "q1", title: "A" }, { id: "q2", title: "B" }]),
    "questions ka map": J({ modern: [{ question: "Q1" }, { question: "Q2" }], polity: [] }),
    "ids ki list": J(["a", "b", "c"]),
    "counter jaisa map": J({ day: "2026-08-18", math: 12, gs: 3 }),
    "khaali map": J({}),
    "khaali list": J([]),
  };
  for (const [name, json] of Object.entries(shapes)) {
    const r = reconcileStore(json, sentOf(json), [], []);
    t(name, [r.changed, r.toSend.length], [false, 0]);
  }
}

console.log("\n14) Ek jaisi do entries — na girein, na har sync par 'badla hua' dikhein");
{
  // Asli shakl: cgl.qtime jaisa { qkey: [12, 15, 12] }. Dono 12 ka content ek
  // hi hai. Pehle dono ka record id bhi ek hi banta tha, to ek entry har sync
  // par GIR jati thi — aur store hamesha "badla hua" dikhta, jisse page baar-baar
  // reload hota tha.
  const dup = J({ q1: [12, 15, 12], q2: [7, 7, 7] });
  t("saari entries records banin", shred(dup).size, 6);
  t("wapas jodne par wahi list", JSON.parse(rebuild(shred(dup))), JSON.parse(dup));
  const r = reconcileStore(dup, sentOf(dup), [], []);
  t("aur sync ko kuch likhna hi nahi", [r.changed, r.toSend.length], [false, 0]);

  const dupList = J([{ id: "a" }, { id: "a" }, "x", "x"]);
  t("list mein bhi dohraav bachta hai", JSON.parse(rebuild(shred(dupList))), JSON.parse(dupList));
}

console.log("\n15) COUNTER — do device ek doosre ki ginti na mitayein");
{
  const today = "2026-08-31";

  // ── Purana roop: poora counter EK dabba tha ────────────────────────────
  // Laptop par reasoning ke 50 ho chuke. Phone pehli baar sync kar raha hai —
  // uske paas is store ki koi yaad nahi, isliye uska apna khaali counter
  // "maine badla hai" gina jata hai aur laptop ka kiya hua uda deta hai.
  const oldA = J({ day: today, counts: { reasoning: 50, math: 0 }, ids: {}, history: {} });
  const oldB = J({ day: today, counts: { reasoning: 0, math: 0 }, ids: {}, history: {} });
  const rOld = reconcileStore(oldB, {}, rowsOf(oldA), []);
  t("purane roop mein phone laptop ki 50 uda deta tha",
    JSON.parse(rOld.nextJson).counts.reasoning, 0);

  // ── Naya roop: har device ka apna khaana ───────────────────────────────
  // Ab byDev ek LIST hai, to sync har device ka alag record banata hai. Phone
  // sirf APNA record chhoota hai — laptop wale ko haath hi nahi laga sakta.
  const dev = (id, reasoning) =>
    ({ id, day: today, counts: { reasoning, math: 0 }, ids: {}, history: {} });
  const newA = J({ v: 2, byDev: [dev("A", 50)] });
  const newB = J({ v: 2, byDev: [dev("B", 0)] });
  const rNew = reconcileStore(newB, {}, rowsOf(newA), []);
  const byDev = JSON.parse(rNew.nextJson).byDev;

  t("dono device ke khaane bache", byDev.length, 2);
  t("aaj ka jod 50 hai (kuch gaya nahi)",
    byDev.filter((e) => e.day === today).reduce((n, e) => n + e.counts.reasoning, 0), 50);
  t("phone sirf apna khaana bhejta hai",
    rNew.toSend.map((x) => x.item_id).filter((k) => k.startsWith("M:byDev")), ["M:byDev/L#B"]);

  // Ab phone par bhi 20 ho gaye — laptop ke 50 phir bhi salamat, jod 70.
  const newB2 = J({ v: 2, byDev: [dev("B", 20), dev("A", 50)] });
  const r2 = reconcileStore(newB2, sentOf(rNew.nextJson), [], []);
  const byDev2 = JSON.parse(r2.nextJson).byDev;
  t("phone par 20 karne ke baad jod 70",
    byDev2.reduce((n, e) => n + e.counts.reasoning, 0), 70);
  t("aur push mein sirf phone ka khaana",
    r2.toSend.map((x) => x.item_id), ["M:byDev/L#B"]);
}

console.log(`\n${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
