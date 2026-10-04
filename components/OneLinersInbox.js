"use client";

// 📥 One-liners ka INBOX roop — baayen sabki chhoti list (subject ka rang,
// din, pehli do line), daayen chuni hui one-liner poori, trick alag khane
// mein. ↑/↓ (ya ←/→) se agli-pichli, 🗑️ se wahin hatao.
//
// Owner ne dropdown ke 10 roop mein se yahi chuna; baaki hata diye.

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { olLines, olTitle, isTrickLine, subOf, updateOneLiner } from "@/lib/oneliners";
import { formatOneLiner } from "@/lib/client-ai";
import QChatFeed from "./QChatFeed";

const COL = { gs: "#10b981", english: "#a855f7", math: "#3b82f6", reasoning: "#f59e0b" };
const M = ({ t }) => <Markdown inline>{t}</Markdown>;
const pad = (n) => String(n).padStart(2, "0");
const dmy = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? "" : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

export default function OneLinersInbox({ items, onDelete, onChange }) {
  const rows = useMemo(() => items.map((o, i) => {
    const all = olLines(o.text);
    return {
      o, i, s: subOf(o.subject), c: COL[o.subject] || "#94a3b8", title: olTitle(o),
      // Ginti wahi jo AI ne di — aur wo bhi HUM likhte hain, markdown nahi.
      //
      // Do galtiyan thi: (1) poori list <ol> mein thi, to har line number le
      // leti thi — example aur ✓/✗ wali bhi; (2) seedha "1. …" markdown ko
      // dene par wo use list maan kar apni ginti bana leta hai aur asli
      // number gayab ho jata hai. Isliye number alag nikaal kar text alag
      // dikhate hain: jis line par AI ne number diya wahi ginti jati hai,
      // baaki (example, ✓/✗) uske neeche bina number ke.
      lines: all.filter((l) => !isTrickLine(l)).map((l) => {
        const m = /^(\d{1,3})[.)]\s*/.exec(l);
        return { n: m ? m[1] : "", t: m ? l.slice(m[0].length) : l };
      }),
      trick: all.filter(isTrickLine),
    };
  }), [items]);

  const [k, setK] = useState(0);
  // 🐋 Bold: purani lines bina bold ke aayi thi (prompt mein kaha hi nahi gaya
  // tha). Ye button usi line ke zaroori shabd **bold** karwa deta hai — ek
  // line, ek chhota call.
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const bold = async (o) => {
    if (busy) return;
    setBusy(o.id); setErr("");
    try {
      const { text } = await formatOneLiner(o.text);
      updateOneLiner(o.id, text);
      if (onChange) onChange();
    } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  };
  const n = rows.length;
  const cur = Math.min(k, Math.max(0, n - 1));
  const go = (d) => setK(Math.min(n - 1, Math.max(0, cur + d)));
  useEffect(() => {
    const on = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  // Chuni hui line list mein dikhti rahe.
  useEffect(() => { document.getElementById(`olx-${cur}`)?.scrollIntoView({ block: "nearest" }); }, [cur]);

  const r = rows[cur];
  return (
    <div className="olx">
      <nav className="olx-list">
        {rows.map((x) => (
          <button key={x.o.id} id={`olx-${x.i}`} type="button" className={x.i === cur ? "is-on" : ""} onClick={() => setK(x.i)}>
            <i style={{ background: x.c }} />
            <span><b>{x.s.label}</b><small>{dmy(x.o.at)}</small></span>
            <em><M t={x.title} /></em>
          </button>
        ))}
      </nav>
      {r && (
        <article className="olx-read" style={{ "--c": r.c }}>
          <header>
            <span className="olx-tag">{r.s.icon} {r.s.label}</span>
            <span className="olx-dim">{dmy(r.o.at)} · {cur + 1} / {n}</span>
            <span className="olx-nav">
              <button type="button" onClick={() => go(-1)} disabled={cur === 0} title="Pichli (↑)">↑</button>
              <button type="button" onClick={() => go(1)} disabled={cur === n - 1} title="Agli (↓)">↓</button>
              <button type="button" onClick={() => bold(r.o)} disabled={busy === r.o.id} title="Zaroori shabd bold karwao (DeepSeek)">
                {busy === r.o.id ? "…" : "🐋"}
              </button>
              <button type="button" onClick={() => onDelete(r.o.id)} title="Hata do">🗑️</button>
            </span>
          </header>
          {err ? <p className="olx-err">⚠️ {err}</p> : null}
          <div className="olx-lines">
            {r.lines.map((l, j) => (
              <p key={j} className={l.n ? "olx-num" : "olx-sub"}>
                {l.n ? <b>{l.n}.</b> : null}
                <M t={l.t} />
              </p>
            ))}
          </div>
          {r.trick.map((l, j) => <div key={j} className="olx-trick"><M t={l} /></div>)}
        </article>
      )}
    </div>
  );
}

// 💬 Chat wali window — saari one-liners ek ke neeche ek: upar subject · din,
// sar daayen bubble mein, poori lines jawab wale bubble mein, trick alag.
export function OneLinersChat({ items, onDelete, onChange, headExtra = null }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const bold = async (o) => {
    if (busy) return;
    setBusy(o.id); setErr("");
    try {
      const { text } = await formatOneLiner(o.text);
      updateOneLiner(o.id, text);
      if (onChange) onChange();
    } catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  };
  const rows = useMemo(() => items.map((o) => {
    const all = olLines(o.text);
    return {
      id: o.id, o, s: subOf(o.subject), title: olTitle(o),
      lines: all.filter((l) => !isTrickLine(l)).map((l) => {
        const m = /^(\d{1,3})[.)]\s*/.exec(l);
        return { n: m ? m[1] : "", t: m ? l.slice(m[0].length) : l };
      }),
      trick: all.filter(isTrickLine),
    };
  }), [items]);
  return (
    <QChatFeed
      title="📝 One-liners"
      list={rows}
      storeKey="oneliners"
      noJump
      unit="lines"
      headExtra={headExtra}
      renderCard={(r) => (
        <article key={r.id} className="qcard qcard--chat">
          <h2 className="qcard__h">
            {r.s.icon} {r.s.label} · {dmy(r.o.at)}
            <span className="qcard__hacts">
              <button type="button" className="btn btn--sm" onClick={() => bold(r.o)} disabled={busy === r.o.id} title="Zaroori shabd bold karwao (DeepSeek)">
                {busy === r.o.id ? "…" : "🐋"}
              </button>
              <button type="button" className="btn btn--sm" onClick={() => onDelete(r.o.id)} title="Hata do">🗑️</button>
            </span>
          </h2>
          <div className="qcard__stem"><M t={r.title} /></div>
          <div className="qcard__answer">
            {r.lines.map((l, j) => (
              <p key={j} className={l.n ? "olx-num" : "olx-sub"} style={{ margin: "0 0 4px" }}>
                {l.n ? <b>{l.n}. </b> : null}
                <M t={l.t} />
              </p>
            ))}
            {r.trick.map((l, j) => <div key={j} className="olx-trick"><M t={l} /></div>)}
          </div>
        </article>
      )}
    />
  );
}
