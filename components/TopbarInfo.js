"use client";

import { useEffect, useState } from "react";
import { getExam, daysBetween } from "@/lib/mission";

// ⏳ Upar ki patti ke baayen: aaj ki tareekh + exam mein kitne din.
// Pehle desktop par patti bilkul khaali thi (sirf 🔒 aur 🌙) — ab ek nazar mein
// countdown dikhta hai. Exam date wahi jo /mission par set hai (lib/mission).
//
// Tareekh aur din sirf mount ke BAAD — server ka "aaj" aur client ka "aaj"
// alag ho sakta hai, aur render mein localStorage padhne se hydration tootta.
export default function TopbarInfo() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const exam = getExam();
    const left = daysBetween(iso, exam);
    const today = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const examLabel = new Date(`${exam}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    setInfo({ today, left, examLabel });
  }, []);

  if (!info) return <div className="topinfo" aria-hidden="true" />;

  return (
    <div className="topinfo">
      <span className="topinfo__date">{info.today}</span>
      {Number.isFinite(info.left) && info.left >= 0 && (
        <span className="topinfo__count" title={`CGL exam — ${info.examLabel}`}>
          <b>{info.left}</b> din baaki · CGL {info.examLabel}
        </span>
      )}
    </div>
  );
}
