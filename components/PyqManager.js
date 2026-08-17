"use client";

// Settings → 📚 PYQ Manager: apni PYQ books banao aur unme questions bharo.
// Ek hi jagah se: nayi book (subject ke saath), usme naya topic/chapter, aur
// questions — 📄 PDF se (part 1, part 2 … saari ek saath) ya 📋 paste karke.
// Questions AI (DeepSeek) se nikalte hain (wahi engine jo baaki app use karti
// hai), duplicates khud skip hote hain, aur book PYQ page par dikhti hai.

import { useMemo, useState } from "react";
import Link from "next/link";
import { getSettings } from "@/lib/storage";
import { extractPdfTextSmart, generateQuizChunked, generateMcqChunked } from "@/lib/client-ai";
import { parseCaMcqs } from "@/lib/caparse";
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

  // Common tail: text -> questions -> topic. `tag` becomes each question's
  // source ("Part 3" filenames se khud aa jata hai). Format auto-detect:
  //   1) Ready-made MCQs (Q + a-d + marked answer) -> code se parse, AI-free.
  //   2) Q&A one-liners ("Q.) ... Ans: ...")       -> gk-to-mcq AI (book ka
  //      answer wahi rehta hai, 3 galat options bante hain — GKTricks isi se bana).
  //   3) Baaki kuch bhi                             -> generic AI extractor.
  const importText = async (text, tag, head = "") => {
    if (!activeTopicId) throw new Error("Pehle topic banao/chuno.");

    let questions = parseCaMcqs(text);
    if (!questions.length) {
      if (!getSettings().apiKey) throw new Error("DeepSeek API key Settings mein daalo (upar wala card).");
      const pairCount = (text.match(/\bAns(?:wer)?\s*[:.\-]/gi) || []).length;
      if (pairCount >= 3) {
        ({ questions } = await generateMcqChunked(text, (i, t, so) =>
          setStatus(`${head}Q&A se MCQ bana raha hai… ${i}/${t} (${so} bane)`)
        ));
      } else {
        ({ questions } = await generateQuizChunked(text, (i, t, so) =>
          setStatus(`${head}AI questions nikaal raha hai… chunk ${i}/${t} (${so} mile)`)
        ));
      }
    }
    if (!questions.length) throw new Error("Isme koi question nahi mila.");
    const tagged = tag ? questions.map((q) => ({ ...q, source: q.source || tag })) : questions;
    const added = addUserTopicQuestions(activeTopicId, tagged);
    return { added, dup: questions.length - added };
  };

  // Ek saath kitni bhi PDF. Ek-ek karke (parallel nahi) — har PDF ke andar AI
  // ke kai chunk jaate hain, saath chala do to key rate-limit kha jaati hai aur
  // progress bhi padha nahi jaata. Ek PDF fail ho to baaki rukti nahi; sirf
  // wahi error list mein jaati hai.
  const onPdf = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || busy) return;

    // "Part 2" aur "Part 10" — numeric sort, warna 10 pehle aa jata hai aur
    // questions book ki tarteeb se ulte pad jaate hain.
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    setBusy(true); setErr(""); setStatus("");
    let added = 0, dup = 0, ok = 0, fatal = "";
    const failed = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tag = file.name.replace(/\.pdf$/i, "").slice(0, 60);
      const head = files.length > 1 ? `[${i + 1}/${files.length}] ${tag} — ` : "";
      try {
        const { text } = await extractPdfTextSmart(file, (p) =>
          setStatus(head + (p.phase === "text" ? `PDF padh raha hoon… ${p.page}/${p.total}` : `📷 OCR… ${p.page}/${p.total}`))
        );
        if (!text || text.trim().length < 20) throw new Error("PDF se text nahi nikla");
        const r = await importText(text, tag, head);
        added += r.added; dup += r.dup; ok += 1;
      } catch (e2) {
        const msg = e2.message || "Error";
        failed.push(`${tag} (${msg})`);
        // Key nahi hai / topic nahi chuna — ye har PDF par wahi rahega, isliye
        // baaki 13 PDF ko bekaar mein padhne ka koi matlab nahi.
        if (/API key|topic banao/i.test(msg)) { fatal = msg; break; }
      }
    }

    // ok = jo sach mein lag gayi. files.length - failed.length galat hota:
    // fatal par loop tootta hai, to jo PDF chhui hi nahi wo "ho gayi" gin jaati.
    setStatus(ok ? `✅ ${ok}/${files.length} PDF · ${added} questions add hue${dup ? ` · ${dup} duplicate skip` : ""}` : "");
    if (fatal) setErr(fatal);
    else if (failed.length) setErr(`${failed.length} PDF nahi hui — ${failed.join(" · ")}`);
    setBusy(false);
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
          PDF se (part 1, part 2… <b>saari ek saath chun lo</b>) ya paste karke.
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
              {busy ? "⏳ …" : "📄 PDF se (ek ya kai)"}
              <input type="file" accept="application/pdf" multiple hidden onChange={onPdf} />
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
