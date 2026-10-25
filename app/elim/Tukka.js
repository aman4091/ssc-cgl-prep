"use client";

// 🎲 Tukka practice — sawaal CHHUPA, sirf 4 options (owner: "question na aata
// ho to bhi"). Teen subject (lib/elim ke naape hue niyam):
//   🧮 Maths  — None / bada / chhota kaato → bache do; phir "aakhri line" dikha
//               kar (bina hal kiye, sirf disha: bada ya chhota) 2 mein se 1.
//   🌍 GS     — None kaato, All/Both ho toh wahi, saal ho toh beech ke do,
//               chhota kaato; sawaal dikhe toh sawaal ka shabd wala, warna lamba.
//   📚 English— No error kaato, ek-doosre ke andar wale, poore vaakya hon toh
//               sabse milta-julta, chhota kaato, warna lamba.
// Do stage: (1) sirf options par tukka, ya (2) "sawaal / aakhri line dikhao"
// ke baad tukka — dono ka % alag, niyam ka % saath mein, andha 25%.
// Decks: public/elimbank/tukka-<subject>.json (slim). Hisaab elim.v1 (device).

import { useEffect, useState } from "react";
import { tukka, tukkaGS, tukkaEN, TUKKA_RULES, GS_RULES, EN_RULES, CHAPTER_TIPS, optNum, lastLine } from "@/lib/elim";

const KEY = "elim.v1";
const loadSt = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const saveSt = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ } };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const L = "ABCD";
const SUBJ = {
  maths: { name: "🧮 Maths", rules: TUKKA_RULES, file: "tukka-maths", run: (o) => tukka(o), run2: (o) => tukka(o), q2: "aakhri line", blurb: "Asli kaam step 1–3: bade-chhote kaat kar bache do mein answer 56–61% baar. Phir sirf aakhri line dekho — answer diye number se bada ya chhota? Hisaab nahi, disha. 4,457 PYQ par milakar ~30% (andha 25%)." },
  gs: { name: "🌍 GS", rules: GS_RULES, file: "tukka-gs", run: (o) => tukkaGS(o, null), run2: (o, q) => tukkaGS(o, q), q2: "sawaal", blurb: "2025 ke 3,443 GS PYQ (CGL / CHSL / Steno) par naapa: poori chain 39% (andha 25%). \"All of the above / Both\" ho toh seedha wahi — 52%." },
  en: { name: "📚 English", rules: EN_RULES, file: "tukka-en", run: (o) => tukkaEN(o), run2: (o) => tukkaEN(o), q2: "sawaal", blurb: "Steno 2026 + 2025 ke 2,315 English PYQ: chain 37%. Jahan options poore vaakya hain, sabse milta-julta option 69% sahi — galat wale sahi ko thoda badal kar banaye jaate hain. \"No error / No improvement\" sirf 3–6%." },
};
const ruleOf = (rules, k) => rules.find((r) => r.k === k);
const avgOf = (opts) => { const n = opts.map(optNum).filter((x) => x != null); return Math.round((n.reduce((s, x) => s + x, 0) / (n.length || 1)) * 100) / 100; };

export default function Tukka() {
  const [subj, setSubj] = useState("maths");
  const [decks, setDecks] = useState({});
  const [at, setAt] = useState({ maths: 0, gs: 0, en: 0 });
  const [stage, setStage] = useState(1);
  const [pick, setPick] = useState(null);
  const [st, setSt] = useState({});
  // 📐 Maths: chapter chuno — us chapter ki disha (CHAPTER_TIPS) aakhri line ke saath.
  const [chap, setChap] = useState("");
  const [chaps, setChaps] = useState([]);
  useEffect(() => { fetch("/sscmaths2025/index.json").then((r) => r.json()).then((j) => setChaps((j.chapters || []).filter((c) => CHAPTER_TIPS[c.slug]))).catch(() => {}); }, []);
  const S = SUBJ[subj];

  useEffect(() => { setSt(loadSt().tk || {}); }, []);
  useEffect(() => {
    if (decks[subj]) return;
    fetch(`/elimbank/${S.file}.json`).then((r) => r.json()).then((d) => {
      const cgl = shuffle(d.filter((q) => /CGL/.test(q.src))), rest = shuffle(d.filter((q) => !/CGL/.test(q.src)));
      setDecks((x) => ({ ...x, [subj]: [...cgl, ...rest] }));
    }).catch(() => setDecks((x) => ({ ...x, [subj]: [] })));
  }, [subj]); // eslint-disable-line react-hooks/exhaustive-deps

  const deckAll = decks[subj];
  const deck = subj === "maths" && chap && deckAll ? deckAll.filter((x) => x.c === chap) : deckAll;
  const q = deck?.[at[subj] % (deck?.length || 1)];
  const disha = subj === "maths" && q ? CHAPTER_TIPS[q.c] || [] : [];
  const chapLabel = (c) => chaps.find((x) => x.slug === c)?.label || c;
  const r1 = q ? S.run(q.o) : null;                       // sirf options
  const r2 = q ? S.run2(q.o, q.q) : null;                 // sawaal ke saath (niyam ka poora faisla)
  const rNow = stage === 1 ? r1 : r2;
  const cutBy = {};
  // Stage 2 par niyam ka AAKHRI faisla (mid) nahi dikhta — 2 mein se 1 tum chuno.
  (rNow?.steps || []).forEach((s) => { if (pick == null && s.k === "mid") return; (s.cut || []).forEach((i) => { cutBy[i] = s.k; }); });

  const choose = (i) => {
    if (pick != null || !q) return;
    setPick(i);
    const s = loadSt();
    const t = (s.tk = s.tk || {});
    const c = (t[subj] = t[subj] || { n1: 0, ok1: 0, n2: 0, ok2: 0, rok: 0, n: 0 });
    c.n++; if (r2.pick === q.a) c.rok++;
    if (stage === 1) { c.n1++; if (i === q.a) c.ok1++; } else { c.n2++; if (i === q.a) c.ok2++; }
    saveSt(s); setSt({ ...t });
  };
  const next = () => { setPick(null); setStage(1); setAt((a) => ({ ...a, [subj]: a[subj] + 1 })); };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const c = st[subj] || {};

  return (
    <div className="elm-tukka">
      <div className="elm-tchips">
        {Object.entries(SUBJ).map(([k, v]) => <button key={k} type="button" aria-pressed={k === subj} onClick={() => { setSubj(k); setPick(null); setStage(1); }}>{v.name}</button>)}
      </div>
      <article className="elm-trick elm-trick--big">
        <h2>🎲 {S.name} — sawaal na aaye toh, is kram mein</h2>
        <ol className="elm-rules">
          {S.rules.map((r) => <li key={r.k}><b>{r.t}</b> <span>({r.p})</span></li>)}
        </ol>
        <p className="elm-keys">{S.blurb} CGL mein galat par −0.5, sahi par +2 → khaali chhodne se tukka hamesha behtar.</p>
      </article>

      {subj === "maths" && chaps.length ? (
        <label className="elm-chap">Chapter
          <select value={chap} onChange={(e) => { setChap(e.target.value); setPick(null); setStage(1); setAt((a) => ({ ...a, maths: 0 })); }}>
            <option value="">🔀 Saare chapter</option>
            {chaps.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </label>
      ) : null}
      <div className="elm-stats">
        <span>Sirf options se <b>{pct(c.ok1, c.n1)}%</b> <small>({c.n1 || 0})</small></span>
        <span>{S.q2} dekh ke <b>{pct(c.ok2, c.n2)}%</b> <small>({c.n2 || 0})</small></span>
        <span>Niyam <b>{pct(c.rok, c.n)}%</b></span>
        <span>Andha <b>25%</b></span>
      </div>

      {!deck ? <p className="hint">Sawaal aa rahe hain…</p> : !q ? <p className="hint">Koi sawaal nahi mila.</p> : (
        <article className="elm-card">
          <div className="elm-top">
            <span className="elm-src">{pick != null ? q.src : stage === 1 ? "Sawaal chhupa hai — sirf options" : `Sirf ${S.q2} — hal mat karo, disha dekho`}</span>
            <span className="elm-pos">{(at[subj] % deck.length) + 1} / {deck.length}</span>
          </div>
          {pick != null ? <p className="elm-q">{q.q}</p>
            : stage === 2 ? <p className="elm-q">{subj === "maths" ? lastLine(q.q) : q.q}</p>
              : <p className="elm-q elm-hidden">? ? ?</p>}
          <ol className="elm-opts">
            {q.o.map((o, i) => {
              const cl = ["elm-opt"];
              const shown = pick != null || stage === 2;
              if (shown && cutBy[i]) cl.push("cut");
              if (pick != null && i === q.a) cl.push("right");
              if (pick === i && i !== q.a) cl.push("wrong");
              return (
                <li key={i} className={cl.join(" ")}>
                  <button type="button" className="elm-pick" onClick={() => choose(i)} disabled={pick != null}>
                    <span className="l">{L[i]}</span><span className="t">{o}</span>
                    {pick != null && i === r2.pick ? <span className="elm-badge">niyam</span> : null}
                  </button>
                  {shown && cutBy[i] ? <div className="elm-why">✂️ {ruleOf(S.rules, cutBy[i])?.t.replace(/ kaato$/, "").replace(/ — answer unhi do mein$/, " — ye bahar")}</div> : null}
                </li>
              );
            })}
          </ol>
          {pick == null && stage === 1 ? (
            <div className="elm-acts">
              <button type="button" className="btn elm-next" onClick={() => setStage(2)}>👁 Kaat liya → {S.q2} dikhao</button>
              <span className="elm-keys">ya seedha ek option par tap — sirf options se tukka</span>
            </div>
          ) : null}
          {stage === 2 && disha.length ? (
            <div className="elm-disha">
              <b>📐 {chapLabel(q.c)} — basics se disha</b>
              <ul>{disha.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ) : null}
          {pick == null && stage === 2 ? (
            <p className="elm-keys">{subj === "maths" ? "Disha andhe kaat se UPAR hai: basics kahe answer bada hoga toh kaata hua bada option wapas le lo (tap chalta hai). Hisaab nahi — sirf bada / chhota / beech." : "Sawaal ka koi shabd kis option mein dohraya hai? Nahi toh lamba wala."}</p>
          ) : null}
          {pick != null ? (
            <div className={`elm-res ${pick === q.a ? "ok" : "no"}`}>
              <h3>{pick === q.a ? "✓ Tukka laga" : `✗ Sahi tha ${L[q.a]}) ${q.o[q.a]}`}</h3>
              <p className="elm-cutres">
                Niyam ne chuna <b>{L[r2.pick]}) {q.o[r2.pick]}</b> — {r2.pick === q.a ? <b className="good">sahi nikla ✓</b> : <b className="bad">is baar chuka</b>}
                {pick === r2.pick ? " · tumne bhi wahi." : " · tumne alag chuna."}
              </p>
              <ol className="elm-steps">
                {r2.steps.map((s, i) => (
                  <li key={i}>
                    <b>Step {i + 1}</b>
                    <p>{s.k === "mid" ? `Bache do (${[r2.pick, ...s.cut].sort().map((x) => L[x]).join(", ")}) — chaaro ka average ≈ ${avgOf(q.o)} → uske paas ${L[r2.pick]}`
                      : s.pick != null ? `${ruleOf(S.rules, s.k)?.t || "Jo bacha"} → ${L[s.pick]}`
                        : `${ruleOf(S.rules, s.k)?.t} → ${s.cut.map((x) => L[x]).join(", ")}`}</p>
                  </li>
                ))}
              </ol>
              <button type="button" className="btn elm-next" onClick={next}>Agla ›</button>
            </div>
          ) : null}
        </article>
      )}
    </div>
  );
}
