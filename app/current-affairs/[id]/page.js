"use client";

// 📰 Current Affairs — ab PYQ bank jaisa hi: ek waqt par EK question.
//
// Owner ka niyam: "voi nahi aata .. aata mein, voi repeat system, poora same,
// bas sabse upar months ka dropdown." Isliye yahan koi list/quiz nahi —
// seedha components/PyqDrill: sawaal, options, neeche jawab + explanation,
// ✨ Gemini / 🐋 DeepSeek / 🧩 Cluster, aur sabse neeche do button:
//
//   Aata hai      -> ye question 100 sawaal aage
//   Nahi aata hai -> 3re, phir 4the, 5ve … (jab tak "Aata hai" na lage)
//
// Ginti aur qataar ka kram `cgl.pyqdrill` mein is mahine ke apne naam se
// bachte hain (ca:2026-07), isliye mahina band karke kholne par wahi se
// chalta hai — PYQ chapter ki tarah.
//
// Daily aur Yearly hata diye gaye: ab sirf MAHINE hain.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEntry, getEntries } from "@/lib/feed";
import { isCaBankId, loadCaBankEntry, loadCaBankIndex, caBankId } from "@/lib/cabank";
import CaImportButton from "@/components/CaImportButton";
import PyqSplit from "@/components/PyqSplit";
import PyqQuestionCard from "@/components/PyqQuestionCard";

// Imported entry ka sortable roop ("2026-07"); `date` kabhi "July 2026" jaisa
// label hota hai jo ISO period se compare nahi hota.
const sortKeyOf = (e) =>
  e.period || (/^\d{4}/.test(e.date || "") ? e.date : "") || (e.createdAt || "").slice(0, 10);

export function monthList(bank) {
  const builtins = (bank?.months || []).map((m) => ({
    id: caBankId(m.period), label: m.label, count: m.count, sort: m.period,
  }));
  const mine = getEntries("current", "monthly").map((e) => ({
    id: e.id,
    label: `📄 ${e.date || e.title || "Import"}`,
    count: (e.questions || []).length,
    sort: sortKeyOf(e),
  }));
  return [...builtins, ...mine].sort((a, b) => (a.sort < b.sort ? 1 : -1));
}

export default function CurrentAffairsMonth() {
  const { id } = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [ready, setReady] = useState(false);
  const [months, setMonths] = useState([]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    if (isCaBankId(id)) {
      loadCaBankEntry(id).then((e) => { if (alive) { setEntry(e); setReady(true); } });
    } else {
      setEntry(getEntry(id));
      setReady(true);
    }
    loadCaBankIndex().then((b) => { if (alive) setMonths(monthList(b)); });
    return () => { alive = false; };
  }, [id]);

  const heading = entry?.date || entry?.title || "Current Affairs";
  const list = useMemo(() => (entry?.questions || []).map((q) => ({
    ...q,
    // Bank apni samjhaish `detail` mein rakhta hai; card `solution` /
    // `explanation` padhta hai.
    explanation: q.explanation || q.detail || "",
  })), [entry]);

  if (!ready) return null;

  const caTop = (
    <div className="ca-top ca-top--in">
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="ca-eyebrow">📰 Current Affairs</span>
            {months.length > 0 && (
              <select
                className="input ca-month"
                value={months.some((m) => m.id === id) ? id : ""}
                onChange={(e) => router.push(`/current-affairs/${e.target.value}`)}
              >
                {!months.some((m) => m.id === id) && <option value="">{heading}</option>}
                {months.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} ({m.count})</option>
                ))}
              </select>
            )}
          </div>
          <CaImportButton />
        </div>
    </div>
  );

  return (
    <>
      {/* Mahina aur 📥 Import — window na ho tab yahan, warna window ke sar mein. */}
      {(!entry || !list.length) && caTop}

      {!entry ? (
        <div className="placeholder">Ye mahina nahi mila. Upar dropdown se doosra chuno.</div>
      ) : !list.length ? (
        <div className="placeholder">Is mahine mein koi question nahi.</div>
      ) : (
        // ⚡ Sprint jaisa roop (components/PyqSplit) — baayen sawaal, daayen
        // button + jawab; mahina ka dropdown upar ki patti mein.
        <PyqSplit
          title={`📰 ${heading}`}
          list={list}
          storeKey={`ca:${id}`}
          headExtra={caTop}
          renderCard={(q, i, mem) => (
            <PyqQuestionCard {...mem} q={q} index={i} subject="gs" chapterName={`Current Affairs · ${heading}`} split />
          )}
        />
      )}
    </>
  );
}
