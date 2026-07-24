"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { getEntries, addEntry, updateEntry, deleteEntry, compressImage } from "@/lib/notebook";

// A personal, free-form notebook. Tap + to add an entry — a Subject + Topic on
// top, then a rule (text), an image, or both. The main view is a compact LIST:
// each entry shows its subject + topic + a short preview; tapping opens the full
// thing. Text + images both live in one synced key, so it shows up on every device.
export default function NotebookPage() {
  const [entries, setEntries] = useState(null); // null = not loaded yet
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState(null);   // which entry is expanded
  const [editId, setEditId] = useState(null);

  // composer / editor fields
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [img, setImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  useEffect(() => { setEntries(getEntries()); }, []);

  const resetFields = () => { setSubject(""); setTopic(""); setText(""); setImg(""); setErr(""); setBusy(false); };
  const closeComposer = () => { setComposing(false); resetFields(); };
  const closeEditor = () => { setEditId(null); resetFields(); };

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

  const startEdit = (e) => {
    setEditId(e.id); setOpenId(e.id);
    setSubject(e.subject || ""); setTopic(e.topic || ""); setText(e.text || ""); setImg(""); setErr("");
  };
  const saveEdit = () => {
    updateEntry(editId, { subject, topic, text });
    setEntries(getEntries()); closeEditor();
  };

  const remove = (id) => {
    if (!confirm("Ye entry delete kar dein?")) return;
    deleteEntry(id); setEntries(getEntries());
    if (openId === id) setOpenId(null);
  };

  const preview = (e) => {
    const t = (e.text || "").replace(/\s+/g, " ").trim();
    if (t) return t.length > 90 ? t.slice(0, 90) + "…" : t;
    if (e.img) return "🖼️ Image";
    return "—";
  };

  // The composer / editor form (shared shape). `onSave`/`onCancel` differ.
  const Form = ({ onSave, onCancel, saveLabel }) => (
    <div className="glass-card" style={{ padding: 16 }}>
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
        rows={5}
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
    </div>
  );

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📓 Notebook</span>
          {!composing && (
            <button className="btn btn--primary btn--sm" onClick={() => { setComposing(true); setEditId(null); resetFields(); }} title="Naya add karo" aria-label="Add">
              ＋ Add
            </button>
          )}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          My <span className="grad">Notebook</span>
        </h1>
        <p className="hero__sub">
          Har entry pe subject + topic daalo, phir rule / note ya image. List mein sab short
          dikhega — kisi ko tap karo to poora khul jaayega. Har device pe sync.
        </p>
      </section>

      {composing && (
        <section className="section">
          <Form onSave={saveNew} onCancel={closeComposer} saveLabel="Save" />
        </section>
      )}

      <section className="section">
        {entries === null ? (
          <div className="placeholder">Loading… 📓</div>
        ) : entries.length === 0 ? (
          <div className="placeholder">
            Notebook khaali hai. Upar <b>＋ Add</b> dabao aur pehla note / image daalo. ✍️
          </div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {entries.map((e) => {
              const open = openId === e.id;
              const editing = editId === e.id;
              if (editing) {
                return (
                  <div key={e.id}>
                    <Form onSave={saveEdit} onCancel={closeEditor} saveLabel="Update" />
                  </div>
                );
              }
              return (
                <article key={e.id} className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Collapsed row — the whole strip toggles open. */}
                  <button
                    onClick={() => setOpenId(open ? null : e.id)}
                    style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", padding: "12px 14px", color: "inherit" }}
                  >
                    <div className="row between" style={{ gap: 8 }}>
                      <span style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", minWidth: 0 }}>
                        <strong style={{ fontSize: "0.95rem" }}>{e.subject || "Untitled"}</strong>
                        {e.topic && <span className="chip" style={{ fontSize: "0.72rem" }}>{e.topic}</span>}
                      </span>
                      <span className="muted" style={{ fontSize: "1rem", flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
                    </div>
                    {!open && (
                      <div className="muted" style={{ fontSize: "0.82rem", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.img && !((e.text || "").trim()) ? "🖼️ Image" : preview(e)}
                        {e.img && (e.text || "").trim() ? " · 🖼️" : ""}
                      </div>
                    )}
                  </button>

                  {/* Expanded body */}
                  {open && (
                    <div style={{ padding: "0 14px 14px" }}>
                      {e.text && (
                        <div style={{ fontSize: "0.92rem" }}>
                          <Markdown>{e.text}</Markdown>
                        </div>
                      )}
                      {e.img && (
                        <a href={e.img} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: e.text ? 12 : 4 }}>
                          <img src={e.img} alt="note" loading="lazy" style={{ maxWidth: "100%", borderRadius: 10, display: "block" }} />
                        </a>
                      )}
                      <div className="row between mt-12" style={{ alignItems: "center" }}>
                        <span className="muted" style={{ fontSize: "0.72rem" }}>
                          {new Date(e.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="row" style={{ gap: 6 }}>
                          <button className="btn btn--ghost btn--sm" onClick={() => startEdit(e)} title="Edit">✏️</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => remove(e.id)} title="Delete">🗑️</button>
                        </span>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
