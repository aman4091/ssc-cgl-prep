"use client";

import { useEffect, useMemo, useState } from "react";
import { doneKeyFor, getDoneSet, isDone, toggleDone } from "@/lib/qdone";
import { countMark } from "@/lib/qcounter";

// Answers page wala ✅ "Ho gaya" — checkbox + label, ☐/☑ button nahi. Mark
// karte hi QBoard card ko list ke ANT mein khiska deta hai (cgl:qdone-changed
// par), aur aaj ka counter +1 ho jata hai — bilkul /answers jaisa. Ek question
// ko baar-baar mark/unmark karo to ginti nahi bigadti (qcounter ids yaad rakhta
// hai). q-act--keep isliye ki mobile ki action-row mein ye chhupe nahi.
export function DoneButton({ q, subject }) {
  const [done, setDone] = useState(false);
  useEffect(() => { setDone(isDone(q)); }, [q]);
  // Stay in sync if the same question is toggled elsewhere (e.g. a second open
  // card of the same question).
  useEffect(() => {
    const h = () => setDone(isDone(q));
    window.addEventListener("cgl:qdone-changed", h);
    return () => window.removeEventListener("cgl:qdone-changed", h);
  }, [q]);
  const toggle = () => {
    const now = toggleDone(q);
    setDone(now);
    if (subject) countMark(doneKeyFor(q), subject, now);
  };
  return (
    <label className="qmark q-act--keep" title={done ? "Ho gaya — hatao" : "Ye question ho gaya — mark karo"}>
      <input type="checkbox" checked={done} onChange={toggle} />
      Ho gaya
    </label>
  );
}

// Splits a page's question list into pending (default) and done, and re-splits
// whenever any card is marked (cgl:qdone-changed). Returns the visible list for
// the active tab plus the two counts. `source` is the page's own list AFTER any
// search / chapter filter it already applies.
export function useDoneTabs(source) {
  const [tab, setTab] = useState("pending");
  const [ver, setVer] = useState(0);
  useEffect(() => {
    const h = () => setVer((v) => v + 1);
    window.addEventListener("cgl:qdone-changed", h);
    return () => window.removeEventListener("cgl:qdone-changed", h);
  }, []);
  const { pending, done } = useMemo(() => {
    const set = getDoneSet();
    const pend = [];
    const dn = [];
    for (const q of source || []) (set.has(doneKeyFor(q)) ? dn : pend).push(q);
    return { pending: pend, done: dn };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, ver]);
  const list = tab === "done" ? done : pending;
  return { tab, setTab, list, pendingCount: pending.length, doneCount: done.length };
}

// The two-tab strip above the questions. Default lands on Baaki (pending).
export function DoneTabBar({ tab, setTab, pendingCount, doneCount }) {
  return (
    <div className="done-tabs" role="tablist">
      <button
        role="tab"
        aria-selected={tab === "pending"}
        className={`done-tab${tab === "pending" ? " done-tab--on" : ""}`}
        onClick={() => setTab("pending")}
      >
        📝 Baaki <span className="done-tab__n">{pendingCount}</span>
      </button>
      <button
        role="tab"
        aria-selected={tab === "done"}
        className={`done-tab${tab === "done" ? " done-tab--on" : ""}`}
        onClick={() => setTab("done")}
      >
        ✅ Ho gaye <span className="done-tab__n">{doneCount}</span>
      </button>
    </div>
  );
}
