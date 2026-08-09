"use client";

// Settings → 📚 PYQ Manager: apni PYQ books banao aur unme questions bharo.
// Ek hi jagah se: nayi book (subject ke saath), usme naya topic/chapter, aur
// questions — 📄 PDF se (part 1, part 2 … ek-ek karke) ya 📋 paste karke.
// Questions AI (DeepSeek) se nikalte hain (wahi engine jo baaki app use karti
// hai), duplicates khud skip hote hain, aur book PYQ page par dikhti hai.

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSettings } from "@/lib/storage";
import { extractPdfTextSmart, generateQuizChunked } from "@/lib/client-ai";
import {
  getUserBooks, addUserBook, getUserTopics, addUserTopic,
  addUserTopicQuestions, userTopicCount, deleteUserTopic, deleteUserBook,
  SHELF_BOOKS,
} from "@/lib/userpyq";

const SUBJECTS = [
  { key: "gs", label: "🧠 GS / GK" },
  { key: "english", label: "📚 English" },
  { key: "maths", label: "🧮 Maths" },
  { key: "reasoning", label: "🧩 Reasoning" },
];

export default function PyqManager() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const books = getUserBooks();
  const [bookId, setBookId] = useState("");
  const [newBook, setNewBook] = useState("");
  const [newBookSub, setNewBookSub] = useState("gs");

  // Default = pehli EXISTING bank (GKTricks) — user seedha usme add kar sake.
  const activeBookId = bookId || SHELF_BOOKS[0].id;
  const topics = useMemo(() => getUserTopics(activeBookId), [activeBookId, books.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [topicId, setTopicId] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const activeTopicId = topicId && topics.some((t) => t.id === topicId) ? topicId : topics[0]?.id || "";

  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  const makeBook = () => {
    const b = addUserBook(newBook, newBookSub);
    if (!b) return;
    setBookId(b.id); setNewBook(""); refresh();
  };
  const makeTopic = () => {
    if (!activeBookId) { setErr("Pehle book banao/chuno."); return; }
    const t = addUserTopic(activeBookId, newTopic);
    if (!t) return;
    setTopicId(t.id); setNewTopic(""); refresh();
  };

  // Common tail: text -> AI questions -> topic. `tag` becomes each question's
  // source ("Part 3" filenames se khud aa jata hai).
  const importText = async (text, tag) => {
    if (!activeTopicId) throw new Error("Pehle topic banao/chuno.");
    if (!getSettings().apiKey) throw new Error("DeepSeek API key Settings mein daalo (upar wala card).");
    const { questions } = await generateQuizChunked(text, (i, t, so) =>
      setStatus(`AI questions nikaal raha hai… chunk ${i}/${t} (${so} mile)`)
    );
    if (!questions.length) throw new Error("Isme koi question nahi mila.");
    const tagged = tag ? questions.map((q) => ({ ...q, source: q.source || tag })) : questions;
    const added = addUserTopicQuestions(activeTopicId, tagged);
    return { added, dup: questions.length - added };
  };

  const onPdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true); setErr(""); setStatus("PDF padh raha hoon…");
    try {
      const { text } = await extractPdfTextSmart(file, (p) =>
        setStatus(p.phase === "text" ? `PDF padh raha hoon… ${p.page}/${p.total}` : `📷 OCR… ${p.page}/${p.total}`)
      );
      if (!text || text.trim().length < 20) throw new Error("Is PDF se text nahi nikla.");
      const tag = file.name.replace(/\.pdf$/i, "").slice(0, 60);
      const { added, dup } = await importText(text, tag);
      setStatus(`✅ ${added} questions add hue${dup ? ` · ${dup} duplicate skip` : ""} — "${tag}"`);
    } catch (e2) { setErr(e2.message || "Error"); setStatus(""); }
    finally { setBusy(false); }
  };

  const onPaste = async () => {
    const t = paste.trim();
    if (!t || busy) return;
    setBusy(true); setErr(""); setStatus("Paste se questions bana raha hoon…");
    try {
      const { added, dup } = await importText(t, "");
      setPaste("");
      setStatus(`✅ ${added} questions add hue${dup ? ` · ${dup} duplicate skip` : ""}`);
    } catch (e2) { setErr(e2.message || "Error"); setStatus(""); }
    finally { setBusy(false); }
  };

  const delTopic = () => {
    const t = topics.find((x) => x.id === activeTopicId);
    if (!t) return;
    if (!confirm(`"${t.name}" topic (${userTopicCount(t.id)} Q) delete karein?`)) return;
    deleteUserTopic(t.id); setTopicId(""); refresh();
  };
  const delBook = () => {
    const b = books.find((x) => x.id === activeBookId);
    if (!b) return;
    if (!confirm(`Poori book "${b.name}" (saare topics + questions) delete karein?`)) return;
    deleteUserBook(b.id); setBookId(""); setTopicId(""); refresh();
  };

  return (
    <section className="section" style={{ maxWidth: 640 }}>
      <div className="glass-card">
        <h3>📚 PYQ Manager</h3>
        <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
          Kisi bhi <b>existing PYQ book</b> (GKTricks, Error Pro, WAR…) mein apne naye
          topics/questions daalo — wo usi book ke shelf par dikhenge. Ya apni <b>nayi book</b>
          banao (jaise &quot;Medieval History&quot;) — wo PYQ page par sabse upar aayegi. Questions
          PDF se (part 1, part 2… ek-ek karke) ya paste karke.
        </p>

        {/* Book */}
        <div className="field mt-16">
          <label>Book</label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <select className="select" style={{ flex: 1, minWidth: 160 }} value={activeBookId} onChange={(e) => { setBookId(e.target.value); setTopicId(""); }}>
              <optgroup label="Existing PYQ books">
                {SHELF_BOOKS.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
              </optgroup>
              {books.length > 0 && (
                <optgroup label="Meri books">
                  {books.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
                </optgroup>
              )}
            </select>
            {activeBookId.startsWith("ub_") && (
              <button className="btn btn--ghost btn--sm" onClick={delBook} title="Book delete">🗑️</button>
            )}
          </div>
          <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="➕ Nayi book ka naam…" value={newBook} onChange={(e) => setNewBook(e.target.value)} onKeyDown={(e) => e.key === "Enter" && makeBook()} />
            <select className="select" style={{ width: "auto" }} value={newBookSub} onChange={(e) => setNewBookSub(e.target.value)}>
              {SUBJECTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button className="btn btn--ghost btn--sm" onClick={makeBook} disabled={!newBook.trim()}>Banao</button>
          </div>
        </div>

        {/* Topic */}
        <div className="field mt-16">
          <label>Topic / Chapter</label>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <select className="select" style={{ flex: 1, minWidth: 160 }} value={activeTopicId} onChange={(e) => setTopicId(e.target.value)}>
              {!topics.length && <option value="">— koi topic nahi —</option>}
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name} ({userTopicCount(t.id)} Q)</option>)}
            </select>
            {activeTopicId && <button className="btn btn--ghost btn--sm" onClick={delTopic} title="Topic delete">🗑️</button>}
          </div>
          <div className="row mt-8" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="➕ Naya topic (jaise Medieval History)…" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && makeTopic()} />
            <button className="btn btn--ghost btn--sm" onClick={makeTopic} disabled={!newTopic.trim() || !activeBookId}>Banao</button>
          </div>
        </div>

        {/* Add questions */}
        <div className="field mt-16">
          <label>Questions add karo</label>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <label className="btn btn--primary btn--sm" style={{ opacity: busy || !activeTopicId ? 0.6 : 1, pointerEvents: busy || !activeTopicId ? "none" : "auto" }}>
              {busy ? "⏳ …" : "📄 PDF se"}
              <input type="file" accept="application/pdf" hidden onChange={onPdf} />
            </label>
          </div>
          <textarea
            className="textarea mt-8"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="📋 Ya questions ka text yahan paste karo (kahin se bhi copy karke)…"
            style={{ minHeight: 110 }}
          />
          <div className="row mt-8" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn--ghost btn--sm" onClick={onPaste} disabled={busy || !paste.trim() || !activeTopicId}>
              📋 Paste se questions banao
            </button>
          </div>
        </div>

        {status && <p className="mt-8" style={{ color: "var(--accent-2)", fontSize: "0.88rem" }}>{status}</p>}
        {err && <p className="mt-8" style={{ color: "var(--bad)", fontSize: "0.88rem" }}>{err}</p>}
        {activeTopicId && (
          <p className="hint" style={{ marginTop: 10 }}>
            💡 Dekho: <Link href={`/pyq/gk/${activeTopicId}`} style={{ textDecoration: "underline" }}>is topic ke questions</Link> — PYQ page par bhi book dikhegi.
          </p>
        )}
      </div>
    </section>
  );
}
