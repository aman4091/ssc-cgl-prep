// 🧠 Fact log ki slides (app/mission/facts) — Home ka mission bhi isi se ginta
// hai ki "saare facts" kitni slides hain (ek round).
import { parseOneLiner } from "./onelinerfmt";

// Fact → slide: shakl (fmt) ho to wahi, warna text; khaane parseOneLiner se.
export function factSecs(facts) {
  const out = [];
  for (const f of facts) {
    const parts = parseOneLiner(f.fmt || f.text || "");
    parts.forEach((p, k) => {
      if (!p.points.length && !p.title) return;
      out.push({
        key: `${f.id}|${k}`, kind: p.kind,
        title: p.title || f.topic || "—",
        points: p.points.length ? p.points : [{ text: p.title, star: false }],
        meta: f.topic && p.title && p.title !== f.topic ? f.topic : "",
      });
    });
  }
  return out;
}
