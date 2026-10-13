"use client";

// 🎮 Answers ke NAYE 40 roop — owner: "abhi kar nahi raha, interest nahi aa
// raha — aise roop do ki mann kare". Kaam wahi (galat sawaal ka jawab dekho →
// ✅ Ho gaya = D0, phir D+1/3/7/14 par 🔁), bas uske upar khel:
//   1–20  target, streak, XP, timer, boss, bingo, quests …
//   21–40 har galti ke saath uske 5 SIMILAR wahin (components/SimInline) —
//         alag page par jaana nahi padta.
//
// Sab kuch lib/ansrev (✅ / 🔁 ka asli hisaab, sync hota hai) se nikalta hai —
// streak, XP, aaj kitne — koi alag ginti nahi. Similar ka din-wise haal
// lib/anssim mein. Card wahi AnswersBoard ka renderCard.

import { useEffect, useMemo, useRef, useState } from "react";
import { dayKey } from "@/lib/wrongbook";
import { getRevMap, markDoneRev, unmarkToday, revPlan, addDaysKey } from "@/lib/ansrev";
import { simItems, simScore, getPicks, simDays, SIM_PER } from "@/lib/anssim";
import SimInline, { SimQ, useSimTick } from "./SimInline";
import { getRun, startFocus, getLog, subjectOfPath, fmtMin } from "@/lib/pomo";
import Markdown from "./Markdown";
import "./answers-play.css";

export const PLAY_LAYOUTS = [
  { id: "p1", name: "🎯 Aaj ka target" },
  { id: "p2", name: "🔥 Streak" },
  { id: "p3", name: "🎮 Level & XP" },
  { id: "p4", name: "⏱️ 5 minute sprint" },
  { id: "p5", name: "🃏 Ek-ek card (skip bhi)" },
  { id: "p6", name: "🗺️ Safar ka nakshaa" },
  { id: "p7", name: "🏅 Badges" },
  { id: "p8", name: "🌱 Paudha ugao" },
  { id: "p9", name: "🍅 Pomodoro 25" },
  { id: "p10", name: "📦 Bas 5 ka dabba" },
  { id: "p11", name: "🎲 Lucky draw" },
  { id: "p12", name: "⚔️ Boss fight" },
  { id: "p13", name: "🧱 Deewar bharo" },
  { id: "p14", name: "📈 Roz ka graph" },
  { id: "p15", name: "🥇 Kal se muqabla" },
  { id: "p16", name: "🏁 Subject race" },
  { id: "p17", name: "🗓️ Hafte ka plan" },
  { id: "p18", name: "🤏 Bas ek sawaal" },
  { id: "p19", name: "🎟️ Bingo" },
  { id: "p20", name: "📜 Aaj ke quest" },
];
export const SIM_LAYOUTS = [
  { id: "s1", name: "🎯 Galti + uske 5 similar" },
  { id: "s2", name: "✅ 4/5 sahi = pakka" },
  { id: "s3", name: "🪜 Seedhi — 5 karo, agla khule" },
  { id: "s4", name: "⚔️ Similar boss (5 vaar)" },
  { id: "s5", name: "🔥 Sahi ki streak" },
  { id: "s6", name: "🌀 Saare similar ek feed mein" },
  { id: "s7", name: "⭐ 5 sitare" },
  { id: "s8", name: "📚 Subject chuno" },
  { id: "s9", name: "📅 Aaj ke 3 (15 sawaal)" },
  { id: "s10", name: "⏱️ 5 sawaal 5 minute" },
  { id: "s11", name: "🃏 Similar flashcard" },
  { id: "s12", name: "🔍 Pehle galti, phir similar" },
  { id: "s13", name: "📉 Kamzor pehle" },
  { id: "s14", name: "💎 Similar XP" },
  { id: "s15", name: "🗓️ Hafte ki challenge (35)" },
  { id: "s16", name: "👨‍🏫 Samjhao — padh ke seekho" },
  { id: "s17", name: "📱 Similar reel" },
  { id: "s18", name: "🔁 Jo galat hue, dobara" },
  { id: "s19", name: "🗺️ Chapter ka nakshaa" },
  { id: "s20", name: "🎓 Mini mock (10 similar)" },
];

const SUB = {
  math: { icon: "🧮", label: "Maths", c: "#3b6cff" },
  gs: { icon: "🌍", label: "GS", c: "#2f9e6e" },
  english: { icon: "📘", label: "English", c: "#a855f7" },
  reasoning: { icon: "🧠", label: "Reasoning", c: "#f59e0b" },
  other: { icon: "📎", label: "Other", c: "#94a3b8" },
};
const subOf = (k) => SUB[k] || SUB.other;
const readJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };
const shortD = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const wkD = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
function seeded(arr, seed) {
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const b = [...arr];
  for (let i = b.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ── saajha ───────────────────────────────────────────────────────────────
function useTimer(sec) {
  const [left, setLeft] = useState(sec);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return undefined;
    if (left <= 0) { setRun(false); return undefined; }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [run, left]);
  return { left, run, start: () => { setLeft(sec); setRun(true); }, stop: () => setRun(false), over: !run && left <= 0 };
}

// Ek sawaal — card + ✅ / 🔁 + (chahe to) uske 5 similar.
function Work({ r, ctx, sim = false, after, simPick }) {
  const p = ctx.plan(r);
  const i = ctx.index.get(r.id) ?? 0;   // card par list wala asli number
  const s = subOf(ctx.bucketOf(r));
  const ch = ctx.chapterOf(r).ch;
  const status = !p.started ? "🆕 Naya" : p.done ? "🏁 Pakka" : p.due ? "🔴 Aaj dohrana" : p.overdue ? `⚠️ ${p.overdue} chhoota` : p.next ? `Agla D+${p.next.gap}` : "";
  return (
    <div className="ap-work">
      <div className="ap-work__bar" style={{ "--sc": s.c }}>
        <span>{s.icon} {s.label}</span>
        {ch ? <span>· {ch.replace(/-/g, " ")}</span> : null}
        <span className="ap-work__st">{status}</span>
      </div>
      {ctx.renderCard(r, i, false)}
      <div className="ap-act">
        {p.revisedToday ? (
          <><span className="ap-ok">✓ Aaj ho gaya</span><button type="button" className="ap-undo" onClick={() => ctx.undo(r.id)}>undo</button></>
        ) : (
          <button type="button" className="ap-go" onClick={() => { ctx.act(r.id); after && after(r); }}>{p.started ? "🔁 Revise kiya" : "✅ Ho gaya"}</button>
        )}
      </div>
      {sim ? <SimInline r={r} onPick={simPick} /> : null}
    </div>
  );
}
const AllDone = ({ children }) => (
  <div className="ap-done"><b>🎉 Aaj ke saare ho gaye!</b><span>{children || "Kal naye dohrane aayenge. Shabaash."}</span></div>
);
function Burst({ n }) {
  if (!n) return null;
  return <div key={n} className="ap-burst" aria-hidden="true">{["🎉", "⭐", "✨", "🔥", "💪", "🎊"].map((e, k) => <i key={k} style={{ "--k": k }}>{e}</i>)}</div>;
}
const Stat = ({ b, s, c }) => <div className="ap-stat" style={c ? { "--c": c } : undefined}><b>{b}</b><span>{s}</span></div>;

// ═══════════════════════ 1–20 · mann lage ═══════════════════════

function Target({ ctx }) {
  const [goal, setGoal] = useState(() => readJ("cgl.ansgoal", 10));
  const setG = (g) => { const v = Math.max(1, Math.min(100, g)); setGoal(v); writeJ("cgl.ansgoal", v); };
  const n = ctx.stats.todayN;
  const pct = Math.min(1, n / goal);
  const r = ctx.queue[0];
  return (
    <div className="ap1">
      <div className="ap1-top">
        <div className="ap1-ring" style={{ "--p": pct }}><b>{n}</b><span>/ {goal}</span></div>
        <div>
          <h2>{n >= goal ? "🎯 Target poora! Ab bonus 🔥" : `Bas ${goal - n} aur — aaj ka target`}</h2>
          <div className="ap-row"><button type="button" onClick={() => setG(goal - 1)}>−</button><span>Roz ka target: <b>{goal}</b></span><button type="button" onClick={() => setG(goal + 1)}>+</button></div>
        </div>
      </div>
      <Burst n={n >= goal ? n : 0} />
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function Streak({ ctx }) {
  const { streak, days, todayN, best } = ctx.stats;
  const last = Array.from({ length: 30 }, (_, k) => addDaysKey(ctx.today, k - 29));
  const r = ctx.queue[0];
  return (
    <div className="ap2">
      <div className="ap2-top">
        <div className="ap2-flame">{todayN ? "🔥" : "🕯️"}<b>{streak}</b><span>din lagatar</span></div>
        <div>
          <h2>{todayN ? "Aaj ka diya jal gaya 🔥" : streak ? `${streak} din ki streak — aaj ek karke bachao!` : "Aaj se streak shuru karo — bas ek sawaal"}</h2>
          <p className="ap-dim">Sabse lambi: {best} din</p>
          <div className="ap2-dots">{last.map((d) => <i key={d} title={`${shortD(d)} · ${days[d] || 0}`} className={days[d] ? "is-on" : d === ctx.today ? "is-today" : ""} />)}</div>
        </div>
      </div>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function Xp({ ctx }) {
  const xp = ctx.stats.total * 10;
  const lvl = Math.floor(xp / 100) + 1;
  const into = xp % 100;
  const [pop, setPop] = useState(0);
  const r = ctx.queue[0];
  const names = ["Shuruaati", "Sipahi", "Yoddha", "Senapati", "Raja", "Samrat", "Chakravarti"];
  return (
    <div className="ap3">
      <div className="ap3-top">
        <div className="ap3-lvl">LV<b>{lvl}</b></div>
        <div className="ap3-mid">
          <b>{names[Math.min(names.length - 1, Math.floor((lvl - 1) / 3))]}</b>
          <div className="ap-bar"><i style={{ width: `${into}%` }} /></div>
          <small>{xp} XP · agle level tak {100 - into} XP ({Math.ceil((100 - into) / 10)} sawaal)</small>
        </div>
        {pop ? <span key={pop} className="ap3-pop">+10 XP</span> : null}
      </div>
      {r ? <Work r={r} ctx={ctx} after={() => setPop((x) => x + 1)} /> : <AllDone />}
    </div>
  );
}

function Sprint({ ctx, sec = 300, keyName = "cgl.ans.best5", title = "5 minute sprint" }) {
  const t = useTimer(sec);
  const [got, setGot] = useState(0);
  const [best, setBest] = useState(() => readJ(keyName, 0));
  useEffect(() => { if (t.over && got > best) { setBest(got); writeJ(keyName, got); } }, [t.over]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = ctx.queue[0];
  if (!t.run && !t.over) {
    return <div className="ap4-start"><h2>⏱️ {title}</h2><p>Jitne ho sakein utne sawaal — ghadi chalegi. Sabse accha: <b>{best}</b></p><button type="button" className="ap-go" onClick={() => { setGot(0); t.start(); }}>▶ Shuru</button></div>;
  }
  if (t.over) {
    return <div className="ap4-start"><h2>⏰ Samay khatam!</h2><p className="ap4-big">{got} sawaal</p><p>{got >= best && got ? "🏆 Naya record!" : `Record: ${best}`}</p><button type="button" className="ap-go" onClick={() => { setGot(0); t.start(); }}>↺ Ek aur round</button></div>;
  }
  return (
    <div className="ap4">
      <div className="ap4-bar"><b>{mmss(t.left)}</b><span>✓ {got}</span><div className="ap-bar"><i style={{ width: `${(t.left / sec) * 100}%` }} /></div></div>
      {r ? <Work r={r} ctx={ctx} after={() => setGot((x) => x + 1)} /> : <AllDone />}
    </div>
  );
}

function OneByOne({ ctx }) {
  const [k, setK] = useState(0);
  const q = ctx.queue;
  const r = q.length ? q[k % q.length] : null;
  return (
    <div className="ap5">
      <div className="ap-row ap5-top"><span>Aaj ✓ <b>{ctx.stats.todayN}</b> · baaki {q.length}</span>{q.length > 1 ? <button type="button" onClick={() => setK(k + 1)}>⏭ Baad mein</button> : null}</div>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function Journey({ ctx }) {
  const doneToday = ctx.list.filter((r) => ctx.plan(r).revisedToday);
  const path = [...doneToday, ...ctx.queue].slice(0, 30);
  const [sel, setSel] = useState(null);
  const cur = sel && !ctx.plan(sel).revisedToday ? sel : ctx.queue[0];
  return (
    <div className="ap6">
      <div className="ap6-path">
        {path.map((r, k) => {
          const d = ctx.plan(r).revisedToday;
          const on = cur && r.id === cur.id;
          return <button key={r.id} type="button" className={`ap6-n${d ? " is-d" : ""}${on ? " is-on" : ""}`} style={{ "--y": `${Math.sin(k / 1.6) * 18}px` }} onClick={() => !d && setSel(r)}>{d ? "✅" : on ? "🚶" : k === path.length - 1 ? "🏁" : subOf(ctx.bucketOf(r)).icon}</button>;
        })}
      </div>
      <p className="ap-dim">Aaj ka safar: {doneToday.length} padaav paar · {ctx.queue.length} baaki</p>
      {cur ? <Work r={cur} ctx={ctx} after={() => setSel(null)} /> : <AllDone />}
    </div>
  );
}

function badgesOf(ctx) {
  const { todayN, total, streak, best, pakka, bySub } = ctx.stats;
  return [
    ["🌟", "Pehla kadam", "Pehla ✅", total >= 1],
    ["✋", "Paanch aaj", "Ek din mein 5", todayN >= 5],
    ["🔟", "Das ka dum", "Ek din mein 10", todayN >= 10],
    ["💯", "Sau", "Kul 100 ✅/🔁", total >= 100],
    ["🎖️", "25 wala", "Kul 25", total >= 25],
    ["🔥", "3 din", "3 din lagatar", Math.max(streak, best) >= 3],
    ["☄️", "Hafta", "7 din lagatar", Math.max(streak, best) >= 7],
    ["🏁", "Pehla pakka", "Ek sawaal D+14 tak", pakka >= 1],
    ["🏆", "10 pakke", "10 sawaal pakke", pakka >= 10],
    ["🧮", "Maths 10", "Maths ke 10 shuru", (bySub.math || 0) >= 10],
    ["🌍", "GS 10", "GS ke 10 shuru", (bySub.gs || 0) >= 10],
    ["📘", "English 10", "English ke 10 shuru", (bySub.english || 0) >= 10],
  ];
}
function Badges({ ctx }) {
  const bs = badgesOf(ctx);
  const next = bs.find((b) => !b[3]);
  const r = ctx.queue[0];
  return (
    <div className="ap7">
      <div className="ap7-wall">{bs.map(([e, n, d, ok]) => <div key={n} className={`ap7-b${ok ? " is-ok" : ""}`} title={d}><i>{ok ? e : "🔒"}</i><b>{n}</b><small>{d}</small></div>)}</div>
      {next ? <p className="ap7-next">Agla badge: <b>{next[0]} {next[1]}</b> — {next[2]}</p> : <p className="ap7-next">Saare badge mil gaye 👑</p>}
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function Plant({ ctx }) {
  const n = ctx.stats.todayN;
  const st = [[0, "🌰", "Beej"], [1, "🌱", "Ankur"], [3, "🌿", "Paudha"], [6, "🪴", "Gamla"], [10, "🌳", "Ped"], [15, "🌸", "Phool!"]];
  let k = 0; st.forEach((x, j) => { if (n >= x[0]) k = j; });
  const nx = st[k + 1];
  const r = ctx.queue[0];
  return (
    <div className="ap8">
      <div className="ap8-pot"><span className="ap8-e" key={k}>{st[k][1]}</span><b>{st[k][2]}</b><small>{nx ? `${nx[0] - n} aur → ${nx[1]} ${nx[2]}` : "Poora khil gaya 🌸"}</small></div>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

// 🍅 Ab site wala hi pomodoro (lib/pomo, neeche-baayen 🍅) — minute subject mein judte hain.
function Pomodoro({ ctx }) {
  const [run, setRun] = useState(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const on = () => setRun(getRun());
    on(); setNow(Date.now());
    window.addEventListener("cgl:pomo", on);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { window.removeEventListener("cgl:pomo", on); clearInterval(t); };
  }, []);
  const today = getLog()[ctx.today] || {};
  const r = ctx.queue[0];
  const sub = subjectOfPath(window.location.pathname, window.location.search);
  if (!run) return <div className="ap4-start"><h2>🍅 25 minute, sirf yahi</h2><p>Phone door, bas Answers. Aaj 🍅 {today._n || 0} · {fmtMin(Object.entries(today).filter(([k]) => k !== "_n").reduce((a, [, v]) => a + v, 0))}</p><button type="button" className="ap-go" onClick={() => startFocus(sub)}>▶ 🍅 Shuru</button></div>;
  // Ghadi aur ⏸ upar wali site ki patti mein (components/PomoGate) — yahan bas kaam.
  return r ? <Work r={r} ctx={ctx} /> : <AllDone />;
}

function Box5({ ctx }) {
  const [box, setBox] = useState(() => ctx.queue.slice(0, 5).map((r) => r.id));
  const [boxes, setBoxes] = useState(0);
  const by = new Map(ctx.list.map((r) => [r.id, r]));
  const items = box.map((id) => by.get(id)).filter(Boolean);
  const left = items.filter((r) => !ctx.plan(r).revisedToday);
  const full = items.length && !left.length;
  return (
    <div className="ap10">
      <div className="ap10-slots">{items.map((r) => <i key={r.id} className={ctx.plan(r).revisedToday ? "is-d" : ""}>{ctx.plan(r).revisedToday ? "✅" : "▢"}</i>)}<span>📦 {boxes} dabbe band</span></div>
      {full ? (
        <div className="ap-done"><b>🎁 Dabba band! Bas itna hi tha.</b><button type="button" className="ap-go" onClick={() => { setBoxes((b) => b + 1); setBox(ctx.queue.slice(0, 5).map((r) => r.id)); }} disabled={!ctx.queue.length}>📦 Ek aur dabba (5)</button></div>
      ) : left[0] ? <Work r={left[0]} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function Lucky({ ctx }) {
  const [pick, setPick] = useState(null);
  const [spin, setSpin] = useState(false);
  const roll = () => {
    if (!ctx.queue.length) return;
    setSpin(true);
    setTimeout(() => { setPick(ctx.queue[Math.floor(Math.random() * ctx.queue.length)]); setSpin(false); }, 900);
  };
  const cur = pick && !ctx.plan(pick).revisedToday ? pick : null;
  return (
    <div className="ap11">
      <div className={`ap11-dice${spin ? " is-spin" : ""}`}>🎲</div>
      {!cur ? <button type="button" className="ap-go" onClick={roll} disabled={spin || !ctx.queue.length}>{spin ? "Ghoom raha…" : "🎲 Aaj ka lucky sawaal"}</button> : null}
      {cur ? <Work r={cur} ctx={ctx} after={() => setPick(null)} /> : !ctx.queue.length ? <AllDone /> : null}
    </div>
  );
}

function Boss({ ctx }) {
  const subs = useMemo(() => {
    const m = {};
    for (const r of ctx.queue) { const k = ctx.bucketOf(r); m[k] = (m[k] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [ctx]);
  const [sub, setSub] = useState(null);
  const k = sub || (subs[0] && subs[0][0]);
  const [hp0] = useState(() => ({}));
  const left = ctx.queue.filter((r) => ctx.bucketOf(r) === k);
  if (k && hp0[k] == null) hp0[k] = Math.max(left.length, 1);
  const hp = left.length;
  const max = Math.max(hp0[k] || 1, hp);
  const s = subOf(k);
  return (
    <div className="ap12">
      <div className="ap-chips">{subs.map(([x, n]) => <button key={x} type="button" className={x === k ? "is-on" : ""} onClick={() => setSub(x)}>{subOf(x).icon} {subOf(x).label} · {n}</button>)}</div>
      {k ? (
        <div className="ap12-boss" style={{ "--sc": s.c }}>
          <span className={`ap12-e${hp === 0 ? " is-dead" : ""}`}>{hp === 0 ? "💀" : "👹"}</span>
          <div><b>{s.label} ka Rakshas</b><div className="ap-bar is-hp"><i style={{ width: `${(hp / max) * 100}%` }} /></div><small>HP {hp}/{max} · har ✅ = ek vaar ⚔️</small></div>
        </div>
      ) : null}
      {left[0] ? <Work r={left[0]} ctx={ctx} /> : <AllDone>{k ? `${s.label} ka rakshas haar gaya! ⚔️` : undefined}</AllDone>}
    </div>
  );
}

function Wall({ ctx }) {
  const [sel, setSel] = useState(null);
  const tiles = ctx.list;
  const st = (r) => { const p = ctx.plan(r); return p.done ? "gold" : p.revisedToday ? "ok" : p.due || p.overdue ? "due" : p.started ? "on" : "new"; };
  const filled = tiles.filter((r) => ctx.plan(r).started).length;
  return (
    <div className="ap13">
      <div className="ap13-h"><b>{Math.round((filled / Math.max(1, tiles.length)) * 100)}%</b> deewar bhari · {filled}/{tiles.length} <span className="ap-dim">(⬜ naya · 🟦 shuru · 🟥 aaj · 🟩 aaj kiya · 🟨 pakka)</span></div>
      <div className="ap13-grid">{tiles.map((r) => <button key={r.id} type="button" className={`ap13-t is-${st(r)}${sel && sel.id === r.id ? " is-sel" : ""}`} onClick={() => setSel(r)} title={subOf(ctx.bucketOf(r)).label} />)}</div>
      {sel ? <Work r={sel} ctx={ctx} /> : <p className="ap-dim">Koi bhi eent dabao — wahi sawaal khulega. Laal wale pehle!</p>}
    </div>
  );
}

function Graph({ ctx }) {
  const d14 = Array.from({ length: 14 }, (_, k) => addDaysKey(ctx.today, k - 13));
  const max = Math.max(1, ...d14.map((d) => ctx.stats.days[d] || 0));
  const r = ctx.queue[0];
  return (
    <div className="ap14">
      <div className="ap14-ch">{d14.map((d) => <div key={d} className={d === ctx.today ? "is-today" : ""}><b>{ctx.stats.days[d] || ""}</b><i style={{ height: `${((ctx.stats.days[d] || 0) / max) * 100}%` }} /><small>{wkD(d)[0]}</small></div>)}</div>
      <p className="ap-dim">Aaj ka danda badhao — har ✅ se upar jata hai.</p>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function VsYesterday({ ctx }) {
  const y = ctx.stats.days[addDaysKey(ctx.today, -1)] || 0;
  const t = ctx.stats.todayN;
  const best = ctx.stats.bestDay;
  const r = ctx.queue[0];
  return (
    <div className="ap15">
      <div className="ap15-row"><Stat b={y} s="Kal" /><Stat b={t} s="Aaj" c={t > y ? "var(--ok)" : "var(--accent)"} /><Stat b={best} s="Sabse accha din" /></div>
      <h2 className="ap15-msg">{t > y ? (t >= best ? "🏆 Aaj tumhara sabse accha din!" : `💪 Kal se aage! Record ke liye ${best - t + 1} aur`) : `Kal ko harane ke liye bas ${y - t + 1} aur`}</h2>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function Race({ ctx }) {
  const subs = useMemo(() => {
    const m = {};
    for (const r of ctx.list) { const k = ctx.bucketOf(r); m[k] ||= { k, n: 0, s: 0 }; m[k].n++; if (ctx.plan(r).started) m[k].s++; }
    return Object.values(m).sort((a, b) => a.s / a.n - b.s / b.n);
  }, [ctx]);
  const [sub, setSub] = useState(null);
  const k = sub || (subs[0] && subs[0].k);
  const r = ctx.queue.find((x) => ctx.bucketOf(x) === k);
  return (
    <div className="ap16">
      {subs.map((x) => (
        <button key={x.k} type="button" className={`ap16-lane${x.k === k ? " is-on" : ""}`} onClick={() => setSub(x.k)} style={{ "--sc": subOf(x.k).c }}>
          <span>{subOf(x.k).label}</span>
          <div className="ap16-track"><i style={{ left: `calc(${(x.s / x.n) * 100}% - 14px)` }}>{subOf(x.k).icon}</i></div>
          <b>{Math.round((x.s / x.n) * 100)}%</b>
        </button>
      ))}
      <p className="ap-dim">Jo peechhe hai use aage badhao — {subOf(k).label} chuna hai.</p>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone>{subOf(k).label} mein aaj kuch baaki nahi.</AllDone>}
    </div>
  );
}

function Week({ ctx }) {
  const pending = ctx.queue.length;
  const per = Math.max(1, Math.ceil(pending / 7));
  const week = Array.from({ length: 7 }, (_, k) => addDaysKey(ctx.today, k));
  const r = ctx.queue[0];
  return (
    <div className="ap17">
      <h2>{pending} baaki → roz sirf <b>{per}</b> karo, hafte mein saaf</h2>
      <div className="ap17-days">{week.map((d, k) => {
        const n = k === 0 ? ctx.stats.todayN : 0;
        return <div key={d} className={k === 0 ? "is-today" : ""}><small>{k === 0 ? "AAJ" : wkD(d)}</small><b>{k === 0 ? `${n}/${per}` : per}</b>{k === 0 ? <div className="ap-bar"><i style={{ width: `${Math.min(100, (n / per) * 100)}%` }} /></div> : null}</div>;
      })}</div>
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

function JustOne({ ctx }) {
  const [step, setStep] = useState("one");
  const r = ctx.queue[0];
  if (!r) return <AllDone />;
  if (step === "ask") {
    return <div className="ap4-start"><h2>Wah! Ek ho gaya 👏</h2><p>Mann hai to bas ek aur?</p><div className="ap-row"><button type="button" className="ap-go" onClick={() => setStep("one")}>👉 Haan, ek aur</button><button type="button" onClick={() => setStep("bye")}>Aaj itna hi</button></div></div>;
  }
  if (step === "bye") return <div className="ap4-start"><h2>👍 Aaj {ctx.stats.todayN} ho gaye</h2><p>Kal phir bas ek se shuru.</p><button type="button" onClick={() => setStep("one")}>Nahi, ek aur karta hu</button></div>;
  return (
    <div className="ap18">
      <h2 className="ap18-h">🤏 Bas ek. Sirf ek sawaal.</h2>
      <Work r={r} ctx={ctx} after={() => setStep("ask")} />
    </div>
  );
}

function Bingo({ ctx }) {
  const grid = useMemo(() => {
    const ids = new Set(ctx.list.map((r) => r.id));
    const saved = readJ("cgl.ans.bingo", {});
    if (saved.d === ctx.today && saved.ids && saved.ids.every((id) => ids.has(id))) return saved.ids;
    const pick = seeded(ctx.queue, ctx.today).slice(0, 9).map((r) => r.id);
    writeJ("cgl.ans.bingo", { d: ctx.today, ids: pick });
    return pick;
  }, [ctx.today]); // eslint-disable-line react-hooks/exhaustive-deps
  const by = new Map(ctx.list.map((r) => [r.id, r]));
  const cells = grid.map((id) => by.get(id)).filter(Boolean);
  const [sel, setSel] = useState(null);
  const d = cells.map((r) => ctx.plan(r).revisedToday);
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]].filter((l) => l.every((x) => d[x])).length;
  const cur = sel && !ctx.plan(sel).revisedToday ? sel : null;
  return (
    <div className="ap19">
      <div className="ap19-top"><b>{lines ? `🎉 BINGO × ${lines}` : "Ek line poori karo!"}</b><span>{d.filter(Boolean).length}/9</span></div>
      <div className="ap19-grid">{cells.map((r, k) => <button key={r.id} type="button" className={`${d[k] ? "is-d" : ""}${cur && cur.id === r.id ? " is-on" : ""}`} onClick={() => !d[k] && setSel(r)}>{d[k] ? "✅" : <>{subOf(ctx.bucketOf(r)).icon}<small>{k + 1}</small></>}</button>)}</div>
      {cur ? <Work r={cur} ctx={ctx} after={() => setSel(null)} /> : <p className="ap-dim">Koi khaana dabao.</p>}
    </div>
  );
}

function Quests({ ctx }) {
  const doneToday = ctx.list.filter((r) => ctx.plan(r).revisedToday);
  const newToday = doneToday.filter((r) => ctx.plan(r).doneToday).length;
  const revToday = doneToday.length - newToday;
  const dueLeft = ctx.queue.filter((r) => ctx.plan(r).started).length;
  const subs = new Set(doneToday.map((r) => ctx.bucketOf(r)));
  const qs = [
    ["🆕 3 naye sawaal shuru karo", Math.min(3, newToday), 3],
    ["🔁 Aaj ke saare dohrane khatam", dueLeft === 0 ? 1 : 0, 1, `${dueLeft} baaki`],
    ["🔁 2 purane dohrao", Math.min(2, revToday), 2],
    ["🎨 2 alag subject chhuo", Math.min(2, subs.size), 2],
    ["⭐ Kul 8 aaj", Math.min(8, doneToday.length), 8],
  ];
  const r = ctx.queue[0];
  return (
    <div className="ap20">
      {qs.map(([t, n, m, extra]) => (
        <div key={t} className={`ap20-q${n >= m ? " is-ok" : ""}`}><span>{n >= m ? "✅" : "⬜"}</span><b>{t}</b><small>{extra || `${n}/${m}`}</small></div>
      ))}
      {r ? <Work r={r} ctx={ctx} /> : <AllDone />}
    </div>
  );
}

// ═══════════════════════ 21–40 · 5 similar wahin ═══════════════════════

// 21 · FINAL (owner): ✅ Ho gaya dabate hi wo sawaal katar mein sabse neeche,
// agla upar aur wahi saamne (lib/answersdone ka waqt — jo kabhi nahi hua wo
// apne kram mein pehle, phir hue wale purane-pehle). Baayen sirf number ki
// patti (isi katar mein), neeche fix ← Pichhla / Agla →. Card ka number
// list wala hi (pakka) — katar ghoomti hai, number nahi.
function SimPair({ ctx }) {
  const order = useMemo(() => {
    const dm = ctx.doneMap || {};
    const not = ctx.list.filter((r) => !dm[r.id]);
    const yes = ctx.list.filter((r) => dm[r.id]).sort((x, y) => (dm[x.id] < dm[y.id] ? -1 : dm[x.id] > dm[y.id] ? 1 : 0));
    return [...not, ...yes];
  }, [ctx.list, ctx.doneMap]);
  const n = order.length;
  const [id, setId] = useState(() => readJ("cgl.ans.s1", ""));
  let k = order.findIndex((r) => r.id === id);
  if (k < 0) k = 0;
  const r = order[k];
  const pick = (nid) => {
    setId(nid); writeJ("cgl.ans.s1", nid);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const go = (d) => pick(order[Math.min(n - 1, Math.max(0, k + d))].id);
  const done = () => {
    ctx.onDone(r);
    // Naye kram mein jo sabse upar hoga — ye wala to ab neeche hai.
    const rest = order.filter((x) => x.id !== r.id);
    pick((rest[0] || r).id);
  };
  const railRef = useRef(null);
  useEffect(() => {
    const el = railRef.current && railRef.current.querySelector(".is-on");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [r && r.id]);
  if (!r) return null;
  const s = subOf(ctx.bucketOf(r));
  const ch = ctx.chapterOf(r).ch;
  const dm = ctx.doneMap || {};
  return (
    <>
      <div className="aps1">
        <nav className="aps1-rail" ref={railRef}>
          {order.map((x) => (
            <button key={x.id} type="button" className={`${x.id === r.id ? "is-on" : ""}${dm[x.id] ? " is-done" : ""}`} onClick={() => pick(x.id)}>
              {(ctx.index.get(x.id) ?? 0) + 1}
            </button>
          ))}
        </nav>
        <div className="aps1-l">
          <div className="ap-work">
            <div className="ap-work__bar" style={{ "--sc": s.c }}>
              <span>{s.icon} {s.label}</span>
              {ch ? <span>· {ch.replace(/-/g, " ")}</span> : null}
            </div>
            {ctx.renderCard(r, ctx.index.get(r.id) ?? 0, false)}
            <div className="ap-act"><button type="button" className="ap-go" onClick={done}>✅ Ho gaya</button></div>
          </div>
        </div>
        <div className="aps1-r"><SimInline r={r} /></div>
      </div>
      <button type="button" className="aps1-nav is-prev" onClick={() => go(-1)} disabled={k <= 0}>← Pichhla</button>
      <button type="button" className="aps1-nav is-next" onClick={() => go(1)} disabled={k >= n - 1}>Agla → <small>{k + 1}/{n}</small></button>
    </>
  );
}

function SimPakka({ ctx }) {
  useSimTick();
  const r = ctx.queue[0];
  if (!r) return <AllDone />;
  const sc = simScore(r.id);
  const pass = sc.made && sc.right >= Math.min(4, sc.made);
  return (
    <div className="aps2">
      <div className={`aps2-gate${pass ? " is-ok" : ""}`}>{pass ? "💪 4/5 sahi — ab ye sawaal pakka! ✅ dabao" : `Pakka tab, jab iske ${SIM_PER} similar mein se 4 sahi hon · abhi ${sc.right}/${sc.made || SIM_PER}`}</div>
      <Work r={r} ctx={ctx} sim />
    </div>
  );
}

function SimLadder({ ctx }) {
  useSimTick();
  const steps = ctx.queue.slice(0, 8);
  const at = steps.findIndex((r) => { const s = simScore(r.id); return !(s.made && s.tried >= s.made); });
  const cur = steps[at < 0 ? 0 : at];
  return (
    <div className="aps3">
      <div className="aps3-steps">{steps.map((r, k) => <span key={r.id} className={k < at || at < 0 ? "is-d" : k === at ? "is-on" : ""}>{k < at || at < 0 ? "✓" : k === at ? "🧗" : "🔒"}</span>)}</div>
      {cur ? <Work r={cur} ctx={ctx} sim /> : <AllDone />}
    </div>
  );
}

function SimBoss({ ctx }) {
  useSimTick();
  const r = ctx.queue[0];
  if (!r) return <AllDone />;
  const sc = simScore(r.id);
  const hp = Math.max(0, SIM_PER - sc.right);
  return (
    <div className="aps4">
      <div className="ap12-boss"><span className={`ap12-e${hp === 0 ? " is-dead" : ""}`}>{hp === 0 ? "💀" : "🐉"}</span><div><b>Is galti ka rakshas</b><div className="ap-bar is-hp"><i style={{ width: `${(hp / SIM_PER) * 100}%` }} /></div><small>Har sahi similar = ek vaar ⚔️ · HP {hp}/{SIM_PER}</small></div></div>
      <Work r={r} ctx={ctx} sim />
    </div>
  );
}

function SimStreak({ ctx }) {
  const [run, setRun] = useState(0);
  const [best, setBest] = useState(() => readJ("cgl.ans.simbest", 0));
  const onPick = (ok) => {
    setRun((x) => {
      const n = ok ? x + 1 : 0;
      if (n > best) { setBest(n); writeJ("cgl.ans.simbest", n); }
      return n;
    });
  };
  const r = ctx.queue[0] || ctx.list[0];
  return (
    <div className="aps5">
      <div className="aps5-top"><b>🔥 {run}</b><span>lagatar sahi · record {best}</span></div>
      <Work r={r} ctx={ctx} sim simPick={onPick} />
    </div>
  );
}

function allSim(ctx) {
  const out = [];
  for (const r of ctx.list) for (const x of simItems(r.id)) out.push({ x, r });
  return out;
}

function SimFeed({ ctx }) {
  useSimTick();
  const picks = getPicks();
  const all = allSim(ctx);
  const [open, setOpen] = useState(null);
  const [n, setN] = useState(20);
  if (!all.length) return <SimEmpty ctx={ctx} />;
  const todo = all.filter((a) => picks[a.x.id] == null);
  const show = [...todo, ...all.filter((a) => picks[a.x.id] != null)].slice(0, n);
  return (
    <div className="aps6">
      <p className="ap-dim">{all.length} similar · {todo.length} baaki</p>
      {show.map(({ x, r }, k) => (
        <div key={x.id} className="aps6-it">
          <SimQ x={x} n={k + 1} picks={picks} />
          <button type="button" className="aps6-src" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "▴ band" : "📎 kis galti ka?"}</button>
          {open === r.id ? <Work r={r} ctx={ctx} /> : null}
        </div>
      ))}
      {n < all.length ? <button type="button" className="ap-go" onClick={() => setN(n + 20)}>Aur 20</button> : null}
    </div>
  );
}
function SimEmpty({ ctx }) {
  const r = ctx.queue[0] || ctx.list[0];
  return <div><p className="ap-dim">Abhi kisi galti ke similar nahi bane — pehla yahin banao 👇</p>{r ? <Work r={r} ctx={ctx} sim /> : null}</div>;
}

function SimStars({ ctx }) {
  useSimTick();
  const r = ctx.queue[0] || ctx.list[0];
  const picks = getPicks();
  const items = simItems(r.id);
  return (
    <div className="aps7">
      <div className="aps7-stars">{Array.from({ length: SIM_PER }, (_, k) => { const x = items[k]; const ok = x && picks[x.id] === x.answer; const bad = x && picks[x.id] != null && !ok; return <span key={k} className={ok ? "is-on" : bad ? "is-bad" : ""}>{ok ? "⭐" : bad ? "✖" : "☆"}</span>; })}</div>
      <Work r={r} ctx={ctx} sim />
    </div>
  );
}

function SimSubject({ ctx }) {
  const subs = [...new Set(ctx.list.map((r) => ctx.bucketOf(r)))];
  const [sub, setSub] = useState(subs[0]);
  const q = ctx.queue.filter((r) => ctx.bucketOf(r) === sub);
  const r = q[0] || ctx.list.find((x) => ctx.bucketOf(x) === sub);
  return (
    <div className="aps8">
      <div className="ap-chips">{subs.map((x) => <button key={x} type="button" className={x === sub ? "is-on" : ""} onClick={() => setSub(x)}>{subOf(x).icon} {subOf(x).label}</button>)}</div>
      {r ? <Work r={r} ctx={ctx} sim /> : <AllDone />}
    </div>
  );
}

function SimToday3({ ctx }) {
  useSimTick();
  const three = useMemo(() => seeded(ctx.list, `s3${ctx.today}`).slice(0, 3), [ctx.today]); // eslint-disable-line react-hooks/exhaustive-deps
  const [k, setK] = useState(0);
  const scores = three.map((r) => simScore(r.id));
  const doneN = scores.reduce((a, s) => a + s.tried, 0);
  const r = three[Math.min(k, three.length - 1)];
  return (
    <div className="aps9">
      <div className="aps9-top"><b>Aaj ke 3 · {doneN}/{three.length * SIM_PER} similar</b><div className="ap-bar"><i style={{ width: `${(doneN / (three.length * SIM_PER)) * 100}%` }} /></div></div>
      <div className="ap-chips">{three.map((x, j) => <button key={x.id} type="button" className={j === k ? "is-on" : ""} onClick={() => setK(j)}>{j + 1} · {subOf(ctx.bucketOf(x)).icon} {scores[j].tried}/{SIM_PER}</button>)}</div>
      {r ? <Work r={r} ctx={ctx} sim /> : null}
    </div>
  );
}

function SimTimer({ ctx }) {
  const t = useTimer(300);
  const [ok, setOk] = useState(0);
  const r = ctx.queue[0] || ctx.list[0];
  if (!t.run && !t.over) return <div className="ap4-start"><h2>⏱️ 5 similar, 5 minute</h2><p>Ek galti ke 5 similar — ghadi ke saath.</p><button type="button" className="ap-go" onClick={() => { setOk(0); t.start(); }}>▶ Shuru</button></div>;
  if (t.over) return <div className="ap4-start"><h2>⏰ Khatam — {ok} sahi</h2><button type="button" className="ap-go" onClick={() => { setOk(0); t.start(); }}>↺ Phir se</button></div>;
  return (
    <div className="ap4">
      <div className="ap4-bar"><b>{mmss(t.left)}</b><span>✓ {ok}</span><div className="ap-bar"><i style={{ width: `${(t.left / 300) * 100}%` }} /></div></div>
      <Work r={r} ctx={ctx} sim simPick={(y) => y && setOk((x) => x + 1)} />
    </div>
  );
}

function SimFlash({ ctx }) {
  useSimTick();
  const all = allSim(ctx);
  const [k, setK] = useState(0);
  const [f, setF] = useState(false);
  if (!all.length) return <SimEmpty ctx={ctx} />;
  const { x } = all[k % all.length];
  return (
    <div className="aps11">
      <div className={`aps11-card${f ? " is-f" : ""}`} onClick={() => setF(!f)}>
        {!f ? <><small>Sawaal · dabao → jawab</small><Markdown>{x.question}</Markdown></> : <><small>Jawab</small><h3>{String.fromCharCode(65 + x.answer)}) <Markdown inline>{x.options[x.answer]}</Markdown></h3>{x.explanation ? <Markdown>{x.explanation}</Markdown> : null}</>}
      </div>
      <div className="ap-row"><button type="button" onClick={() => { setK(k - 1 + all.length); setF(false); }}>←</button><span>{(k % all.length) + 1} / {all.length}</span><button type="button" onClick={() => { setK(k + 1); setF(false); }}>→</button></div>
    </div>
  );
}

function SimSteps({ ctx }) {
  const [step, setStep] = useState(1);
  const r = ctx.queue[0] || ctx.list[0];
  const [rid, setRid] = useState(r && r.id);
  useEffect(() => { if (r && r.id !== rid) { setRid(r.id); setStep(1); } }, [r && r.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <AllDone />;
  return (
    <div className="aps12">
      <div className="aps12-tabs"><span className={step === 1 ? "is-on" : ""}>1 · Galti samjho</span><span className={step === 2 ? "is-on" : ""}>2 · Similar se pakka</span></div>
      {step === 1 ? <><Work r={r} ctx={ctx} /><button type="button" className="ap-go" onClick={() => setStep(2)}>Samajh gaya → ab {SIM_PER} similar</button></>
        : <><SimInline r={r} /><button type="button" onClick={() => setStep(1)}>← Galti phir dekho</button></>}
    </div>
  );
}

function SimWeak({ ctx }) {
  useSimTick();
  const rows = ctx.list.map((r) => ({ r, s: simScore(r.id) })).filter((x) => x.s.tried).sort((a, b) => a.s.right / a.s.tried - b.s.right / b.s.tried);
  const [open, setOpen] = useState(null);
  if (!rows.length) return <SimEmpty ctx={ctx} />;
  return (
    <div className="aps13">
      {rows.map(({ r, s }) => (
        <div key={r.id}>
          <button type="button" className="aps13-row" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <span className={`aps13-sc${s.right / s.tried < 0.6 ? " is-bad" : ""}`}>{s.right}/{s.tried}</span>
            <span>{subOf(ctx.bucketOf(r)).icon} {String(r.q?.question || r.ocrText || r.qid || "Sawaal").slice(0, 80)}</span>
          </button>
          {open === r.id ? <Work r={r} ctx={ctx} sim /> : null}
        </div>
      ))}
    </div>
  );
}

function SimXp({ ctx }) {
  useSimTick();
  const days = simDays();
  const ok = Object.values(days).reduce((a, d) => a + (d.ok || 0), 0);
  const xp = ok * 5 + ctx.stats.total * 10;
  const lvl = Math.floor(xp / 150) + 1;
  const r = ctx.queue[0] || ctx.list[0];
  return (
    <div className="ap3">
      <div className="ap3-top"><div className="ap3-lvl">LV<b>{lvl}</b></div><div className="ap3-mid"><b>💎 {xp} XP</b><div className="ap-bar"><i style={{ width: `${((xp % 150) / 150) * 100}%` }} /></div><small>✅ = 10 XP · sahi similar = 5 XP</small></div></div>
      <Work r={r} ctx={ctx} sim />
    </div>
  );
}

function SimWeek({ ctx }) {
  useSimTick();
  const days = simDays();
  const week = Array.from({ length: 7 }, (_, k) => addDaysKey(ctx.today, k - 6));
  const n = week.reduce((a, d) => a + ((days[d] && days[d].n) || 0), 0);
  const r = ctx.queue[0] || ctx.list[0];
  return (
    <div className="aps15">
      <div className="aps9-top"><b>🗓️ Hafte ki challenge: {n}/35 similar</b><div className="ap-bar"><i style={{ width: `${Math.min(100, (n / 35) * 100)}%` }} /></div><small>{n >= 35 ? "🏆 Challenge poori!" : `Roz 5 — aaj ${(days[ctx.today] && days[ctx.today].n) || 0}`}</small></div>
      <div className="ap14-ch is-sm">{week.map((d) => <div key={d} className={d === ctx.today ? "is-today" : ""}><b>{(days[d] && days[d].n) || ""}</b><i style={{ height: `${Math.min(100, (((days[d] && days[d].n) || 0) / 10) * 100)}%` }} /><small>{wkD(d)[0]}</small></div>)}</div>
      <Work r={r} ctx={ctx} sim />
    </div>
  );
}

function SimTeach({ ctx }) {
  useSimTick();
  const r = ctx.queue[0] || ctx.list[0];
  const items = simItems(r.id);
  return (
    <div className="aps16">
      <Work r={r} ctx={ctx} />
      {!items.length ? <SimInline r={r} /> : (
        <div className="aps16-list">
          <h4>👨‍🏫 Iske jaise {items.length} — jawab ke saath, bas padho</h4>
          {items.map((x, k) => (
            <div key={x.id} className="aps16-it">
              <p><b>{k + 1}.</b> <Markdown inline>{x.question}</Markdown></p>
              <p className="aps16-a">✓ {String.fromCharCode(65 + x.answer)}) <Markdown inline>{x.options[x.answer]}</Markdown></p>
              {x.explanation ? <div className="aps16-x"><Markdown>{x.explanation}</Markdown></div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SimReel({ ctx }) {
  useSimTick();
  const picks = getPicks();
  const all = allSim(ctx);
  if (!all.length) return <SimEmpty ctx={ctx} />;
  return (
    <div className="aps17">
      {all.map(({ x, r }, k) => (
        <section key={x.id} className="aps17-s">
          <small>{k + 1} / {all.length} · {subOf(ctx.bucketOf(r)).icon}</small>
          <SimQ x={x} n={k + 1} picks={picks} />
        </section>
      ))}
    </div>
  );
}

function SimRetry({ ctx }) {
  useSimTick();
  const weak = ctx.list.filter((r) => { const s = simScore(r.id); return s.made && s.tried >= s.made && s.right < 3; });
  const r = weak[0];
  if (!r) return <div><p className="ap-dim">Koi aisi galti nahi jiske similar mein 3 se kam sahi hon 👍</p><SimEmpty ctx={ctx} /></div>;
  const reset = () => { const p = getPicks(); for (const x of simItems(r.id)) delete p[x.id]; try { localStorage.setItem("cgl.qfeed.similar", JSON.stringify(p)); } catch { /* quota */ } window.dispatchEvent(new CustomEvent("cgl:simpool")); };
  return (
    <div className="aps18">
      <p className="aps2-gate">🔁 {weak.length} galtiyan jinke similar mein 3 se kam sahi — phir se karo</p>
      <button type="button" className="ap-go" onClick={reset}>↺ Is wale ke {SIM_PER} phir se</button>
      <Work r={r} ctx={ctx} sim />
    </div>
  );
}

function SimChapters({ ctx }) {
  useSimTick();
  const chs = useMemo(() => {
    const m = new Map();
    for (const r of ctx.list) { const c = ctx.chapterOf(r).ch || "Bina chapter"; if (!m.has(c)) m.set(c, []); m.get(c).push(r); }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [ctx.list]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ch, setCh] = useState(null);
  const [k, setK] = useState(0);
  const items = ch ? (chs.find((x) => x[0] === ch) || [null, []])[1] : [];
  return (
    <div className="aps19">
      <div className="aps19-grid">
        {chs.map(([c, rs]) => {
          const tried = rs.reduce((a, r) => a + simScore(r.id).tried, 0);
          const tot = rs.length * SIM_PER;
          return <button key={c} type="button" className={c === ch ? "is-on" : ""} onClick={() => { setCh(c); setK(0); }}><b>{c.replace(/-/g, " ")}</b><small>{rs.length} galti · {tried}/{tot}</small><div className="ap-bar"><i style={{ width: `${(tried / tot) * 100}%` }} /></div></button>;
        })}
      </div>
      {items.length ? (
        <>
          <div className="ap-row"><button type="button" onClick={() => setK((k - 1 + items.length) % items.length)}>←</button><span>{k + 1} / {items.length}</span><button type="button" onClick={() => setK((k + 1) % items.length)}>→</button></div>
          <Work r={items[k % items.length]} ctx={ctx} sim />
        </>
      ) : <p className="ap-dim">Koi chapter dabao.</p>}
    </div>
  );
}

function SimMock({ ctx }) {
  useSimTick();
  const all = allSim(ctx);
  const [set, setSet] = useState(null);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  if (all.length < 3) return <SimEmpty ctx={ctx} />;
  if (!set) return <div className="ap4-start"><h2>🎓 Mini mock</h2><p>{Math.min(10, all.length)} similar, mila-jula. Ant mein score.</p><button type="button" className="ap-go" onClick={() => { setSet([...all].sort(() => Math.random() - 0.5).slice(0, 10).map((a) => a.x)); setI(0); setAns({}); }}>▶ Shuru</button></div>;
  if (i >= set.length) {
    const right = set.filter((x) => ans[x.id] === x.answer).length;
    return <div className="ap4-start"><h2>🎓 {right} / {set.length}</h2><p>{right >= set.length * 0.8 ? "🏆 Zabardast!" : right >= set.length / 2 ? "💪 Accha — thoda aur" : "📚 Similar wale roop se aur karo"}</p><button type="button" className="ap-go" onClick={() => setSet(null)}>↺ Naya mock</button></div>;
  }
  const x = set[i];
  return (
    <div className="aps20">
      <div className="ap4-bar"><b>{i + 1} / {set.length}</b><div className="ap-bar"><i style={{ width: `${(i / set.length) * 100}%` }} /></div></div>
      <div className="sim-q__t aps20-q"><b>{i + 1}.</b> <Markdown inline>{x.question}</Markdown></div>
      <div className="sim-q__o aps20-o">
        {x.options.map((o, k) => <button key={k} type="button" className={ans[x.id] != null ? (k === x.answer ? "is-y" : k === ans[x.id] ? "is-n" : "is-dim") : ""} disabled={ans[x.id] != null} onClick={() => setAns((a) => ({ ...a, [x.id]: k }))}><i>{String.fromCharCode(65 + k)}</i><Markdown inline>{o}</Markdown></button>)}
      </div>
      {ans[x.id] != null ? <button type="button" className="ap-go" onClick={() => setI(i + 1)}>Agla →</button> : null}
    </div>
  );
}

const COMP = {
  p1: Target, p2: Streak, p3: Xp, p4: Sprint, p5: OneByOne, p6: Journey, p7: Badges, p8: Plant, p9: Pomodoro, p10: Box5,
  p11: Lucky, p12: Boss, p13: Wall, p14: Graph, p15: VsYesterday, p16: Race, p17: Week, p18: JustOne, p19: Bingo, p20: Quests,
  s1: SimPair, s2: SimPakka, s3: SimLadder, s4: SimBoss, s5: SimStreak, s6: SimFeed, s7: SimStars, s8: SimSubject, s9: SimToday3, s10: SimTimer,
  s11: SimFlash, s12: SimSteps, s13: SimWeak, s14: SimXp, s15: SimWeek, s16: SimTeach, s17: SimReel, s18: SimRetry, s19: SimChapters, s20: SimMock,
};
export const isPlayLayout = (id) => !!COMP[id];

// ✅ / 🔁 ka hisaab (lib/ansrev) se: aaj kitne, streak, kul, din-wise.
function statsOf(list, rev, plan, today, bucketOf) {
  const ids = new Set(list.map((r) => r.id));
  const days = {};
  for (const id of Object.keys(rev)) {
    if (!ids.has(id)) continue;
    const e = rev[id];
    if (!e || !e.s) continue;
    const all = [e.s, ...(e.r || [])].map((x) => dayKey(x));
    for (const d of new Set(all)) days[d] = (days[d] || 0) + 1;
  }
  const total = Object.values(days).reduce((a, b) => a + b, 0);
  let streak = 0;
  let d = days[today] ? today : addDaysKey(today, -1);
  while (days[d]) { streak++; d = addDaysKey(d, -1); }
  const keys = Object.keys(days).sort();
  let best = 0, run = 0, prev = "";
  for (const k of keys) { run = prev && addDaysKey(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  let pakka = 0;
  const bySub = {};
  for (const r of list) { const p = plan(r); if (p.done) pakka++; if (p.started) { const k = bucketOf(r); bySub[k] = (bySub[k] || 0) + 1; } }
  return { days, total, todayN: days[today] || 0, streak, best: Math.max(best, streak), bestDay: Math.max(0, ...Object.values(days)), pakka, bySub };
}

export default function AnswersPlay({ lay, list, renderCard, bucketOf, chapterOf, doneMap, onDone }) {
  const [rev, setRev] = useState({});
  const seen = useRef(false);
  useEffect(() => {
    if (!seen.current) { seen.current = true; setRev(getRevMap()); }
    const on = () => setRev(getRevMap());
    window.addEventListener("cgl:ansrev", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:ansrev", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const today = dayKey(new Date().toISOString());
  const plan = useMemo(() => { const c = new Map(); return (r) => { if (!c.has(r.id)) c.set(r.id, revPlan(r, rev, today)); return c.get(r.id); }; }, [rev, today]);
  // Kaam ki line: pehle aaj ke / chhoote dohrane (purane pehle), phir naye.
  const queue = useMemo(() => {
    const due = [], fresh = [];
    for (const r of list) {
      const p = plan(r);
      if (p.revisedToday || p.done) continue;
      if (p.started) { if (p.due || p.overdue) due.push(r); } else fresh.push(r);
    }
    return [...due, ...fresh];
  }, [list, plan]);
  const stats = useMemo(() => statsOf(list, rev, plan, today, bucketOf), [list, rev, plan, today, bucketOf]);
  const index = useMemo(() => new Map(list.map((r, k) => [r.id, k])), [list]);
  const ctx = {
    list, renderCard, bucketOf, chapterOf, plan, queue, stats, today, index, doneMap,
    onDone: (r) => { if (onDone) onDone(r); else setRev(markDoneRev(r.id)); },
    act: (id) => setRev(markDoneRev(id)),
    undo: (id) => setRev(unmarkToday(id)),
  };
  const C = COMP[lay];
  if (!C || !list.length) return null;
  return <div className={`ap ap--${lay}`}><C ctx={ctx} /></div>;
}
