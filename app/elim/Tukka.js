"use client";

// 🎲 Tukka practice (owner: "kar de ye") — sawaal CHHUPA, sirf 4 options.
// Tum tukka lagao → phir dikhta hai: niyam (lib/elim tukka) kya kaatta aur kya
// chunta, sahi kya tha, aur sawaal kya tha. Neeche tumhara % vs niyam ka % vs
// andha 25%. Sawaal: 2025 ke saare Maths PYQ (text wale) jinke 4 options number
// hain — public/sscmaths2025.

import { useEffect, useState } from "react";
import { tukka, TUKKA_RULES, optNum } from "@/lib/elim";

const KEY = "elim.v1";
const loadSt = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const saveSt = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ } };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const L = "ABCD";
const ruleOf = (k) => TUKKA_RULES.find((r) => r.k === k);
const avgOf = (opts) => {
  const n = opts.map(optNum).filter((x) => x != null);
  const a = n.reduce((s, x) => s + x, 0) / (n.length || 1);
  return Math.round(a * 100) / 100;
};

export default function Tukka() {
  const [deck, setDeck] = useState(null);
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState(null);
  const [st, setSt] = useState({});

  useEffect(() => {
    setSt(loadSt().t || {});
    (async () => {
      const idx = await fetch("/sscmaths2025/index.json").then((r) => r.json()).catch(() => ({ chapters: [] }));
      const lists = await Promise.all((idx.chapters || []).map((c) => fetch(`/sscmaths2025/${c.slug}.json`).then((r) => (r.ok ? r.json() : [])).catch(() => [])));
      const all = [];
      lists.flat().forEach((q) => {
        if (q.img || (q.options || []).length !== 4) return;
        const r = tukka(q.options);
        if (r.pick == null) return;
        all.push({ ...q, r });
      });
      // CGL wale pehle (paper wahi), baaki baad mein.
      const cgl = shuffle(all.filter((q) => /CGL/.test(q.source || "")));
      const rest = shuffle(all.filter((q) => !/CGL/.test(q.source || "")));
      setDeck([...cgl, ...rest]);
    })();
  }, []);

  const q = deck?.[at];
  const choose = (i) => {
    if (pick != null) return;
    setPick(i);
    const s = loadSt();
    const t = s.t || { n: 0, ok: 0, rok: 0, same: 0 };
    t.n++;
    if (i === q.answer) t.ok++;
    if (q.r.pick === q.answer) t.rok++;
    if (i === q.r.pick) t.same++;
    s.t = t; saveSt(s); setSt(t);
  };
  const next = () => { setPick(null); setAt((a) => (a + 1) % deck.length); };

  if (!deck) return <p className="hint">Sawaal aa rahe hain… (saare chapter)</p>;
  if (!q) return <p className="hint">Koi sawaal nahi mila.</p>;
  const cutBy = {};
  q.r.steps.forEach((s) => s.cut.forEach((i) => { cutBy[i] = s.k; }));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <div className="elm-tukka">
      <article className="elm-trick elm-trick--big">
        <h2>🎲 Sawaal na aaye toh — tukke ka kram</h2>
        <ol className="elm-rules">
          {TUKKA_RULES.map((r) => <li key={r.k}><b>{r.t}</b> <span>({r.p})</span></li>)}
        </ol>
        <p className="elm-keys">Asli kaam step 1–3 ka hai — bade-chhote kaat kar bache do mein answer 56–61% baar. Step 4 bas jaldi faisla (lagbhag 50-50). 2025 ke 4,457 PYQ par milakar ~30% sahi (andha tukka 25%). Pakka answer nahi — par CGL mein galat par sirf −0.5, sahi par +2 → khaali chhodne se tukka hamesha behtar.</p>
      </article>

      <div className="elm-stats">
        <span>Tukke <b>{st.n || 0}</b></span>
        <span>Tumhare sahi <b>{pct(st.ok || 0, st.n)}%</b></span>
        <span>Niyam ke sahi <b>{pct(st.rok || 0, st.n)}%</b></span>
        <span>Andha tukka <b>25%</b></span>
        <span>Niyam jaisa chuna <b>{pct(st.same || 0, st.n)}%</b></span>
      </div>

      <article className="elm-card">
        <div className="elm-top">
          <span className="elm-src">{pick == null ? "Sawaal chhupa hai — sirf options" : q.source}</span>
          <span className="elm-pos">{at + 1} / {deck.length}</span>
        </div>
        {pick != null ? <p className="elm-q">{q.question}</p> : <p className="elm-q elm-hidden">? ? ?</p>}
        <ol className="elm-opts">
          {q.options.map((o, i) => {
            const cl = ["elm-opt"];
            if (pick != null && cutBy[i]) cl.push("cut");
            if (pick != null && i === q.answer) cl.push("right");
            if (pick === i && i !== q.answer) cl.push("wrong");
            return (
              <li key={i} className={cl.join(" ")}>
                <button type="button" className="elm-pick" onClick={() => choose(i)} disabled={pick != null}>
                  <span className="l">{L[i]}</span><span className="t">{o}</span>
                  {pick != null && i === q.r.pick ? <span className="elm-badge">niyam</span> : null}
                </button>
                {pick != null && cutBy[i] ? <div className="elm-why">✂️ {cutBy[i] === "mid" ? "Bacha tha, par average se door" : ruleOf(cutBy[i])?.t.replace(/ kaato$/, "")}</div> : null}
              </li>
            );
          })}
        </ol>
        {pick == null ? (
          <p className="elm-keys">Upar ka kram lagao: pehle mann mein kaato, phir bache hue par tap.</p>
        ) : (
          <div className={`elm-res ${pick === q.answer ? "ok" : "no"}`}>
            <h3>{pick === q.answer ? "✓ Tukka laga" : `✗ Sahi tha ${L[q.answer]}) ${q.options[q.answer]}`}</h3>
            <p className="elm-cutres">
              Niyam ne chuna <b>{L[q.r.pick]}) {q.options[q.r.pick]}</b> — {q.r.pick === q.answer ? <b className="good">sahi nikla ✓</b> : <b className="bad">is baar chuka</b>}
              {pick === q.r.pick ? " · tumne bhi wahi chuna." : " · tumne alag chuna."}
            </p>
            <ol className="elm-steps">
              {q.r.steps.map((s, i) => (
                <li key={i}>
                  <b>Step {i + 1}</b>
                  <p>{s.k === "mid" ? `Bache do (${[q.r.pick, ...s.cut].sort().map((x) => L[x]).join(", ")}) — chaaro ka average ≈ ${avgOf(q.options)} → uske paas ${L[q.r.pick]}` : `${ruleOf(s.k)?.t} → ${s.cut.map((x) => L[x]).join(", ")}`}</p>
                </li>
              ))}
            </ol>
            <button type="button" className="btn elm-next" onClick={next}>Agla ›</button>
          </div>
        )}
      </article>
    </div>
  );
}
