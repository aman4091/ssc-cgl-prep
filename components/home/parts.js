"use client";

// Chhote saajhe tukde — sab homepage roop inhe istemal karte hain.

import Link from "next/link";
import PlanPractice from "@/components/PlanPractice";
import { splitTitle, secOf } from "./useMissionHome";

// ▶ Shuru — block ka apna practice (auto) ho to wahi, warna uska link.
export function Go({ b, label }) {
  if (!b) return null;
  if (b.auto && b.auto.n) return <PlanPractice auto={b.auto} title={b.t} />;
  if (b.href) return <Link href={b.href} className="btn btn--primary btn--sm">{label || b.hrefLabel || "▶ Kholo"}</Link>;
  return null;
}

export function Tick({ ok, onClick, big }) {
  return (
    <button type="button" className={`hx-tick${ok ? " is-on" : ""}${big ? " hx-tick--big" : ""}`} onClick={onClick} aria-label={ok ? "Undo" : "Ho gaya"}>
      {ok ? "✓" : ""}
    </button>
  );
}

// Aaj ke teen subject — plan ke g / m / e topic.
export function subjectsOf(d) {
  const p = d.plan || {};
  const find = (id) => d.tl.find((b) => b.id === id);
  return [
    p.g && { k: "gs", icon: "🌍", label: "GS", t: p.g.t, b: find("gs1"), c: "#2f9e6e" },
    p.m && { k: "maths", icon: "🧮", label: "Maths", t: p.m.t, b: find("math"), c: "#3b6cff" },
    p.e && { k: "english", icon: "📘", label: "English", t: p.e.t, b: find("eng"), c: "#a855f7" },
  ].filter(Boolean);
}

// 🗂️ Chaar subject ke khaane — GS, Maths, English, Mock+Revision. Har
// khaane mein aaj ka topic, us subject ke aaj ke saare block (tick ke saath),
// aur do kaam ke link.
//
// Ye pehle sirf "Subject Hub" (roop I) ke andar tha. Owner ne kaha ki roop E
// mein neeche "Aaj ke match" ki jagah yahi chaar box chahiye, isliye yahan
// nikaal liya — ek hi jagah, dono roop wahi dikhate hain.
const SUBJECT_BOXES = [
  { k: "gs", icon: "🌍", t: "GS", c: "#2f9e6e", secs: ["gs"], links: [["/pyq/war", "🎯 PYQ"], ["/mission/facts", "🧠 Fact log"]] },
  { k: "maths", icon: "🧮", t: "Maths", c: "#3b6cff", secs: ["maths"], links: [["/notes/brahmastra", "📐 Formula"], ["/pyq/sprint", "⚡ Sprint"]] },
  { k: "english", icon: "📘", t: "English", c: "#a855f7", secs: ["english", "reasoning"], links: [["/notes/goldenrules", "🏅 Rules"], ["/vocab", "🔤 Vocab"]] },
  { k: "mock", icon: "📝", t: "Mock + Revision", c: "#e5484d", secs: ["mock", "rev"], links: [["/mock-marks", "📊 Marks"], ["/mission/analysis", "🔍 Analysis"]] },
];

export function SubjectBoxes({ d }) {
  const subs = subjectsOf(d);
  const topic = {
    gs: subs.find((s) => s.k === "gs"),
    maths: subs.find((s) => s.k === "maths"),
    english: subs.find((s) => s.k === "english"),
  };
  const isDone = (b) => !!(b && d.doneToday[b.id]);
  return (
    <div className="hI-grid">
      {SUBJECT_BOXES.map((q) => {
        const bl = d.work.filter((b) => q.secs.includes(b.sec));
        const tp = topic[q.k];
        return (
          <section key={q.k} className="hI-q" style={{ "--sc": q.c }}>
            <header>
              <span className="hI-q__ic">{q.icon}</span>
              <h2>{q.t}</h2>
              <span className="hI-q__n">{bl.filter(isDone).length}/{bl.length}</span>
            </header>
            {tp ? <p className="hI-q__tp">{tp.t}</p> : null}
            <ul>
              {bl.map((b) => (
                <li key={b.id} className={`${isDone(b) ? "is-ok" : ""}${d.cur && d.cur.id === b.id ? " is-now" : ""}`}>
                  <Tick ok={isDone(b)} onClick={() => d.toggle(b.id)} />
                  <span className="hI-time">{b.start}</span>
                  <span className="hI-t">{splitTitle(b)[0]}</span>
                  {d.cur && d.cur.id === b.id ? <Go b={b} /> : null}
                </li>
              ))}
            </ul>
            <div className="hI-links">{q.links.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}</div>
          </section>
        );
      })}
    </div>
  );
}

export function BlockName({ b }) {
  const [name, topic] = splitTitle(b);
  return (
    <>
      <span className="hx-bname">{name}</span>
      {topic ? <span className="hx-btopic">{topic}</span> : null}
    </>
  );
}

export { splitTitle, secOf };
