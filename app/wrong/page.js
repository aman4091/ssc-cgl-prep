"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SUBJECTS, getWrongBook, isPracticeable, imagesOf, imageKey, isSubject,
  dayKey, dayLabel, storeImages, addWrong, updateWrong, removeWrong, setOcrText, setDetail,
} from "@/lib/wrongbook";
import { getFile } from "@/lib/filestore";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { r2Status } from "@/lib/r2client";
import { saveQuiz, makeId, getSettings } from "@/lib/storage";
import { generateSimilar, readImageText } from "@/lib/client-ai";
import ZoomableImage from "@/components/ZoomableImage";
import Markdown from "@/components/Markdown";

// Wrong Questions — a hand-kept book, one shelf per subject.
//
// Separate from the Mistake Notebook on purpose: that one fills itself from the
// quiz runners, this one holds only what you put in. They share no storage.
//
// The fast path is a screenshot: paste anywhere on the page and the question is
// added on the spot — no form, no Save. Text, a note, options and a solution are
// all optional extras you can fill in later with Edit; options only matter if
// you want the question in a practice quiz.

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

function WrongCard({ rec, onEdit, onDelete, onChange }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  // Which of this record's images the lightbox is showing (null = closed).
  const [lb, setLb] = useState(null);
  const [busy, setBusy] = useState("");     // "" | "gemini" | "similar"
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [prog, setProg] = useState(0);       // tesseract OCR progress, 0-100
  const [manual, setManual] = useState(""); // text to copy by hand if the clipboard refused
  // The paste box for Gemini's answer — opens when you press ✨ Gemini, so the
  // reply has somewhere to land as this question's details.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
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
    onChange && onChange();
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
      // Give the reply somewhere to land — pre-fill with anything saved before.
      setPasteText(rec.detail || "");
      setPasteOpen(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const savePaste = () => {
    setDetail(rec.id, pasteText);
    setPasteOpen(false);
    setShown(true); // reveal it right away so the save is visible
    onChange && onChange();
  };
  const pasteFromClip = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setPasteText((p) => (p ? `${p}\n${t}` : t));
    } catch { /* clipboard blocked — user can Ctrl+V into the box */ }
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
      {/* Actions sit ABOVE the question, right-aligned like the PYQ/bank cards.
          On a phone (.q-head__actions media rule) only the q-act--keep buttons
          survive — Show answer, ✨ Gemini and 🎯 20 — with Edit/Delete hidden. */}
      <div className="q-head__actions" style={{ marginBottom: 12 }}>
        {(hasAnswer || q.solution || rec.note || rec.detail) && (
          <button className="btn btn--ghost btn--sm q-act--keep" onClick={() => setShown((v) => !v)}>
            {shown ? "🙈 Hide answer" : "👁️ Show answer"}
          </button>
        )}
        <button
          className="btn btn--ghost btn--sm q-act--keep"
          onClick={askGemini}
          disabled={!!busy}
          title="Prompt + question copy karke Gemini kholo (image se text apne aap padh liya jayega)"
        >
          {busy === "gemini"
            ? (prog ? `${prog}%` : "…")
            : copied
              ? "✓"
              : <><span className="ask__ico">✨</span><span className="ask__word"> Gemini</span></>}
        </button>
        <button
          className="btn btn--ghost btn--sm q-act--keep"
          onClick={make20}
          disabled={!!busy}
          title="Isi type ke 20 naye questions generate karo"
        >
          {busy === "similar"
            ? (prog ? `${prog}%` : "…")
            : <><span className="ask__ico">🎯</span><span className="ask__word"> 20 similar</span></>}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onEdit}>✏️ Edit</button>
        <button className="btn btn--ghost btn--sm" onClick={onDelete}>🗑️ Delete</button>
      </div>

      {err && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginBottom: 10 }}>{err}</p>}

      {/* Paste Gemini's answer here — becomes this question's saved details. */}
      {pasteOpen && (
        <div className="answer-box" style={{ marginBottom: 12 }}>
          <span className="vd-label">📥 Gemini ka answer / details yahan paste karo</span>
          <textarea
            className="textarea"
            rows={5}
            style={{ marginTop: 8, width: "100%" }}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            autoFocus
            placeholder="Gemini se answer copy karke yahan paste (Ctrl+V) karo — ye is question ke saath details ban jayega."
          />
          <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn--primary btn--sm" onClick={savePaste} disabled={!pasteText.trim()}>💾 Save</button>
            <button className="btn btn--ghost btn--sm" onClick={pasteFromClip}>📋 Paste from clipboard</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setPasteOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

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

      {shown && rec.detail && (
        <div
          className="mt-8"
          style={{ fontSize: "0.9rem", borderTop: "1px solid var(--glass-border)", paddingTop: 10 }}
        >
          <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 4 }}>✨ Gemini · details</p>
          <Markdown>{rec.detail}</Markdown>
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

function WrongInner() {
  const router = useRouter();
  const sp = useSearchParams();
  // The active shelf comes from the URL, so the left-menu subject buttons and
  // the in-page chips are the same control. Default: Reasoning.
  const urlSubject = sp.get("subject");
  const subject = isSubject(urlSubject) ? urlSubject : "reasoning";

  const [items, setItems] = useState([]);
  const [dateFilter, setDateFilter] = useState("all"); // "all" | a dayKey
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
  // Whether the server can upload at all. If not, every paste silently becomes
  // device-only — worth saying up front rather than after the fact.
  const [cloud, setCloud] = useState({ configured: true });
  const [flash, setFlash] = useState("");   // "added" confirmation after a paste
  const fileRef = useRef(null);
  const formRef = useRef(null);

  // Reload the shelf's records WITHOUT touching the date filter — used after
  // every edit/delete/tag so a chosen date doesn't jump around under you.
  const refresh = () => {
    setItems(getWrongBook(subject));
  };
  useEffect(() => { r2Status().then(setCloud).catch(() => {}); }, []);

  const active = SUBJECTS.find((s) => s.key === subject);

  const reset = () => {
    setImages([]); setText(""); setOpts(["", "", "", ""]); setAns(0);
    setSol(""); setNote(""); setWithOpts(false); setErr("");
  };
  const cancel = () => { setOpen(false); setEditing(null); reset(); };

  // Switching subject (chip or menu button) reloads the shelf and jumps the date
  // dropdown to that subject's latest day — the whole point of "latest by default".
  useEffect(() => {
    const list = getWrongBook(subject);
    setItems(list);
    const latest = list.reduce((mx, r) => (r.at > mx ? r.at : mx), "");
    setDateFilter(latest ? dayKey(latest) : "all");
    cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  // Distinct days present on this shelf, newest first, each with its label+count.
  const dates = useMemo(() => {
    const m = new Map();
    for (const r of items) {
      const k = dayKey(r.at);
      if (!k) continue;
      const cur = m.get(k) || { key: k, label: dayLabel(r.at), n: 0 };
      cur.n += 1;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [items]);

  // A date that no longer exists (e.g. the last card of that day was deleted)
  // falls back to the newest remaining day.
  useEffect(() => {
    if (dateFilter !== "all" && items.length && !dates.some((d) => d.key === dateFilter)) {
      setDateFilter(dates[0]?.key || "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const shown = dateFilter === "all" ? items : items.filter((r) => dayKey(r.at) === dateFilter);

  // Paste = the question is added. No form, no Save.
  //
  // Pasting with the form already open is the exception: there you are composing
  // (or editing) one question, so the image joins that one instead of starting
  // another. Everything else is optional and can be added later with Edit.
  const takeFiles = useCallback(async (files) => {
    const imgs = (files || []).filter(isImageFile);
    if (!imgs.length) return;
    setBusy(true); setErr("");
    try {
      const { images: added, localOnly } = await storeImages(imgs);
      if (open) {
        setImages((prev) => [...prev, ...added]);
      } else {
        const rec = addWrong({ subject, q: null, images: added, note: "" });
        setDateFilter(dayKey(rec.at)); // show the day it just landed on
        refresh();
        setFlash(`✅ ${active.icon} ${active.label} mein add ho gaya`);
        setTimeout(() => setFlash(""), 2200);
      }
      // Say it rather than leaving an image silently stranded on one device.
      if (localOnly) {
        setErr(
          `${localOnly} image cloud par upload nahi hui — sirf is device par rahegi` +
          (cloud.configured ? " (network ya server ne mana kiya)." : " kyunki server par R2 settings nahi hain.")
        );
      }
    } catch {
      setErr("Image save nahi ho payi — dobara try karo.");
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subject, cloud.configured]);

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
      if (editing) {
        await updateWrong(editing, { q, images, note });
      } else {
        const rec = addWrong({ subject, q, images, note });
        setDateFilter(dayKey(rec.at)); // show the day it just landed on
      }
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

  // Practice what's currently shown — the whole subject when the date is "all",
  // or just the picked day's questions when a date is selected.
  const practiceable = shown.filter(isPracticeable);
  const practice = () => {
    if (!practiceable.length) return;
    const dayBit = dateFilter === "all" ? "" : ` · ${dates.find((d) => d.key === dateFilter)?.label || ""}`;
    const quiz = {
      id: makeId(),
      title: `${active.icon} ${active.label} · Wrong questions${dayBit}`,
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
        <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span className="hero__eyebrow">❌ Wrong Questions · {active.icon} {active.label}</span>
          {/* Date dropdown, top-right — like the Current Affairs date picker. */}
          {items.length > 0 && (
            <select
              className="input"
              style={{ width: "auto", padding: "5px 9px", fontSize: "0.85rem" }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Date ke hisaab se filter — is subject ki latest date par default"
            >
              <option value="all">Saari dates ({items.length})</option>
              {dates.map((d) => (
                <option key={d.key} value={d.key}>{d.label} ({d.n})</option>
              ))}
            </select>
          )}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Wrong <span className="grad">Questions</span>
        </h1>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {!cloud.configured && (
          <div
            className="glass-card"
            style={{ marginBottom: 14, borderColor: "rgba(251,191,36,0.45)", background: "rgba(251,191,36,0.07)" }}
          >
            <strong style={{ color: "var(--warning)" }}>⚠️ Cloud image upload band hai</strong>
            <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
              Server par R2 ki settings nahi mili, isliye paste ki hui image cloud par nahi ja rahi —
              wo sirf isi device par reh jayegi aur doosre device par “image is device par nahi hai”
              likha aayega. Deploy par R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT,
              R2_BUCKET aur R2_PUBLIC_BASE set karke redeploy karo.
            </p>
          </div>
        )}

        {busy && (
          <p className="muted" style={{ fontSize: "0.84rem", marginBottom: 10 }}>📋 Image save ho rahi hai…</p>
        )}
        {flash && (
          <p style={{ color: "var(--success)", fontSize: "0.86rem", fontWeight: 600, marginBottom: 10 }}>{flash}</p>
        )}

        {practiceable.length > 0 && (
          <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button className="btn btn--ghost btn--sm" onClick={practice}>
              🎯 Practice ({practiceable.length})
            </button>
          </div>
        )}

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
            {active.label} mein abhi kuch nahi — screenshot copy karke <strong>Ctrl+V</strong>.
          </div>
        ) : shown.length === 0 ? (
          <div className="placeholder">
            Is date par koi question nahi. Upar se dusri date chuno ya “Saari dates”.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {shown.map((rec) => (
              <WrongCard
                key={rec.id}
                rec={rec}
                onEdit={() => startEdit(rec)}
                onDelete={() => remove(rec.id)}
                onChange={() => refresh()}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// useSearchParams needs a Suspense boundary or the whole route opts out of
// static rendering.
export default function WrongQuestionsPage() {
  return (
    <Suspense
      fallback={
        <section className="hero">
          <span className="hero__eyebrow">❌ Wrong Questions</span>
        </section>
      }
    >
      <WrongInner />
    </Suspense>
  );
}
