"use client";

// ⏱️ Under 40 / 🐢 40 se upar — Maths Skip drill ke nateeje (lib/mathdrill).
// Har question apni copy ke saath bachta hai, isliye bank khole bina poora
// dikhta hai. Jo pehle 40+ tha aur baad mein 40 ke andar hua, wo apne aap
// is taraf aa jaata hai (aur ulta bhi).

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "../sprint.css";
import Markdown from "@/components/Markdown";
import { getU40, getO40, removeResult, getHist, getDue, LIMIT, GAPS } from "@/lib/mathdrill";

const LETTER = ["A", "B", "C", "D", "E"];
const FROM = { go: "✅ Ho jayega bola tha", skip: "⏭ Skip kiya tha" };
const pct = (a, b) => (b ? Math.round((a * 100) / b) : 0);

function Row({ m, onDel }) {
  const [open, setOpen] = useState(false);
  const opts = Array.isArray(m.options) ? m.options : [];
  const imgs = Array.isArray(m.optImgs) ? m.optImgs : null;
  const how = m.timeout ? "⌛ 40 sec khatam" : m.gaveUp ? "⏭ chhoda" : m.right ? `${m.t} sec` : `❌ galat · ${m.t} sec`;
  const due = m.due ? new Date(m.due).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  return (
    <div className="card" style={{ padding: 14, marginTop: 10 }}>
      <div className="sp-meta">
        {[m._chapter, how, FROM[m.from], new Date(m.at).toLocaleDateString("en-IN")].filter(Boolean).join(" · ")}
      </div>
      {m.due ? (
        <div className="dr-due">🔁 Padaav {(m.stage || 0) + 1}/{GAPS.length} · agla dohrana {due}{m.due <= Date.now() ? " (aaj due)" : ""}</div>
      ) : m.mastered ? <div className="dr-due">🏆 Chaaron dohrane paar</div> : null}
      {m.qImg ? <img src={m.qImg} alt="question" className="sp-img" /> : <Markdown>{m.question}</Markdown>}
      {m.method ? <div className="dr-method-old mt-8">🧠 Method: <b>{m.method}</b></div> : null}
      <div className="sp-opts">
        {(imgs || opts).map((_, i) => (
          <div key={i} className={`sp-opt${open && i === m.answer ? " is-right" : ""}`}>
            <span className="sp-opt__k">{LETTER[i] || i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {imgs ? <img src={imgs[i]} alt={LETTER[i]} /> : <Markdown inline>{opts[i] || ""}</Markdown>}
            </span>
          </div>
        ))}
      </div>
      <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="sp-ibtn" onClick={() => setOpen((v) => !v)}>{open ? "⌃ band karo" : "⌄ jawab dekho"}</button>
        <button type="button" className="sp-ibtn" onClick={onDel} title="Is list se hatao">🗑️ hatao</button>
      </div>
      {open && (m.solImg || m.explanation) ? (
        <div className="sp-ans mt-8">
          {m.solImg ? <img src={m.solImg} alt="solution" className="sp-img" /> : null}
          {m.explanation ? <Markdown>{m.explanation}</Markdown> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Under40Page() {
  const [tab, setTab] = useState("u40");
  const [u, setU] = useState(null);
  const [o, setO] = useState([]);
  const [hist, setHist] = useState([]);
  const [chap, setChap] = useState("");
  const [dueN, setDueN] = useState(0);
  const load = () => { setU(getU40()); setO(getO40()); setHist(getHist()); setDueN(getDue().length); };
  useEffect(load, []);

  const list = tab === "u40" ? u || [] : o;
  const chaps = useMemo(() => {
    const m = new Map();
    for (const x of list) m.set(x._chapter || "—", (m.get(x._chapter || "—") || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);
  const shown = chap ? list.filter((x) => (x._chapter || "—") === chap) : list;

  // Saare drill ka jod: "ho jayega" bole unme se kitne sach mein under 40.
  const tot = hist.reduce((a, h) => ({
    goT: a.goT + h.go.tried, goU: a.goU + h.go.u40, skT: a.skT + h.skip.tried, skU: a.skU + h.skip.u40,
  }), { goT: 0, goU: 0, skT: 0, skU: 0 });

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🎯 Maths Skip drill</span>
          <Link href="/pyq/sprint" className="btn btn--ghost btn--sm">← Sprint</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          <span className="grad">Under {LIMIT}</span> aur {LIMIT} se upar
        </h1>
        <p className="hero__sub">Drill mein {LIMIT} sec ke andar sahi hue question ⏱️ Under {LIMIT} mein, baaki 🐢 {LIMIT} se upar mein.</p>
      </section>

      <section className="section">
        {(tot.goT > 0 || tot.skT > 0) && (
          <div className="dr-cols">
            <div className="dr-col is-go">
              <h3 style={{ margin: 0 }}>✅ Ho jayega bole</h3>
              <div className="dr-stat"><b>{tot.goT}</b> kiye · <b className="ok">{tot.goU} under {LIMIT}</b> ({pct(tot.goU, tot.goT)}%) · <b className="bad">{tot.goT - tot.goU} {LIMIT}+</b></div>
            </div>
            <div className="dr-col is-skip">
              <h3 style={{ margin: 0 }}>⏭ Skip kiye</h3>
              <div className="dr-stat"><b>{tot.skT}</b> kiye · <b className="ok">{tot.skU} under {LIMIT}</b> ({pct(tot.skU, tot.skT)}%) · <b className="bad">{tot.skT - tot.skU} {LIMIT}+</b></div>
            </div>
          </div>
        )}

        {dueN > 0 && (
          <p className="dr-launch mt-8">🔁 Aaj <b>{dueN}</b> question dohrane hain — <Link href="/pyq/sprint">Sprint → Maths → 🔁 Aaj ke dohrane</Link></p>
        )}
        <div className="dr-tabs">
          <button type="button" className={`sp-pick${tab === "u40" ? " is-on" : ""}`} onClick={() => { setTab("u40"); setChap(""); }}>⏱️ Under {LIMIT} ({(u || []).length})</button>
          <button type="button" className={`sp-pick${tab === "o40" ? " is-on" : ""}`} onClick={() => { setTab("o40"); setChap(""); }}>🐢 {LIMIT} se upar ({o.length})</button>
        </div>
        {chaps.length > 1 && (
          <div className="sp-selects">
            <label className="sp-sel">
              <span>Chapter</span>
              <select value={chap} onChange={(e) => setChap(e.target.value)}>
                <option value="">— Saare chapter ({list.length}) —</option>
                {chaps.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
              </select>
            </label>
          </div>
        )}

        {u === null ? <div className="placeholder">Loading…</div>
          : !shown.length ? <div className="placeholder">Abhi yahan kuch nahi. Sprint → Maths → 🎯 Skip drill chalao.</div>
          : shown.map((m) => <Row key={m.h} m={m} onDel={() => { removeResult(tab, m.h); load(); }} />)}
      </section>
    </>
  );
}
