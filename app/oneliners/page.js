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
import OneLinersInbox from "@/components/OneLinersInbox";
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

  return (
    <>
      {/* Upar bas naam. Pehle yahan ek poora hero tha — badi "Ek question, ek
          line" aur do line ka bayaan — jo har baar aadhi screen kha jata tha;
          owner ne hata diya. */}
      <section className="section" style={{ marginTop: 16, marginBottom: 0 }}>
        <h1 className="ol-h1">📝 One-liners</h1>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="subj-row" style={{ marginBottom: 12 }}>
          <button className={`subj-chip${sub === "all" ? " is-active" : ""}`} onClick={() => setSub("all")}>
            📝 Sab · {all.length}
          </button>
          {OL_SUBS.map((s) => {
            const n = all.filter((o) => o.subject === s.k).length;
            if (!n) return null;
            return (
              <button key={s.k} className={`subj-chip${sub === s.k ? " is-active" : ""}`} onClick={() => setSub(s.k)}>
                {s.icon} {s.label} · {n}
              </button>
            );
          })}
        </div>

        <div className="row between ms-form" style={{ marginBottom: 8 }}>
          <h2 className="ms-h2" style={{ margin: 0 }}>Saari lines ({shown.length})</h2>
          {all.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => { if (confirm(`Saari ${all.length} one-liners hamesha ke liye hat jayengi. Pakka?`)) { clearOneLiners(); load(); } }}
            >🗑️ Sab hatao</button>
          )}
          <input className="input" style={{ maxWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 dhoondo" />
        </div>

        {shown.length === 0 ? (
          <div className="placeholder">
            {all.length === 0
              ? "Abhi koi one-liner nahi. Overlay par subject ka answer copy karne ke baad 📝 dabao."
              : "Is chhaan-been mein kuch nahi mila."}
          </div>
        ) : (
          <OneLinersInbox key={`${sub}|${q}`} items={shown} onDelete={drop} onChange={load} />
        )}
      </section>
    </>
  );
}

export default function OneLinersPage() {
  return (
    <Suspense fallback={<div className="placeholder">…</div>}>
      <OneLinersInner />
    </Suspense>
  );
}
