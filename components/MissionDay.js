"use client";

import Link from "next/link";
import PlanPractice from "./PlanPractice";
import { buildTimeline, tickable, revisionFor, planFor, dateOfDay, fmtDay } from "@/lib/mission";

// Ek din ki poori timeline — home (aaj), /mission/plan (koi bhi din) dono yahi
// dikhate hain. Har block: time, ✓, kya karna hai, kyun/kaise, aur seedha us
// kaam ka button (quiz / page / marks). Life wale (walk, nashta, dinner) dhundhle
// dikhte hain — wo bhi timeline ka hissa hain taaki "abhi" hamesha sahi bataye.

const SEC_LABEL = { maths: "Maths", gs: "GS", english: "English", reasoning: "Reasoning", rev: "Revision", mock: "Mock", life: "", break: "" };
const SECT_CAT = { Q: ["maths", "🧮 Maths"], GS: ["gk", "🌍 GS"], E: ["english", "📘 English"], R: ["reasoning", "🧠 Reasoning"] };

export function BlockActions({ b, compact }) {
  const acts = [];
  if (b.auto && b.auto.n) acts.push(<PlanPractice key="pp" auto={b.auto} title={b.t} />);
  if (b.kind === "sectional" && b.sects) {
    for (const s of b.sects) {
      if (s === "DIAG") { acts.push(<Link key="diag" href="/mission/diagnose" className="btn btn--sm">🩺 Maths self-test</Link>); continue; }
      const [cat, label] = SECT_CAT[s] || [];
      if (cat) acts.push(<Link key={s} href={`/mock-marks?cat=${cat}`} className="btn btn--sm">📊 {label}</Link>);
    }
  } else if (b.href) {
    acts.push(<Link key="h1" href={b.href} className="btn btn--sm">{b.hrefLabel || "Kholo →"}</Link>);
  }
  if (b.href2) acts.push(<Link key="h2" href={b.href2} className="btn btn--sm">{b.href2Label || "Kholo →"}</Link>);
  if (b.kind === "mock" || b.kind === "sectional") {
    if (b.kind === "mock" && b.href !== "/mock-marks?cat=full") acts.push(<Link key="mk" href="/mock-marks?cat=full" className="btn btn--sm">📊 Marks daalo</Link>);
    acts.push(<Link key="an" href="/mission/analysis" className="btn btn--sm btn--ghost">🔍 Analysis</Link>);
  }
  if (!acts.length) return null;
  return <div className={"ms-acts" + (compact ? " ms-acts--compact" : "")}>{acts}</div>;
}

function Revision({ day, mission }) {
  const rev = revisionFor(day, mission);
  if (!rev.length) return <p className="hint" style={{ margin: "4px 0 0" }}>Pehla din — revise karne ko abhi kuch nahi. Fact log khaali ho to seedha aage badho.</p>;
  return (
    <ul className="ms-rev">
      {rev.map((r) => (
        <li key={String(r.gap)}>
          <strong>{r.gap === "final" ? "Final skim" : `D${r.day} (${r.gap} din pehle)`}:</strong>{" "}
          {r.items.map((i) => i.t).join(" · ")}
        </li>
      ))}
    </ul>
  );
}

export default function MissionDay({ day, mission, done, onToggle, nowMin = null }) {
  const p = planFor(day, mission);
  if (!p) return <div className="placeholder">Ye din plan mein nahi hai.</div>;
  const tl = buildTimeline(day, mission);
  const d = (done && done[day]) || {};

  return (
    <div className="ms-tl">
      {tl.map((b) => {
        const isNow = nowMin != null && b.s <= nowMin && nowMin < b.e;
        const isPast = nowMin != null && b.e <= nowMin;
        const ok = !!d[b.id];
        if (b.life || b.brk) {
          return (
            <div key={b.id} className={"ms-row ms-row--life" + (isNow ? " is-now" : "") + (isPast ? " is-past" : "")}>
              <span className="ms-time">{b.start}{b.id !== "sleep" ? `–${b.end}` : ""}</span>
              <span className="ms-life">{b.t}</span>
              {b.href && <Link href={b.href} className="ms-lifelink">kholo →</Link>}
            </div>
          );
        }
        return (
          <div key={b.id} className={"ms-row" + (isNow ? " is-now" : "") + (ok ? " is-done" : "") + (b.must ? "" : " is-bonus")} data-sec={b.sec}>
            <span className="ms-time">{b.start}–{b.end}</span>
            <div className="ms-body">
              <div className="ms-head">
                {tickable(b) && (
                  <button className={"chk__box" + (ok ? " is-on" : "")} onClick={() => onToggle && onToggle(b.id)} aria-label={ok ? "Undo" : "Ho gaya"}>
                    {ok ? "✓" : ""}
                  </button>
                )}
                <span className="ms-title">{b.t}</span>
                {SEC_LABEL[b.sec] && <span className="ms-sec">{SEC_LABEL[b.sec]}</span>}
                {!b.must && <span className="ms-sec ms-sec--bonus">bonus</span>}
                {isNow && <span className="ms-sec ms-sec--now">ABHI</span>}
              </div>
              {b.how && <p className="ms-how">{b.how}</p>}
              {b.kind === "revision" && <Revision day={day} mission={mission} />}
              <BlockActions b={b} />
            </div>
          </div>
        );
      })}
      {tl.skipped && tl.skipped.length > 0 && (
        <p className="hint" style={{ marginTop: 8 }}>
          Aaj ke time mein fit nahi hua: {tl.skipped.map((b) => b.t).join(" · ")} — chhod do, kal wapas aayega.
        </p>
      )}
      <p className="hint" style={{ marginTop: 8 }}>
        {fmtDay(dateOfDay(mission.startDate, day))} · Day {day} · {p.type === "A" ? "Full mock din" : p.type === "B" ? "Build din" : "Taper (halka)"}
        {p.ext ? ` · Extension din ${p.ext}` : ""}{p.unconfTaper ? " · (taper tabhi jab exam date confirm ho)" : ""}
      </p>
    </div>
  );
}
