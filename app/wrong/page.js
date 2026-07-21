"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SUBJECTS, subjectLabel, getWrongBook, countsBySubject, isPracticeable,
  storeImages, addWrong, updateWrong, removeWrong, clearWrong,
} from "@/lib/wrongbook";
import { getFile } from "@/lib/filestore";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { saveQuiz, makeId } from "@/lib/storage";

// Wrong Questions — a hand-kept book, one shelf per subject.
//
// Separate from the Mistake Notebook on purpose: that one fills itself from the
// quiz runners, this one holds only what you put in. They share no storage.
//
// The fast path is a screenshot: paste anywhere on the page and the form opens
// with the image already in it. Typing a proper MCQ is optional, and only pays
// for itself if you want to practise the question later.

// Object URLs for a record's stored blobs, revoked when they change or unmount.
function useBlobUrls(ids) {
  const [urls, setUrls] = useState([]);
  const key = (ids || []).join(",");
  useEffect(() => {
    let alive = true;
    const made = [];
    (async () => {
      const out = [];
      for (const id of ids || []) {
        const blob = await getFile(id).catch(() => null);
        if (!blob) continue;
        const u = URL.createObjectURL(blob);
        made.push(u);
        out.push(u);
      }
      if (alive) setUrls(out);
      else made.forEach((u) => URL.revokeObjectURL(u));
    })();
    return () => { alive = false; made.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

function WrongCard({ rec, onEdit, onDelete }) {
  const [shown, setShown] = useState(false);
  const urls = useBlobUrls(rec.imgIds);
  const q = rec.q || {};
  const opts = q.options || [];
  const hasAnswer = Number.isInteger(q.answer) && opts.length > 0;

  return (
    <div className="glass-card">
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={u}
          alt={`Wrong question ${i + 1}`}
          style={{ width: "100%", height: "auto", borderRadius: 10, marginBottom: 10, display: "block" }}
        />
      ))}

      {q.question && <p style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>{q.question}</p>}

      {opts.length > 0 && (
        <div className="mt-8" style={{ display: "grid", gap: 6 }}>
          {opts.map((o, i) => {
            const right = shown && i === q.answer;
            return (
              <div
                key={i}
                style={{
                  padding: "8px 12px", borderRadius: 8, fontSize: "0.92rem",
                  border: `1px solid ${right ? "var(--success)" : "var(--glass-border)"}`,
                  background: right ? "rgba(34,197,94,0.10)" : "transparent",
                }}
              >
                <strong style={{ opacity: 0.6, marginRight: 8 }}>{String.fromCharCode(65 + i)}</strong>
                {o}
                {right && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {shown && (q.solution || rec.note) && (
        <p className="muted mt-8" style={{ fontSize: "0.86rem", whiteSpace: "pre-wrap" }}>
          {q.solution && <>💡 {q.solution}</>}
          {q.solution && rec.note && <br />}
          {rec.note && <>📝 {rec.note}</>}
        </p>
      )}

      <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
        {(hasAnswer || q.solution || rec.note) && (
          <button className="btn btn--ghost btn--sm" onClick={() => setShown((v) => !v)}>
            {shown ? "🙈 Hide answer" : "👁️ Show answer"}
          </button>
        )}
        <button className="btn btn--ghost btn--sm" onClick={onEdit}>✏️ Edit</button>
        <button className="btn btn--ghost btn--sm" onClick={onDelete}>🗑️ Delete</button>
      </div>
    </div>
  );
}

export default function WrongQuestionsPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("reasoning");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(() => Object.fromEntries(SUBJECTS.map((s) => [s.key, 0])));
  const [open, setOpen] = useState(false);      // add/edit form open
  const [editing, setEditing] = useState(null); // record id being edited

  // form state
  const [imgIds, setImgIds] = useState([]);
  const [text, setText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [ans, setAns] = useState(0);
  const [sol, setSol] = useState("");
  const [note, setNote] = useState("");
  const [withOpts, setWithOpts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const formRef = useRef(null);

  const refresh = (subj = subject) => {
    setItems(getWrongBook(subj));
    setCounts(countsBySubject());
  };
  useEffect(() => { refresh(subject); /* eslint-disable-next-line */ }, [subject]);

  const active = SUBJECTS.find((s) => s.key === subject);

  const reset = () => {
    setImgIds([]); setText(""); setOpts(["", "", "", ""]); setAns(0);
    setSol(""); setNote(""); setWithOpts(false); setErr("");
  };
  const cancel = () => { setOpen(false); setEditing(null); reset(); };

  // Compress + store, then hold the ids. Doing it on paste rather than on save
  // keeps the thumbnails honest: what you see is what is already on disk.
  const takeFiles = useCallback(async (files) => {
    const imgs = (files || []).filter(isImageFile);
    if (!imgs.length) return;
    setBusy(true); setErr("");
    try {
      const ids = await storeImages(imgs);
      setImgIds((prev) => [...prev, ...ids]);
      setOpen(true);
    } catch {
      setErr("Image save nahi ho payi — dobara try karo.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Paste anywhere on the page. Ignored while typing so Ctrl+V of ordinary text
  // into the question box still behaves normally.
  useEffect(() => {
    const onPaste = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
      const imgs = imagesFromEvent(e);
      if (!imgs.length) return;
      if (typing && !formRef.current?.contains(e.target)) return;
      e.preventDefault();
      takeFiles(imgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFiles]);

  const onDrop = (e) => {
    const imgs = imagesFromEvent(e);
    if (!imgs.length) return;
    e.preventDefault();
    takeFiles(imgs);
  };

  const dropImage = (id) => setImgIds((prev) => prev.filter((x) => x !== id));

  const startEdit = (rec) => {
    setEditing(rec.id);
    setImgIds(rec.imgIds || []);
    setText(rec.q?.question || "");
    const o = rec.q?.options || [];
    setOpts(o.length ? [...o] : ["", "", "", ""]);
    setAns(Number.isInteger(rec.q?.answer) ? rec.q.answer : 0);
    setSol(rec.q?.solution || "");
    setNote(rec.note || "");
    setWithOpts(o.filter(Boolean).length >= 2);
    setErr("");
    setOpen(true);
  };

  const save = async () => {
    const cleanOpts = withOpts ? opts.map((o) => o.trim()).filter(Boolean) : [];
    if (!imgIds.length && !text.trim()) {
      setErr("Ek image paste karo ya question likho."); return;
    }
    if (withOpts) {
      if (cleanOpts.length < 2) { setErr("Options ke liye kam se kam 2 chahiye."); return; }
      if (ans < 0 || ans >= cleanOpts.length) { setErr("Sahi option tick karo."); return; }
    }
    const q = (text.trim() || cleanOpts.length || sol.trim())
      ? { question: text.trim(), options: cleanOpts, answer: withOpts ? ans : 0, solution: sol.trim() }
      : null;

    setBusy(true);
    try {
      if (editing) await updateWrong(editing, { q, imgIds, note });
      else addWrong({ subject, q, imgIds, note });
      cancel();
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Ye question hata dein?")) return;
    await removeWrong(id);
    refresh();
  };
  const clearShelf = async () => {
    if (!confirm(`${active.label} ke saare ${items.length} questions hata dein?`)) return;
    await clearWrong(subject);
    refresh();
  };

  const practiceable = items.filter(isPracticeable);
  const practice = () => {
    if (!practiceable.length) return;
    const quiz = {
      id: makeId(),
      title: `${active.icon} ${active.label} · Wrong questions`,
      source: "wrongbook",
      createdAt: new Date().toISOString(),
      questions: practiceable.map((r) => r.q),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const formUrls = useBlobUrls(imgIds);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">❌ Wrong Questions</span>
          <Link href="/mistakes" className="btn btn--ghost btn--sm">🔴 Mistake Notebook</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Wrong <span className="grad">Questions</span>
        </h1>
        <p className="hero__sub">
          Screenshot lo aur kahin bhi <strong>Ctrl+V</strong> — question seedha yahan add ho jayega.
          Subject ke hisaab se apni khud ki list; ye Mistake Notebook se alag hai.
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {/* Subject shelves */}
        <div className="chips" style={{ marginBottom: 16 }}>
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              className={`chip chip--btn chip--lg ${subject === s.key ? "is-active" : ""}`}
              onClick={() => { setSubject(s.key); cancel(); }}
            >
              {s.icon} {s.label} ({counts[s.key]})
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="btn btn--primary btn--sm" onClick={() => (open ? cancel() : setOpen(true))}>
            {open ? "✕ Cancel" : `➕ Add to ${active.label}`}
          </button>
          {practiceable.length > 0 && (
            <button className="btn btn--ghost btn--sm" onClick={practice}>
              🎯 Practice ({practiceable.length})
            </button>
          )}
          {items.length > 0 && (
            <button className="btn btn--ghost btn--sm" onClick={clearShelf}>🗑️ Clear {active.label}</button>
          )}
        </div>

        {open && (
          <div className="glass-card" ref={formRef} style={{ marginBottom: 16 }}>
            <h3>{editing ? "✏️ Edit" : "➕ Naya question"} · {active.icon} {active.label}</h3>

            {/* Paste zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{
                marginTop: 12, padding: "18px 14px", borderRadius: 12, cursor: "pointer",
                border: "1.5px dashed var(--glass-border)", textAlign: "center",
                background: "var(--accent-wash)",
              }}
            >
              <p style={{ fontWeight: 600 }}>📋 {busy ? "Image save ho rahi hai…" : "Ctrl+V karke image paste karo"}</p>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                ya image yahan drag karo · ya tap karke file choose karo
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { takeFiles([...(e.target.files || [])]); e.target.value = ""; }}
              />
            </div>

            {formUrls.length > 0 && (
              <div className="mt-8" style={{ display: "grid", gap: 8 }}>
                {formUrls.map((u, i) => (
                  <div key={imgIds[i]} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Pasted ${i + 1}`} style={{ width: "100%", height: "auto", borderRadius: 10, display: "block" }} />
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => dropImage(imgIds[i])}
                      style={{ position: "absolute", top: 6, right: 6 }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-16">
              <label className="vd-label">Question text (optional — image hi kaafi hai)</label>
              <textarea className="textarea" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
            </div>

            <div className="mt-8">
              <label className="vd-label">Note (optional) — kyun galat hua?</label>
              <textarea
                className="textarea" rows={2} value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. formula yaad nahi tha"
              />
            </div>

            <div className="mt-8">
              <label className="vd-label">Answer / solution (optional)</label>
              <textarea className="textarea" rows={2} value={sol} onChange={(e) => setSol(e.target.value)} />
            </div>

            {/* Options are only needed to practise it later as an MCQ. */}
            {!withOpts ? (
              <button className="btn btn--ghost btn--sm mt-8" onClick={() => setWithOpts(true)}>
                ➕ Options daalo (taaki practice quiz mein aa sake)
              </button>
            ) : (
              <div className="mt-16">
                <label className="vd-label">Options — sahi wale ko tick karo ✓</label>
                <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                  {opts.map((o, i) => (
                    <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input
                        type="radio" name="wb-correct" checked={ans === i}
                        onChange={() => setAns(i)} title="Mark correct" style={{ flexShrink: 0 }}
                      />
                      <strong style={{ opacity: 0.6, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</strong>
                      <input
                        className="input" style={{ flex: 1 }} value={o}
                        onChange={(e) => setOpts((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))}
                      />
                    </div>
                  ))}
                </div>
                <button className="btn btn--ghost btn--sm mt-8" onClick={() => { setWithOpts(false); setOpts(["", "", "", ""]); }}>
                  ✕ Options hatao
                </button>
              </div>
            )}

            {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{err}</p>}

            <div className="row mt-16" style={{ gap: 8 }}>
              <button className="btn btn--primary btn--sm" onClick={save} disabled={busy}>
                {busy ? "…" : "💾 Save"}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={cancel}>Cancel</button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="placeholder">
            {active.label} mein abhi kuch nahi. Screenshot copy karo aur yahin <strong>Ctrl+V</strong> dabao —
            question apne aap add ho jayega.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((rec) => (
              <WrongCard
                key={rec.id}
                rec={rec}
                onEdit={() => startEdit(rec)}
                onDelete={() => remove(rec.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
