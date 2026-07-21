"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SUBJECTS, getWrongBook, countsBySubject, isPracticeable, imagesOf, imageKey,
  storeImages, addWrong, updateWrong, removeWrong, clearWrong, setOcrText,
} from "@/lib/wrongbook";
import { getFile } from "@/lib/filestore";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { saveQuiz, makeId, getSettings } from "@/lib/storage";
import { generateSimilar, readImageText } from "@/lib/client-ai";
import ZoomableImage from "@/components/ZoomableImage";

// Wrong Questions — a hand-kept book, one shelf per subject.
//
// Separate from the Mistake Notebook on purpose: that one fills itself from the
// quiz runners, this one holds only what you put in. They share no storage.
//
// The fast path is a screenshot: paste anywhere on the page and the form opens
// with the image already in it. Typing a proper MCQ is optional, and only pays
// for itself if you want to practise the question later.

// Display URLs for a record's images. An R2 image is already a URL; a local
// fallback has to be read out of IndexedDB and object-URL'd (and revoked).
// `missing` counts local blobs this device doesn't have — what a synced record
// looks like when its image never made it to R2.
function useImageUrls(images) {
  const [state, setState] = useState({ urls: [], missing: 0, loading: true });
  const key = (images || []).map(imageKey).join(",");
  useEffect(() => {
    let alive = true;
    const made = [];
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const out = [];
      let gone = 0;
      for (const img of images || []) {
        if (img.url) { out.push(img.url); continue; }
        const blob = await getFile(img.id).catch(() => null);
        if (!blob) { gone += 1; continue; }
        const u = URL.createObjectURL(blob);
        made.push(u);
        out.push(u);
      }
      if (alive) setState({ urls: out, missing: gone, loading: false });
      else made.forEach((u) => URL.revokeObjectURL(u));
    })();
    return () => { alive = false; made.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

// The question as plain text — typed stem + lettered options, or whatever OCR
// read off the screenshot. This is what gets copied to Gemini and what the
// 20-similar generator is given as its sample.
function askTextOf(rec) {
  const q = rec.q || {};
  if (q.question || (q.options || []).some(Boolean)) {
    const nl = "\n";
    const opts = (q.options || [])
      .filter(Boolean)
      .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
      .join(nl);
    return [q.question, opts, q.solution && `Answer/solution: ${q.solution}`]
      .filter(Boolean).join(nl).trim();
  }
  return String(rec.ocrText || "").trim();
}

// navigator.clipboard can refuse after an await (the user gesture has expired),
// which on this page happens whenever OCR ran first. Fall back to execCommand
// so "copy karke Gemini kholo" doesn't silently paste nothing.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Settings keeps a prompt per subject as well as a generic Gemini one — a maths
// question must carry the maths instructions. Same precedence AskElsewhere uses.
function promptFor(subject) {
  const st = getSettings();
  const perSubject = String((st.shortcutPrompts || {})[subject] || "").trim();
  return perSubject || String(st.geminiPrompt || "").trim();
}

function WrongCard({ rec, onEdit, onDelete, onOcr }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  // Which of this record's images the lightbox is showing (null = closed).
  const [lb, setLb] = useState(null);
  const [busy, setBusy] = useState("");     // "" | "gemini" | "similar"
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [prog, setProg] = useState(0);       // tesseract OCR progress, 0-100
  const [manual, setManual] = useState(""); // text to copy by hand if the clipboard refused
  const { urls, missing, loading } = useImageUrls(imagesOf(rec));
  const q = rec.q || {};
  const opts = q.options || [];
  const hasAnswer = Number.isInteger(q.answer) && opts.length > 0;

  // The text to send onward. An image-only question has none until OCR reads it,
  // so that runs on first use and the result is cached on the record — it's
  // plain text, so it syncs and no other device has to read the image again.
  const ensureText = async () => {
    const have = askTextOf(rec);
    if (have) return have;
    const imgs = imagesOf(rec);
    if (!imgs.length) {
      throw new Error("Is question ka text nahi hai — Edit karke likh do.");
    }
    // Read whichever engine Settings selects: Gemini vision if it is ON, else
    // tesseract in the browser. R2 images come through our own proxy because
    // r2.dev sends no CORS header.
    const parts = [];
    for (const im of imgs) {
      let blob;
      if (im.url) {
        const res = await fetch(`/api/r2/image?url=${encodeURIComponent(im.url)}`);
        if (!res.ok) throw new Error("Image load nahi hui.");
        blob = await res.blob();
      } else {
        blob = await getFile(im.id).catch(() => null);
        if (!blob) throw new Error("Image is device par nahi hai.");
      }
      const { text: part } = await readImageText(blob, (pr) => setProg(Math.round(pr * 100)));
      if (part) parts.push(part);
    }
    const text = parts.join("\n").trim();
    if (!text) throw new Error("Image se koi text nahi mila.");
    setOcrText(rec.id, text);
    onOcr && onOcr();
    return text;
  };

  const askGemini = async () => {
    setBusy("gemini"); setErr(""); setManual(""); setProg(0);
    try {
      const text = await ensureText();
      const pre = promptFor(rec.subject);
      const full = pre ? `${pre}\n\n${text}` : text;
      const ok = await copyText(full);
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
      else setManual(full); // clipboard blocked — show it so nothing is lost
      window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const make20 = async () => {
    setBusy("similar"); setErr(""); setProg(0);
    try {
      const text = await ensureText();
      const data = await generateSimilar(
        { question: text, options: (q.options || []).filter(Boolean) },
        20,
        rec.subject
      );
      const quiz = {
        id: makeId(),
        title: data.title || "Similar (20)",
        source: "similar",
        createdAt: new Date().toISOString(),
        questions: data.questions,
      };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (e) {
      setErr(e.message);
      setBusy("");
    }
  };

  return (
    <div className="glass-card">
      {/* Actions sit ABOVE the question, like the PYQ/bank cards — a pasted
          screenshot is tall, and buttons underneath meant scrolling past the
          whole image to reach them. */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {(hasAnswer || q.solution || rec.note) && (
          <button className="btn btn--ghost btn--sm" onClick={() => setShown((v) => !v)}>
            {shown ? "🙈 Hide answer" : "👁️ Show answer"}
          </button>
        )}
        <button
          className="btn btn--ghost btn--sm"
          onClick={askGemini}
          disabled={!!busy}
          title="Prompt + question copy karke Gemini kholo (image se text apne aap padh liya jayega)"
        >
          {busy === "gemini" ? (prog ? `${prog}%` : "…") : copied ? "✓ Copied" : "✨ Gemini"}
        </button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={make20}
          disabled={!!busy}
          title="Isi type ke 20 naye questions generate karo"
        >
          {busy === "similar" ? (prog ? `${prog}%` : "…") : "🎯 20"}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onEdit}>✏️ Edit</button>
        <button className="btn btn--ghost btn--sm" onClick={onDelete}>🗑️ Delete</button>
      </div>

      {err && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 10 }}>{err}</p>}

      {/* Clipboard refused (it can, once OCR has eaten the user gesture) — put
          the text on screen instead of pretending the copy worked. */}
      {manual && (
        <div style={{ marginBottom: 10 }}>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            Clipboard block ho gaya — ye text khud copy karke Gemini mein paste karo:
          </p>
          <textarea className="textarea" rows={4} readOnly value={manual} onFocus={(e) => e.target.select()} />
        </div>
      )}

      {/* A pasted screenshot usually carries the options baked in, so it is tall.
          Shown capped here and opened full-size (and zoomable) on tap, rather
          than letting one question eat the whole screen. */}
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={u}
          alt={`Wrong question ${i + 1}`}
          onClick={() => setLb(i)}
          title="Tap to enlarge"
          style={{
            width: "100%", maxHeight: "min(70vh, 620px)", objectFit: "contain",
            objectPosition: "left top",
            borderRadius: 10, marginBottom: 10, display: "block",
            background: "#fff", cursor: "zoom-in",
          }}
        />
      ))}

      {/* Cloud sync carries the record but not the blob, so on another device a
          card would otherwise render as an empty strip of buttons. Say so. */}
      {!loading && missing > 0 && (
        <div
          style={{
            padding: "14px 12px", borderRadius: 10, marginBottom: 10,
            border: "1px dashed var(--glass-border)", background: "var(--accent-wash)",
          }}
        >
          <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            📷 {missing} image is device par nahi hai
          </p>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
            Ye image cloud (R2) par upload nahi ho payi thi, isliye sirf usi device par hai jahan
            paste ki thi. Wahan se dobara paste kar do — phir har device par dikhegi.
          </p>
        </div>
      )}

      {lb !== null && urls[lb] && (
        <div className="lightbox" onClick={() => setLb(null)}>
          <button className="lightbox__x" onClick={() => setLb(null)}>✕</button>
          <button
            className="lightbox__nav lightbox__nav--prev" disabled={lb <= 0}
            onClick={(e) => { e.stopPropagation(); setLb((i) => Math.max(0, i - 1)); }}
          >
            ‹
          </button>
          <div className="lightbox__body" onClick={(e) => e.stopPropagation()}>
            <ZoomableImage key={lb} src={urls[lb]} alt={`Wrong question ${lb + 1}`} />
          </div>
          <button
            className="lightbox__nav lightbox__nav--next" disabled={lb >= urls.length - 1}
            onClick={(e) => { e.stopPropagation(); setLb((i) => Math.min(urls.length - 1, i + 1)); }}
          >
            ›
          </button>
        </div>
      )}

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

      {rec.ocrText && (
        <details className="mt-8">
          <summary className="muted" style={{ fontSize: "0.78rem", cursor: "pointer" }}>
            📄 Image se pada hua text
          </summary>
          <p className="muted" style={{ fontSize: "0.82rem", whiteSpace: "pre-wrap", marginTop: 6 }}>
            {rec.ocrText}
          </p>
        </details>
      )}
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
  const [images, setImages] = useState([]);
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
    setImages([]); setText(""); setOpts(["", "", "", ""]); setAns(0);
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
      const { images: added, localOnly } = await storeImages(imgs);
      setImages((prev) => [...prev, ...added]);
      setOpen(true);
      // Say it rather than leaving an image silently stranded on one device.
      if (localOnly) setErr(`${localOnly} image cloud par upload nahi hui — sirf is device par rahegi.`);
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

  const dropImage = (img) => setImages((prev) => prev.filter((x) => imageKey(x) !== imageKey(img)));

  const startEdit = (rec) => {
    setEditing(rec.id);
    setImages(imagesOf(rec));
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
    if (!images.length && !text.trim()) {
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
      if (editing) await updateWrong(editing, { q, images, note });
      else addWrong({ subject, q, images, note });
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

  const { urls: formUrls } = useImageUrls(images);

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
                  <div key={imageKey(images[i])} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt={`Pasted ${i + 1}`}
                      style={{
                        width: "100%", maxHeight: "min(50vh, 420px)", objectFit: "contain",
                        objectPosition: "left top",
                        borderRadius: 10, display: "block", background: "#fff",
                      }}
                    />
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => dropImage(images[i])}
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
                onOcr={() => refresh()}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
