"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getTest, addSection, updateSection, removeSection, addSectionQuestions, clearSectionQuestions,
} from "@/lib/exttests";
import { ocrImage, generateQuizText } from "@/lib/client-ai";
import { saveQuiz, makeId, getSettings } from "@/lib/storage";

const PRESETS = ["Maths", "Reasoning", "English", "General Awareness"];

export default function MockBuilderPage() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [newSec, setNewSec] = useState("");
  const [busy, setBusy] = useState("");     // section id currently processing
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fileRefs = useRef({});

  const refresh = () => setTest(getTest(id));
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  if (!test) {
    return (
      <section className="hero">
        <p className="muted">Mock not found. <Link href="/external-tests" className="link">← External Tests</Link></p>
      </section>
    );
  }

  const sections = test.sections || [];
  const totalQ = sections.reduce((a, s) => a + (s.questions?.length || 0), 0);
  const totalMin = sections.reduce((a, s) => a + (Number(s.timeMin) || 0), 0);

  const addSec = (name) => {
    const nm = (name || "").trim();
    if (!nm) return;
    addSection(id, nm, 15);
    setNewSec("");
    refresh();
  };

  const startQuiz = (title, questions, timeMin) => {
    if (!questions.length) { setErr("Is section mein pehle questions add karo."); return; }
    const quiz = {
      id: makeId(), title, source: `${test.name} · mock`,
      createdAt: new Date().toISOString(), questions,
      timeLimitSec: Math.max(60, Math.round((Number(timeMin) || 15) * 60)),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };
  const startSection = (s) => startQuiz(`${test.name} · ${s.name}`, s.questions || [], s.timeMin);
  const startFull = () => startQuiz(`${test.name} · Full mock`, sections.flatMap((s) => s.questions || []), totalMin);

  const extractImages = async (secId, files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (!getSettings().apiKey) { setErr("Add your DeepSeek API key in Settings first."); return; }
    setBusy(secId); setErr(""); setMsg("");
    try {
      let added = 0;
      for (let i = 0; i < list.length; i++) {
        setMsg(`📷 OCR image ${i + 1}/${list.length}…`);
        let text = "";
        try { text = await ocrImage(list[i]); } catch { /* skip */ }
        if (text && text.trim().length > 15) {
          setMsg(`Image ${i + 1}/${list.length}: questions bana raha…`);
          try { const { questions } = await generateQuizText(text); added += addSectionQuestions(id, secId, questions); }
          catch (e) { console.warn(e); }
        }
      }
      if (!added) throw new Error("Koi question nahi bana — saaf screenshot use karo.");
      setMsg(`✓ Added ${added} question${added > 1 ? "s" : ""}.`);
      refresh();
    } catch (e) { setErr(e.message); setMsg(""); }
    finally { setBusy(""); }
  };

  const pasteInto = async (secId) => {
    if (!navigator.clipboard?.read) { setErr("Paste not supported — use the 📷 button or Ctrl+V into the picker."); return; }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "pasted.png", { type })); }
      }
      if (!files.length) { setErr("Clipboard mein koi image nahi mili."); return; }
      await extractImages(secId, files);
    } catch (e) { setErr("Paste failed: " + e.message); }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧩 Mock Builder</span>
          <Link href="/external-tests" className="btn btn--ghost btn--sm">← External Tests</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>{test.name}</h1>
        <p className="hero__sub">
          Sections banao, har section mein question screenshots paste/upload karo (AI MCQ bana dega), aur
          har section ka apna time set karo — jaise <strong>Maths 14 min</strong>. Phir timed test do.
        </p>
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--primary" onClick={startFull} disabled={totalQ === 0}>
            ▶ Start full mock ({totalQ} Q · {totalMin} min)
          </button>
        </div>
      </section>

      {/* Add section */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <h3>➕ Add section</h3>
          <div className="row mt-12" style={{ gap: 10, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Section name (e.g. Maths)"
              value={newSec} onChange={(e) => setNewSec(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSec(newSec); }} />
            <button className="btn btn--primary" onClick={() => addSec(newSec)} disabled={!newSec.trim()}>Add</button>
          </div>
          <div className="chips mt-12">
            {PRESETS.map((p) => (
              <button key={p} className="chip chip--btn chip--lg" onClick={() => addSec(p)}>+ {p}</button>
            ))}
          </div>
        </div>
      </section>

      {(msg || err) && (
        <section className="section" style={{ marginTop: 0 }}>
          {msg && <p style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{msg}</p>}
          {err && <p style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{err}</p>}
        </section>
      )}

      {/* Sections */}
      <section className="section">
        <div className="section__head"><h2>Sections</h2><p>{sections.length ? `${sections.length} sections · ${totalQ} questions` : "No sections yet — add one above."}</p></div>
        {sections.length === 0 ? (
          <div className="placeholder">Add a section (Maths, Reasoning…) to start building. 🧩</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {sections.map((s) => {
              const qn = s.questions?.length || 0;
              const processing = busy === s.id;
              return (
                <article key={s.id} className="glass-card">
                  <div className="row between" style={{ alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <input className="input" style={{ fontWeight: 700, fontSize: "1.02rem" }} value={s.name}
                        onChange={(e) => { updateSection(id, s.id, { name: e.target.value }); refresh(); }} />
                      <div className="row mt-8" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="muted" style={{ fontSize: "0.82rem" }}>⏱️ Time:</span>
                        <input className="input" type="number" min={1} style={{ width: 84 }} value={s.timeMin}
                          onChange={(e) => { updateSection(id, s.id, { timeMin: parseInt(e.target.value) || 0 }); refresh(); }} />
                        <span className="muted" style={{ fontSize: "0.82rem" }}>min</span>
                        <span className="badge badge--ok" style={{ marginLeft: 6 }}>{qn} Q</span>
                      </div>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm(`Delete section "${s.name}"?`)) { removeSection(id, s.id); refresh(); } }}>✕</button>
                  </div>

                  <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
                    <label className="btn btn--ghost btn--sm" style={{ opacity: processing ? 0.6 : 1, pointerEvents: processing ? "none" : "auto" }}>
                      📷 Question image(s)
                      <input
                        ref={(el) => (fileRefs.current[s.id] = el)}
                        type="file" accept="image/*" multiple hidden
                        onChange={(e) => { const files = e.target.files; if (fileRefs.current[s.id]) fileRefs.current[s.id].value = ""; extractImages(s.id, files); }}
                      />
                    </label>
                    <button className="btn btn--ghost btn--sm" onClick={() => pasteInto(s.id)} disabled={processing}>📋 Paste image</button>
                    <button className="btn btn--primary btn--sm" onClick={() => startSection(s)} disabled={qn === 0 || processing}>▶ Start ({qn} Q · {s.timeMin} min)</button>
                    {qn > 0 && <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Clear all questions in this section?")) { clearSectionQuestions(id, s.id); refresh(); } }}>🗑️ Clear</button>}
                  </div>

                  {qn > 0 && (
                    <details className="mt-12">
                      <summary className="muted" style={{ fontSize: "0.82rem", cursor: "pointer" }}>👁️ Preview {qn} question{qn > 1 ? "s" : ""}</summary>
                      <ol className="mt-8" style={{ paddingLeft: 20, display: "grid", gap: 6 }}>
                        {s.questions.map((q, i) => (
                          <li key={i} style={{ fontSize: "0.84rem", color: "var(--text-2)" }}>{q.question}</li>
                        ))}
                      </ol>
                    </details>
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
