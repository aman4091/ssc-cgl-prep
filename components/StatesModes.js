"use client";

// 🇮🇳 States GK ke PANDRAH tareeke — saat dekhne ke, aath yaad-jaanchne ke.
//
// Ek hi maal (lib/statesgk) ko pandrah tarah se saamne rakha gaya hai, kyunki
// yaad ek hi tarike se nahi hota: kabhi list se, kabhi jode milane se, kabhi
// galti karke. Upar ke dropdown se ek-ek karke dekho aur jo jache wahi rakho.
//
// Har test wale tarike mein pehle ye chunna hota hai ki kis cheez ka test hai
// (nritya / tyohar / janjati / devta / kyun) — mix kabhi nahi hota.

import { useEffect, useMemo, useRef, useState } from "react";
import { STATES, REGIONS, KINDS, pairs, options, shuffle, stateOf } from "@/lib/statesgk";

export const MODES = [
  { k: "state", n: "1 · Rajya ka panna", t: "dekho", d: "Ek rajya chuno — uska sab kuch ek jagah" },
  { k: "dance", n: "2 · Nritya → rajya", t: "dekho", d: "Saare nritya ek list mein" },
  { k: "fest", n: "3 · Tyohar ka table", t: "dekho", d: "Tyohar · rajya · kyun · devta" },
  { k: "tribe", n: "4 · Janjati → rajya", t: "dekho", d: "Saari janjatiyan ek jagah" },
  { k: "god", n: "5 · Devta-wise", t: "dekho", d: "Kis devta ke kitne tyohar" },
  { k: "region", n: "6 · Region ke jatthe", t: "dekho", d: "North-East, South… alag-alag" },
  { k: "trick", n: "7 · Trick sheet", t: "dekho", d: "Yaad rakhne ke hook" },
  { k: "flash", n: "8 · Flashcard", t: "test", d: "Palat kar dekho — khud se poochho" },
  { k: "mcq", n: "9 · MCQ", t: "test", d: "Chaar mein se ek" },
  { k: "rapid", n: "10 · Rapid fire", t: "test", d: "10 second har sawaal" },
  { k: "type", n: "11 · Type karo", t: "test", d: "Jawab khud likho" },
  { k: "match", n: "12 · Jodi milao", t: "test", d: "Paanch-paanch jode" },
  { k: "odd", n: "13 · Alag kaun", t: "test", d: "Teen ek rajya ke, ek bahar ka" },
  { k: "tf", n: "14 · Sahi / Galat", t: "test", d: "Statement par haan-na" },
  { k: "lei", n: "15 · Rozana revision", t: "test", d: "Galat wala baar-baar, sahi wala kam" },
];

// ── chhote tukde ─────────────────────────────────────────────────────────
function KindPick({ kind, setKind }) {
  return (
    <div className="stg-kinds">
      {KINDS.map((x) => (
        <button key={x.k} type="button" className={kind === x.k ? "is-on" : ""} onClick={() => setKind(x.k)}>{x.label}</button>
      ))}
    </div>
  );
}
const Score = ({ r, w, streak, extra, onReset }) => (
  <div className="stg-score">
    <span className="stg-ok">✓ {r}</span>
    <span className="stg-no">✗ {w}</span>
    <span>🔥 {streak}</span>
    {extra}
    <button type="button" className="stg-reset" onClick={onReset}>↻ Naya</button>
  </div>
);

// ═══ 1 · Rajya ka panna ══════════════════════════════════════════════════
function StatePage() {
  const [k, setK] = useState(STATES[0].k);
  const s = stateOf(k);
  return (
    <>
      <select className="stg-sel" value={k} onChange={(e) => setK(e.target.value)} aria-label="Rajya chuno">
        {STATES.map((x) => <option key={x.k} value={x.k}>{x.name}{x.type === "ut" ? " (UT)" : ""}</option>)}
      </select>
      <article className="stg-page">
        <h3>{s.name} <span className="stg-dim">· {s.region}{s.type === "ut" ? " · UT" : ""}</span></h3>
        <h4>🪶 Janjati</h4>
        <p>{s.tribes.join(" · ")}</p>
        <h4>💃 Nritya</h4>
        <p>{s.dances.join(" · ")}</p>
        <h4>🎉 Tyohar</h4>
        <ul className="stg-fl">
          {s.fests.map((f) => (
            <li key={f.n}>
              <b>{f.n}</b> — {f.why}
              {f.god !== "—" ? <span className="stg-god"> 🕉️ {f.god}</span> : null}
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}

// ═══ 2 / 4 · ek cheez ki poori list (dhoondh ke saath) ═══════════════════
function FlatList({ kind }) {
  const [q, setQ] = useState("");
  const all = useMemo(() => pairs(kind).sort((a, b) => a.q.localeCompare(b.q)), [kind]);
  const t = q.trim().toLowerCase();
  const rows = t ? all.filter((x) => x.q.toLowerCase().includes(t) || x.a.toLowerCase().includes(t)) : all;
  return (
    <>
      <input className="stg-find" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 dhoondo…" />
      <div className="stg-two">
        {rows.map((x) => (
          <div key={x.id} className="stg-row"><span>{x.q}</span><b>{x.a}</b></div>
        ))}
      </div>
    </>
  );
}

// ═══ 3 · Tyohar ka poora table ═══════════════════════════════════════════
function FestTable() {
  const [q, setQ] = useState("");
  const rows = [];
  for (const s of STATES) for (const f of s.fests) rows.push({ ...f, s: s.name });
  const t = q.trim().toLowerCase();
  const shown = t ? rows.filter((r) => `${r.n} ${r.s} ${r.why} ${r.god}`.toLowerCase().includes(t)) : rows;
  return (
    <>
      <input className="stg-find" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 tyohar, rajya, devta…" />
      <div className="stg-tw">
        <table className="stg-t">
          <thead><tr><th>Tyohar</th><th>Rajya</th><th>Kyun</th><th>Devta</th></tr></thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}><td><b>{r.n}</b></td><td>{r.s}</td><td>{r.why}</td><td>{r.god}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══ 5 · Devta-wise ══════════════════════════════════════════════════════
function GodWise() {
  const map = new Map();
  for (const s of STATES) for (const f of s.fests) {
    if (!f.god || f.god === "—") continue;
    const key = f.god.split("(")[0].trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ n: f.n, s: s.name });
  }
  const list = [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="stg-two">
      {list.map(([god, fs]) => (
        <div key={god} className="stg-card">
          <h4>🕉️ {god}</h4>
          <ul>{fs.map((f) => <li key={f.n + f.s}><b>{f.n}</b> — {f.s}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

// ═══ 6 · Region ke jatthe ════════════════════════════════════════════════
function RegionWise() {
  const [r, setR] = useState("North-East");
  const list = STATES.filter((s) => s.region === r);
  return (
    <>
      <div className="stg-kinds">
        {REGIONS.map((x) => (
          <button key={x} type="button" className={r === x ? "is-on" : ""} onClick={() => setR(x)}>{x}</button>
        ))}
      </div>
      <div className="stg-two">
        {list.map((s) => (
          <div key={s.k} className="stg-card">
            <h4>{s.name}</h4>
            <p><b>💃</b> {s.dances.slice(0, 4).join(", ")}</p>
            <p><b>🪶</b> {s.tribes.slice(0, 4).join(", ")}</p>
            <p><b>🎉</b> {s.fests.map((f) => f.n).join(", ")}</p>
          </div>
        ))}
      </div>
    </>
  );
}

// ═══ 7 · Trick sheet ═════════════════════════════════════════════════════
// Ye hook hain — matlab poora yaad karne ki jagah ek pakad. Exam mein aadha
// naam dekh kar rajya yaad aa jaye, itna kaafi hai.
const TRICKS = [
  ["“Kut” = Mizoram", "Chapchar Kut, Mim Kut, Pawl Kut — teeno Mizoram ke fasal tyohar."],
  ["“Cham” = Buddhist pahaad", "Singhi Chham (Sikkim), Cham (Ladakh), Bardo Chham (Arunachal) — mask/mukhauta nritya."],
  ["“-attam / -aattam” = Tamil Nadu", "Karagattam, Kolattam, Oyilattam, Mayilattam. Kerala wale “-yattam/-kali”: Mohiniyattam, Ottamthullal, Kolkali."],
  ["Bihu = Assam, Bhangra = Punjab", "B se Bihu–Bihari nahi, ASSAM. Bihar wala hai Jat-Jatin aur Bidesia."],
  ["Chhau teen jagah", "Seraikela (Jharkhand), Mayurbhanj (Odisha), Purulia (West Bengal) — teeno padosi."],
  ["Hornbill = Nagaland", "“Tyoharon ka tyohar”, 1–10 December, Kisama."],
  ["Wangala = Garo, Nongkrem = Khasi", "Meghalaya ki do tribe, do tyohar. Wangala mein 100 drums, devta Saljong (Surya)."],
  ["Hojagiri = Tripura (Reang)", "Sar par ghada, paanv bottle par — Lakshmi ki pooja."],
  ["Cheraw = Mizoram", "Bamboo dance — baans ke beech paanv."],
  ["Perini = Telangana", "Shiva ka yoddha nritya (Kakatiya kaal)."],
  ["Dance ka devta yaad rakho", "Dollu Kunitha–Beereshwara (Shiva), Veeragase–Veerabhadra (Shiva), Karagattam–Mariamman, Mayilattam–Murugan."],
  ["Fasal ke tyohar ek line mein", "Bihu (Assam) · Pongal (TN) · Onam (Kerala) · Baisakhi (Punjab) · Nuakhai (Odisha) · Wangala (Meghalaya) · Solung (Arunachal)."],
  ["Naya saal ek line mein", "Ugadi (AP/Karnataka) · Gudi Padwa (Maharashtra) · Poila Boishakh (WB) · Vishu (Kerala) · Bohag Bihu (Assam) · Losar (Ladakh/Sikkim/Arunachal)."],
  ["Devi ke bade tyohar", "Durga Puja (WB) · Bonalu aur Bathukamma (Telangana) · Attukal Pongala (Kerala) · Bastar Dussehra–Danteshwari (Chhattisgarh) · Mysore Dasara–Chamundeshwari (Karnataka)."],
  ["Surya ke tyohar", "Chhath (Bihar) · Pongal (TN) · Uttarayan (Gujarat) · Wangala (Meghalaya, Saljong) · Konark aur Modhera ke nritya utsav."],
  ["Tribal mele", "Sammakka Saralamma (Telangana — sabse bada) · Bhagoria (MP) · Madai (Chhattisgarh) · Hornbill (Nagaland)."],
  ["Sabse badi janjati", "Bharat mein Gond (MP) · Odisha mein Kondh · Arunachal mein Nyishi · Meghalaya mein Khasi/Garo."],
  ["Konyak = chehre par gudai", "Nagaland ki tribe, Aoling unka naya saal."],
  ["Bonda, Juang, Saora = Odisha", "PVTG naam sun kar Odisha soch lo (Kondh bhi wahin)."],
  ["Toda = Nilgiri (Tamil Nadu)", "Kota, Kurumba, Badaga bhi wahi pahaad."],
  ["Jarawa, Onge, Sentinelese, Shompen = Andaman", "Shompen sirf Great Nicobar mein."],
  ["Gaddi–Gujjar = pahaadi charwahe", "Himachal aur J&K dono mein milte hain (Bakarwal sirf J&K)."],
];
function TrickSheet() {
  return (
    <div className="stg-two">
      {TRICKS.map(([h, b]) => (
        <div key={h} className="stg-card stg-trick"><h4>🧠 {h}</h4><p>{b}</p></div>
      ))}
    </div>
  );
}

// ═══ 8 · Flashcard ═══════════════════════════════════════════════════════
function Flash() {
  const [kind, setKind] = useState("dance");
  const list = useMemo(() => shuffle(pairs(kind)), [kind]);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => { setI(0); setOpen(false); }, [kind]);
  const x = list[i % list.length];
  const go = (d) => { setOpen(false); setI((p) => (p + d + list.length) % list.length); };
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <div className={`stg-flash${open ? " is-open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <small>{open ? "jawab" : KINDS.find((k) => k.k === kind).ask}</small>
        <b>{open ? x.a : x.q}</b>
        {open && x.extra ? <em>{x.extra}</em> : null}
        <span className="stg-dim">tap karo — palat jayega</span>
      </div>
      <div className="stg-nav">
        <button type="button" onClick={() => go(-1)}>← Pichla</button>
        <span className="stg-dim">{(i % list.length) + 1} / {list.length}</span>
        <button type="button" onClick={() => go(1)}>Agla →</button>
      </div>
    </>
  );
}

// ═══ 9 / 10 · MCQ aur Rapid fire ═════════════════════════════════════════
function Quiz({ rapid }) {
  const [kind, setKind] = useState("dance");
  const all = useMemo(() => pairs(kind), [kind]);
  const [queue, setQueue] = useState(() => shuffle(all));
  const [i, setI] = useState(0);
  const [mark, setMark] = useState(null);
  const [chosen, setChosen] = useState("");
  const [r, setR] = useState(0); const [w, setW] = useState(0); const [st, setSt] = useState(0);
  const [left, setLeft] = useState(10);
  useEffect(() => { setQueue(shuffle(all)); setI(0); setMark(null); setR(0); setW(0); setSt(0); }, [all]);
  const x = queue[i] || null;
  const opts = useMemo(() => (x ? options(x, all) : []), [x, all]);

  const next = () => {
    setMark(null); setChosen(""); setLeft(10);
    setI((p) => { const n = p + 1; if (n < queue.length) return n; setQueue(shuffle(all)); return 0; });
  };
  const answer = (o) => {
    if (mark) return;
    setChosen(o);
    if (o === x.a) { setR((v) => v + 1); setSt((v) => v + 1); setMark("ok"); setTimeout(next, 500); }
    else { setW((v) => v + 1); setSt(0); setMark("no"); }
  };
  // Rapid fire: 10 second, waqt khatam = galat.
  useEffect(() => {
    if (!rapid || mark || !x) return undefined;
    if (left <= 0) { setW((v) => v + 1); setSt(0); setMark("no"); return undefined; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [rapid, left, mark, x]);

  if (!x) return null;
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <Score r={r} w={w} streak={st} onReset={() => { setQueue(shuffle(all)); setI(0); setMark(null); setR(0); setW(0); setSt(0); }}
        extra={rapid ? <span className={left <= 3 ? "stg-no" : "stg-dim"}>⏱ {Math.max(0, left)}s</span> : null} />
      <div className={`stg-q${mark === "ok" ? " is-ok" : mark === "no" ? " is-no" : ""}`}>
        <small>{KINDS.find((k) => k.k === kind).ask}</small>
        <b>{x.q}</b>
        <div className="stg-opts">
          {opts.map((o) => (
            <button key={o} type="button" onClick={() => answer(o)}
              className={mark && o === x.a ? "is-ok" : mark === "no" && o === chosen ? "is-no" : ""}>{o}</button>
          ))}
        </div>
        {mark === "no" && <p className="stg-ans">Sahi: <b>{x.a}</b> <button type="button" onClick={next}>Agla →</button></p>}
      </div>
    </>
  );
}

// ═══ 11 · Type karo ══════════════════════════════════════════════════════
function TypeIt() {
  const [kind, setKind] = useState("dance");
  const all = useMemo(() => pairs(kind), [kind]);
  const [queue, setQueue] = useState(() => shuffle(all));
  const [i, setI] = useState(0);
  const [v, setV] = useState("");
  const [mark, setMark] = useState(null);
  const [r, setR] = useState(0); const [w, setW] = useState(0); const [st, setSt] = useState(0);
  const box = useRef(null);
  useEffect(() => { setQueue(shuffle(all)); setI(0); setV(""); setMark(null); }, [all]);
  useEffect(() => { box.current?.focus(); }, [i]);
  const x = queue[i] || null;
  const next = () => { setV(""); setMark(null); setI((p) => { const n = p + 1; if (n < queue.length) return n; setQueue(shuffle(all)); return 0; }); };
  const submit = (e) => {
    e.preventDefault();
    if (mark === "no") { next(); return; }
    const got = v.trim().toLowerCase();
    const want = String(x.a).toLowerCase();
    const ok = !!got && (want.includes(got) && got.length >= 4 || got === want);
    if (ok) { setR((n) => n + 1); setSt((n) => n + 1); setMark("ok"); setTimeout(next, 500); }
    else { setW((n) => n + 1); setSt(0); setMark("no"); }
  };
  if (!x) return null;
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <Score r={r} w={w} streak={st} onReset={() => { setQueue(shuffle(all)); setI(0); setV(""); setMark(null); setR(0); setW(0); setSt(0); }} />
      <div className={`stg-q${mark === "ok" ? " is-ok" : mark === "no" ? " is-no" : ""}`}>
        <small>{KINDS.find((k) => k.k === kind).ask}</small>
        <b>{x.q}</b>
        <form onSubmit={submit} className="stg-form">
          <input ref={box} value={v} onChange={(e) => { setV(e.target.value); if (mark === "no") setMark(null); }} placeholder="jawab likho…" autoComplete="off" />
          <button type="submit" className="btn btn--primary btn--sm">{mark === "no" ? "Agla →" : "Check"}</button>
        </form>
        {mark === "no" && <p className="stg-ans">Sahi: <b>{x.a}</b></p>}
      </div>
    </>
  );
}

// ═══ 12 · Jodi milao ═════════════════════════════════════════════════════
function Match() {
  const [kind, setKind] = useState("dance");
  const all = useMemo(() => pairs(kind), [kind]);
  const [round, setRound] = useState(0);
  const set = useMemo(() => {
    const picked = [];
    const seen = new Set();
    for (const x of shuffle(all)) {
      if (picked.length >= 5) break;
      if (seen.has(x.a)) continue;          // paanch alag-alag jawab, warna jodi ban hi nahi sakti
      seen.add(x.a); picked.push(x);
    }
    return { left: shuffle(picked), right: shuffle(picked.map((x) => x.a)) };
  }, [all, round]);
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState("");
  useEffect(() => { setPick(null); setDone([]); setBad(""); }, [set]);

  const tapRight = (a) => {
    if (!pick) return;
    if (pick.a === a) { setDone((d) => [...d, pick.id]); setPick(null); setBad(""); }
    else { setBad(a); setTimeout(() => setBad(""), 500); }
  };
  const over = done.length === set.left.length;
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <p className="stg-dim">Baayen se ek chuno, phir dayein uska rajya. {done.length} / {set.left.length} ho gaye.</p>
      <div className="stg-match">
        <div>
          {set.left.map((x) => (
            <button key={x.id} type="button" disabled={done.includes(x.id)}
              className={`${done.includes(x.id) ? "is-done" : ""}${pick && pick.id === x.id ? " is-pick" : ""}`}
              onClick={() => setPick(x)}>{x.q}</button>
          ))}
        </div>
        <div>
          {set.right.map((a) => (
            <button key={a} type="button" disabled={done.some((id) => set.left.find((l) => l.id === id)?.a === a)}
              className={`${done.some((id) => set.left.find((l) => l.id === id)?.a === a) ? "is-done" : ""}${bad === a ? " is-no" : ""}`}
              onClick={() => tapRight(a)}>{a}</button>
          ))}
        </div>
      </div>
      {over && <p className="stg-ans">✅ Poora ho gaya. <button type="button" onClick={() => setRound((n) => n + 1)}>Naye paanch →</button></p>}
    </>
  );
}

// ═══ 13 · Alag kaun ══════════════════════════════════════════════════════
function OddOne() {
  const [kind, setKind] = useState("dance");
  const all = useMemo(() => pairs(kind), [kind]);
  const [round, setRound] = useState(0);
  const [r, setR] = useState(0); const [w, setW] = useState(0);
  const [mark, setMark] = useState(null);
  const puz = useMemo(() => {
    // Ek rajya jiske teen item hain + ek dusre rajya ka.
    const byState = new Map();
    for (const x of all) { if (!byState.has(x.a)) byState.set(x.a, []); byState.get(x.a).push(x); }
    const big = [...byState.entries()].filter(([, v]) => v.length >= 3);
    const [name, items] = big[Math.floor(Math.random() * big.length)];
    const three = shuffle(items).slice(0, 3);
    const other = shuffle(all.filter((x) => x.a !== name))[0];
    return { name, rows: shuffle([...three, other]), odd: other };
  }, [all, round]);
  useEffect(() => { setMark(null); }, [puz]);
  const tap = (x) => {
    if (mark) return;
    const ok = x.id === puz.odd.id;
    setMark(ok ? "ok" : "no");
    if (ok) setR((n) => n + 1); else setW((n) => n + 1);
  };
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <Score r={r} w={w} streak={0} onReset={() => { setR(0); setW(0); setRound((n) => n + 1); }} />
      <div className="stg-q">
        <small>Teen ek hi rajya ke hain — chautha alag hai. Alag wale par tap karo.</small>
        <div className="stg-opts">
          {puz.rows.map((x) => (
            <button key={x.id} type="button" onClick={() => tap(x)}
              className={mark && x.id === puz.odd.id ? "is-ok" : ""}>{x.q}</button>
          ))}
        </div>
        {mark && (
          <p className="stg-ans">
            {mark === "ok" ? "✅ Sahi!" : "❌ Nahi."} Teen the <b>{puz.name}</b> ke, alag tha <b>{puz.odd.q}</b> ({puz.odd.a}).
            <button type="button" onClick={() => setRound((n) => n + 1)}>Agla →</button>
          </p>
        )}
      </div>
    </>
  );
}

// ═══ 14 · Sahi / Galat ═══════════════════════════════════════════════════
function TrueFalse() {
  const [kind, setKind] = useState("dance");
  const all = useMemo(() => pairs(kind), [kind]);
  const [round, setRound] = useState(0);
  const [r, setR] = useState(0); const [w, setW] = useState(0); const [st, setSt] = useState(0);
  const [mark, setMark] = useState(null);
  const q = useMemo(() => {
    const x = shuffle(all)[0];
    const flip = Math.random() < 0.5;
    const other = shuffle(all.filter((y) => y.a !== x.a))[0];
    return { x, said: flip ? other.a : x.a, truth: !flip };
  }, [all, round]);
  useEffect(() => { setMark(null); }, [q]);
  const tap = (v) => {
    if (mark) return;
    const ok = v === q.truth;
    setMark(ok ? "ok" : "no");
    if (ok) { setR((n) => n + 1); setSt((n) => n + 1); } else { setW((n) => n + 1); setSt(0); }
  };
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <Score r={r} w={w} streak={st} onReset={() => { setR(0); setW(0); setSt(0); setRound((n) => n + 1); }} />
      <div className={`stg-q${mark === "ok" ? " is-ok" : mark === "no" ? " is-no" : ""}`}>
        <small>Ye baat sahi hai ya galat?</small>
        <b>{q.x.q} — {q.said}</b>
        <div className="stg-tf">
          <button type="button" onClick={() => tap(true)}>✅ Sahi</button>
          <button type="button" onClick={() => tap(false)}>❌ Galat</button>
        </div>
        {mark && (
          <p className="stg-ans">
            {mark === "ok" ? "✅ Theek" : "❌ Nahi"} — asli jawab <b>{q.x.a}</b>.
            <button type="button" onClick={() => setRound((n) => n + 1)}>Agla →</button>
          </p>
        )}
      </div>
    </>
  );
}

// ═══ 15 · Rozana revision (Leitner) ══════════════════════════════════════
// Har sawaal ka apna dabba (1-5). Sahi hua to upar ke dabbe mein (der se
// dobara aayega), galat hua to seedha dabba 1 (turant phir aayega).
const LEI = "cgl.states.lei";
const GAP = [0, 0, 1, 3, 7, 15];   // dabbe ka intezaar (din)
const readLei = () => { try { return JSON.parse(localStorage.getItem(LEI) || "{}") || {}; } catch { return {}; } };
const writeLei = (v) => { try { localStorage.setItem(LEI, JSON.stringify(v)); } catch { /* ignore */ } };

function Leitner() {
  const [kind, setKind] = useState("dance");
  const all = useMemo(() => pairs(kind), [kind]);
  const [box, setBox] = useState({});
  const [x, setX] = useState(null);
  const [mark, setMark] = useState(null);
  const [chosen, setChosen] = useState("");
  const [r, setR] = useState(0); const [w, setW] = useState(0);
  useEffect(() => { setBox(readLei()); }, []);

  const due = useMemo(() => {
    const now = Date.now();
    return all.filter((it) => {
      const b = box[it.id];
      if (!b) return true;
      return now - b.at >= GAP[b.b] * 86400000;
    });
  }, [all, box]);
  useEffect(() => { setX(due.length ? shuffle(due)[0] : null); setMark(null); }, [kind, due.length]);
  const opts = useMemo(() => (x ? options(x, all) : []), [x, all]);

  const answer = (o) => {
    if (!x || mark) return;
    setChosen(o);
    const ok = o === x.a;
    const cur = box[x.id] || { b: 1, at: 0 };
    const nb = { ...box, [x.id]: { b: ok ? Math.min(5, cur.b + 1) : 1, at: Date.now() } };
    setBox(nb); writeLei(nb);
    setMark(ok ? "ok" : "no");
    if (ok) { setR((n) => n + 1); setTimeout(() => setMark(null), 500); } else setW((n) => n + 1);
  };

  const counts = [1, 2, 3, 4, 5].map((b) => all.filter((it) => (box[it.id]?.b || 1) === b && box[it.id]).length);
  return (
    <>
      <KindPick kind={kind} setKind={setKind} />
      <div className="stg-boxes">
        {counts.map((c, i) => <span key={i}>Dabba {i + 1}<b>{c}</b></span>)}
        <span className="stg-dim">baaki aaj: {due.length}</span>
      </div>
      {!x ? (
        <p className="stg-ans">🎉 Aaj ka sab ho gaya — agla lot apne din par aayega.</p>
      ) : (
        <div className={`stg-q${mark === "ok" ? " is-ok" : mark === "no" ? " is-no" : ""}`}>
          <small>{KINDS.find((k) => k.k === kind).ask} · dabba {box[x.id]?.b || 1}</small>
          <b>{x.q}</b>
          <div className="stg-opts">
            {opts.map((o) => (
              <button key={o} type="button" onClick={() => answer(o)}
                className={mark && o === x.a ? "is-ok" : mark === "no" && o === chosen ? "is-no" : ""}>{o}</button>
            ))}
          </div>
          {mark === "no" && (
            <p className="stg-ans">Sahi: <b>{x.a}</b> — ye dabba 1 mein wapas.
              <button type="button" onClick={() => { setMark(null); setX(shuffle(due)[0]); }}>Agla →</button>
            </p>
          )}
          <span className="stg-dim">✓ {r} · ✗ {w}</span>
        </div>
      )}
    </>
  );
}

// ── jo bhi tarika chuna ho, wahi ────────────────────────────────────────
export default function StatesMode({ mode }) {
  switch (mode) {
    case "state": return <StatePage />;
    case "dance": return <FlatList kind="dance" />;
    case "fest": return <FestTable />;
    case "tribe": return <FlatList kind="tribe" />;
    case "god": return <GodWise />;
    case "region": return <RegionWise />;
    case "trick": return <TrickSheet />;
    case "flash": return <Flash />;
    case "mcq": return <Quiz rapid={false} />;
    case "rapid": return <Quiz rapid />;
    case "type": return <TypeIt />;
    case "match": return <Match />;
    case "odd": return <OddOne />;
    case "tf": return <TrueFalse />;
    case "lei": return <Leitner />;
    default: return null;
  }
}
