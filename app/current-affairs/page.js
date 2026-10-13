"use client";

// /current-affairs — 📰 SAARE mahine ek jagah, 25-25 ke SET (owner: "current
// affairs ko bhi sets mein kar de 25 25 ke .. months combined"). Har set 15
// minute ka test (components/PyqSets) — PYQ jaisa hi; galat / chhode Wrong
// Sets mein. Kram: purana mahina pehle, naya aakhir mein — naya mahina
// judne par pehle ke set nahi badalte. 📥 Import wale mahine bhi isi mein.
// Ek mahina alag dekhna ho to /current-affairs/<mahina> (purana roop) abhi bhi hai.

import { useEffect, useState } from "react";
import PyqSets from "@/components/PyqSets";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import CaImportButton from "@/components/CaImportButton";
import { loadCaBankIndex, loadCaBankEntry } from "@/lib/cabank";
import { getEntry } from "@/lib/feed";
import { isCaBankId } from "@/lib/cabank";
import { monthList } from "./[id]/page";

export default function CurrentAffairsSets() {
  const [list, setList] = useState(null);
  const [months, setMonths] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ms = monthList(await loadCaBankIndex()).sort((a, b) => (a.sort < b.sort ? -1 : 1));
      const entries = await Promise.all(ms.map((m) => (isCaBankId(m.id) ? loadCaBankEntry(m.id) : Promise.resolve(getEntry(m.id)))));
      const all = [];
      entries.forEach((e, k) => {
        for (const q of (e && e.questions) || []) {
          // Bank apni samjhaish `detail` mein rakhta hai; card `explanation` padhta hai.
          all.push({ ...q, explanation: q.explanation || q.detail || "", _chapter: `Current Affairs · ${ms[k].label}` });
        }
      });
      if (alive) { setList(all); setMonths(ms.length); }
    })();
    return () => { alive = false; };
  }, []);

  if (!list) return <div className="placeholder">Current affairs khul rahe hain… 📰</div>;
  return (
    <section className="section" style={{ marginTop: 16 }}>
      <div className="row between" style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="ca-eyebrow">📰 Current Affairs · {months} mahine · {list.length} sawaal</span>
        <CaImportButton />
      </div>
      {list.length ? (
        <PyqSets
          list={list}
          subject="gs"
          resumeKey="ca:all"
          title="Current Affairs"
          renderCard={(q, i) => <PyqQuestionCard key={q.id || i} q={q} index={i} subject="gs" resumeKey="ca:all" chapterName={q._chapter || "Current Affairs"} />}
        />
      ) : (
        <div className="placeholder">Abhi koi mahina nahi hai — PDF import karo.</div>
      )}
    </section>
  );
}
