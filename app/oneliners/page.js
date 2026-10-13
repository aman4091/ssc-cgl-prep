"use client";

// 📝 One-liners — overlay ke 📝 button se aayi ek-line notes.
//
// Fact log aur Zaroori baatein se alag rakha gaya hai (owner: "fact log mein
// mt bhej .. alag page bna"). Yahan revision ka chakkar nahi chalta.
//
// Padhne ka roop: INBOX (components/OneLinersInbox) — baayen list, daayen
// chuni hui line poori. Pehle yahan popup wali list thi, phir dropdown se 10
// roop compare hue; owner ne Inbox chuna, isliye na popup hai na dropdown.
//
// Har line ab markdown se banti hai (components/Markdown) — wahi renderer jo
// answers page par hai. AI ka jawab bold aur LaTeX ke saath aata hai; pehle
// yahan wo kachcha dikhta tha ("Neither of the two boys **is** guilty"),
// yaani jis shabd par zor dena tha wahi taaron mein dab jata tha.

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getOneLiners, removeOneLiner, clearOneLiners, OL_SUBS } from "@/lib/oneliners";
import { SlideRow } from "@/components/OneLinerLayouts";
import { parseOneLiner } from "@/lib/onelinerfmt";
import "@/app/notes/paste/layouts.css";
import "./inbox.css";

// Menu se seedha subject: /oneliners?sub=gs. Chips wahi ke wahi hain — ye
// sirf shuruaat tay karta hai, taaki menu mein "GS" dabane par GS hi khule.
function OneLinersInner() {
  const sp = useSearchParams();
  const qSub = OL_SUBS.some((s) => s.k === sp.get("sub")) ? sp.get("sub") : "all";
  const [all, setAll] = useState([]);
  const [sub, setSub] = useState(qSub);
  const [q, setQ] = useState("");
  useEffect(() => { setSub(qSub); }, [qSub]);

  const load = () => setAll(getOneLiners());
  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener("cgl:oneliners-changed", on);   // overlay se nayi line
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:oneliners-changed", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((o) => (sub === "all" || o.subject === sub)
      && (!t || o.text.toLowerCase().includes(t)));
  }, [all, sub, q]);

  // Hatane ke baad Inbox usi jagah rehta hai — agli line wahan aa jati hai.
  const drop = (id) => { removeOneLiner(id); load(); };

  if (all.length === 0) {
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <div className="placeholder">Abhi koi one-liner nahi. Overlay par subject ka answer copy karne ke baad 📝 dabao.</div>
      </section>
    );
  }
  // 🎞️ FINAL (owner): Notesliner wala "Slides" — har line ek slide, chhote ‹ ›
  // button (components/OneLinerLayouts SlideRow). Chat wali window code mein.
  const secs = shown.flatMap((o) => {
    const sub = OL_SUBS.find((x) => x.k === o.subject);
    const parts = parseOneLiner(o.text).filter((p) => p.points.length || p.title);
    return parts.map((p, k) => ({
      key: `${o.id}|${k}`, kind: p.kind,
      title: p.title || (sub ? `${sub.icon} ${sub.label}` : "📝"),
      points: p.points.length ? p.points : [{ text: p.title, star: false }],
      meta: sub ? `${sub.icon} ${sub.label}` : "",
      act: k === 0 ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => drop(o.id)} title="Ye line hatao">🗑️</button> : null,
    }));
  });
  return (
    <section className="section" style={{ marginTop: 16 }}>
      <div className="ol-slidebar">
        <>
          <button className={`subj-chip${sub === "all" ? " is-active" : ""}`} onClick={() => setSub("all")}>📝 Sab · {all.length}</button>
          {OL_SUBS.map((s) => {
            const n = all.filter((o) => o.subject === s.k).length;
            if (!n) return null;
            return (
              <button key={s.k} className={`subj-chip${sub === s.k ? " is-active" : ""}`} onClick={() => setSub(s.k)}>
                {s.icon} {s.label} · {n}
              </button>
            );
          })}
          <input className="input qfeed__search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 dhoondo" />
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => { if (confirm(`Saari ${all.length} one-liners hamesha ke liye hat jayengi. Pakka?`)) { clearOneLiners(); load(); } }}
          >🗑️ Sab hatao</button>
        </>
      </div>
      <SlideRow secs={secs} empty="Is chhaanti mein koi line nahi." />
    </section>
  );
}

export default function OneLinersPage() {
  return (
    <Suspense fallback={<div className="placeholder">…</div>}>
      <OneLinersInner />
    </Suspense>
  );
}
