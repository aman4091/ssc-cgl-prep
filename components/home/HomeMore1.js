"use client";

// Homepage roop E–I. Sab components/home/useMissionHome ka hi data padhte hain.

import Link from "next/link";
import { Go, Tick, SubjectBoxes, splitTitle } from "./parts";
import { hhmm } from "./useMissionHome";

const isDone = (d, b) => !!(b && d.doneToday[b.id]);

// 🅴 Scoreboard — stadium ka LED board: exam tak ke din/ghante, aaj ka score
// (CORE), har section ka TARGET vs FLOOR, aur neeche subject ke chaar khaane
// (wahi jo Subject Hub mein hain — components/home/parts SubjectBoxes).
export function HomeScore({ d }) {
  const hrs = d.toExam != null ? d.toExam * 24 - Math.floor(d.nowMin / 60) : null;
  return (
    <div className="hE">
      <section className="hE-board">
        <div className="hE-cell"><span>DIN</span><b>{String(d.toExam ?? 0).padStart(2, "0")}</b></div>
        <div className="hE-cell"><span>GHANTE</span><b>{hrs ?? "–"}</b></div>
        <div className="hE-mid">
          <span className="hE-mid__t">SSC CGL 2026</span>
          <span className="hE-mid__s">DAY {d.day}/{d.N} · {d.phase.name}</span>
        </div>
        <div className="hE-cell"><span>CORE</span><b>{d.stats.coreDone}-{d.stats.coreTotal}</b></div>
        <div className="hE-cell"><span>STREAK</span><b>{d.streak}</b></div>
      </section>

      <section className="hE-secs">
        {d.SECTIONS.map((s) => {
          const t = d.TARGET[s.k], f = d.FLOOR[s.k];
          return (
            <div key={s.k} className="hE-sec">
              <span className="hE-sec__ic">{s.icon}</span>
              <span className="hE-sec__l">{s.label}</span>
              <div className="hE-sec__bar"><i style={{ width: `${(f / 50) * 100}%` }} /><em style={{ left: `${(t / 50) * 100}%` }} /></div>
              <span className="hE-sec__n">FLOOR <b>{f}</b> · TARGET <b>{t}</b> / 50</span>
            </div>
          );
        })}
      </section>

      {/* Neeche pehle "🏟️ Aaj ke match" ki ek lambi qatar thi. Owner ne kaha
          uski jagah Subject Hub wale chaar khaane chahiye — wahi ab yahan. */}
      <SubjectBoxes d={d} />
      {d.cur && !d.cur.life ? <div className="hE-go"><Go b={d.cur} /></div> : null}
    </div>
  );
}

// 🅸 Subject Hub — char khane: GS, Maths, English, Mock+Revision. Har khane
// mein aaj ka topic aur us subject ke aaj ke saare block.
export function HomeSubjects({ d }) {
  return (
    <div className="hI">
      <p className="hI-top">Day <b>{d.day}</b>/{d.N} · {d.phase.name} · CORE <b>{d.stats.coreDone}/{d.stats.coreTotal}</b> · exam <b>{d.toExam}</b> din</p>
      <SubjectBoxes d={d} />
      {d.cur ? <p className="hI-now">▶ Abhi: <b>{splitTitle(d.cur)[0]}</b> · {hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha</p> : null}
    </div>
  );
}
