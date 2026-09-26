"use client";

import "@/app/ca-revision/carev.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { FACT_SECS, GAPS, DAILY_CAP, REV_NOTE, factView, getFacts, addFact, removeFact, clearFacts, dueFacts, dueTotal, dueByGap, reviewFact, topicsInUse } from "@/lib/missionfacts";
import { clearSession } from "@/lib/recallsession";
import { getMission, currentDayNum, planFor } from "@/lib/mission";
import Recall from "@/components/carevision/Recall";
import AskWords from "@/components/AskWords";
import TrickButtons from "@/components/TrickButtons";
import FactTidyBtn from "@/components/FactTidyBtn";

// Bade card mein revise (CA Revision wala Recall, khula roop): upar naam,
// neeche uske baare mein — seedha dikhta hai, chhupa nahi. "Kerala dance:
// Kathakali, Mohiniyattam…" — ':' / '—' / '=' / '→' se pehle wala hissa
// naam, baad wala baaki. Alag karne wala na ho to topic naam hai.
// Har baar SAARE facts (naye kram mein). Aata tha -> sirf is round se bahar;
// Nahi aata tha -> isi round mein baar-baar, jab tak "aata tha" na dabe.
// Kuch save nahi hota — agli baar revise karo to sab phir aate hain. (1/3/7/14
// din wala schedule neeche ki "Aaj revise karo" list ka hai, alag.)
const SPLIT = /^(.{3,90}?)\s*(?::|—|–|=|→|\s-\s)\s*([\s\S]{2,})$/;
const FACT_LABELS = { bad: "Nahi aata tha", good: "Aata tha", show: "Dikhao" };

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Card par kya dikhega — padaav ke hisaab se (lib/missionfacts factView):
// D+1 par poora prose, D+3 / D+7 / D+14 par sirf "⚡" wali line aur neeche
// "⌄ poora padho".
function toCard(f) {
  const sec = FACT_SECS.find((x) => x.k === f.sec);
  const v = factView(f);
  // "Naam – baat" ko sar aur jawab mein todna sirf EK line wale fact par.
  // Saaf ki hui shakl (🧹) kai line ki hoti hai — wahan pehli line ka naam
  // sar bana kar baaki facts ko usse alag kar dena galat hai; sar topic hi
  // rehna chahiye.
  const oneLine = String(v.main).trim().indexOf(String.fromCharCode(10)) < 0;
  const m = oneLine ? SPLIT.exec(String(v.main).trim()) : null;
  return {
    id: f.id,
    trigger: m ? m[1] : (f.topic || `${sec?.label || "Fact"} — yaad karo`),
    answer: m ? m[2] : v.main,
    more: v.more,
    extra: null,
    pdfPage: null,
    meta: `${sec?.icon || ""} ${sec?.label || ""}${f.topic ? ` · ${f.topic}` : ""}`,
  };
}

// /mission/facts — GS / CA / English / Maths ka ek-line fact log.
//
// Upar: aaj ke due (1/3/7/14 din wale) — padho, "yaad tha" ya "bhool gaya".
// Beech mein: naya fact jodo (mock analysis ya PYQ ke baad turant).
// Neeche: topic-wise poori list.

export default function MissionFactsPage() {
  const [facts, setFacts] = useState([]);
  const [due, setDue] = useState([]);
  const [dueAll, setDueAll] = useState({ total: 0, byGap: {} });
  const [open, setOpen] = useState({});
  const [sec, setSec] = useState("gs");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState([]);
  const [revising, setRevising] = useState(null);
  // Recall apni qataar andar copy kar leta hai, isliye card ka text badalne
  // par prop se kuch nahi hota — remount karna padta hai. resumeKey ki wajah
  // se wo wahin se uthta hai jahan tha, isliye jhatka nahi lagta.
  const [rev, setRev] = useState(0);
  const autoStarted = useRef(false);

  const load = () => { setFacts(getFacts()); setDue(dueFacts()); setDueAll({ total: dueTotal(), byGap: dueByGap() }); };

  // Page kholte hi seedha revision — owner ka niyam. Fact log padhne ki
  // list nahi, dohrane ki cheez hai: upar naam, neeche uske baare mein, aur
  // "Aata tha / Nahi aata tha". Bahar nikalte hi neeche wali list mil jati
  // hai (naya fact jodna, dhoondhna, hatana). Ek baar hi — list par wapas
  // aane ke baad koi load() ise dobara shuru nahi karta.
  useEffect(() => {
    if (autoStarted.current || !facts.length) return;
    autoStarted.current = true;
    setRevising(shuffle(facts).map(toCard));
  }, [facts]);
  useEffect(() => {
    load();
    // Aaj ka GS topic sabse pehla sujhaav — usi ke facts sabse zyada banenge.
    const m = getMission();
    const p = planFor(currentDayNum(m));
    const s = [p && p.g ? p.g.t.split(":")[0] : null, ...topicsInUse()].filter(Boolean);
    setSuggest([...new Set(s)].slice(0, 10));
    const on = () => load();
    window.addEventListener("cgl:mission-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:mission-changed", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);

  const add = () => {
    if (!text.trim()) return;
    addFact({ sec, topic, text });
    setText("");
    load();
  };

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const g = {};
    for (const f of facts) {
      if (term && !(`${f.topic} ${f.text}`.toLowerCase().includes(term))) continue;
      const k = f.topic || "(bina topic)";
      (g[k] = g[k] || []).push(f);
    }
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  }, [facts, q]);

  if (revising) {
    return (
      <Recall
        askWords
        key={`facts-${rev}`}
        queue={revising}
        labels={FACT_LABELS}
        open
        loop
        onRate={() => {}}
        tools={(c) => (
          <>
            {/* 🧹 Chipka hua cluster padhne layak — DeepSeek sirf shakl ke
                liye, fact ek bhi nahi badalta. Ek baar, phir save. */}
            <FactTidyBtn
              id={c.id}
              onDone={() => {
                load();
                const now = getFacts();
                setRevising((q) => (q ? q.map((x) => {
                  const f = now.find((y) => y.id === x.id);
                  return f ? toCard(f) : x;
                }) : q));
                setRev((n) => n + 1);
              }}
            />
            <TrickButtons card={c} subject="gs" />
          </>
        )}
        onDelete={(c) => { removeFact(c.id); load(); }}
        resumeKey="facts"
        onExit={() => { setRevising(null); load(); window.scrollTo(0, 0); }}
      />
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">🧠 Fact log</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Ek line, <span className="grad">cluster ke saath</span>
        </h1>
        <p className="hero__sub">
          Har galat/unsure GS ya CA sawaal → 1 line. Kerala ka dance pucha? Kerala ke saare dance ek line mein — SSC agli baar
          usi cluster ka doosra fact poochta hai. Har fact 1, 3, 7, 14 din baad khud wapas aata hai. "Saare facts revise
          karo" mein har baar sab aate hain — jo aata hai wo us round se hat jata hai, jo nahi aata wo baar-baar aata hai.
        </p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        {facts.length > 0 && (
          <button
            className="btn btn--primary ms-revise-go"
            onClick={() => { clearSession("facts"); setRevising(shuffle(facts).map(toCard)); }}
          >
            ▶ Naya round shuru karo · {facts.length}
          </button>
        )}
        <h2 className="ms-h2">Aaj revise karo ({due.length})</h2>
        <p className="hint" style={{ margin: "0 0 8px" }}>
          💡 Fact ke andar kisi bhi <b>naam</b> par click karo — dayein taraf uska matlab aur tasveer aa jayegi.{" "}
        </p>
        <p className="hint" style={{ margin: "0 0 8px" }}>
          <strong>{REV_NOTE}</strong> Kram wahi hai — D+3 pehle, fir D+7, fir D+1, sabse aakhir mein D+14.
          {dueAll.total > due.length
            ? ` Aaj ki hadd ${DAILY_CAP} hai (kul ${dueAll.total} due hain) — bache hue kal khud aa jayenge, koi backlog nahi.`
            : ""}
        </p>
        {due.length > 0 && (
          <div className="row" style={{ gap: 6, marginBottom: 8 }}>
            {GAPS.map((g) => (dueAll.byGap[g] ? <span key={g} className="chip">D+{g}: <strong>{dueAll.byGap[g]}</strong></span> : null))}
          </div>
        )}
        {due.length === 0 ? (
          <div className="placeholder">Aaj ke liye kuch due nahi. 👍</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {due.map((f) => (
              <div key={f.id} className="glass-card ms-fact">
                <div className="row between" style={{ flexWrap: "nowrap", gap: 8 }}>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {FACT_SECS.find((s) => s.k === f.sec)?.icon} {f.topic || "—"}
                  </span>
                  {!open[f.id] && <button className="btn btn--sm" onClick={() => setOpen((o) => ({ ...o, [f.id]: true }))}>👁 Dikhao</button>}
                </div>
                {open[f.id] ? (
                  <>
                    {/* Naam par click → dayein taraf uska poora parichay + tasveer. */}
                    <p style={{ margin: "6px 0 8px", fontSize: "1.1rem", lineHeight: 1.5 }}><AskWords>{factView(f).main}</AskWords></p>
                    {factView(f).more && (
                      <details style={{ margin: "0 0 8px" }}>
                        <summary className="hint" style={{ cursor: "pointer" }}>⌄ poora padho</summary>
                        <p style={{ margin: "6px 0 0", fontSize: "1rem", lineHeight: 1.6 }}><AskWords>{factView(f).more}</AskWords></p>
                      </details>
                    )}
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn btn--primary btn--sm" onClick={() => { reviewFact(f.id, true); load(); }}>✓ Aata tha</button>
                      <FactTidyBtn id={f.id} onDone={load} />
                      <button className="btn btn--ghost btn--sm" onClick={() => { reviewFact(f.id, false); load(); }}>✗ Nahi aata tha (kal phir)</button>
                    </div>
                  </>
                ) : (
                  <p className="hint" style={{ margin: "6px 0 0" }}>Pehle khud yaad karo — fir "Dikhao".</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="ms-h2">Naya fact jodo</h2>
        <div className="glass-card ms-form" style={{ padding: 14 }}>
          <div className="row" style={{ gap: 6, marginBottom: 8 }}>
            {FACT_SECS.map((s) => (
              <button key={s.k} className={"chip chip--btn" + (sec === s.k ? " is-active" : "")} onClick={() => setSec(s.k)}>{s.icon} {s.label}</button>
            ))}
          </div>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Polity, Dance, Sep 2026 CA)" />
          {suggest.length > 0 && (
            <div className="row" style={{ gap: 6, margin: "6px 0 8px" }}>
              {suggest.map((s) => <button key={s} className="chip chip--btn chip--sm" onClick={() => setTopic(s)}>{s}</button>)}
            </div>
          )}
          <textarea className="textarea input" rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Fact, cluster ke saath. e.g. Kerala dance: Kathakali, Mohiniyattam, Theyyam, Ottan Thullal" />
          <button className="btn btn--primary mt-12" onClick={add} disabled={!text.trim()}>➕ Jodo</button>
        </div>
      </section>

      <section className="section">
        <div className="row between ms-form" style={{ marginBottom: 8 }}>
          <h2 className="ms-h2" style={{ margin: 0 }}>Saare facts ({facts.length})</h2>
          {facts.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => {
                if (confirm(`Saare ${facts.length} facts hamesha ke liye hat jayenge. Pakka?`)) { clearFacts(); load(); }
              }}
            >🗑️ Sab hatao</button>
          )}
          <input className="input" style={{ maxWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 dhoondo" />
        </div>
        {groups.length === 0 ? (
          <div className="placeholder">Abhi koi fact nahi. Aaj ke GS PYQ ke baad pehla fact yahin likho.</div>
        ) : groups.map(([t, list]) => (
          <details key={t} className="glass-card ms-group" open={groups.length <= 3}>
            <summary><strong>{t}</strong> <span className="muted">· {list.length}</span></summary>
            {list.map((f) => (
              <div key={f.id} className="ms-factrow">
                <span>{FACT_SECS.find((s) => s.k === f.sec)?.icon} <AskWords>{f.text}</AskWords></span>
                <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <span className="hint">{f.due ? `agla ${f.due.slice(8)}/${f.due.slice(5, 7)}` : "pakka ✓"}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Ye fact hata dein?")) { removeFact(f.id); load(); } }}>🗑️</button>
                </span>
              </div>
            ))}
          </details>
        ))}
      </section>
    </>
  );
}
