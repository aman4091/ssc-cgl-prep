"use client";

// The ➕ Add items picker. Lists every notes book (grouped GS / English), each
// expandable to its topics (chapters). Tapping a topic adds/removes it from the
// homepage study feed (lib/homefeed). Topics load lazily per book — loadNotes
// caches, so re-expanding is instant.

import { useEffect, useState } from "react";
import { listNotesBooks, loadNotes } from "@/lib/notesbank";
import { addNotesItem, removeItem, hasNotesItem, notesItemId, subscribeHome } from "@/lib/homefeed";

const SUBJECT_LABEL = { gs: "📚 GS", english: "✍️ English" };

// meta.topics is polymorphic: plain strings (Brahmastra/History) OR objects with
// page ranges (Polity/Parmar). Merge to a de-duped, ordered list of names.
function topicNames(meta) {
  const t = (meta && meta.topics) || [];
  if (!t.length) return [];
  if (typeof t[0] === "string") return [...new Set(t)];
  const seen = new Map();
  for (const o of t) {
    if (!o || !o.topic) continue;
    const no = o.topic_no != null ? o.topic_no : o.first_page;
    if (!seen.has(o.topic)) seen.set(o.topic, no);
  }
  return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
}

export default function AddItemsModal({ onClose }) {
  const [books] = useState(() => listNotesBooks());
  const [open, setOpen] = useState(null);       // expanded book slug
  const [topics, setTopics] = useState({});     // slug -> string[] (loaded)
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);              // re-render on add/remove

  useEffect(() => subscribeHome(() => setTick((n) => n + 1)), []);

  const groups = books.reduce((acc, b) => {
    const key = b.subject === "english" ? "english" : "gs";
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {});

  const expand = async (b) => {
    if (open === b.slug) { setOpen(null); return; }
    setOpen(b.slug);
    if (!topics[b.slug]) {
      setLoading(true);
      try {
        const data = await loadNotes(b.slug);
        setTopics((t) => ({ ...t, [b.slug]: topicNames(data.meta) }));
      } catch {
        setTopics((t) => ({ ...t, [b.slug]: [] }));
      } finally { setLoading(false); }
    }
  };

  const toggle = (b, topic) => {
    if (hasNotesItem(b.slug, topic)) removeItem(notesItemId(b.slug, topic));
    else addNotesItem(b.slug, topic, `${b.eyebrow || b.title} · ${topic}`);
  };

  return (
    <div className="nx-overlay" onClick={onClose}>
      <div className="nx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="nx-bar">
          <b>➕ Chapters add karo</b>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="nx-edit" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {["gs", "english"].map((key) =>
            (groups[key] || []).length ? (
              <div key={key} style={{ marginBottom: 12 }}>
                <div className="nt-meta" style={{ margin: "6px 0" }}>{SUBJECT_LABEL[key]}</div>
                {groups[key].map((b) => (
                  <div key={b.slug} className="nt-card" style={{ padding: 8 }}>
                    <button
                      className="row between"
                      onClick={() => expand(b)}
                      style={{ width: "100%", background: "none", border: 0, cursor: "pointer", color: "inherit" }}
                    >
                      <b>{b.eyebrow || b.title}</b>
                      <span className="nt-meta">{open === b.slug ? "▲" : "▼"}</span>
                    </button>
                    {open === b.slug && (
                      <div style={{ marginTop: 8 }}>
                        {!topics[b.slug] ? (
                          <div className="nt-meta">{loading ? "…" : ""}</div>
                        ) : topics[b.slug].length === 0 ? (
                          <div className="nt-meta">Is book mein chapters list nahi.</div>
                        ) : (
                          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                            {topics[b.slug].map((topic) => {
                              const on = hasNotesItem(b.slug, topic);
                              return (
                                <button
                                  key={topic}
                                  className={`btn btn--sm ${on ? "btn--primary" : "btn--ghost"}`}
                                  onClick={() => toggle(b, topic)}
                                >
                                  {on ? "✓ " : "+ "}{topic}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
