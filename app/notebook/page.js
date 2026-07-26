"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { getEntries, addEntry, updateEntry, deleteEntry, compressImage } from "@/lib/notebook";

// A personal, free-form notebook. Tap + to add an entry — a Subject + Topic on
// top, then a rule (text), an image, or both. The main view is a compact LIST;
// tapping an entry opens it in a POPUP with the full note / image. Text + images
// both live in one synced key, so it shows up on every device.
export default function NotebookPage() {
  const [entries, setEntries] = useState(null); // null = not loaded yet
  const [composing, setComposing] = useState(false);
  const [viewId, setViewId] = useState(null);   // entry open in the popup
  const [editing, setEditing] = useState(false); // popup is in edit mode

  // composer / editor fields
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [img, setImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => { setEntries(getEntries()); }, []);

  // Lock the page scroll while a popup (view or composer) is open.
  useEffect(() => {
    const on = composing || viewId !== null;
    document.body.classList.toggle("modal-open", on);
    return () => document.body.classList.remove("modal-open");
  }, [composing, viewId]);

  const resetFields = () => { setSubject(""); setTopic(""); setText(""); setImg(""); setErr(""); setBusy(false); };
  const closeComposer = () => { setComposing(false); resetFields(); };
  const closeView = () => { setViewId(null); setEditing(false); resetFields(); };

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
    if (!subject.trim() && !topic.trim() && !text.trim() && !img) { setErr("Kuch to bharo — subject, note ya image."); return; }
    try { addEntry({ subject, topic, text, img }); setEntries(getEntries()); closeComposer(); }
    catch { setErr("Storage full ho gaya (image bahut badi). Chhoti image try karo."); }
  };

  const openView = (e) => { setViewId(e.id); setEditing(false); };
  const startEdit = (e) => {
    setEditing(true);
    setSubject(e.subject || ""); setTopic(e.topic || ""); setText(e.text || ""); setImg(""); setErr("");
  };
  const saveEdit = () => {
    updateEntry(viewId, { subject, topic, text });
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
  const renderForm = ({ onSave, onCancel, saveLabel }) => (
    <>
      <input
        className="input"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (e.g. English, Maths, GK)…"
        style={{ width: "100%", fontWeight: 600 }}
      />
      <input
        className="input mt-8"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic (e.g. Pronoun, Percentage)…"
        style={{ width: "100%" }}
      />
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

  const openEntry = viewId != null ? (entries || []).find((e) => e.id === viewId) : null;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📓 Notebook</span>
          <button className="btn btn--primary btn--sm" onClick={() => { resetFields(); setComposing(true); }} title="Naya add karo" aria-label="Add">
            ＋ Add
          </button>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          My <span className="grad">Notebook</span>
        </h1>
        <p className="hero__sub">
          Har entry pe subject + topic daalo, phir rule / note ya image. List mein sab short
          dikhega — kisi ko tap karo to popup mein poora khul jaayega. Har device pe sync.
        </p>
      </section>

      <section className="section">
        {entries === null ? (
          <div className="placeholder">Loading… 📓</div>
        ) : entries.length === 0 ? (
          <div className="placeholder">
            Notebook khaali hai. Upar <b>＋ Add</b> dabao aur pehla note / image daalo. ✍️
          </div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {entries.map((e) => (
              <button
                key={e.id}
                className="glass-card"
                onClick={() => openView(e)}
                style={{ width: "100%", textAlign: "left", cursor: "pointer", color: "inherit", padding: "12px 14px" }}
              >
                <div className="row between" style={{ gap: 8 }}>
                  <span style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", minWidth: 0 }}>
                    <strong style={{ fontSize: "0.95rem" }}>{e.subject || "Untitled"}</strong>
                    {e.topic && <span className="chip" style={{ fontSize: "0.72rem" }}>{e.topic}</span>}
                  </span>
                  <span className="muted" style={{ fontSize: "1rem", flexShrink: 0 }}>›</span>
                </div>
                <div className="muted" style={{ fontSize: "0.82rem", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {preview(e)}{e.img && (e.text || "").trim() ? " · 🖼️" : ""}
                </div>
              </button>
            ))}
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
