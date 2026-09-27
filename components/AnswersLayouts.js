"use client";

// 📖 Answers ka Do-pane — baayen question ki chhoti list, daayen chuna hua
// card aur uska revision timeline (D0 → D+1 → D+3 → D+7 → D+14).
//
// Owner ne 15 layout mein se yahi chuna; baaki hata diye. Revision ka hisaab
// lib/ansrev mein: D0 = jis din question ko PEHLI BAAR ✅ "ho gaya" kiya.
// Card ka ✅ (AnswersBoard.onDone) aur yahan ka button — dono wahi kaam karte
// hain: pehli baar D0, baad mein aaj ka revise.

import { useEffect, useMemo, useState } from "react";
import { dayKey } from "@/lib/wrongbook";
import { getRevMap, markDoneRev, unmarkToday, revPlan, addDaysKey } from "@/lib/ansrev";

const SUB = {
  math: { icon: "🧮", label: "Maths", c: "#3b6cff" },
  gs: { icon: "🌍", label: "GS", c: "#2f9e6e" },
  english: { icon: "📘", label: "English", c: "#a855f7" },
  reasoning: { icon: "🧠", label: "Reasoning", c: "#f59e0b" },
  other: { icon: "📎", label: "Other", c: "#94a3b8" },
};
const subOf = (k) => SUB[k] || SUB.other;
const shortD = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const wk = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
const snip = (r) => String(r.q?.question || r.ocrText || r.note || "").replace(/\s+/g, " ").trim();

// List ki chhaanti.
const FILTERS = [
  { k: "all", l: "Sab" },
  { k: "due", l: "🔁 Aaj dohrane" },
  { k: "new", l: "🆕 Shuru nahi" },
  { k: "done", l: "🏁 Pakke" },
];
const pass = (f, p) =>
  f === "all" ? true
    : f === "due" ? p.started && (p.due || p.overdue > 0) && !p.revisedToday
      : f === "new" ? !p.started
        : p.done;

// Upar ki patti — revision ka haal + agle 7 din.
function RevSummary({ list, plan }) {
  const today = dayKey(new Date().toISOString());
  const st = useMemo(() => {
    let due = 0, miss = 0, did = 0, fresh = 0, done = 0;
    const next7 = Array.from({ length: 7 }, (_, i) => ({ k: addDaysKey(today, i), n: 0 }));
    for (const r of list) {
      const p = plan(r);
      if (!p.started) { fresh++; continue; }
      if (p.due && !p.revisedToday) due++;
      if (p.overdue && !p.revisedToday) miss++;
      if (p.revisedToday) did++;
      if (p.done) done++;
      for (const s of p.stages) { const d = next7.find((x) => x.k === s.date); if (d && s.state !== "ok") d.n++; }
    }
    return { due, miss, did, fresh, done, next7 };
  }, [list, plan, today]);
  const max = Math.max(1, ...st.next7.map((x) => x.n));
  return (
    <div className="rv-sum">
      <div className="rv-sum__n"><b className="c-due">{st.due}</b><span>aaj dohrane</span></div>
      <div className="rv-sum__n"><b className="c-miss">{st.miss}</b><span>chhoote hue</span></div>
      <div className="rv-sum__n"><b className="c-ok">{st.did}</b><span>aaj kiye</span></div>
      <div className="rv-sum__n"><b>{st.fresh}</b><span>🆕 shuru nahi</span></div>
      <div className="rv-sum__n"><b>{st.done}</b><span>🏁 pakke</span></div>
      <div className="rv-sum__week" title="Agle 7 din kitne dohrane padenge">
        {st.next7.map((d, i) => (
          <span key={d.k}>
            <b>{d.n}</b>
            <i style={{ height: `${Math.round((d.n / max) * 34)}px` }} />
            <small>{i === 0 ? "Aaj" : wk(d.k)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AnswersDoPane({ list, renderCard, bucketOf, jumpId }) {
  const [rev, setRev] = useState({});
  useEffect(() => {
    setRev(getRevMap());
    const on = () => setRev(getRevMap());
    window.addEventListener("cgl:ansrev", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:ansrev", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const today = dayKey(new Date().toISOString());
  const plan = useMemo(() => {
    const cache = new Map();
    return (r) => { if (!cache.has(r.id)) cache.set(r.id, revPlan(r, rev, today)); return cache.get(r.id); };
  }, [rev, today]);

  const [f, setF] = useState("all");
  const rows = useMemo(
    () => [...list].sort((a, b) => String(b.at).localeCompare(String(a.at))).filter((r) => pass(f, plan(r))),
    [list, f, plan],
  );
  const [id, setId] = useState("");
  useEffect(() => { if (jumpId) setId(jumpId); }, [jumpId]);
  const cur = rows.find((r) => r.id === id) || rows[0] || null;
  const p = cur ? plan(cur) : null;
  const pick = (rid) => { setId(rid); if (window.innerWidth < 900) setTimeout(() => document.getElementById("dp-main")?.scrollIntoView({ behavior: "smooth" }), 0); };

  let lastDay = "";
  return (
    <>
      <RevSummary list={list} plan={plan} />
      <div className="al14">
        <nav className="al14-list">
          <div className="al14-f">
            {FILTERS.map((x) => (
              <button key={x.k} type="button" className={f === x.k ? "is-on" : ""} onClick={() => setF(x.k)}>{x.l}</button>
            ))}
          </div>
          {!rows.length && <p className="al14-empty">Is chhaanti mein kuch nahi.</p>}
          {rows.map((r, i) => {
            const dk = dayKey(r.at); const hd = dk !== lastDay; lastDay = dk; const q = plan(r);
            const tag = !q.started ? ["🆕", ""] : q.revisedToday ? ["✓ aaj", "c-ok"] : q.due ? ["aaj", "c-due"] : q.overdue ? ["der", "c-miss"] : q.done ? ["🏁", ""] : q.next ? [shortD(q.next.date), "al14-dim"] : ["", ""];
            return (
              <div key={r.uid}>
                {hd && <div className="al14-day">{shortD(dk)} · {wk(dk)}</div>}
                <button type="button" className={`al14-it${cur && r.id === cur.id ? " is-on" : ""}`} onClick={() => pick(r.id)}>
                  <i style={{ background: subOf(bucketOf(r)).c }} />
                  <span>{snip(r) || `Question ${r.qid || i + 1}`}</span>
                  <em className={tag[1]}>{tag[0]}</em>
                </button>
              </div>
            );
          })}
        </nav>

        {cur && (
          <div className="al14-main" id="dp-main">
            <div className="al14-head">
              <b>{subOf(bucketOf(cur)).icon} {subOf(bucketOf(cur)).label}</b>
              <span className="al14-dim">aaya {shortD(dayKey(cur.at))}</span>
              {p.started
                ? p.revisedToday
                  ? <button className="rv-btn is-on" onClick={() => setRev(unmarkToday(cur.id))}>✓ Aaj {p.doneToday ? "ho gaya (D0)" : "revise hua"} · undo</button>
                  : <button className="rv-btn" onClick={() => setRev(markDoneRev(cur.id))}>🔁 Revise kiya</button>
                : <button className="rv-btn" onClick={() => setRev(markDoneRev(cur.id))}>✅ Ho gaya — aaj se D0</button>}
            </div>

            {p.started ? (
              <div className="al14-tl">
                {[{ gap: 0, date: p.base, state: "ok" }, ...p.stages].map((s) => (
                  <span key={s.gap} className={`al14-st is-${s.state}`}>
                    <i />
                    <b>{s.gap ? `D+${s.gap}` : "D0"}</b>
                    <small>{s.state === "today" ? "AAJ" : shortD(s.date)}</small>
                  </span>
                ))}
              </div>
            ) : (
              <p className="al14-new">🆕 Abhi shuru nahi. Question karke <b>✅ Ho gaya</b> dabao — wahi din <b>D0</b> banega, phir D+1, D+3, D+7, D+14 apne aap.</p>
            )}
            {p.started && (
              <p className="al14-status">
                {p.done ? "🏁 Pakka ho gaya — saare padaav poore." : p.revisedToday ? `✓ Aaj ka kaam ho gaya${p.next ? ` · agla ${shortD(p.next.date)} (D+${p.next.gap})` : ""}` : p.due ? "🔴 Aaj dohrana hai." : p.overdue ? `⚠️ ${p.overdue} padaav chhoota — aaj dohra lo.` : p.next ? `Agla revision ${shortD(p.next.date)} (D+${p.next.gap})` : ""}
              </p>
            )}
            {renderCard(cur, rows.indexOf(cur), false)}
          </div>
        )}
      </div>
    </>
  );
}
