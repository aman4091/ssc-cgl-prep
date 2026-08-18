// Sync merge ka regression test — `npm run test:sync`.
//
// Ye tests isliye repo mein hain, scratchpad mein nahi: sync ki galti chupi rehti
// hai (data aaj nahi, do din baad gayab milta hai) aur uska koi UI nahi jisse
// pakda ja sake. Har baar sync ko chhedne se pehle aur baad mein ye chalao.
//
// lib/syncmerge.js ESM hai par package CommonJS hai, isliye node use seedha
// import nahi kar sakta — source ko ek temp .mjs mein copy karke import karte hain.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const src = readFileSync(new URL("../lib/syncmerge.js", import.meta.url), "utf8");
const tmp = join(mkdtempSync(join(tmpdir(), "syncmerge-")), "syncmerge.mjs");
writeFileSync(tmp, src);
const { threeWayMerge, hashMap, diffLocal, mergeValues } = await import(pathToFileURL(tmp).href);

const J = JSON.stringify;
let pass = 0, fail = 0;
function t(name, got, want) {
  if (J(got) === J(want)) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + "\n       got  " + J(got) + "\n       want " + J(want)); }
}
const many = (n) => { const o = {}; for (let i = 0; i < n; i++) o["cgl.k" + i] = J({ v: i }); return o; };

console.log("\n1) ASLI HAADSA: purana device apne aap ko push karta tha aur naya data ud jata tha");
{
  const yday = { "cgl.home.items": J([{ id: "a" }]), "cgl.qstats": J({ x: 1 }) };
  const base = hashMap(yday);                                            // dono ne kal sync kiya tha
  const cloud = { "cgl.home.items": J([{ id: "a" }, { id: "b" }]), "cgl.qstats": J({ x: 1 }) }; // computer ne topic add kiya
  const tablet = { "cgl.home.items": J([{ id: "a" }]), "cgl.qstats": J({ x: 1, y: 2 }) };       // tablet purana + background write
  const r = threeWayMerge(tablet, cloud, base);
  t("computer ka naya topic nahi uda", JSON.parse(r.merged["cgl.home.items"]), [{ id: "a" }, { id: "b" }]);
  t("tablet ka apna naya data bhi bacha", JSON.parse(r.merged["cgl.qstats"]), { x: 1, y: 2 });
  t("tablet par list update hui", JSON.parse(r.writes["cgl.home.items"]), [{ id: "a" }, { id: "b" }]);
  t("kuch delete nahi hua", r.deletes, []);
}

console.log("\n2) Bilkul naya device (base null): dono taraf ka data milna chahiye");
{
  const fresh = { "cgl.settings": J({ theme: "dark" }) };
  const cloud = { "cgl.home.items": J([{ id: "a" }]), "cgl.settings": J({ theme: "light", font: "x" }) };
  const r = threeWayMerge(fresh, cloud, null);
  t("cloud ka data mila", JSON.parse(r.merged["cgl.home.items"]), [{ id: "a" }]);
  t("settings jud gayi (local jeeta)", JSON.parse(r.merged["cgl.settings"]), { theme: "dark", font: "x" });
  t("kuch delete nahi", r.deletes, []);
}

console.log("\n3) Jaan-boojh kar kiya delete phir bhi chalna chahiye");
{
  const base = hashMap({ "cgl.quizzes": J([{ id: "q1" }]), "cgl.x": J(1) });
  const r = threeWayMerge({ "cgl.x": J(1) }, { "cgl.quizzes": J([{ id: "q1" }]), "cgl.x": J(1) }, base);
  t("delete cloud tak gaya", r.merged["cgl.quizzes"], undefined);
}

console.log("\n4) Browser ne local storage saaf kar diya -> delete NAHI, wapas bharo");
{
  const all = many(20);
  const r = threeWayMerge({ "cgl.k0": all["cgl.k0"] }, all, hashMap(all));
  t("wipe pakda gaya", r.wiped, true);
  t("cloud par sab bacha", Object.keys(r.merged).length, 20);
  t("device par 19 wapas aa rahe", Object.keys(r.writes).length, 19);
  t("koi delete nahi", r.deletes, []);
}

console.log("\n5) Cloud row khaali mil gayi -> device khud ko NA mitaye, ulta cloud bhar de");
{
  const all = many(20);
  const r = threeWayMerge(all, {}, hashMap(all));
  t("remote-wipe pakda gaya", r.remoteWiped, true);
  t("local par kuch nahi hata", r.deletes, []);
  t("cloud wapas bhar raha hai", Object.keys(r.merged).length, 20);
}

console.log("\n6) Dono taraf se ek saath sab gayab -> jo bacha hai wo bhi na jaye");
{
  const all = many(20);
  const r = threeWayMerge({ "cgl.k0": all["cgl.k0"] }, {}, hashMap(all));
  t("dono taraf wipe", [r.wiped, r.remoteWiped], [true, true]);
  t("bachi hui key bachi", Object.keys(r.merged), ["cgl.k0"]);
  t("local se kuch nahi hata", r.deletes, []);
}

console.log("\n7) Cloud se sirf ek cheez sach mein delete hui -> wo delete honi chahiye");
{
  const all = many(20);
  const remote = { ...all }; delete remote["cgl.k3"];
  const r = threeWayMerge(all, remote, hashMap(all));
  t("wipe nahi samjha", r.remoteWiped, false);
  t("wahi ek hati", r.deletes, ["cgl.k3"]);
}

console.log("\n8) Dono taraf ek hi list badli -> union, kuch na khoye");
{
  const base = hashMap({ "cgl.feed.entries": J([{ id: "e1", at: "1" }]) });
  const r = threeWayMerge(
    { "cgl.feed.entries": J([{ id: "e1", at: "1" }, { id: "e2", at: "2" }]) },
    { "cgl.feed.entries": J([{ id: "e1", at: "1" }, { id: "e3", at: "3" }]) },
    base
  );
  t("dono nayi entries bachi", JSON.parse(r.merged["cgl.feed.entries"]).map((e) => e.id), ["e1", "e2", "e3"]);
}

console.log("\n9) Ek hi record dono jagah edit -> naya timestamp jeete");
{
  const a = J([{ id: "r1", note: "purana", updatedAt: "2026-08-18T10:00:00Z" }]);
  const b = J([{ id: "r1", note: "naya", updatedAt: "2026-08-18T12:00:00Z" }]);
  t("naya wala jeeta", JSON.parse(mergeValues(a, b))[0].note, "naya");
}

console.log("\n10) Nested object (settings jaisa) -> gehra merge");
{
  const a = J({ ui: { theme: "dark" }, plan: { mon: ["m1"] } });
  const b = J({ ui: { font: "big" }, plan: { mon: ["m2"] }, extra: 1 });
  t("nested jud gaya", JSON.parse(mergeValues(a, b)), { ui: { font: "big", theme: "dark" }, plan: { mon: ["m1", "m2"] }, extra: 1 });
}

console.log("\n11) Kuch nahi badla -> network chhoona hi nahi");
{
  const same = { "cgl.a": J([1, 2]) };
  const r = threeWayMerge(same, same, hashMap(same));
  t("remote ko bhejne ko kuch nahi", r.remoteDiffers, false);
  t("local par likhne ko kuch nahi", r.changedLocally, false);
}

console.log("\n12) Manual buttons (prefer local/remote) kabhi delete na karein");
{
  const local = { "cgl.a": J(1), "cgl.onlyLocal": J(9) };
  const cloud = { "cgl.a": J(2), "cgl.onlyCloud": J(8) };
  const rl = threeWayMerge(local, cloud, null, "local");
  const rr = threeWayMerge(local, cloud, null, "remote");
  t("local-prefer: a=local, dono side bache", [rl.merged["cgl.a"], !!rl.merged["cgl.onlyLocal"], !!rl.merged["cgl.onlyCloud"]], ["1", true, true]);
  t("remote-prefer: a=cloud, dono side bache", [rr.merged["cgl.a"], !!rr.merged["cgl.onlyLocal"], !!rr.merged["cgl.onlyCloud"]], ["2", true, true]);
  t("dono mein zero delete", [rl.deletes.length, rr.deletes.length], [0, 0]);
}

console.log("\n13) gktricks / PYQ ke apne question (cgl.userpyq.*) — inhi ke Modern wale question ude the");
{
  // Shape: { [topicId]: [ {question, options, answer, ...} ] } — in questions par
  // koi `id` NAHI hota, isliye union content se hota hai (JSON barabar = ek hi).
  const q = (n) => ({ question: "Q" + n, options: ["a", "b", "c", "d"], answer: 0 });
  const yday = { "cgl.userpyq.questions": J({ modern: [q(1)] }), "cgl.userpyq.topics": J([{ id: "u_1", name: "Modern" }]) };
  const base = hashMap(yday);
  // Computer par kal naye question add hue -> cloud par
  const cloud = { "cgl.userpyq.questions": J({ modern: [q(1), q(2), q(3)] }), "cgl.userpyq.topics": J([{ id: "u_1", name: "Modern" }]) };
  // Dusra device purani copy ke saath, aur usne apna alag topic banaya
  const other = {
    "cgl.userpyq.questions": J({ modern: [q(1)], polity: [q(9)] }),
    "cgl.userpyq.topics": J([{ id: "u_1", name: "Modern" }, { id: "u_2", name: "Polity" }]),
  };
  const r = threeWayMerge(other, cloud, base);
  const merged = JSON.parse(r.merged["cgl.userpyq.questions"]);
  t("Modern ke saare question bache", merged.modern.map((x) => x.question), ["Q1", "Q2", "Q3"]);
  t("dusre device ka apna topic bhi bacha", merged.polity.map((x) => x.question), ["Q9"]);
  t("topics list jud gayi", JSON.parse(r.merged["cgl.userpyq.topics"]).map((x) => x.id), ["u_1", "u_2"]);
  t("kuch delete nahi", r.deletes, []);
}

console.log("\n14) diffLocal sahi batata hai kya likhna/hatana hai");
{
  t("diff", diffLocal({ a: "1", b: "2" }, { a: "1", c: "3" }), { writes: { c: "3" }, deletes: ["b"], changedLocally: true });
}

console.log(`\n${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
