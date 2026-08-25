"use client";

import { useState } from "react";
import { addMock, sectionStats, percentileOf } from "@/lib/mockmarks";
import { bumpCount } from "@/lib/qcounter";

// 🌐 Bahar diya hua test — Testbook, RBE, jo bhi.
//
// Ye site ka apna quiz nahi tha, isliye ginti apne aap nahi chadhti thi. Natija
// ye ki bahar poora reasoning ka mock dene ke baad bhi homepage par ring khaali
// khadi rehti thi aur agla subject band — ulta hi ho gaya: jo asli kaam tha
// wahi gina nahi gaya.
//
// Isliye chaar-paanch khaane: kitne question the, kitne sahi, kitne galat.
// Marks aur accuracy khud ban jaate hain (SSC ka +2 / −0.5), rank aur "kitne
// mein se" daalo to percentile bhi. Save karte hi do kaam hote hain — record
// Mock Marks mein chala jata hai, aur us subject ki aaj ki ginti utni hi badh
// jati hai jitne question the. Ring bhar jati hai, agla darwaza khul jata hai.

// Ring ka subject -> Mock Marks ka bucket. Naam alag hain (purane bucket wahi
// rehne diye, warna pehle ke record doosri jagah chale jaate).
export const EXT_CAT = { reasoning: "reasoning", math: "maths", english: "english", gs: "gk" };

const todayStr = () => new Date().toISOString().slice(0, 10);
const n0 = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };

export default function ExtMock({ subject, label, icon, onSaved, onClose }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [total, setTotal] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [timeMin, setTimeMin] = useState("");
  const [rank, setRank] = useState("");
  const [outOf, setOutOf] = useState("");
  const [err, setErr] = useState("");

  // Galat khaali chhoda ho to maan lete hain ki jitne attempt kiye sab mein se
  // baaki galat the. Neeche saaf-saaf dikh jata hai, isliye chup-chaap kuch
  // maan lene ka dar nahi.
  const T = n0(total), C = n0(correct);
  const W = wrong === "" ? Math.max(0, T - C) : n0(wrong);
  const st = sectionStats({ name: label, correct: C, wrong: W, total: T, timeMin });
  const pc = percentileOf(rank, outOf);

  const save = () => {
    if (!T) { setErr("Kitne question the, wo daalo."); return; }
    if (C + W > T) { setErr("Sahi + galat kul question se zyada nahi ho sakte."); return; }
    addMock({
      name: name.trim() || `${label} mock`,
      cat: EXT_CAT[subject],
      date,
      external: true,
      rank, outOf,
      sections: [{ name: label, correct: C, wrong: W, total: T, timeMin }],
    });
    // Aaj ki ginti — poore question, sirf attempt kiye hue nahi. Test dene ka
    // matlab hai saare question saamne se guzre.
    bumpCount(subject, T);
    onSaved?.();
  };

  return (
    <div className="extm">
      <div className="extm__head">
        <b>🌐 {icon} {label} — bahar diya hua test</b>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
      </div>

      <div className="extm__grid">
        <label className="extm__f extm__f--wide">
          <span>Naam</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. Testbook ${label} Mock 5`} />
        </label>
        <label className="extm__f">
          <span>Date</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="extm__f">
          <span>Kul question</span>
          <input className="input" type="number" min="0" inputMode="numeric"
            value={total} onChange={(e) => setTotal(e.target.value)} placeholder="25" />
        </label>
        <label className="extm__f">
          <span>Sahi ✅</span>
          <input className="input" type="number" min="0" inputMode="numeric"
            value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="18" />
        </label>
        <label className="extm__f">
          <span>Galat ❌</span>
          <input className="input" type="number" min="0" inputMode="numeric"
            value={wrong} onChange={(e) => setWrong(e.target.value)}
            placeholder={T ? String(Math.max(0, T - C)) : "0"} />
        </label>
        <label className="extm__f">
          <span>Time (min)</span>
          <input className="input" type="number" min="0" inputMode="numeric"
            value={timeMin} onChange={(e) => setTimeMin(e.target.value)} placeholder="15" />
        </label>
        <label className="extm__f">
          <span>Rank</span>
          <input className="input" type="number" min="1" inputMode="numeric"
            value={rank} onChange={(e) => setRank(e.target.value)} placeholder="1240" />
        </label>
        <label className="extm__f">
          <span>Kitne mein se</span>
          <input className="input" type="number" min="1" inputMode="numeric"
            value={outOf} onChange={(e) => setOutOf(e.target.value)} placeholder="18500" />
        </label>
      </div>

      {/* Hisaab saath ke saath — number daalte hi marks saamne, taaki "20 sahi
          par bhi score kam kyun" wala sawaal wahin dikh jaye. */}
      <div className="extm__out">
        <span className="chip">🏆 Score <b>{st.score}</b></span>
        <span className="chip">🎯 Accuracy <b>{st.accuracy}%</b></span>
        <span className="chip muted">{st.attempted}/{st.total} attempt · {st.unattempted} chhode</span>
        <span className="chip muted">❌ {W} galat = −{(W * 0.5).toFixed(1)}</span>
        {pc != null && <span className="chip">📈 Percentile <b>{pc}</b></span>}
      </div>

      {err && <p className="ansp__err">{err}</p>}

      <div className="extm__acts">
        <button className="btn btn--sm btn--primary" onClick={save}>💾 Save karo</button>
        <button className="btn btn--sm btn--ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
