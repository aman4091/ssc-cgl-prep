"use client";

// 📈 Mock Marks ka Graph & Report — ek category (Maths / Reasoning / …) ke
// saare mocks ek jagah: KPI tiles, score / accuracy / percentile ki trend line,
// har mock ka sahi-galat-chhoda, subject-wise tulna aur likhit report.
//
// Charts saade SVG hain (koi library nahi). Rang dataviz validator se jaanche
// hue hain (white card par): line #2a78d6, sahi #1a8a64, galat #d9573a — sahi/
// galat ki CVD doori 6–8 band mein hai, isliye legend + 2px gap + tooltip +
// table saath mein hain; rang akela kuch nahi batata.

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, PER_CORRECT, PER_WRONG, getMocks, mockTotals, percentileOf } from "@/lib/mockmarks";

const r1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => {
  if (v == null || !Number.isFinite(v)) return "–";
  const x = r1(v);
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
};
const signed = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));
const shortDate = (d) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
  catch { return d || ""; }
};
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

// Mock records → chart rows, sabse purana pehle (graph baayein se daayein).
function toRows(mocks) {
  return mocks.slice().reverse().map((m) => {
    const t = mockTotals(m);
    const max = t.total * PER_CORRECT;
    return {
      id: m.id, name: m.name, date: m.date,
      score: t.score, max, pct: max ? (t.score / max) * 100 : null,
      correct: t.correct, wrong: t.wrong, un: Math.max(0, t.total - t.attempted),
      total: t.total, attempted: t.attempted,
      acc: t.attempted ? (t.correct / t.attempted) * 100 : null,
      time: t.timeMin || null, rank: m.rank, outOf: m.outOf,
      pc: percentileOf(m.rank, m.outOf), sections: t.sections,
    };
  });
}

const RANGES = [
  { key: "all", label: "Sab" },
  { key: "30d", label: "Pichhle 30 din" },
  { key: "10", label: "Last 10" },
  { key: "5", label: "Last 5" },
];
function applyRange(rows, key) {
  if (key === "10") return rows.slice(-10);
  if (key === "5") return rows.slice(-5);
  if (key === "30d") {
    const cut = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    return rows.filter((r) => (r.date || "") >= cut);
  }
  return rows;
}

function niceTicks(lo, hi, count = 5) {
  const range = hi - lo || 1;
  const raw = range / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const out = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

// x-axis ki dates — pehli aur aakhri hamesha; beech wali tabhi jab pichhli
// likhi date se alag hon aur kam se kam ~64px door (ek din mein kai mock hon to
// "09 Sept 09 Sept" ek doosre par na chadhe). `edge` = pehli/aakhri label
// kinare se chipki (line chart) ya beech mein (column chart).
function labelIdx(n, X, dateOf, edge) {
  if (!n) return [];
  const HALF = 26, GAP = 64;
  const mid = (i) => (edge && n > 1 && i === 0 ? X(i) + HALF : edge && n > 1 && i === n - 1 ? X(i) - HALF : X(i));
  const out = [0];
  for (let i = 1; i < n; i++) {
    const p = out[out.length - 1];
    if (dateOf(i) === dateOf(p) || mid(i) - mid(p) < GAP) {
      if (i === n - 1 && out.length > 1) out[out.length - 1] = i; // aakhri jeetti hai
      continue;
    }
    out.push(i);
  }
  return out;
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Tooltip pointer ke daayein; card ke daayein kinare ke paas ho to baayein.
const tipStyle = (x, w) => (x > w * 0.6 ? { left: x - 12, transform: "translateX(-100%)" } : { left: x + 12 });

/* ---------------- Line chart (ek series, crosshair + tooltip) ---------------- */

function LineChart({ points, lo, hi, unit = "", refY, refLabel, label }) {
  const [ref, w] = useWidth();
  const [hov, setHov] = useState(null);
  const H = 210, padL = 38, padR = 46, padT = 14, padB = 28;
  const pw = Math.max(10, w - padL - padR), ph = H - padT - padB;
  const n = points.length;
  const ticks = niceTicks(lo, hi);
  const tlo = ticks[0], thi = ticks[ticks.length - 1];
  const X = (i) => padL + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
  const Y = (v) => padT + ph - ((v - tlo) / (thi - tlo || 1)) * ph;
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join("");
  const area = n > 1 ? `${d}L${X(n - 1).toFixed(1)},${padT + ph}L${X(0).toFixed(1)},${padT + ph}Z` : "";
  const xl = labelIdx(n, X, (i) => points[i].date, true);
  const last = n - 1;
  const h = hov != null ? points[hov] : null;

  const move = (e) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const i = n <= 1 ? 0 : Math.round(((x - padL) / pw) * (n - 1));
    setHov(Math.max(0, Math.min(last, i)));
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") setHov((v) => Math.max(0, (v ?? last) - 1));
    else if (e.key === "ArrowRight") setHov((v) => Math.min(last, (v ?? -1) + 1));
    else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className="mr-plot">
      {w > 0 && n > 0 && (
        <svg width={w} height={H} role="img" aria-label={label} tabIndex={0}
          onPointerMove={move} onPointerLeave={() => setHov(null)}
          onFocus={() => setHov(last)} onBlur={() => setHov(null)} onKeyDown={onKey}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + pw} y1={Y(t)} y2={Y(t)} className={t === tlo ? "mr-axisline" : "mr-gridline"} />
              <text x={padL - 7} y={Y(t)} className="mr-tick" textAnchor="end" dominantBaseline="middle">{t}{unit}</text>
            </g>
          ))}
          {refY != null && (
            <g>
              <line x1={padL} x2={padL + pw} y1={Y(refY)} y2={Y(refY)} className="mr-ref" />
              <text x={padL + 4} y={Y(refY) - 5} className="mr-reflabel">{refLabel}</text>
            </g>
          )}
          {area && <path d={area} className="mr-area" />}
          <path d={d} className="mr-line" />
          {xl.map((i) => (
            <text key={i} x={X(i)} y={H - 9} className="mr-tick"
              textAnchor={n > 1 && i === 0 ? "start" : n > 1 && i === last ? "end" : "middle"}>{shortDate(points[i].date)}</text>
          ))}
          {h && <line x1={X(hov)} x2={X(hov)} y1={padT} y2={padT + ph} className="mr-cross" />}
          {h && hov !== last && <circle cx={X(hov)} cy={Y(h.y)} r={4.5} className="mr-dot" />}
          <circle cx={X(last)} cy={Y(points[last].y)} r={4.5} className="mr-dot" />
          <text x={X(last) + 9} y={Y(points[last].y)} className="mr-endlabel" dominantBaseline="middle">{fmt(points[last].y)}{unit}</text>
        </svg>
      )}
      {h && w > 0 && (
        <div className="mr-tip" style={tipStyle(X(hov), w)}>
          <strong>{fmt(h.y)}{unit}{h.of ? <span className="mr-tip__of"> / {h.of}</span> : null}</strong>
          {h.extra && <span className="mr-tip__sub">{h.extra}</span>}
          <span className="mr-tip__sub">{h.name} · {shortDate(h.date)}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Stacked columns: sahi / galat / chhoda ---------------- */

// Column ka upar wala sira 4px gol, neeche (baseline) chaukor.
function colPath(x, y, w, h, round) {
  const r = round ? Math.min(4, h, w / 2) : 0;
  if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const STACK = [
  { key: "correct", label: "Sahi", cls: "mr-ok" },
  { key: "wrong", label: "Galat", cls: "mr-bad" },
  { key: "un", label: "Chhoda", cls: "mr-skip" },
];

function StackChart({ rows }) {
  const [ref, w] = useWidth();
  const [hov, setHov] = useState(null);
  const H = 210, padL = 34, padR = 8, padT = 10, padB = 28, GAP = 2;
  const pw = Math.max(10, w - padL - padR), ph = H - padT - padB;
  const n = rows.length;
  const ticks = niceTicks(0, Math.max(1, ...rows.map((r) => r.total)));
  const thi = ticks[ticks.length - 1];
  const slot = pw / Math.max(1, n);
  const bw = Math.max(3, Math.min(24, slot * 0.62));
  const Y = (v) => padT + ph - (v / thi) * ph;
  const cx = (i) => padL + slot * i + slot / 2;
  const xl = labelIdx(n, cx, (i) => rows[i].date, false);
  const h = hov != null ? rows[hov] : null;

  return (
    <div ref={ref} className="mr-plot">
      {w > 0 && n > 0 && (
        <svg width={w} height={H} role="img" aria-label="Har mock ke sahi, galat aur chhode sawaal">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + pw} y1={Y(t)} y2={Y(t)} className={t === 0 ? "mr-axisline" : "mr-gridline"} />
              <text x={padL - 7} y={Y(t)} className="mr-tick" textAnchor="end" dominantBaseline="middle">{t}</text>
            </g>
          ))}
          {rows.map((r, i) => {
            const segs = STACK.map((s) => ({ ...s, v: r[s.key] })).filter((s) => s.v > 0);
            let acc = 0;
            const x = cx(i) - bw / 2;
            return (
              <g key={r.id} className={"mr-col" + (hov === i ? " is-hov" : "")} tabIndex={0}
                aria-label={`${r.name}: ${r.correct} sahi, ${r.wrong} galat, ${r.un} chhode`}
                onPointerEnter={() => setHov(i)} onPointerLeave={() => setHov(null)}
                onFocus={() => setHov(i)} onBlur={() => setHov(null)}>
                <rect x={padL + slot * i} y={padT} width={slot} height={ph} fill="transparent" />
                {segs.map((s, k) => {
                  const y0 = Y(acc), y1 = Y(acc + s.v);
                  acc += s.v;
                  // neeche wale segment se 2px ki surface-gap
                  const hgt = Math.max(0, y0 - y1 - (k ? GAP : 0));
                  return <path key={s.key} d={colPath(x, y1, bw, hgt, k === segs.length - 1)} className={s.cls} />;
                })}
              </g>
            );
          })}
          {xl.map((i) => (
            <text key={i} x={cx(i)} y={H - 9} className="mr-tick" textAnchor="middle">{shortDate(rows[i].date)}</text>
          ))}
        </svg>
      )}
      {h && w > 0 && (
        <div className="mr-tip" style={tipStyle(cx(hov), w)}>
          <span className="mr-tip__sub mr-tip__name">{h.name} · {shortDate(h.date)}</span>
          {STACK.map((s) => (
            <span key={s.key} className="mr-tip__row"><i className={"mr-key " + s.cls} /><b>{h[s.key]}</b> {s.label}</span>
          ))}
          <span className="mr-tip__sub">Score {fmt(h.score)} / {h.max}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Horizontal bars (tulna) ---------------- */

function HBars({ items }) {
  return (
    <div className="mr-hbars">
      {items.map((it) => {
        const p = Math.max(0, Math.min(100, it.value ?? 0));
        return (
          <div key={it.key} className={"mr-hbar" + (it.on ? " is-on" : "")}>
            <div className="mr-hbar__label">{it.label}{it.sub && <small>{it.sub}</small>}</div>
            <div className="mr-hbar__track">
              <div className="mr-hbar__fill" style={{ width: `calc((100% - 58px) * ${p / 100})` }} />
              <span className="mr-hbar__val">{fmt(it.value)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- KPI tile ---------------- */

function Kpi({ label, value, of, delta, deltaNote, note }) {
  return (
    <div className="mr-kpi">
      <div className="mr-kpi__label">{label}</div>
      <div className="mr-kpi__val">{value}{of && <small>{of}</small>}</div>
      {delta != null && (
        <div className="mr-kpi__delta">
          <b className={delta > 0 ? "up" : delta < 0 ? "down" : ""}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {signed(delta)}</b> {deltaNote}
        </div>
      )}
      {note && <div className="mr-kpi__note">{note}</div>}
    </div>
  );
}

function slopeOf(ys) {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2, my = sum(ys, (y) => y) / n;
  let a = 0, b = 0;
  ys.forEach((y, i) => { a += (i - mx) * (y - my); b += (i - mx) ** 2; });
  return b ? a / b : 0;
}

/* ================================ Report ================================ */

export default function MockReport({ cat, mocks }) {
  const [range, setRange] = useState("all");
  const [showTable, setShowTable] = useState(false);
  const catInfo = CATEGORIES.find((c) => c.key === cat) || CATEGORIES[0];

  const rows = useMemo(() => applyRange(toRows(mocks), range), [mocks, range]);

  // Sab mocks ka ek hi "kitne mein se" ho (jaise 25 sawaal = 50 marks) to
  // asli score dikhao; alag-alag hon to % mein, warna tulna galat hogi.
  const maxes = [...new Set(rows.map((r) => r.max).filter(Boolean))];
  const uniform = maxes.length === 1 ? maxes[0] : null;
  const val = (r) => (uniform ? r.score : r.pct ?? 0);
  const unitS = uniform ? "" : "%";

  // Sirf sectional subjects ki tulna — Full Mock subject nahi, poora paper hai.
  const compare = useMemo(() => CATEGORIES.filter((c) => c.subject).map((c) => {
    const rs = applyRange(toRows(getMocks(c.key)), range);
    const mx = sum(rs, (r) => r.max);
    const att = sum(rs, (r) => r.attempted);
    return {
      key: c.key, on: c.key === cat, label: `${c.icon} ${c.label}`, n: rs.length,
      value: mx ? (sum(rs, (r) => r.score) / mx) * 100 : null,
      acc: att ? (sum(rs, (r) => r.correct) / att) * 100 : null,
    };
  }).filter((c) => c.n > 0), [range, cat, mocks]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionsAgg = useMemo(() => {
    if (cat !== "full") return [];
    const m = new Map();
    rows.forEach((r) => r.sections.forEach((s) => {
      const k = s.name || "Section";
      const a = m.get(k) || { score: 0, max: 0, correct: 0, attempted: 0 };
      a.score += s.score; a.max += s.total * PER_CORRECT; a.correct += s.correct; a.attempted += s.attempted;
      m.set(k, a);
    }));
    return [...m.entries()].map(([k, a]) => ({
      key: k, label: k, value: a.max ? (a.score / a.max) * 100 : null,
      sub: a.attempted ? `acc ${fmt((a.correct / a.attempted) * 100)}%` : "",
    }));
  }, [rows, cat]);

  const rangeBar = (
    <div className="mr-filters" role="group" aria-label="Range">
      {RANGES.map((r) => (
        <button key={r.key} className={"chip chip--btn" + (range === r.key ? " is-active" : "")}
          aria-pressed={range === r.key} onClick={() => setRange(r.key)}>
          {range === r.key ? "✓ " : ""}{r.label}
        </button>
      ))}
    </div>
  );

  if (!rows.length) {
    return (
      <div className="mr-root">
        {rangeBar}
        <div className="placeholder" style={{ marginTop: 12 }}>
          {mocks.length ? "Is range mein koi mock nahi — upar 'Sab' chuno." : `Abhi koi ${catInfo.label} record nahi — graph ke liye pehle marks daalo.`}
        </div>
      </div>
    );
  }

  const n = rows.length;
  const scores = rows.map(val);
  const avg = sum(scores, (x) => x) / n;
  const bestI = scores.indexOf(Math.max(...scores));
  const worstI = scores.indexOf(Math.min(...scores));
  const last5 = rows.slice(-5), prev5 = rows.slice(-10, -5);
  const avgOf = (rs) => sum(rs, val) / rs.length;
  const delta5 = prev5.length ? avgOf(last5) - avgOf(prev5) : null;
  const att = sum(rows, (r) => r.attempted);
  const accAll = att ? (sum(rows, (r) => r.correct) / att) * 100 : null;
  const pcRows = rows.filter((r) => r.pc != null);
  const avgPc = pcRows.length ? sum(pcRows, (r) => r.pc) / pcRows.length : null;
  const timed = rows.filter((r) => r.time);
  const avgTime = timed.length ? sum(timed, (r) => r.time) / timed.length : null;
  const lost = sum(rows, (r) => r.wrong) * PER_WRONG;
  const unAvg = sum(rows, (r) => r.un) / n;
  const totAvg = sum(rows, (r) => r.total) / n;
  const slope = slopeOf(scores);
  const of = uniform ? ` / ${uniform}` : "%";

  const scorePts = rows.map((r) => ({
    y: val(r), of: uniform ? uniform : null, name: r.name, date: r.date,
    extra: `✅ ${r.correct} · ❌ ${r.wrong} · ⭕ ${r.un}`,
  }));
  const sLo = Math.min(0, ...scores);
  const sHi = uniform ? uniform : 100;
  const accRows = rows.filter((r) => r.acc != null);
  const accPts = accRows.map((r) => ({ y: r.acc, name: r.name, date: r.date, extra: `${r.correct}/${r.attempted} sahi` }));
  const accLo = Math.max(0, Math.floor((Math.min(...accRows.map((r) => r.acc)) - 5) / 10) * 10);
  const pcPts = pcRows.map((r) => ({ y: r.pc, name: r.name, date: r.date, extra: `Rank ${r.rank} / ${r.outOf}` }));
  const pcLo = pcRows.length ? Math.max(0, Math.floor((Math.min(...pcRows.map((r) => r.pc)) - 5) / 10) * 10) : 0;

  const weakest = compare.length > 1 ? compare.reduce((a, b) => ((a.value ?? 999) <= (b.value ?? 999) ? a : b)) : null;
  const weakSec = sectionsAgg.length > 1 ? sectionsAgg.reduce((a, b) => ((a.value ?? 999) <= (b.value ?? 999) ? a : b)) : null;

  // ---- likhit report ----
  const notes = [];
  if (n >= 3) {
    const total = slope * (n - 1);
    notes.push(Math.abs(slope) < 0.05
      ? <>➖ Score lagbhag <strong>ek jaisa</strong> chal raha hai — {n} mocks mein koi saaf badhat ya girawat nahi.</>
      : <>{slope > 0 ? "📈" : "📉"} Trend: har mock par ~<strong>{signed(slope)}{unitS}</strong> — pehle se aakhri tak kul ~{fmt(Math.abs(total))}{unitS} {slope > 0 ? "sudhar" : "girawat"}.</>);
  }
  if (delta5 != null) {
    notes.push(<>🔁 Aakhri {last5.length} ka avg <strong>{fmt(avgOf(last5))}{of}</strong>, usse pehle ke {prev5.length} ka {fmt(avgOf(prev5))}{of} → <strong>{signed(delta5)}</strong> {delta5 >= 0 ? "badhat" : "girawat"}.</>);
  }
  notes.push(<>🏆 Sabse achha: <strong>{rows[bestI].name}</strong> — {fmt(scores[bestI])}{of} ({shortDate(rows[bestI].date)}).</>);
  if (n > 1) notes.push(<>🔻 Sabse kam: <strong>{rows[worstI].name}</strong> — {fmt(scores[worstI])}{of} ({shortDate(rows[worstI].date)}).</>);
  if (accAll != null) {
    notes.push(<>🎯 Accuracy <strong>{fmt(accAll)}%</strong> — har 10 attempt mein ~{fmt(10 - accAll / 10)} galat. Galat jawabon se kul <strong>{fmt(lost)} marks</strong> kate (−{PER_WRONG} har galat), yaani har mock mein ~{fmt(lost / n)}.</>);
  }
  if (totAvg) notes.push(<>⭕ Har mock mein ~<strong>{fmt(unAvg)}</strong> sawaal chhode ({fmt((unAvg / totAvg) * 100)}% paper).</>);
  if (avgTime != null) notes.push(<>⏱ Avg time <strong>{fmt(avgTime)} min</strong> per mock ({timed.length} mock{timed.length === 1 ? "" : "s"} mein time bhara hai).</>);
  if (pcRows.length) {
    const bp = pcRows.reduce((a, b) => (a.pc >= b.pc ? a : b));
    notes.push(<>🏅 Avg percentile <strong>{fmt(avgPc)}</strong>; sabse achha {fmt(bp.pc)} ({bp.name}, rank {bp.rank}/{bp.outOf}).</>);
  }
  if (weakest && cat !== "full") {
    notes.push(weakest.key === cat
      ? <>⚠️ Sabhi subjects mein <strong>{catInfo.label}</strong> ka avg sabse kam hai ({fmt(weakest.value)}%) — isi par zyada zor.</>
      : <>📊 Subjects mein sabse kamzor abhi <strong>{weakest.label}</strong> hai ({fmt(weakest.value)}%).</>);
  }
  if (weakSec) notes.push(<>⚠️ Full mocks mein sabse kamzor section: <strong>{weakSec.label}</strong> ({fmt(weakSec.value)}%).</>);

  return (
    <div className="mr-root">
      {rangeBar}

      <div className="mr-kpis mt-12">
        <Kpi label="Mocks" value={n} note={n > 1 ? `${shortDate(rows[0].date)} – ${shortDate(rows[n - 1].date)}` : shortDate(rows[0].date)} />
        <Kpi label="Avg score" value={fmt(avg)} of={of} note={uniform ? `${fmt((avg / uniform) * 100)}% marks` : null} />
        <Kpi label="Best" value={fmt(scores[bestI])} of={of} note={rows[bestI].name} />
        <Kpi label={`Aakhri ${last5.length} ka avg`} value={fmt(avgOf(last5))} of={of}
          delta={delta5 != null ? r1(delta5) : null} deltaNote={`vs pehle ke ${prev5.length}`} />
        {accAll != null && <Kpi label="Accuracy" value={`${fmt(accAll)}%`} note={`${sum(rows, (r) => r.correct)} / ${att} sahi`} />}
        {avgPc != null && <Kpi label="Avg percentile" value={fmt(avgPc)} note={`${pcRows.length} mock${pcRows.length === 1 ? "" : "s"} mein rank`} />}
        <Kpi label="Negative se kate" value={`−${fmt(lost)}`} note={`~${fmt(lost / n)} har mock`} />
        {avgTime != null && <Kpi label="Avg time" value={fmt(avgTime)} of=" min" />}
      </div>

      <div className="glass-card mt-12">
        <h3 className="mr-h">Score ka graph</h3>
        <p className="mr-sub">{uniform ? `${uniform} marks mein se` : "Kul marks ka %"} · +{PER_CORRECT} sahi, −{PER_WRONG} galat · line avg {fmt(avg)}{unitS} dikhati hai</p>
        <LineChart points={scorePts} lo={sLo} hi={sHi} unit={unitS} refY={n > 1 ? avg : null}
          refLabel={`avg ${fmt(avg)}${unitS}`} label={`${catInfo.label} score har mock mein`} />
      </div>

      <div className="mr-charts mt-12">
        {accPts.length > 0 && (
          <div className="glass-card">
            <h3 className="mr-h">Accuracy</h3>
            <p className="mr-sub">Attempt kiye sawaalon mein se sahi — %</p>
            <LineChart points={accPts} lo={accLo} hi={100} unit="%" label="Accuracy har mock mein" />
          </div>
        )}
        {pcPts.length > 0 && (
          <div className="glass-card">
            <h3 className="mr-h">Percentile</h3>
            <p className="mr-sub">Sirf wo mocks jinka rank / kitne mein se bhara hai</p>
            <LineChart points={pcPts} lo={pcLo} hi={100} label="Percentile har mock mein" />
          </div>
        )}
      </div>

      <div className="glass-card mt-12">
        <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
          <div>
            <h3 className="mr-h">Sahi · Galat · Chhoda</h3>
            <p className="mr-sub">Har mock ke sawaal — column par hover / tap karo</p>
          </div>
          <div className="mr-legend">
            {STACK.map((s) => <span key={s.key}><i className={"mr-swatch " + s.cls} />{s.label}</span>)}
          </div>
        </div>
        <StackChart rows={rows} />
      </div>

      <div className="mr-charts mt-12">
        {compare.length > 1 && (
          <div className="glass-card">
            <h3 className="mr-h">Subject-wise tulna</h3>
            <p className="mr-sub">Har sectional subject ka avg score, kul marks ke % mein</p>
            <HBars items={compare.map((c) => ({ ...c, sub: `${c.n} mock${c.n === 1 ? "" : "s"} · acc ${fmt(c.acc)}%` }))} />
          </div>
        )}
        {sectionsAgg.length > 0 && (
          <div className="glass-card">
            <h3 className="mr-h">Section-wise (Full mock)</h3>
            <p className="mr-sub">Har section ka avg score, us section ke marks ke % mein</p>
            <HBars items={sectionsAgg.map((s) => ({ ...s, on: true }))} />
          </div>
        )}
      </div>

      <div className="glass-card mt-12">
        <h3 className="mr-h">📝 Report</h3>
        <ul className="mr-notes">
          {notes.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>

      <div className="mt-12">
        <button className="btn btn--ghost btn--sm" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
          {showTable ? "✕ Table chhupao" : "📋 Table mein dekho"}
        </button>
        {showTable && (
          <div className="glass-card mt-8" style={{ overflowX: "auto" }}>
            <table className="mm-table mr-table">
              <thead>
                <tr>
                  <th>Mock</th><th>Date</th><th>Score</th><th>Sahi</th><th>Galat</th><th>Chhoda</th>
                  <th>Acc%</th><th>Time</th><th>Rank</th><th>%ile</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td><td>{shortDate(r.date)}</td>
                    <td className="mm-derived">{fmt(r.score)} / {r.max}</td>
                    <td>{r.correct}</td><td>{r.wrong}</td><td>{r.un}</td>
                    <td>{fmt(r.acc)}</td><td>{r.time ? `${fmt(r.time)}m` : "–"}</td>
                    <td>{r.rank && r.outOf ? `${r.rank}/${r.outOf}` : "–"}</td><td>{fmt(r.pc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
