"use client";

// 🏠 HOME ke 20 roop (owner: "abhi wala hata de, 20 alag variations — har
// subject ke set, wrong sets, todo, aur jo tujhe sahi lage"). Upar dropdown se
// chuno, is device par yaad (cgl.homelay). Saara data lib/homedata se.
//
//  1 Dashboard        — sab ek nazar mein
//  2 Aaj ka mission   — apne aap bani checklist (har subject 2 set + Wrong)
//  3 Subject column   — chaar column, har subject ka apna haal
//  4 Ek button        — bas "agla test" ka bada button
//  5 Countdown        — exam ke din + roz ki zaroori raftaar
//  6 Calendar         — 5 hafte ka heatmap + streak
//  7 Scoreboard       — accuracy aur marks ki patti
//  8 Wrong pehle      — Wrong Sets sabse upar
//  9 Todo board       — apni list + set ke button
// 10 Minimal          — bas link, koi sajawat nahi
// 11 Tiles            — bade rangeen dabbe
// 12 Coach            — data dekh kar salah
// 13 Report           — pichhle test ki table
// 14 Random           — 🎲 kismat se subject
// 15 Hafte ka plan    — 7 din × 4 subject
// 16 Kamzor pehle     — sabse kam accuracy wala upar
// 17 Rings            — aaj ke target ke gol chhalle
// 18 Terminal         — command line jaisa haal
// 19 Resume queue     — chhode hue + Wrong, baaki button
// 20 Aaj ke 3 kaam    — sirf teen sabse zaroori kaam

import Link from "next/link";
import { useState } from "react";
import { useHomeData, SUBJ, PER_DAY, adviceOf, nextUp, dayKeyBack, todayKey, setTodos, CA, openHref } from "@/lib/homedata";
import { fmtMarks, marksOf, maxMarks } from "@/lib/settests";
import "./home20.css";

export const HOME_LAYOUTS = [
  { id: "1", name: "Dashboard" }, { id: "2", name: "Aaj ka mission" }, { id: "3", name: "Subject column" },
  { id: "4", name: "Ek button" }, { id: "5", name: "Countdown + raftaar" }, { id: "6", name: "Calendar heatmap" },
  { id: "7", name: "Scoreboard" }, { id: "8", name: "Wrong pehle" }, { id: "9", name: "Todo board" },
  { id: "10", name: "Minimal" }, { id: "11", name: "Tiles" }, { id: "12", name: "Coach (salah)" },
  { id: "13", name: "Report table" }, { id: "14", name: "Random challenge" }, { id: "15", name: "Hafte ka plan" },
  { id: "16", name: "Kamzor pehle" }, { id: "17", name: "Rings" }, { id: "18", name: "Terminal" },
  { id: "19", name: "Resume queue" }, { id: "20", name: "Aaj ke 3 kaam" },
];
const KEY = "cgl.homelay";
const EXTRA = [
  { href: "/answers", icon: "📖", label: "Answers sets" },
  { href: "/vocab", icon: "🔤", label: "Vocab slides" },
  { href: "/mission/facts", icon: "🧠", label: "Fact log" },
  { href: "/notes/paste", icon: "📝", label: "Notesliner" },
];
const accOf = (b) => (b.right + b.wrong ? Math.round((b.right / (b.right + b.wrong)) * 100) : null);
const subLabel = (k) => (SUBJ.find((s) => s.k === k) || { label: k === "wrong" ? "Wrong Sets" : k === "answers" ? "Answers" : k === "ca" ? CA.label : "Other" }).label;
const subIcon = (k) => (SUBJ.find((s) => s.k === k) || { icon: k === "wrong" ? "🔁" : k === "answers" ? "📖" : k === "ca" ? CA.icon : "📎" }).icon;
const when = (iso) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ── chhote tukde ──
function SubCard({ s, d, big }) {
  const b = d.bySub[s.k];
  const a = accOf(b);
  const tot = d.totals[s.k];
  return (
    <Link href={s.href} className={`h20-sub${big ? " is-big" : ""}`}>
      <span className="h20-sub__i">{s.icon}</span>
      <b>{s.label}</b>
      <small>{b.sets} set diye{tot ? ` / ${tot}` : ""} · aaj {b.today}</small>
      <span className="h20-bar"><i style={{ width: `${tot ? Math.min(100, (b.sets / tot) * 100) : 0}%` }} /></span>
      <small>{a == null ? "abhi koi test nahi" : `accuracy ${a}% · ${b.wrong} galat`}</small>
      <span className="h20-go">▶ Sets</span>
    </Link>
  );
}
function WrongCard({ d, big }) {
  const w = d.wrong;
  return (
    <Link href="/wrong-sets" className={`h20-wrong${big ? " is-big" : ""}`}>
      <b>🔁 Wrong Sets</b>
      <span>{w.pending ? `${w.pending} set baaki · ${w.pendingQ} sawaal` : w.sets ? "Saare wrong set ho gaye ✓" : "Abhi koi galat / chhoda sawaal nahi"}</span>
      <span className="h20-go">▶ Kholo</span>
    </Link>
  );
}
function Resume({ d }) {
  if (!d.progs.length) return null;
  return (
    <div className="h20-box h20-resume">
      <h3>⏸ Beech mein chhode test</h3>
      {d.progs.slice(0, 4).map((p) => (
        <Link key={p.key} href={p.path} className="h20-row"><span>{p.title}</span><small>{Math.floor((p.left || 0) / 60)} min bache</small></Link>
      ))}
    </div>
  );
}
function Todo({ d }) {
  const [t, setT] = useState("");
  const list = d.todos;
  const add = () => { const v = t.trim(); if (!v) return; setTodos([{ id: Date.now().toString(36), t: v, done: false }, ...list]); setT(""); };
  const tog = (id) => setTodos(list.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const del = (id) => setTodos(list.filter((x) => x.id !== id));
  return (
    <div className="h20-box h20-todo">
      <h3>✅ Todo</h3>
      <div className="h20-todo__add">
        <input className="input" value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Kya karna hai… (Enter)" />
        <button type="button" className="btn btn--sm" onClick={add}>Jodo</button>
      </div>
      {list.length ? list.map((x) => (
        <div key={x.id} className={`h20-todo__it${x.done ? " is-done" : ""}`}>
          <label><input type="checkbox" checked={x.done} onChange={() => tog(x.id)} /> {x.t}</label>
          <button type="button" onClick={() => del(x.id)} aria-label="Hatao">✕</button>
        </div>
      )) : <p className="h20-dim">Kuch nahi likha — upar jodo.</p>}
    </div>
  );
}
function Advice({ d, max = 6 }) {
  const a = adviceOf(d).slice(0, max);
  return (
    <div className="h20-box h20-adv">
      <h3>🧭 Salah</h3>
      {a.length ? a.map((x, i) => (
        <div key={i} className="h20-adv__it"><span>{x.icon}</span><p>{x.text}</p>{x.href ? <Link href={x.href} className="btn btn--sm">{x.label}</Link> : null}</div>
      )) : <p className="h20-dim">Aaj sab ho gaya — shabaash! 🎉</p>}
    </div>
  );
}
function Extra() {
  return <div className="h20-extra">{EXTRA.map((x) => <Link key={x.href} href={x.href}>{x.icon} {x.label}</Link>)}</div>;
}
function Days({ d }) {
  return d.daysLeft == null ? null : <span className="h20-days"><b>{d.daysLeft}</b> din baaki</span>;
}

// ── 20 roop ──
const L = {};
L[1] = ({ d }) => (
  <>
    <div className="h20-head"><h2>Aaj · {d.todayN} set diye</h2><Days d={d} /><span className="h20-days">🔥 {d.streak} din</span></div>
    <Resume d={d} />
    <div className="h20-grid4">{SUBJ.map((s) => <SubCard key={s.k} s={s} d={d} />)}</div>
    <div className="h20-two"><WrongCard d={d} /><Advice d={d} max={3} /></div>
    <div className="h20-two"><Todo d={d} /><div className="h20-box"><h3>📌 Aur</h3><Extra /></div></div>
  </>
);
L[2] = ({ d }) => {
  const items = [
    ...SUBJ.flatMap((s) => Array.from({ length: PER_DAY }, (_, i) => ({ key: `${s.k}${i}`, t: `${s.icon} ${s.label} — set ${i + 1}`, done: d.bySub[s.k].today > i, href: s.href }))),
    ...[0, 1].map((i) => ({ key: `ca${i}`, t: `${CA.icon} ${CA.label} — set ${i + 1}`, done: (d.bySub.ca || {}).today > i, href: CA.href })),
    // 🧮 Seedhi poori 2 baar · 🔤 Vocab 150 = 50 ke 3 set · 🧠 Fact log saare 2 baar
    ...[0, 1].map((i) => ({ key: `calc${i}`, t: `🧮 Calculation seedhi — set ${i + 1}`, done: (d.prog.ladder || 0) > i, href: "/calculation" })),
    ...[0, 1, 2].map((i) => ({ key: `voc${i}`, t: `🔤 Vocab — set ${i + 1} (50 word)${(d.prog.vocab || 0) < (i + 1) * 50 && (d.prog.vocab || 0) > i * 50 ? ` · ${(d.prog.vocab || 0) - i * 50}/50` : ""}`, done: (d.prog.vocab || 0) >= (i + 1) * 50, href: "/vocab" })),
    // Pehli slide se aakhri tak = (slides − 1) kadam — ek round.
    ...(d.factSlides ? [0, 1].map((i) => { const R = Math.max(1, d.factSlides - 1); const f = d.prog.facts || 0; return { key: `fact${i}`, t: `🧠 Fact log — round ${i + 1} (saare ${d.factSlides})${f < (i + 1) * R && f > i * R ? ` · ${f - i * R}/${R}` : ""}`, done: f >= (i + 1) * R, href: "/mission/facts" }; }) : []),
    { key: "w", t: "🔁 Ek Wrong Set", done: d.bySub.wrong.today > 0 || (!d.wrong.pending && d.wrong.sets > 0), href: "/wrong-sets" },
    { key: "a", t: "📖 Ek Answers set", done: d.bySub.answers.today > 0, href: "/answers" },
  ];
  const n = items.filter((x) => x.done).length;
  return (
    <div className="h20-box">
      <div className="h20-head"><h2>🎯 Aaj ka mission</h2><span className="h20-days"><b>{n}</b>/{items.length}</span></div>
      <span className="h20-bar is-big"><i style={{ width: `${(n / items.length) * 100}%` }} /></span>
      {items.map((x) => <Link key={x.key} href={x.href} className={`h20-check${x.done ? " is-done" : ""}`}><span>{x.done ? "✅" : "⬜"}</span>{x.t}</Link>)}
      <Todo d={d} />
    </div>
  );
};
L[3] = ({ d }) => (
  <div className="h20-cols">
    {SUBJ.map((s) => {
      const rec = d.recent.filter((r) => r.sub === s.k).slice(0, 4);
      return (
        <div key={s.k} className="h20-col">
          <SubCard s={s} d={d} />
          <h4>Pichhle test</h4>
          {rec.length ? rec.map((r, i) => <p key={i} className="h20-mini">{r.right}✓ {r.wrong}✗ · {when(r.at)}</p>) : <p className="h20-dim">—</p>}
        </div>
      );
    })}
    <div className="h20-col"><WrongCard d={d} /><Resume d={d} /></div>
  </div>
);
L[4] = ({ d }) => {
  const n = nextUp(d);
  return (
    <div className="h20-focus">
      <p className="h20-dim">Sochna nahi — bas dabao:</p>
      <Link href={n.href} className="h20-big">{n.label}</Link>
      <p className="h20-dim">Aaj {d.todayN} set · 🔥 {d.streak} din · <Days d={d} /></p>
    </div>
  );
};
L[5] = ({ d }) => (
  <div className="h20-box">
    <div className="h20-count"><b>{d.daysLeft ?? "—"}</b><span>din exam tak</span></div>
    <table className="h20-table">
      <thead><tr><th>Subject</th><th>Diye</th><th>Baaki</th><th>Roz chahiye</th><th /></tr></thead>
      <tbody>
        {SUBJ.map((s) => {
          const tot = d.totals[s.k] || 0;
          const rest = Math.max(0, tot - d.bySub[s.k].sets);
          const per = d.daysLeft ? Math.ceil(rest / d.daysLeft) : rest;
          return <tr key={s.k}><td>{s.icon} {s.label}</td><td>{d.bySub[s.k].sets}</td><td>{tot ? rest : "…"}</td><td><b>{tot ? per : "…"}</b> set</td><td><Link href={s.href}>▶</Link></td></tr>;
        })}
      </tbody>
    </table>
    <p className="h20-dim">Poora bank khatam karne ke liye roz itne set (sach maano to mixed / galti wale par zor zyada do).</p>
    <WrongCard d={d} />
  </div>
);
L[6] = ({ d }) => {
  const days = Array.from({ length: 35 }, (_, i) => dayKeyBack(34 - i));
  const mx = Math.max(1, ...days.map((k) => d.byDay[k] || 0));
  return (
    <div className="h20-box">
      <div className="h20-head"><h2>📅 5 hafte</h2><span className="h20-days">🔥 {d.streak} din lagatar</span></div>
      <div className="h20-heat">
        {days.map((k) => { const n = d.byDay[k] || 0; return <span key={k} title={`${k}: ${n} set`} style={{ opacity: n ? 0.25 + 0.75 * (n / mx) : 1 }} className={n ? "is-on" : ""}>{n || ""}</span>; })}
      </div>
      <div className="h20-grid4">{SUBJ.map((s) => <SubCard key={s.k} s={s} d={d} />)}</div>
    </div>
  );
};
L[7] = ({ d }) => (
  <div className="h20-box">
    <h2>🏆 Scoreboard</h2>
    {SUBJ.map((s) => {
      const b = d.bySub[s.k]; const a = accOf(b);
      return (
        <Link key={s.k} href={s.href} className="h20-score">
          <span>{s.icon} {s.label}</span>
          <span className="h20-bar"><i style={{ width: `${a || 0}%`, background: a == null ? "" : a >= 80 ? "#27ae60" : a >= 60 ? "#f0ad4e" : "#e00000" }} /></span>
          <b>{a == null ? "—" : `${a}%`}</b>
          <small>{fmtMarks(b.marks)}/{maxMarks(b.right + b.wrong + b.skipped)} marks</small>
        </Link>
      );
    })}
    <WrongCard d={d} />
  </div>
);
L[8] = ({ d }) => (
  <>
    <WrongCard d={d} big />
    <Resume d={d} />
    <div className="h20-grid4">{SUBJ.map((s) => <SubCard key={s.k} s={s} d={d} />)}</div>
  </>
);
L[9] = ({ d }) => (
  <div className="h20-two is-wide">
    <Todo d={d} />
    <div className="h20-box"><h3>▶ Test do</h3>{SUBJ.map((s) => <Link key={s.k} href={s.href} className="h20-row"><span>{s.icon} {s.label}</span><small>aaj {d.bySub[s.k].today}</small></Link>)}<Link href="/wrong-sets" className="h20-row"><span>🔁 Wrong Sets</span><small>{d.wrong.pendingQ} sawaal</small></Link><Extra /></div>
  </div>
);
L[10] = ({ d }) => (
  <div className="h20-min">
    {SUBJ.map((s) => <p key={s.k}><Link href={s.href}>{s.label} sets</Link> — {d.bySub[s.k].sets} diye, aaj {d.bySub[s.k].today}</p>)}
    <p><Link href="/wrong-sets">Wrong sets</Link> — {d.wrong.pendingQ} sawaal baaki</p>
    {d.progs[0] ? <p><Link href={d.progs[0].path}>Resume: {d.progs[0].title}</Link></p> : null}
    {EXTRA.map((x) => <p key={x.href}><Link href={x.href}>{x.label}</Link></p>)}
  </div>
);
L[11] = ({ d }) => (
  <div className="h20-tiles">
    {SUBJ.map((s, i) => <Link key={s.k} href={s.href} className={`h20-tile t${i}`}><span>{s.icon}</span><b>{s.label}</b><small>{d.bySub[s.k].sets} set · aaj {d.bySub[s.k].today}</small></Link>)}
    <Link href="/wrong-sets" className="h20-tile t4"><span>🔁</span><b>Wrong Sets</b><small>{d.wrong.pendingQ} sawaal</small></Link>
    {EXTRA.map((x, i) => <Link key={x.href} href={x.href} className={`h20-tile t${5 + i}`}><span>{x.icon}</span><b>{x.label}</b></Link>)}
  </div>
);
L[12] = ({ d }) => (<><Advice d={d} max={10} /><Resume d={d} /></>);
L[13] = ({ d }) => (
  <div className="h20-box">
    <h2>📊 Pichhle test</h2>
    {d.recent.length ? (
      <table className="h20-table">
        <thead><tr><th>Kab</th><th>Subject</th><th>✓</th><th>✗</th><th>Chhode</th><th>Marks</th></tr></thead>
        <tbody>{d.recent.map((r, i) => <tr key={i}><td>{when(r.at)}</td><td>{subIcon(r.sub)} {subLabel(r.sub)}</td><td>{r.right}</td><td className="is-bad">{r.wrong}</td><td>{r.skipped}</td><td><b>{fmtMarks(marksOf(r))}</b>/{maxMarks(r.total)}</td></tr>)}</tbody>
      </table>
    ) : <p className="h20-dim">Abhi koi test nahi diya.</p>}
    <div className="h20-grid4">{SUBJ.map((s) => <SubCard key={s.k} s={s} d={d} />)}</div>
  </div>
);
L[14] = ({ d }) => {
  const [pick, setPick] = useState(null);
  const roll = () => setPick(SUBJ[Math.floor(Math.random() * SUBJ.length)]);
  return (
    <div className="h20-focus">
      <p className="h20-dim">Aaj kya karein? Kismat se:</p>
      <button type="button" className="h20-dice" onClick={roll}>🎲</button>
      {pick ? <Link href={pick.href} className="h20-big">{pick.icon} {pick.label} ka set do</Link> : <p className="h20-dim">Pase par dabao</p>}
      <WrongCard d={d} />
    </div>
  );
};
L[15] = ({ d }) => {
  const days = Array.from({ length: 7 }, (_, i) => dayKeyBack(6 - i));
  return (
    <div className="h20-box">
      <h2>🗓️ Is hafte</h2>
      <table className="h20-table h20-week">
        <thead><tr><th /> {days.map((k) => <th key={k}>{new Date(k + "T00:00").toLocaleDateString("en-IN", { weekday: "short" })}</th>)}</tr></thead>
        <tbody>
          {[...SUBJ, { k: "wrong", label: "Wrong", icon: "🔁" }].map((s) => (
            <tr key={s.k}><td>{s.icon} {s.label}</td>{days.map((k) => { const n = (d.daySub[k] || {})[s.k] || 0; return <td key={k} className={n >= PER_DAY ? "is-ok" : n ? "is-some" : ""}>{n || ""}</td>; })}</tr>
          ))}
        </tbody>
      </table>
      <p className="h20-dim">Hara = us din {PER_DAY}+ set. Khaali din dikhe to wahi subject aaj pehle.</p>
    </div>
  );
};
L[16] = ({ d }) => {
  const rows = SUBJ.map((s) => ({ s, a: accOf(d.bySub[s.k]) })).sort((x, y) => (x.a ?? -1) - (y.a ?? -1));
  return (
    <div className="h20-box">
      <h2>📉 Kamzor pehle</h2>
      {rows.map(({ s, a }, i) => (
        <Link key={s.k} href={s.href} className={`h20-weak${i === 0 ? " is-top" : ""}`}>
          <b>{i + 1}. {s.icon} {s.label}</b><span>{a == null ? "abhi test nahi — pehle yahi" : `${a}% accuracy`}</span><span className="h20-go">▶</span>
        </Link>
      ))}
      <WrongCard d={d} />
    </div>
  );
};
L[17] = ({ d }) => (
  <div className="h20-box">
    <h2>⭕ Aaj ka target ({PER_DAY} set / subject)</h2>
    <div className="h20-rings">
      {SUBJ.map((s) => {
        const n = Math.min(PER_DAY, d.bySub[s.k].today);
        return (
          <Link key={s.k} href={s.href} className="h20-ring" style={{ "--p": `${(n / PER_DAY) * 100}%` }}>
            <span><b>{d.bySub[s.k].today}</b>/{PER_DAY}</span><small>{s.icon} {s.label}</small>
          </Link>
        );
      })}
      <Link href="/wrong-sets" className="h20-ring" style={{ "--p": d.wrong.pending ? "0%" : "100%" }}><span><b>{d.wrong.pending}</b></span><small>🔁 Wrong baaki</small></Link>
    </div>
  </div>
);
L[18] = ({ d }) => (
  <pre className="h20-term">
    {`$ ssc status --today ${todayKey()}\n`}
    {`  exam        ${d.daysLeft ?? "?"} din baaki\n  streak      ${d.streak} din\n  aaj         ${d.todayN} set\n\n`}
    {SUBJ.map((s) => `  ${s.label.padEnd(16)} ${String(d.bySub[s.k].sets).padStart(3)} set   aaj ${d.bySub[s.k].today}   acc ${accOf(d.bySub[s.k]) ?? "-"}%\n`).join("")}
    {`  ${"Wrong Sets".padEnd(16)} ${String(d.wrong.pendingQ).padStart(3)} sawaal baaki\n\n$ `}
    {SUBJ.map((s) => <Link key={s.k} href={s.href}>{`[${s.slug}] `}</Link>)}
    <Link href="/wrong-sets">[wrong]</Link>
    {d.progs[0] ? <> <Link href={d.progs[0].path}>[resume]</Link></> : null}
  </pre>
);
L[19] = ({ d }) => (
  <div className="h20-two is-wide">
    <div>
      <Resume d={d} />
      <WrongCard d={d} big />
      {!d.progs.length && !d.wrong.pending ? <p className="h20-dim">Koi adhoora kaam nahi — naya set chuno →</p> : null}
    </div>
    <div className="h20-box"><h3>⚡ Naya</h3>{SUBJ.map((s) => <SubCard key={s.k} s={s} d={d} />)}<Extra /></div>
  </div>
);
L[20] = ({ d }) => {
  const top = adviceOf(d).filter((x) => x.href).slice(0, 3);
  return (
    <div className="h20-box">
      <h2>🥇 Aaj ke 3 kaam</h2>
      {top.length ? top.map((x, i) => (
        <Link key={i} href={x.href} className="h20-three"><b>{i + 1}</b><p>{x.icon} {x.text}</p><span className="h20-go">▶</span></Link>
      )) : <p className="h20-dim">Aaj ke saare kaam ho gaye 🎉</p>}
      <Todo d={d} />
    </div>
  );
};

// ✅ FINAL (owner): "13 Report" — sirf 4 subject + Current Affairs + Wrong
// Sets + Answers ke test ("Other" nahi), pakki unchai ka dabba jisme scroll,
// har line par ▶ (wahi set seedha). Neeche subject ke dabbon ki jagah
// "2 · Aaj ka mission". Date-time ki jagah nahi — Accuracy, Chhode aur Marks
// ke beech.
const SHOW = new Set(["math", "reasoning", "english", "gs", "ca", "wrong", "answers"]);
function Final({ d }) {
  const rows = d.recentAll.filter((r) => SHOW.has(r.sub));
  return (
    <>
      <div className="h20-box">
        <h2>📊 Pichhle test</h2>
        <div className="h20-rep">
          {rows.length ? (
            <table className="h20-table">
              <thead><tr><th>Subject</th><th>✓</th><th>✗</th><th>Chhode</th><th>Accuracy</th><th>Marks</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const a = r.right + r.wrong ? Math.round((r.right / (r.right + r.wrong)) * 100) : null;
                  const href = openHref(r);
                  return (
                    <tr key={i}>
                      <td>{subIcon(r.sub)} {subLabel(r.sub)}{r.title ? <small className="h20-rt">{r.title}</small> : null}</td>
                      <td>{r.right}</td>
                      <td className="is-bad">{r.wrong}</td>
                      <td>{r.skipped}</td>
                      <td>{a == null ? "—" : `${a}%`}</td>
                      <td><b>{fmtMarks(marksOf(r))}</b>/{maxMarks(r.total)}</td>
                      <td>{href ? <Link href={href} className="h20-open" title="Ye set kholo">▶</Link> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <p className="h20-dim">Abhi koi test nahi diya — neeche mission se shuru karo.</p>}
        </div>
      </div>
      {L[2]({ d })}
    </>
  );
}

export default function Home20() {
  // Dropdown hata diya — Final (13 Report + 2 Mission). Baaki 20 roop (L)
  // code mein pade hain.
  const d = useHomeData();
  return (
    <section className="section h20">
      <div className="h20-top"><span className="h20-title">🏠 Home</span>{d ? <Days d={d} /> : null}</div>
      {d ? <div className="h20-body h20--final"><Final d={d} /></div> : <p className="h20-dim">…</p>}
    </section>
  );
}
