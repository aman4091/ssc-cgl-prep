"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import {
  getEntries, addEntry, updateEntry, deleteEntry, compressImage, fileLegacyEntries,
} from "@/lib/notebook";
import { NB_SUBJECTS, subjectByLabel, chaptersFor } from "@/lib/notebookTaxonomy";

// A personal notebook, filed like the rest of the app: pick a Subject from the
// left rail (GS / Maths / English / Reasoning), drill into a Chapter, and the
// notes for that chapter show up. Tap + to add a note into the open subject +
// chapter — a rule (text), an image, or both. Everything lives in one synced key
// so it shows up on every device.
export default function NotebookPage() {
  const [entries, setEntries] = useState(null); // null = not loaded yet
  const [subjectKey, setSubjectKey] = useState(NB_SUBJECTS[0].key);
  const [chapter, setChapter] = useState(null);  // null = show the chapter list
  const [composing, setComposing] = useState(false);
  const [viewId, setViewId] = useState(null);   // entry open in the popup
  const [editing, setEditing] = useState(false); // popup is in edit mode

  // composer / editor fields
  const [subjectLabel, setSubjectLabel] = useState(NB_SUBJECTS[0].label);
  const [topicLabel, setTopicLabel] = useState("");
  const [text, setText] = useState("");
  const [img, setImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  // File the legacy flat notes into English › Noun once, then load.
  useEffect(() => {
    fileLegacyEntries();
    const list = getEntries();
    setEntries(list);
    // Land on the first subject that actually has notes, so it isn't an empty screen.
    const withNotes = NB_SUBJECTS.find((s) => list.some((e) => e.subject === s.label));
    if (withNotes) setSubjectKey(withNotes.key);
  }, []);

  // Lock the page scroll while a popup (view or composer) is open.
  useEffect(() => {
    const on = composing || viewId !== null;
    document.body.classList.toggle("modal-open", on);
    return () => document.body.classList.remove("modal-open");
  }, [composing, viewId]);

  const subject = NB_SUBJECTS.find((s) => s.key === subjectKey) || NB_SUBJECTS[0];

  // Count notes per subject and per chapter of the open subject.
  const byEntry = entries || [];
  const subjectCounts = useMemo(() => {
    const m = {};
    for (const s of NB_SUBJECTS) m[s.label] = 0;
    for (const e of byEntry) if (e.subject in m) m[e.subject] += 1;
    return m;
  }, [byEntry]);

  // Chapters to show for the open subject: the fixed list, PLUS any orphan topic
  // that has notes but isn't in the list (so nothing filed under an old label hides).
  const chapterRows = useMemo(() => {
    const counts = {};
    for (const e of byEntry) {
      if (e.subject !== subject.label) continue;
      const t = (e.topic || "Miscellaneous").trim() || "Miscellaneous";
      counts[t] = (counts[t] || 0) + 1;
    }
    const seen = new Set();
    const rows = [];
    for (const ch of subject.chapters) { rows.push({ ch, count: counts[ch] || 0 }); seen.add(ch); }
    for (const t of Object.keys(counts)) if (!seen.has(t)) rows.push({ ch: t, count: counts[t] });
    return rows;
  }, [byEntry, subject]);

  const chapterEntries = useMemo(() => {
    if (!chapter) return [];
    return byEntry.filter(
      (e) => e.subject === subject.label && ((e.topic || "Miscellaneous").trim() || "Miscellaneous") === chapter
    );
  }, [byEntry, subject, chapter]);

  const pickSubject = (key) => { setSubjectKey(key); setChapter(null); };

  const resetFields = () => { setText(""); setImg(""); setErr(""); setBusy(false); };
  const closeComposer = () => { setComposing(false); resetFields(); };
  const closeView = () => { setViewId(null); setEditing(false); resetFields(); };

  const openComposer = () => {
    resetFields();
    setSubjectLabel(subject.label);
    setTopicLabel(chapter || subject.chapters[0]);
    setComposing(true);
  };

  const attach = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) { setErr("Sirf image file add kar sakte ho."); return; }
    setBusy(true); setErr("");
    try { setImg(await compressImage(file)); }
    catch (e) { setErr(e.message || "Image add nahi hui."); }
    finally { setBusy(false); }
  };

  // Paste an image straight from the clipboard (screenshots) into the composer.
  const onPaste = (e) => {
    const item = [...(e.clipboardData?.items || [])].find((it) => it.type.startsWith("image/"));
    if (item) { e.preventDefault(); attach(item.getAsFile()); }
  };

  const saveNew = () => {
    if (!text.trim() && !img) { setErr("Kuch to bharo — note ya image."); return; }
    try {
      addEntry({ subject: subjectLabel, topic: topicLabel, text, img });
      const list = getEntries();
      setEntries(list);
      // Jump the view to where the note just landed, so it's visible.
      const s = subjectByLabel(subjectLabel);
      if (s) setSubjectKey(s.key);
      setChapter(topicLabel);
      closeComposer();
    } catch { setErr("Storage full ho gaya (image bahut badi). Chhoti image try karo."); }
  };

  const openView = (e) => { setViewId(e.id); setEditing(false); };
  const startEdit = (e) => {
    setEditing(true);
    setSubjectLabel(e.subject || subject.label);
    setTopicLabel(e.topic || "Miscellaneous");
    setText(e.text || ""); setImg(""); setErr("");
  };
  const saveEdit = () => {
    updateEntry(viewId, { subject: subjectLabel, topic: topicLabel, text });
    setEntries(getEntries()); setEditing(false); resetFields();
  };

  const remove = (id) => {
    if (!confirm("Ye entry delete kar dein?")) return;
    deleteEntry(id); setEntries(getEntries());
    if (viewId === id) closeView();
  };

  const preview = (e) => {
    const t = (e.text || "").replace(/\s+/g, " ").trim();
    if (t) return t.length > 90 ? t.slice(0, 90) + "…" : t;
    if (e.img) return "🖼️ Image";
    return "—";
  };

  // A plain render FUNCTION (not a nested component): calling it returns JSX that
  // reconciles in place, so the inputs keep focus while you type. Defining this
  // as a <Form/> component would remount on every keystroke and drop focus.
  const renderForm = ({ onSave, onCancel, saveLabel }) => {
    const chapterOpts = chaptersFor(subjectLabel);
    // If an entry sat under an old label, keep it selectable so editing doesn't lose it.
    const opts = chapterOpts.includes(topicLabel) || !topicLabel ? chapterOpts : [topicLabel, ...chapterOpts];
    return (
      <>
        <div className="row" style={{ gap: 8 }}>
          <select
            className="input"
            value={subjectLabel}
            onChange={(e) => {
              const next = e.target.value;
              setSubjectLabel(next);
              const chs = chaptersFor(next);
              if (!chs.includes(topicLabel)) setTopicLabel(chs[0]);
            }}
            style={{ flex: 1, fontWeight: 600 }}
          >
            {NB_SUBJECTS.map((s) => <option key={s.key} value={s.label}>{s.icon} {s.label}</option>)}
          </select>
          <select
            className="input"
            value={topicLabel}
            onChange={(e) => setTopicLabel(e.target.value)}
            style={{ flex: 1 }}
          >
            {opts.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea
          className="input mt-8"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          placeholder="Rule / note likho… (image bhi yahan paste kar sakte ho)"
          rows={6}
          style={{ width: "100%", resize: "vertical", fontSize: "0.95rem" }}
        />
        {img && (
          <div style={{ marginTop: 12 }}>
            <img src={img} alt="attached" style={{ maxWidth: "100%", borderRadius: 10, display: "block" }} />
            <button className="btn btn--ghost btn--sm" onClick={() => setImg("")} style={{ marginTop: 8 }}>✕ Image hatao</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
        {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{err}</p>}
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "…" : "🖼️ Image add"}
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn--primary btn--sm" onClick={onSave} disabled={busy}>💾 {saveLabel}</button>
        </div>
      </>
    );
  };

  const openEntry = viewId != null ? (entries || []).find((e) => e.id === viewId) : null;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📓 Notebook</span>
          <button className="btn btn--primary btn--sm" onClick={openComposer} title="Naya add karo" aria-label="Add">
            ＋ Add
          </button>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          My <span className="grad">Notebook</span>
        </h1>
        <p className="hero__sub">
          Left se subject chuno, phir chapter — us chapter ke saare notes yahin dikhenge.
          ＋ Add se note ya image daalo. Har device pe sync.
        </p>
      </section>

      <section className="section">
        {entries === null ? (
          <div className="placeholder">Loading… 📓</div>
        ) : (
          <div className="nb-shell">
            {/* Left rail — subjects */}
            <aside className="nb-rail">
              {NB_SUBJECTS.map((s) => (
                <button
                  key={s.key}
                  className={`nb-subj${s.key === subjectKey ? " is-active" : ""}`}
                  onClick={() => pickSubject(s.key)}
                >
                  <span className="nb-subj__icon">{s.icon}</span>
                  <span className="nb-subj__label">{s.label}</span>
                  {subjectCounts[s.label] > 0 && <span className="nb-subj__count">{subjectCounts[s.label]}</span>}
                </button>
              ))}
            </aside>

            {/* Main — chapters, or a chapter's notes */}
            <div className="nb-main">
              <div className="nb-crumb">
                <button className="nb-crumb__btn" onClick={() => setChapter(null)}>
                  {subject.icon} {subject.label}
                </button>
                {chapter && <><span className="nb-crumb__sep">›</span><span className="nb-crumb__here">{chapter}</span></>}
              </div>

              {!chapter ? (
                <div className="grid" style={{ gap: 8 }}>
                  {chapterRows.map(({ ch, count }) => (
                    <button
                      key={ch}
                      className="glass-card nb-chapter"
                      onClick={() => setChapter(ch)}
                    >
                      <span className="nb-chapter__name">{ch}</span>
                      <span className="nb-chapter__meta">
                        <span className="muted" style={{ fontSize: "0.78rem" }}>{count} note{count === 1 ? "" : "s"}</span>
                        <span className="muted" style={{ fontSize: "1rem" }}>›</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : chapterEntries.length === 0 ? (
                <div className="placeholder">
                  <b>{chapter}</b> mein abhi koi note nahi. Upar <b>＋ Add</b> dabao. ✍️
                </div>
              ) : (
                <div className="grid" style={{ gap: 10 }}>
                  {chapterEntries.map((e) => (
                    <button
                      key={e.id}
                      className="glass-card"
                      onClick={() => openView(e)}
                      style={{ width: "100%", textAlign: "left", cursor: "pointer", color: "inherit", padding: "12px 14px" }}
                    >
                      <div className="muted" style={{ fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {preview(e)}{e.img && (e.text || "").trim() ? " · 🖼️" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Add composer — popup */}
      {composing && (
        <div className="modal-overlay" onClick={closeComposer}>
          <div className="modal glass-card" onClick={(ev) => ev.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.15rem", margin: 0 }}>➕ Naya note</h2>
              <button className="btn btn--ghost btn--sm" onClick={closeComposer} aria-label="Close">✕</button>
            </div>
            {renderForm({ onSave: saveNew, onCancel: closeComposer, saveLabel: "Save" })}
          </div>
        </div>
      )}

      {/* View / edit one entry — popup */}
      {openEntry && (
        <div className="modal-overlay" onClick={closeView}>
          <div className="modal glass-card" onClick={(ev) => ev.stopPropagation()}>
            <div className="row between" style={{ alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", minWidth: 0 }}>
                <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{openEntry.subject || "Untitled"}</h2>
                {openEntry.topic && <span className="chip" style={{ fontSize: "0.74rem" }}>{openEntry.topic}</span>}
              </span>
              <button className="btn btn--ghost btn--sm" onClick={closeView} aria-label="Close">✕</button>
            </div>

            {editing ? (
              renderForm({ onSave: saveEdit, onCancel: () => { setEditing(false); resetFields(); }, saveLabel: "Update" })
            ) : (
              <>
                {openEntry.text && (
                  <div style={{ fontSize: "0.95rem" }}>
                    <Markdown>{openEntry.text}</Markdown>
                  </div>
                )}
                {openEntry.img && (
                  <a href={openEntry.img} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: openEntry.text ? 12 : 0 }}>
                    <img src={openEntry.img} alt="note" loading="lazy" style={{ maxWidth: "100%", borderRadius: 10, display: "block" }} />
                  </a>
                )}
                <div className="row between mt-16" style={{ alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: "0.72rem" }}>
                    {new Date(openEntry.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="row" style={{ gap: 6 }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => startEdit(openEntry)} title="Edit">✏️ Edit</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => remove(openEntry.id)} title="Delete">🗑️ Delete</button>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
