"use client";

// 🎯 Similar — kisi bhi question (Answers page / PYQ) ke 🎯 se bane 5-5 naye
// question, sab ek jagah, mila-jula (lib/simpool). Chat wali window.

import { useCallback, useEffect, useState } from "react";
import QChatFeed from "@/components/QChatFeed";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import { orderedPool, pendingCount } from "@/lib/simpool";

const STORE = "similar";
const picksOf = () => { try { return JSON.parse(localStorage.getItem(`cgl.qfeed.${STORE}`) || "{}") || {}; } catch { return {}; } };

export default function SimilarPage() {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(0);

  const load = useCallback(() => {
    const p = picksOf();
    setList(orderedPool((id) => p[id] != null));
    setBusy(pendingCount());
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("cgl:simpool", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:simpool", load); window.removeEventListener("cgl:sync-applied", load); };
  }, [load]);

  if (!list) return <section className="section"><div className="placeholder">Khul raha hai…</div></section>;
  if (!list.length) {
    return (
      <section className="hero">
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>🎯 Similar</h1>
        <p className="hero__sub">
          {busy ? "🐋 Pehle question ban rahe hain…" : "Abhi koi nahi. Kisi bhi question (Answers page ya PYQ) par 🎯 dabao — Gemini ka likha question paste karo, uske jaise 5 yahan aa jayenge."}
        </p>
      </section>
    );
  }
  return (
    <section className="section">
      <QChatFeed
        title={busy ? "🎯 Similar · 🐋 aur ban rahe hain…" : "🎯 Similar"}
        list={list}
        storeKey={STORE}
        renderCard={(q, i, mem) => (
          <PyqQuestionCard
            {...mem}
            key={q.id}
            q={q}
            index={i}
            subject={q.subject || "math"}
            chapterName={`🎯 ${q.gl || "Similar"}`}
            chatLook
          />
        )}
      />
    </section>
  );
}
