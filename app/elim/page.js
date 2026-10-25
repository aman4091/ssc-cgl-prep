"use client";

// ✂️ Option elimination — CGL Maths (owner: paper parso; "mereko tarike jaanne
// hain… questions to mein vaise hi solve kar leta").
//
// Pehla roop (har PYQ ka hal + kaato-chuno) owner ko faltu laga: wo hal tha,
// kaatne ka tareeka nahi. Ab:
//   📚 Tareeke seekho — har tareeka (lib/elim TRICKS) asli CGL 2025 PYQ par,
//      STEP BY STEP: "options mein ye dekho → ye do kaato kyunki… → ye bacha".
//      public/elimbank/learn.json (har PYQ par script ne jaancha ki saare step
//      ke baad sirf sahi answer bachta hai).
//   🎯 Khud kaato — wahi PYQ mila-jula; pehle khud ✂️ (max 3), phir chuno,
//      phir wahi steps dikhte hain: kya karna tha, tumne kya kiya.
// Hisaab isi device par (localStorage "elim.v1" — cgl.* nahi, sync mein nahi).

import { Suspense, useEffect, useMemo, useState } from "react";
import { TRICKS, trickOf } from "@/lib/elim";
import "./elim.css";
import Tukka from "./Tukka";

const KEY = "elim.v1";
const loadSt = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const saveSt = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ } };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const L = "ABCD";

// Ek PYQ ke options, `upto` step tak ke kaate hue (har kaate ke neeche wajah).
function Opts({ item, upto, picked, myCut, onPick, onCut, play }) {
  const cutAt = {};
  item.steps.forEach((st, si) => { if (si < upto) st.cut.forEach((i) => { cutAt[i] = si; }); });
  const done = upto >= item.steps.length;
  return (
    <ol className="elm-opts">
      {item.o.map((o, i) => {
        const cl = ["elm-opt"];
        if (cutAt[i] != null) cl.push("cut");
        if (play && myCut.includes(i)) cl.push("cut");
        if (done && i === item.a) cl.push("right");
        if (picked != null && picked === i && i !== item.a) cl.push("wrong");
        if (done && play && myCut.includes(i) && i === item.a) cl.push("badcut");
        return (
          <li key={i} className={cl.join(" ")}>
            {play ? (
              <>
                <button type="button" className="elm-pick" onClick={() => onPick(i)} disabled={picked != null || myCut.includes(i)}>
                  <span className="l">{L[i]}</span><span className="t">{o}</span>
                </button>
                <button type="button" className="elm-x" onClick={() => onCut(i)} disabled={picked != null || (!myCut.includes(i) && myCut.length >= 3)} aria-pressed={myCut.includes(i)} title={myCut.includes(i) ? "Wapas lao" : "Ye option kaato"}>{myCut.includes(i) ? "↩" : "✂️"}</button>
              </>
            ) : (
              <div className="elm-pick elm-static"><span className="l">{L[i]}</span><span className="t">{o}</span></div>
            )}
            {cutAt[i] != null ? <div className="elm-why">✂️ Step {cutAt[i] + 1} mein kata</div> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Steps({ item, upto }) {
  return (
    <ol className="elm-steps">
      {item.steps.slice(0, upto).map((st, i) => (
        <li key={i}>
          <b>Step {i + 1}{st.cut.length ? ` · kaato ${st.cut.map((x) => L[x]).join(", ")}` : ""}</b>
          <p>{st.s}</p>
        </li>
      ))}
      {upto >= item.steps.length ? <li className="elm-left"><b>Bacha: {L[item.a]}) {item.o[item.a]}</b> — bina poora hal kiye.</li> : null}
    </ol>
  );
}

function ElimInner() {
  const [tab, setTab] = useState("learn");
  const [data, setData] = useState(null);
  const [tk, setTk] = useState("trap");
  const [ei, setEi] = useState(0);
  const [upto, setUpto] = useState(0);
  // practice
  const [deck, setDeck] = useState([]);
  const [pi, setPi] = useState(0);
  const [myCut, setMyCut] = useState([]);
  const [picked, setPicked] = useState(null);
  const [st, setSt] = useState({});

  useEffect(() => {
    setSt(loadSt());
    fetch("/elimbank/learn.json").then((r) => r.json()).then((j) => {
      setData(j);
      const all = [];
      Object.entries(j).forEach(([k, arr]) => arr.forEach((x) => all.push({ ...x, k })));
      setDeck(shuffle(all));
    }).catch(() => setData({}));
  }, []);

  const keys = useMemo(() => TRICKS.filter((t) => data?.[t.k]?.length), [data]);
  const items = data?.[tk] || [];
  const item = items[ei];
  useEffect(() => { setUpto(0); }, [tk, ei]);
  const T = trickOf(tk);

  const cur = deck[pi];
  useEffect(() => { setMyCut([]); setPicked(null); }, [pi]);
  const onCut = (i) => setMyCut((c) => (c.includes(i) ? c.filter((x) => x !== i) : c.length >= 3 ? c : [...c, i]));
  const onPick = (i) => {
    if (picked != null || myCut.includes(i)) return;
    setPicked(i);
    const s = loadSt();
    s.n = (s.n || 0) + 1;
    if (i === cur.a) s.ok = (s.ok || 0) + 1;
    s.cuts = (s.cuts || 0) + myCut.length;
    if (myCut.includes(cur.a)) s.bad = (s.bad || 0) + 1;
    saveSt(s); setSt(s);
  };

  return (
    <section className="section elm">
      <header className="elm-head">
        <div>
          <div className="elm-eb">CGL Maths · 2025 PYQ</div>
          <h1>✂️ Option kaato</h1>
          <p className="elm-sub">Sawaal na aaye tab bhi answer tak: options ki shakal dekh kar 2–3 kaato. Har tareeka asli PYQ par, step by step.</p>
        </div>
        <div className="elm-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "learn"} onClick={() => setTab("learn")}>📚 Tareeke seekho</button>
          <button type="button" role="tab" aria-selected={tab === "play"} onClick={() => setTab("play")}>🎯 Khud kaato</button>
          <button type="button" role="tab" aria-selected={tab === "tukka"} onClick={() => setTab("tukka")}>🎲 Tukka</button>
        </div>
      </header>

      {tab === "tukka" ? <Tukka /> : !data ? <p className="hint">Aa raha hai…</p> : tab === "learn" ? (
        <div className="elm-learn">
          <div className="elm-tchips">
            {keys.map((t) => (
              <button key={t.k} type="button" aria-pressed={t.k === tk} onClick={() => { setTk(t.k); setEi(0); }}>
                {t.icon} {t.name} <b>{data[t.k].length}</b>
              </button>
            ))}
          </div>
          {T ? (
            <article className="elm-trick elm-trick--big">
              <h2>{T.icon} {T.name}</h2>
              <p><b>Kab:</b> {T.when}</p>
              <p><b>Kaise:</b> {T.how}</p>
            </article>
          ) : null}
          {item ? (
            <article className="elm-card">
              <div className="elm-top">
                <span className="elm-src">PYQ · {item.src}</span>
                <span className="elm-pos">{ei + 1} / {items.length}</span>
              </div>
              <p className="elm-q">{item.q}</p>
              <Opts item={item} upto={upto} />
              <Steps item={item} upto={upto} />
              <div className="elm-acts">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEi((e) => Math.max(0, e - 1))} disabled={ei === 0}>‹ Pichhla</button>
                {upto < item.steps.length
                  ? <button type="button" className="btn elm-next" onClick={() => setUpto((u) => u + 1)}>▶ {upto === 0 ? "Pehla step dikhao" : "Agla step"}</button>
                  : <button type="button" className="btn elm-next" onClick={() => setUpto(0)}>↺ Dobara</button>}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEi((e) => Math.min(items.length - 1, e + 1))} disabled={ei >= items.length - 1}>Agla PYQ ›</button>
              </div>
              <p className="elm-keys">Pehle khud socho: options mein kya ajeeb hai? Phir ▶ dabao.</p>
            </article>
          ) : null}
        </div>
      ) : (
        <div className="elm-play">
          <div className="elm-stats">
            <span>Kiye <b>{st.n || 0}</b></span>
            <span>Sahi <b>{st.n ? Math.round(((st.ok || 0) / st.n) * 100) : 0}%</b></span>
            <span>Kaate <b>{st.cuts || 0}</b></span>
            <span className={st.bad ? "bad" : ""}>Sahi answer kaata <b>{st.bad || 0}</b></span>
          </div>
          {cur ? (
            <article className="elm-card">
              <div className="elm-top">
                <span className="elm-src">PYQ · {cur.src}</span>
                <span className="elm-pos">{pi + 1} / {deck.length}</span>
              </div>
              <p className="elm-q">{cur.q}</p>
              <Opts item={cur} upto={picked != null ? cur.steps.length : 0} picked={picked} myCut={myCut} onPick={onPick} onCut={onCut} play />
              {picked == null ? (
                <p className="elm-keys">Pehle ✂️ se jo ho hi nahi sakta wo kaato (max 3) → phir bache hue mein se chuno. Tareeka chhupa hai — answer ke baad dikhega.</p>
              ) : (
                <div className={`elm-res ${picked === cur.a ? "ok" : "no"}`}>
                  <h3>{picked === cur.a ? "✓ Sahi" : `✗ Sahi tha ${L[cur.a]}) ${cur.o[cur.a]}`}</h3>
                  <p className="elm-cutres">
                    {myCut.length === 0 ? "Kuch nahi kaata — neeche dekho kaunse 2–3 seedhe kat jaate the."
                      : myCut.includes(cur.a) ? <b className="bad">Tumne sahi answer ({L[cur.a]}) hi kaat diya — neeche dekho kaun si shart galat padhi.</b>
                        : <b className="good">Tumhare kaate {myCut.map((x) => L[x]).join(", ")} sab sahi ✓</b>}
                  </p>
                  <div className="elm-do">
                    <h4>{trickOf(cur.k)?.icon} Tareeka: {trickOf(cur.k)?.name}</h4>
                    <Steps item={cur} upto={cur.steps.length} />
                  </div>
                  <button type="button" className="btn elm-next" onClick={() => setPi((p) => (p + 1) % deck.length)}>Agla sawaal ›</button>
                </div>
              )}
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default function ElimPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><ElimInner /></Suspense>;
}
