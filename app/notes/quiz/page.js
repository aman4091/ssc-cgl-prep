"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listNotesBooks, loadNotes } from "@/lib/notesbank";
import { startNotesQuiz, startChapterQuiz, askedMap } from "@/lib/notesquiz";
import { pageText } from "@/components/NotesReader";
import { getQuizzes } from "@/lib/storage";

// 📝 Notes Quiz — har notes book ka quiz ek hi jagah se.
//
// Quiz ka button pehle sirf padhne wale page par tha: quiz dena ho to pehle
// book kholo, phir chapter, phir page dhoondho. Padhne ke beech wo theek hai,
// par jab iraada hi "aaj quiz dena hai" ho to wo raasta ulta pad jata hai.
//
// Shakl jaan-boojh kar TEEN kadam ki hai — subject, phir book, phir chapter —
// aur teeno alag dikhte hain. Pehli koshish sab kuch ek khulti-band hoti list
// mein thi: 14 book ke andar 284 chapter, sab ek hi patli lakeer mein — dekhne
// mein hi thak jaate the. Chapter ab card hain, ek grid mein, taaki nazar ek
// baar mein poora chapter padhe: naam, kitne page, aur kitne question ho chuke.
//
// Engine wahi hai jo reader mein chalta hai (lib/notesquiz), aur `pk` bhi wahi
// — isliye yahan se poochhe gaye question wahan dobara nahi aayenge, aur ✓
// nishaan dono jagah ka hisaab dikhata hai.
const SUBJECTS = [
  { key: "gs", label: "General Studies", icon: "🌍" },
  { key: "english", label: "English", icon: "📚" },
  { key: "math", label: "Maths", icon: "🧮" },
];

const MIN_TEXT = 30; // isse kam text wala page = scan-only, uska quiz nahi banta

function chaptersOf(b) {
  const map = new Map();
  for (const p of b.pages || []) {
    if (p.is_cover || p.kind === "practice") continue;
    if (!map.has(p.topic)) map.set(p.topic, { topic: p.topic, pages: [] });
    map.get(p.topic).pages.push(p);
  }
  // Har chapter ke sirf wahi page jinse quiz ban sakta hai — scan-only page
  // ginti mein aaye to "12 pages" likh kar button kuch banata hi nahi.
  return [...map.values()]
    .map((c) => ({ topic: c.topic, quizPages: c.pages.filter((p) => pageText(p).length >= MIN_TEXT) }))
    .filter((c) => c.quizPages.length > 0);
}

export default function NotesQuizHubPage() {
  const router = useRouter();
  const books = useMemo(() => listNotesBooks(), []);

  const [subject, setSubject] = useState("gs");
  const [slug, setSlug] = useState("");
  const [data, setData] = useState(null);      // { book, chapters } | "err" | null = load ho rahi
  const [openChap, setOpenChap] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [asked, setAsked] = useState({});      // pk -> kitne question ho chuke
  const [running, setRunning] = useState([]);
  // Book ka chapter-hisaab ek hi baar: 272 page ka text dobara jodna sirf
  // wapas aane par bahut mehnga hai (loadNotes khud JSON cache karta hai).
  const cache = useRef({});

  const subBooks = useMemo(
    () => books.filter((b) => (b.subject || "gs") === subject),
    [books, subject],
  );

  // Subject badla to us subject ki pehli book apne aap khul jaati hai — khaali
  // screen dikha kar "ab kya" poochhne ka koi faayda nahi.
  useEffect(() => {
    if (!subBooks.length) { setSlug(""); return; }
    if (!subBooks.some((b) => b.slug === slug)) setSlug(subBooks[0].slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subBooks]);

  useEffect(() => {
    if (!slug) { setData(null); return undefined; }
    let alive = true;
    setOpenChap(""); setQuery("");
    if (cache.current[slug]) { setData(cache.current[slug]); return undefined; }
    setData(null);
    loadNotes(slug).then((b) => {
      if (!alive) return;
      const d = b ? { book: b, chapters: chaptersOf(b) } : "err";
      cache.current[slug] = d;
      setData(d);
    });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    try {
      setRunning(getQuizzes().filter((q) => q.source === "notesquiz").slice(0, 3));
      setAsked(askedMap());
    } catch { /* store abhi hydrate nahi hua */ }
  }, []);

  const book = data && data !== "err" ? data.book : null;
  const chapters = useMemo(() => {
    if (!book) return [];
    const t = query.trim().toLowerCase();
    const list = data.chapters.map((c, i) => ({ ...c, no: i + 1 }));
    return t ? list.filter((c) => c.topic.toLowerCase().includes(t)) : list;
  }, [data, book, query]);

  const totals = useMemo(() => {
    if (!book) return { ch: 0, pg: 0, done: 0 };
    let pg = 0, done = 0;
    for (const c of data.chapters) {
      pg += c.quizPages.length;
      if (asked[`${book.scanBase || ""}#chapter:${c.topic}`]) done += 1;
    }
    return { ch: data.chapters.length, pg, done };
  }, [data, book, asked]);

  const flash = (m) => { setErr(m); setTimeout(() => setErr(""), 2800); };

  const runChapter = async (c) => {
    if (busy || !book) return;
    const id = `ch:${c.topic}`;
    setBusy(id); setErr("");
    try {
      const { quizId } = await startChapterQuiz({
        texts: c.quizPages.map(pageText),
        pk: `${book.scanBase || ""}#chapter:${c.topic}`,
        title: `${book.title} · ${c.topic} quiz`,
      });
      router.push(`/quizzes/${quizId}`);
    } catch (e) {
      setBusy("");
      flash(e.message === "nahi bana" ? "Quiz nahi bana — dobara try karo." : (e.message || "Error"));
    }
  };

  const runPage = async (p) => {
    if (busy || !book) return;
    setBusy(`pg:${p.book_page}`); setErr("");
    try {
      const { quizId } = await startNotesQuiz({
        text: pageText(p),
        pk: `${book.scanBase || ""}#${p.book_page}`,
        title: `${book.title} · page ${p.book_page} quiz`,
      });
      router.push(`/quizzes/${quizId}`);
    } catch (e) {
      setBusy("");
      flash(e.message === "nahi bana" ? "Quiz nahi bana — dobara try karo." : (e.message || "Error"));
    }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <div className="row between">
          <span className="hero__eyebrow">📝 Notes Quiz</span>
          <Link href="/" className="btn btn--ghost btn--sm">← Home</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Saare notes ke quiz <span className="grad">ek jagah</span>
        </h1>
        <p className="hero__sub">
          Subject chuno → book → chapter. Har chapter ka <b>poora quiz</b> ek tap, ya kisi ek
          <b> page</b> ka. 50 questions, har baar naye — ✓ ka matlab wahan se pehle quiz ban chuka hai.
        </p>
      </section>

      {running.length > 0 && (
        <section className="section nq-sec">
          <p className="nq-lbl">⏳ Adhoore quiz — wahin se aage</p>
          <div className="nq-run">
            {running.map((q) => (
              <Link key={q.id} href={`/quizzes/${q.id}`} className="nq-runq">
                <b>{q.title || "Notes quiz"}</b>
                <span>{q.questions?.length || 0} Q{q.streaming ? " · ban raha" : ""}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- kadam 1: subject ---- */}
      <section className="section nq-sec">
        <p className="nq-lbl">1 · Subject</p>
        <div className="nq-tabs">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`nq-tab${subject === s.key ? " is-on" : ""}`}
              onClick={() => setSubject(s.key)}
            >
              {s.icon} {s.label}
              <i>{books.filter((b) => (b.subject || "gs") === s.key).length}</i>
            </button>
          ))}
        </div>
      </section>

      {/* ---- kadam 2: book ---- */}
      <section className="section nq-sec">
        <p className="nq-lbl">2 · Book</p>
        <div className="nq-books">
          {subBooks.map((b) => (
            <button
              key={b.slug}
              type="button"
              className={`nq-book${slug === b.slug ? " is-on" : ""}`}
              onClick={() => setSlug(b.slug)}
            >
              <span className="nq-book__t">
                {b.title}
                <span className="nq-book__s">{b.eyebrow}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---- kadam 3: chapter ---- */}
      <section className="section nq-sec">
        <div className="nq-head">
          <p className="nq-lbl" style={{ margin: 0 }}>
            3 · Chapter
            {book && (
              <span className="nq-head__m">
                {totals.ch} chapters · {totals.pg} pages{totals.done ? ` · ✓ ${totals.done} ho chuke` : ""}
              </span>
            )}
          </p>
          {book && totals.ch > 6 && (
            <input
              className="input nq-find"
              placeholder="🔍 Chapter dhoondho…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>

        {err && <p className="nq-err">{err}</p>}

        {!slug ? null : data === null ? (
          <div className="placeholder">Book khul rahi hai… 📖</div>
        ) : data === "err" ? (
          <div className="placeholder">Book load nahi hui — net check karo. 😕</div>
        ) : !data.chapters.length ? (
          <div className="placeholder">
            Ye book sirf SCAN hai (text transcription nahi), isliye ismein quiz nahi ban sakta.{" "}
            <Link href={`/notes/${slug}`}>Padhne ke liye kholo →</Link>
          </div>
        ) : !chapters.length ? (
          <div className="placeholder">Is naam ka koi chapter nahi.</div>
        ) : (
          <div className="nq-grid">
            {chapters.map((c) => {
              const id = `ch:${c.topic}`;
              const n = asked[`${book.scanBase || ""}#chapter:${c.topic}`] || 0;
              const open = openChap === c.topic;
              return (
                <div key={c.topic} className={`nq-ch${n ? " is-done" : ""}`}>
                  <div className="nq-ch__hd">
                    <span className="nq-ch__no">{c.no}</span>
                    <span className="nq-ch__t">{c.topic}</span>
                  </div>
                  <p className="nq-ch__m">
                    {c.quizPages.length} page{c.quizPages.length > 1 ? "s" : ""}
                    {n ? ` · ✓ ${n} question ho chuke` : ""}
                  </p>
                  <div className="nq-ch__acts">
                    <button className="btn btn--primary btn--sm" disabled={!!busy} onClick={() => runChapter(c)}>
                      {busy === id ? "…" : "📝 Chapter quiz"}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setOpenChap(open ? "" : c.topic)}>
                      Pages {open ? "▴" : "▾"}
                    </button>
                    <Link
                      href={`/notes/${slug}?topic=${encodeURIComponent(c.topic)}`}
                      className="btn btn--ghost btn--sm"
                      title="Ye chapter padho"
                    >
                      📖
                    </Link>
                  </div>
                  {open && (
                    <div className="nq-pages">
                      {c.quizPages.map((p) => {
                        const pn = asked[`${book.scanBase || ""}#${p.book_page}`] || 0;
                        return (
                          <button
                            key={p.book_page}
                            className={`nq-pg${pn ? " is-done" : ""}`}
                            disabled={!!busy}
                            onClick={() => runPage(p)}
                            title={`Page ${p.book_page} ka quiz${pn ? ` · ${pn} question ho chuke` : ""}`}
                          >
                            {busy === `pg:${p.book_page}` ? "…" : `${pn ? "✓" : ""}${p.book_page}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
