// 📄 Mock marks ki poori report, sirf TEXT mein.
//
// Graph & Report (components/MockReport) screen ke liye hai. Ye wahi aankde
// ek .txt mein likhta hai: file mein rakh sakte ho, kisi ko bhej sakte ho, ya
// print kar sakte ho. Har mock ki line, har category ka nichod, section-wise
// tulna aur mistake-book ke chapter-wise counts.
//
// Jaan-boojh kar is file mein KOI import nahi hai. Ye ek saaf function hai
// (data andar, string bahar), isliye browser mein /mock-marks ka button bhi
// ise chalata hai aur Node mein ek baar ki file banane wala script bhi. Marking
// ki values lib/mockmarks.js wali hi hain (+2 / −0.5).

const PER_CORRECT = 2;
const PER_WRONG = 0.5;

const CATS = [
  { key: "full", label: "FULL MOCK" },
  { key: "reasoning", label: "REASONING" },
  { key: "maths", label: "MATHS (Quant)" },
  { key: "english", label: "ENGLISH" },
  { key: "gk", label: "GK / GS" },
];
const SUBJECT_WORD = { reasoning: /reason/i, maths: /quant|math/i, english: /english/i, gk: /\bgs\b|general awareness|gk/i };

const n0 = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const r1 = (x) => Math.round(x * 10) / 10;
const fmt = (x) => (x == null || !Number.isFinite(x) ? "-" : String(r1(x)));
const signed = (x) => (x > 0 ? "+" : "") + fmt(x);
const pad = (s, w) => { s = String(s); return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length); };
const padL = (s, w) => { s = String(s); return s.length >= w ? s : " ".repeat(w - s.length) + s; };
const line = (ch = "-", w = 96) => ch.repeat(w);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? `${m[3]} ${MONTHS[+m[2] - 1]}` : d || "-"; };

function percentile(rank, outOf) {
  const r = Number(rank), n = Number(outOf);
  if (!Number.isFinite(r) || !Number.isFinite(n) || r < 1 || n < 1 || r > n) return null;
  return Math.round(((n - r) / n) * 10000) / 100;
}

// "SSC CGL 2025 - English (Held On: 14th_September_2025_Shift_3)" -> "English · 14 Sep 2025 S3"
export function shortMockName(name) {
  let s = String(name || "Mock").replace(/^TB[:\s]+/i, "").replace(/^SSC CGL 2025\s*-\s*/i, "");
  s = s.replace(/\(Held On:\s*(\d+)\w*_([A-Za-z]+)_(\d{4})_Shift_(\d)\)/i, (_, d, mon, y, sh) => `· ${d} ${mon.slice(0, 3)} ${y} S${sh}`);
  return s.replace(/\s+/g, " ").trim();
}

function secStats(s) {
  const correct = n0(s.correct), wrong = n0(s.wrong);
  const total = Math.max(n0(s.total), correct + wrong);
  const attempted = correct + wrong;
  return {
    name: s.name || "Section", correct, wrong, total, attempted,
    un: Math.max(0, total - attempted),
    score: correct * PER_CORRECT - wrong * PER_WRONG,
    acc: attempted ? (correct / attempted) * 100 : null,
    time: n0(s.timeMin),
  };
}

function rowOf(m) {
  const secs = (m.sections || []).map(secStats);
  const t = secs.reduce((a, s) => ({
    correct: a.correct + s.correct, wrong: a.wrong + s.wrong, total: a.total + s.total,
    attempted: a.attempted + s.attempted, un: a.un + s.un, score: a.score + s.score, time: a.time + s.time,
  }), { correct: 0, wrong: 0, total: 0, attempted: 0, un: 0, score: 0, time: 0 });
  return {
    ...t, secs, id: m.id, name: m.name, short: shortMockName(m.name), cat: m.cat || "full", date: m.date || "",
    max: t.total * PER_CORRECT, acc: t.attempted ? (t.correct / t.attempted) * 100 : null,
    rank: m.rank || null, outOf: m.outOf || null, pc: percentile(m.rank, m.outOf),
  };
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
function slopeOf(ys) {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2, my = avg(ys);
  let a = 0, b = 0;
  ys.forEach((y, i) => { a += (i - mx) * (y - my); b += (i - mx) ** 2; });
  return b ? a / b : 0;
}

function catBlock(label, rows) {
  const out = [];
  out.push("", line("="), `  ${label}  —  ${rows.length} mock${rows.length === 1 ? "" : "s"}`, line("="));
  if (!rows.length) { out.push("  (koi record nahi)"); return out; }

  out.push(
    "  " + pad("#", 3) + pad("Date", 8) + pad("Mock", 40) + padL("C", 4) + padL("W", 4) + padL("U", 4) +
    padL("Score", 8) + padL("Acc%", 6) + padL("Min", 5) + padL("Rank / Kul", 16) + padL("%ile", 7),
    "  " + line("-", 101),
  );
  rows.forEach((r, i) => {
    out.push(
      "  " + pad(i + 1, 3) + pad(shortDate(r.date), 8) + pad(r.short, 40) +
      padL(r.correct, 4) + padL(r.wrong, 4) + padL(r.un, 4) +
      padL(`${fmt(r.score)}/${r.max}`, 8) + padL(r.acc == null ? "-" : Math.round(r.acc), 6) + padL(r.time || "-", 5) +
      padL(r.rank && r.outOf ? `${r.rank} / ${r.outOf}` : "-", 16) + padL(r.pc == null ? "-" : fmt(r.pc), 7),
    );
  });

  // Full mock ke andar section-wise line bhi.
  if (rows.some((r) => r.secs.length > 1)) {
    out.push("", "  Section-wise:");
    rows.forEach((r) => {
      out.push(`   ${shortDate(r.date)} · ${r.short}`);
      r.secs.forEach((s) => {
        out.push(`      ${pad(s.name, 34)} ${padL(s.correct, 3)} C  ${padL(s.wrong, 3)} W  ${padL(s.un, 3)} U   score ${padL(fmt(s.score), 5)}/${s.total * PER_CORRECT}   acc ${s.acc == null ? "-" : Math.round(s.acc)}%`);
      });
    });
  }

  const scores = rows.map((r) => r.score);
  const n = rows.length;
  const bestI = scores.indexOf(Math.max(...scores));
  const worstI = scores.indexOf(Math.min(...scores));
  const last5 = rows.slice(-5), prev5 = rows.slice(-10, -5);
  const d5 = prev5.length ? avg(last5.map((r) => r.score)) - avg(prev5.map((r) => r.score)) : null;
  const att = rows.reduce((a, r) => a + r.attempted, 0);
  const cor = rows.reduce((a, r) => a + r.correct, 0);
  const lost = rows.reduce((a, r) => a + r.wrong, 0) * PER_WRONG;
  const pcs = rows.filter((r) => r.pc != null);
  const maxes = [...new Set(rows.map((r) => r.max))];
  const of = maxes.length === 1 ? ` / ${maxes[0]}` : "";

  out.push("", "  Nichod:");
  out.push(`   • Avg score: ${fmt(avg(scores))}${of}   ·   Best: ${fmt(scores[bestI])} (${rows[bestI].short}, ${shortDate(rows[bestI].date)})   ·   Sabse kam: ${fmt(scores[worstI])} (${shortDate(rows[worstI].date)})`);
  if (d5 != null) out.push(`   • Aakhri ${last5.length} ka avg ${fmt(avg(last5.map((r) => r.score)))}  vs  usse pehle ke ${prev5.length} ka ${fmt(avg(prev5.map((r) => r.score)))}  →  ${signed(d5)}`);
  if (n >= 3) out.push(`   • Trend: har mock par ~${signed(slopeOf(scores))} marks`);
  out.push(`   • Attempt avg: ${fmt(att / n)} / ${fmt(avg(rows.map((r) => r.total)))}   ·   Chhode avg: ${fmt(avg(rows.map((r) => r.un)))}`);
  out.push(`   • Accuracy: ${att ? fmt((cor / att) * 100) : "-"}%  (${cor}/${att} sahi)   ·   Negative se kate: −${fmt(lost)} (har mock ~${fmt(lost / n)})`);
  if (pcs.length) {
    const bp = pcs.reduce((a, b) => (a.pc >= b.pc ? a : b));
    out.push(`   • Avg percentile: ${fmt(avg(pcs.map((r) => r.pc)))}  (${pcs.length} mock mein rank)   ·   Best: ${fmt(bp.pc)} (rank ${bp.rank}/${bp.outOf})`);
  }
  return out;
}

// Automatic observations — sirf aankdon se, andaza nahi.
function diagnosis(byCat) {
  const out = [];
  for (const key of ["maths", "english", "reasoning", "gk"]) {
    const rows = (byCat[key] || []).slice(-6);
    if (!rows.length) continue;
    const att = avg(rows.map((r) => r.attempted));
    const tot = avg(rows.map((r) => r.total));
    const cor = rows.reduce((a, r) => a + r.correct, 0);
    const attT = rows.reduce((a, r) => a + r.attempted, 0);
    const acc = attT ? (cor / attT) * 100 : 0;
    const un = tot - att;
    const label = CATS.find((c) => c.key === key).label;
    let verdict = "theek chal raha hai — maintain karo";
    if (un >= 4 && acc >= 80) verdict = `SPEED / question selection ki dikkat — accuracy ${fmt(acc)}% theek hai par ~${fmt(un)} sawaal chhoot rahe hain (~${fmt(un * PER_CORRECT)} marks table par)`;
    else if (un < 2 && acc < 82) verdict = `ACCURACY ki dikkat — time kaafi hai (sab attempt), par ${fmt(100 - acc)}% galat; har mock ~${fmt(avg(rows.map((r) => r.wrong)))} galat`;
    else if (acc < 70) verdict = `CONCEPT ki dikkat — accuracy sirf ${fmt(acc)}%`;
    out.push(`   • ${pad(label, 14)} (aakhri ${rows.length}): avg ${fmt(avg(rows.map((r) => r.score)))}, attempt ${fmt(att)}/${fmt(tot)}, acc ${fmt(acc)}%  →  ${verdict}`);
  }
  const counts = CATS.map((c) => `${c.label.split(" ")[0]} ${(byCat[c.key] || []).length}`).join(" · ");
  out.push(`   • Kitne mock diye: ${counts}. Sabse zyada wahi subject practice ho raha hai jo pehle se strong hai to time galat jagah ja raha hai.`);
  return out;
}

export function buildMockTextReport(mocks, opts = {}) {
  const { wrongChapters = null, generatedAt = new Date() } = opts;
  const rows = (mocks || []).map(rowOf)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
  const byCat = {};
  rows.forEach((r) => { (byCat[r.cat] = byCat[r.cat] || []).push(r); });

  const stamp = (() => { try { return generatedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); } catch { return String(generatedAt); } })();
  const out = [
    line("="),
    "  SSC CGL TIER-1 — MOCK MARKS REPORT",
    `  Bana: ${stamp}   ·   Kul records: ${rows.length}   ·   Marking: +${PER_CORRECT} sahi, −${PER_WRONG} galat`,
    "  C = sahi · W = galat · U = chhoda · Score = 2C − 0.5W · %ile = (kul − rank) / kul",
    line("="),
  ];

  // Ek nazar mein — har category ki ek line.
  out.push("", "  EK NAZAR MEIN", "  " + line("-", 94));
  out.push("  " + pad("Category", 16) + padL("Mocks", 6) + padL("Avg", 8) + padL("Best", 8) + padL("Aakhri-5", 10) + padL("Attempt", 9) + padL("Acc%", 7) + padL("Galat/mock", 12) + padL("Avg %ile", 10));
  for (const c of CATS) {
    const rs = byCat[c.key] || [];
    if (!rs.length) { out.push("  " + pad(c.label, 16) + padL(0, 6)); continue; }
    const att = rs.reduce((a, r) => a + r.attempted, 0);
    const cor = rs.reduce((a, r) => a + r.correct, 0);
    const pcs = rs.filter((r) => r.pc != null).map((r) => r.pc);
    out.push("  " + pad(c.label, 16) + padL(rs.length, 6) + padL(fmt(avg(rs.map((r) => r.score))), 8) +
      padL(fmt(Math.max(...rs.map((r) => r.score))), 8) + padL(fmt(avg(rs.slice(-5).map((r) => r.score))), 10) +
      padL(fmt(att / rs.length), 9) + padL(att ? fmt((cor / att) * 100) : "-", 7) +
      padL(fmt(avg(rs.map((r) => r.wrong))), 12) + padL(pcs.length ? fmt(avg(pcs)) : "-", 10));
  }

  // Galat category mein file hua record pakdo (naam kuch, bucket kuch aur).
  const odd = rows.filter((r) => r.cat !== "full" && SUBJECT_WORD[r.cat] &&
    !SUBJECT_WORD[r.cat].test(r.name) && Object.entries(SUBJECT_WORD).some(([k, re]) => k !== r.cat && re.test(r.name)));
  if (odd.length) {
    out.push("", "  ⚠ In record ka naam aur category match nahi karte (galti se galat jagah save?):");
    odd.forEach((r) => out.push(`     - ${shortDate(r.date)} · "${r.short}" → category "${r.cat}"`));
  }

  for (const c of CATS) out.push(...catBlock(c.label, byCat[c.key] || []));

  out.push("", line("="), "  DIAGNOSIS (aankdon se)", line("="), ...diagnosis(byCat));

  if (wrongChapters && typeof wrongChapters === "object") {
    const names = { math: "MATHS", english: "ENGLISH", reasoning: "REASONING", gs: "GS" };
    out.push("", line("="), "  MISTAKE BOOK — chapter-wise galtiyan (practice + mock dono)", line("="));
    for (const [sub, label] of Object.entries(names)) {
      const m = wrongChapters[sub];
      if (!m) continue;
      const total = Object.values(m).reduce((a, b) => a + b, 0);
      const list = Object.entries(m).filter(([k]) => k !== "untagged").sort((a, b) => b[1] - a[1]);
      out.push(`  ${label} — ${total} galtiyan${m.untagged ? ` (${m.untagged} bina chapter tag)` : ""}`);
      for (let i = 0; i < list.length; i += 3) {
        out.push("     " + list.slice(i, i + 3).map(([k, v]) => pad(`${k}: ${v}`, 40)).join("").trimEnd());
      }
    }
  }

  out.push("", line("="), "  (Site par /mock-marks → 📄 Text report se ye report kabhi bhi dobara ban sakti hai.)", "");
  return out.join("\n");
}
