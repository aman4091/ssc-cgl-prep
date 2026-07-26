"use client";

import { useEffect, useMemo, useState } from "react";
import { doneKeyFor, getDoneSet, isDone, toggleDone } from "@/lib/qdone";

// The ✓ toggle that sits in a question card's action row. Marking it "ho gaya"
// moves the card from the Baaki tab to the Ho gaye tab — the page re-filters on
// the cgl:qdone-changed event that toggleDone fires. Carries q-act--keep so it
// survives the mobile action-row (where un-kept buttons are hidden).
export function DoneButton({ q }) {
  const [done, setDone] = useState(false);
  useEffect(() => { setDone(isDone(q)); }, [q]);
  // Stay in sync if the same question is toggled elsewhere (e.g. its twin on the
  // other tab, or a second open card of the same question).
  useEffect(() => {
    const h = () => setDone(isDone(q));
    window.addEventListener("cgl:qdone-changed", h);
    return () => window.removeEventListener("cgl:qdone-changed", h);
  }, [q]);
  const toggle = () => setDone(toggleDone(q));
  return (
    <button
      className="btn btn--ghost btn--sm q-act--keep"
      onClick={toggle}
      title={done ? "Ho gaya — hatao (Baaki mein wapas)" : "Ye question ho gaya — mark karo"}
      style={done ? { color: "var(--success)" } : {}}
    >
      {done ? "☑" : "☐"}
    </button>
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
