"use client";

// 📖 Answers page ka sawaal (screenshot) — Wrong Sets ke test mein. PYQ card
// iske liye nahi bana (option tasveer mein hain), isliye yahan: tasveer +
// A/B/C/D, natije par jawab (Gemini/DeepSeek ka) aur "Sahi option kaunsa
// tha?" — wahi lib/anskeys jo Answers ke sets mein (owner khud batata hai).

import { useState } from "react";
import Markdown from "./Markdown";
import { imagesOf } from "@/lib/wrongbook";
import { useImageUrls } from "@/lib/wrongimages";
import { savedKey } from "@/lib/anskeys";

const L = "ABCD";

// Sahi option: tumhara bataya, warna sawaal ke apne data ka. Andaza nahi.
export function ansKeyOf(r) {
  const sv = r && r.id ? savedKey(r.id) : -1;
  if (sv >= 0) return sv;
  const q = r && r.q;
  if (q && Array.isArray(q.options) && q.options.length >= 2) {
    if (Number.isInteger(q.answer)) return q.answer;
    if (/^\d+$/.test(String(q.answer ?? ""))) return Number(q.answer);
  }
  return -1;
}

export default function AnsTestQ({ r, done, pick, onPick, onTell }) {
  const { urls, missing } = useImageUrls(imagesOf(r));
  const [big, setBig] = useState(null);
  const key = ansKeyOf(r);
  const opts = r.q && Array.isArray(r.q.options) && r.q.options.length >= 2 ? r.q.options.slice(0, 4).map(String) : ["", "", "", ""];
  const ans = String(r.detail2 || r.detail || (r.q && r.q.solution) || "").trim();
  return (
    <div className="tbt-ansq">
      {r.q && r.q.question ? <div className="qcard__stem"><Markdown>{r.q.question}</Markdown></div> : null}
      {urls.map((u, i) => <img key={u} src={u} alt={`sawaal ${i + 1}`} className="tbt-ansimg" onClick={() => setBig(u)} />)}
      {missing ? <p className="h20-dim">📷 {missing} tasveer is device par nahi hai.</p> : null}
      <div className="tbt-opts">
        {opts.map((o, k) => {
          const cls = done ? (key === k ? " is-key" : "") + (pick === k ? (key >= 0 ? (key === k ? "" : " is-bad") : " is-mine") : "") : "";
          return (
            <label key={k} className={`tbt-opt${cls}`}>
              <span><input type="radio" checked={pick === k} disabled={done} readOnly onClick={() => onPick(k)} /></span>
              <span>{o ? `${L[k]}) ${o}` : L[k]}</span>
            </label>
          );
        })}
      </div>
      {done ? (
        <>
          <div className="tbx-self">
            <span>{key < 0 ? "Sahi option kaunsa tha? Ek baar batao — aage ke liye yaad rahega, marks bhi isi se." : savedKey(r.id) >= 0 ? "Sahi option (tumhara bataya) — badalna ho to dabao:" : "Sahi option (sawaal ke data se) — galat ho to sahi dabao:"}{pick != null ? <> · tumhara <b>{L[pick]}</b></> : null}</span>
            {L.split("").map((ch, k) => <button key={ch} type="button" className={key === k ? "is-on is-ok" : ""} onClick={() => onTell(k)}>{ch}</button>)}
          </div>
          {ans ? <div className="ansp__answer tbt-ansq__ans"><Markdown>{ans}</Markdown></div> : null}
        </>
      ) : null}
      {big ? <div className="tbt-pop" onClick={() => setBig(null)}><img src={big} alt="" className="tbt-ansbig" /></div> : null}
    </div>
  );
}
