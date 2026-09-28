"use client";

// 🧩 Notes ke har page par: poora page DeepSeek ko → JODI MILAO, yahin
// popup mein (Bharat Sanskriti par nahi — owner ka niyam). Jodiyan kram se
// 5-5 ke set mein: 10 bani to Set 1/2, Set 2/2. Pehli baar dabao to banti
// hain (paisa ek hi baar, `cgl.culture.notesets` mein bachti hain), phir
// button seedha popup kholta hai. Jodi milne ke baad ✏️ Edit; 🔄 = naya.

import { useEffect, useMemo, useState } from "react";
import { notesPairs } from "@/lib/client-ai";
import { readNoteSets, saveNoteSet } from "@/lib/culturepairs";
import "./jodi.css";

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// Text ko line ke kinaare se ~max akshar ke tukdon mein.
function chunks(t, max) {
  const out = [];
  let cur = "";
  for (const line of t.split(/\n/)) {
    if (cur && cur.length + line.length > max) { out.push(cur); cur = ""; }
    if (line.length > max) { for (let i = 0; i < line.length; i += max) out.push(line.slice(i, i + max)); continue; }
    cur += (cur ? "\n" : "") + line;
  }
  if (cur.trim()) out.push(cur);
  return out.length ? out : [t];
}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, "");

function EditPair({ x, onSave, onDel, onCancel }) {
  const [f, setF] = useState({ l: x.l, r: x.r, note: x.note || "" });
  return (
    <div className="jd-edit" onClick={(e) => e.stopPropagation()}>
      <input value={f.l} onChange={(e) => setF({ ...f, l: e.target.value })} placeholder="Baayen" />
      <input value={f.r} onChange={(e) => setF({ ...f, r: e.target.value })} placeholder="Daayen" />
      <textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Explanation" />
      <div>
        <button type="button" className="jd-save" onClick={() => f.l.trim() && f.r.trim() && onSave({ l: f.l.trim(), r: f.r.trim(), note: f.note.trim() })}>💾 Save</button>
        <button type="button" onClick={onCancel}>Radd</button>
        <button type="button" className="jd-del" onClick={() => confirm("Ye jodi hata dein?") && onDel()}>🗑️ Hatao</button>
      </div>
    </div>
  );
}

function Play({ pairs, onChange }) {
  const nSets = Math.max(1, Math.ceil(pairs.length / 5));
  const [si, setSi] = useState(0);
  const cur = Math.min(si, nSets - 1);
  const set = useMemo(() => pairs.map((p, i) => ({ ...p, i })).slice(cur * 5, cur * 5 + 5), [pairs, cur]);
  const left = useMemo(() => shuffle(set), [set]);
  const right = useMemo(() => shuffle(set), [set]);
  const [sel, setSel] = useState(null);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  const [missed, setMissed] = useState([]);
  const [edit, setEdit] = useState(null);
  useEffect(() => { setSel(null); setDone([]); setMissed([]); setEdit(null); }, [cur, pairs.length]);
  const tryR = (m) => {
    if (sel == null || done.includes(m.i)) return;
    const a = set.find((x) => x.i === sel);
    if (norm(a.r) === norm(m.r)) { setDone((d) => [...d, sel]); setSel(null); }
    else { setMissed((x) => [...x, sel]); setBad(m.i); setTimeout(() => setBad(null), 450); }
  };
  const allDone = done.length === set.length;
  return (
    <div className="jd">
      <div className="jd-sets">
        {Array.from({ length: nSets }, (_, i) => <button key={i} type="button" className={i === cur ? "is-on" : ""} onClick={() => setSi(i)}>Set {i + 1}</button>)}
        <span>{done.length}/{set.length} jodi</span>
      </div>
      <div className="jd-cols">
        <div>{left.map((m) => <button key={m.i} type="button" className={done.includes(m.i) ? "is-ok" : sel === m.i ? "is-sel" : ""} onClick={() => !done.includes(m.i) && setSel(m.i)}>{m.l}</button>)}</div>
        <div>{right.map((m) => <button key={m.i} type="button" className={done.includes(m.i) ? "is-ok" : bad === m.i ? "is-bad" : ""} onClick={() => tryR(m)}>{m.r}</button>)}</div>
      </div>
      {done.length > 0 && (
        <ul className="jd-notes">
          {set.filter((x) => done.includes(x.i)).map((x) => (
            <li key={x.i} className={missed.includes(x.i) ? "is-miss" : ""}>
              <b>{x.l}</b> = <b>{x.r}</b>{x.note ? <span> — {x.note}</span> : null}
              {edit === x.i
                ? <EditPair x={x}
                  onSave={(p) => { const n = [...pairs]; n[x.i] = { ...n[x.i], ...p }; onChange(n); setEdit(null); }}
                  onDel={() => { onChange(pairs.filter((_, k) => k !== x.i)); setEdit(null); }}
                  onCancel={() => setEdit(null)} />
                : <button type="button" className="jd-edbtn" onClick={() => setEdit(x.i)}>✏️ Edit</button>}
            </li>
          ))}
        </ul>
      )}
      {allDone && (
        <div className="jd-next">
          <button type="button" onClick={() => { setDone([]); setMissed([]); setSi(cur); setSel(null); }}>↺ Yahi set dobara</button>
          {cur < nSets - 1 ? <button type="button" className="jd-go" onClick={() => setSi(cur + 1)}>Agla set →</button> : <button type="button" className="jd-go" onClick={() => setSi(0)}>🎉 Pehle set se</button>}
        </div>
      )}
    </div>
  );
}

export default function NotesPairsBtn({ pageKey, title, page, text }) {
  const [rec, setRec] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    const load = () => setRec(readNoteSets()[pageKey] || null);
    load();
    window.addEventListener("cgl:culture-pairs", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:culture-pairs", load); window.removeEventListener("cgl:sync-applied", load); };
  }, [pageKey]);
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const n = rec?.pairs?.length || 0;
  // Poora page ek saath nahi banta to thoda-thoda: page ~2500 akshar ke
  // tukdon mein, har tukde ki jodiyan bante hi save. Koi tukda fail ho to
  // use aadha karke dobara; phir bhi na bane to chhod kar aage.
  const make = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    let queue = chunks(String(text || ""), 2500);
    const total = queue.length;
    let got = [], done = 0, lastErr = "";
    const seen = new Set();
    while (queue.length) {
      const part = queue.shift();
      setBusy(`${Math.min(done + 1, total)}/${total}`);
      try {
        const d = await notesPairs(part, title || "");
        for (const p of d.pairs || []) {
          const k = String(p.l).toLowerCase();
          if (!seen.has(k)) { seen.add(k); got.push(p); }
        }
        done++;
        const r = { title: title || "Notes", page, pairs: got };
        saveNoteSet(pageKey, r); setRec(r);
      } catch (e) {
        lastErr = e.message;
        if (/key|401|402|balance/i.test(lastErr)) break;
        if (part.length > 700) queue = [...chunks(part, Math.ceil(part.length / 2)), ...queue];
        else done++;
      }
    }
    setBusy(false);
    if (got.length) setOpen(true);
    else setErr(lastErr || "Jodiyan nahi bani — dobara dabao.");
  };
  const change = (pairs) => { const r = { ...rec, pairs }; saveNoteSet(pageKey, r); setRec(r); };
  return (
    <>
      <button
        className="nt-gemini"
        disabled={busy}
        onClick={() => (n ? setOpen(true) : make())}
        title={err || (n ? `Is page ki ${n} jodiyan — ${Math.ceil(n / 5)} set (Jodi milao)` : "Is page se DeepSeek Jodi milao ke set banaye (5-5 ke)")}
      >
        {busy ? `⏳${typeof busy === "string" ? busy : ""}` : n ? `🧩${Math.ceil(n / 5)}` : "🧩"}
      </button>
      {err && !open ? <span className="nt-meta" style={{ color: "var(--danger)" }}>{err}</span> : null}
      {open && rec && (
        <div className="modal-overlay" onClick={() => setOpen(false)} style={{ zIndex: 500 }}>
          <div className="modal glass pocket-modal jd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="jd-hd">
              <div><span className="hero__eyebrow">🧩 Jodi milao · page {page}</span><h2>{title}</h2></div>
              <div className="jd-hdb">
                <button type="button" disabled={busy} onClick={make} title="DeepSeek se naye sire se">{busy ? `⏳ ${typeof busy === "string" ? busy : ""}` : "🔄 naya"}</button>
                <button type="button" onClick={() => setOpen(false)} title="Band (Esc)">✕</button>
              </div>
            </div>
            {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{err}</p>}
            {n ? <Play pairs={rec.pairs} onChange={change} /> : <p>Saari jodiyan hata di — 🔄 naya dabao.</p>}
          </div>
        </div>
      )}
    </>
  );
}
