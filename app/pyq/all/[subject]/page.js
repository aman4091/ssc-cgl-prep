"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { allSubjectMeta, loadAllSubject } from "@/lib/allbank";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";
import QBoard from "@/components/QBoard";

// Ek subject ke SAARE question — har bank, har chapter, ek list mein.
//
// Card wahi hai jo us bank ke apne page par chalta hai: maths/reasoning ke
// question tasveer hain (MathQuestionCard / ReasonQuestionCard), baaki text
// (PyqQuestionCard). Isliye yahan kiya hua kaam wahan bhi ginta hai aur wahan
// ka kiya hua yahan — ✅ ho-gaya, ★, stats aur paste kiya Gemini answer sab ek.

export default function AllSubjectPage() {
  const { subject } = useParams();
  const meta = allSubjectMeta(subject);

  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [prog, setProg] = useState({ done: 0, total: 0 });
  const [src, setSrc] = useState("");        // "" = saare bank
  const [chapter, setChapter] = useState(""); // "" = saare chapter
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!meta) return undefined;
    let alive = true;
    setQs([]); setReady(false); setSrc(""); setChapter(""); setQuery("");
    setProg({ done: 0, total: 0 });
    loadAllSubject(meta.slug, (done, total) => { if (alive) setProg({ done, total }); })
      .then((list) => { if (!alive) return; setQs(list); setReady(true); });
    return () => { alive = false; };
  }, [meta]);

  // Bank ki list — jo asli mein aaye hain, ginti ke saath.
  const banks = useMemo(() => {
    const m = new Map();
    for (const q of qs) {
      const cur = m.get(q._src);
      if (cur) cur.count += 1;
      else m.set(q._src, { id: q._src, label: q._srcLabel, count: 1 });
    }
    return [...m.values()];
  }, [qs]);

  // Chapter dropdown chune hue bank ke andar ka hai — warna 100 se zyada naam
  // ek hi list mein aa jaate hain aur dhoondhna mushkil ho jata hai.
  const chapters = useMemo(() => {
    const m = new Map();
    for (const q of qs) {
      if (src && q._src !== src) continue;
      m.set(q._chapter, (m.get(q._chapter) || 0) + 1);
    }
    return [...m.entries()].map(([name, count]) => ({ name, count }));
  }, [qs, src]);

  // useMemo zaroori hai: bina iske har render par nayi array banti hai aur
  // QBoard use "nayi list" samajh kar apna slice shuru se kar deta hai.
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return qs.filter((q) => {
      if (src && q._src !== src) return false;
      if (chapter && q._chapter !== chapter) return false;
      if (!t) return true;
      const hay = `${q.question || ""} ${q.qText || ""} ${(q.options || []).join(" ")} ${(q.optText || []).join(" ")} ${q.source || ""}`;
      return hay.toLowerCase().includes(t);
    });
  }, [qs, src, chapter, query]);

  if (!meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Aisa koi subject nahi hai.</p>
        <Link href="/pyq/all" className="btn btn--ghost btn--sm mt-16">← All</Link>
      </section>
    );
  }

  const resumeKey = `all:${meta.slug}`;
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🗂️ All · {meta.label}</span>
          <Link href="/pyq/all" className="btn btn--ghost btn--sm">← Subjects</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {meta.icon} {meta.label} <span className="grad">· {filtered.length.toLocaleString("en-IN")}</span>
        </h1>
        <p className="hero__sub">{meta.desc}</p>
      </section>

      {/* Test ke dauraan ye patti chhup jaati hai (body.exam-on) — bank/chapter
          badalne ki cheez paper ke beech mein nahi honi chahiye. */}
      <section className="section pyq-filters" style={{ marginTop: 4 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {banks.length > 1 && (
            <select
              className="input"
              style={{ maxWidth: 260 }}
              value={src}
              onChange={(e) => { setSrc(e.target.value); setChapter(""); }}
            >
              <option value="">Saare bank ({qs.length.toLocaleString("en-IN")})</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.label} ({b.count})</option>
              ))}
            </select>
          )}
          {chapters.length > 1 && (
            <select
              className="input"
              style={{ maxWidth: 300 }}
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            >
              <option value="">Saare chapter ({chapters.length})</option>
              {chapters.map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
              ))}
            </select>
          )}
          <input
            className="input"
            style={{ maxWidth: 260 }}
            placeholder="🔍 Question mein dhoondho…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      <section className="section">
        {!ready ? (
          <div className="placeholder">
            Saare chapter khul rahe hain… 📚 {prog.total ? `${prog.done}/${prog.total} (${pct}%)` : ""}
          </div>
        ) : (
          <QBoard
            title={`All · ${meta.label}`}
            list={filtered}
            subject={meta.subject}
            resumeKey={resumeKey}
            emptyText="Is filter par koi question nahi."
            renderCard={(q, i, all) => {
              // Bank ka naam card ke upar likhna band kar diya — test ke beech
              // mein "Pinnacle Maths · Mensuration" padhne ki koi zaroorat nahi,
              // aur card ke sar mein question ka apna id/paper waise bhi hai.
              // Naam sirf Mistake Notebook ki category ke liye banta hai.
              const name = `${q._srcLabel} · ${q._chapter}`;
              return (
                <Fragment key={q._uid}>
                  {q._card === "math" ? (
                    <MathQuestionCard q={q} index={i} subject="math" resumeKey={resumeKey} chapterName={name} />
                  ) : q._card === "reason" ? (
                    <ReasonQuestionCard q={q} index={i} subject="reasoning" resumeKey={resumeKey} chapterName={name} />
                  ) : (
                    <PyqQuestionCard q={q} index={i} subject={meta.subject} resumeKey={resumeKey} chapterName={name} />
                  )}
                </Fragment>
              );
            }}
          />
        )}
      </section>
    </>
  );
}
