"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { scanUrl } from "@/lib/notesbank";
import { getSettings, saveQuiz, getQuiz, makeId } from "@/lib/storage";
import { readImageText, generateNotesQuiz } from "@/lib/client-ai";
import ZoomableImage from "@/components/ZoomableImage";

// Plain text of a page's blocks — what the ✨ Gemini button sends. Strips the
// transcription markup (**bold**, __underline__, [?…] unsure marks) to words.
function stripMd(s) {
  return String(s || "")
    .replace(/^\s*\*\s+/, "")            // leading "* " bullet marker
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // **bold** → text (before single-*)
    .replace(/\*([^*\n]+)\*/g, "$1")     // *italic* → text
    .replace(/\*/g, "")                  // any leftover lone asterisk marker
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\[\?([^\]]*)\]/g, (m, g) => (g ? g + "?" : "?"))
    .replace(/\s+/g, " ")
    .trim();
}
function blockText(b) {
  if (!b) return "";
  if (b.type === "heading" || b.type === "rule" || b.type === "note" || b.type === "hook")
    return stripMd(String(b.text || "").replace(/^#+\s+/, ""));
  if (b.type === "list") return (b.items || []).map((i) => "• " + stripMd(i)).join("\n");
  if (b.type === "example")
    return (b.items || []).map((i) => "• " + stripMd(i.text) + (i.note ? " — " + stripMd(i.note) : "")).join("\n");
  if (b.type === "qr")
    return (b.cells || []).map((c) => stripMd(c.k) + ": " + stripMd(c.v)).join("\n");
  if (b.type === "table") {
    const head = b.headers ? b.headers.map(stripMd).join(" | ") : "";
    const rows = (b.rows || []).map((r) => r.map(stripMd).join(" | ")).join("\n");
    return [head, rows].filter(Boolean).join("\n");
  }
  return "";
}
function pageText(p) {
  return (p.blocks || []).map(blockText).filter(Boolean).join("\n");
}

// ---- per-page "make a quiz from this page" (50 Q, batched + streamed) ----
const QUIZ_TARGET = 50;
const QUIZ_BATCH = 10;
const normQ = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, "").slice(0, 80);

function dispatchAppend(id, count, done) {
  try { window.dispatchEvent(new CustomEvent("cgl:quiz-appended", { detail: { id, count, done } })); }
  catch { /* no window */ }
}

// Cross-click memory of what a page has already been quizzed on, so pressing
// the button again asks NEW questions instead of the same ones — until the page
// is exhausted (a cycle), then it resets and repeats from the top.
const ASKED_KEY = "cgl.notesquiz.asked";
function readAsked() { try { return JSON.parse(localStorage.getItem(ASKED_KEY) || "{}"); } catch { return {}; } }
function getAsked(pk) { return readAsked()[pk] || []; }          // array of question texts
function addAsked(pk, texts) {
  const all = readAsked();
  const seen = new Set((all[pk] || []).map(normQ));
  const merged = [...(all[pk] || [])];
  for (const t of texts) { const k = normQ(t); if (t && !seen.has(k)) { seen.add(k); merged.push(t); } }
  all[pk] = merged.slice(-120); // cap the memory per page
  localStorage.setItem(ASKED_KEY, JSON.stringify(all));
}
function clearAsked(pk) { const all = readAsked(); delete all[pk]; localStorage.setItem(ASKED_KEY, JSON.stringify(all)); }
const pageKeyOf = (book, page) => `${book?.scanBase || ""}#${page.book_page}`;

// Drop questions whose stem matches anything already asked or already in this quiz.
function freshOnly(questions, ...excludeLists) {
  const seen = new Set();
  for (const list of excludeLists) for (const t of list) seen.add(normQ(t));
  const out = [];
  for (const q of questions || []) {
    const k = normQ(q.question);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(q);
  }
  return out;
}

// One page can rarely yield 50 distinct questions, so this stops when a batch
// adds nothing new — never pads with repeats. Everything it adds is remembered
// against the page so the NEXT click continues with different questions.
async function streamNotesQuiz(text, quizId, pk) {
  let dry = 0;
  for (;;) {
    const before = getQuiz(quizId);
    if (!before) return; // deleted
    const have = before.questions.length;
    if (have >= QUIZ_TARGET) break;

    const asked = getAsked(pk);
    const here = before.questions.map((q) => q.question);
    let fresh = [];
    try {
      const b = await generateNotesQuiz(text, Math.min(QUIZ_BATCH, QUIZ_TARGET - have), [...asked, ...here]);
      fresh = freshOnly(b.questions, asked, here);
    } catch { fresh = []; }

    const quiz = getQuiz(quizId);
    if (!quiz) return;
    if (fresh.length) { quiz.questions = [...quiz.questions, ...fresh]; addAsked(pk, fresh.map((q) => q.question)); }
    dry = fresh.length ? 0 : dry + 1;
    const finished = dry >= 2 || quiz.questions.length >= QUIZ_TARGET; // page ran dry
    quiz.streaming = !finished;
    saveQuiz(quiz);
    dispatchAppend(quizId, quiz.questions.length, finished);
    if (finished) return;
  }
  const quiz = getQuiz(quizId);
  if (quiz && quiz.streaming) { quiz.streaming = false; saveQuiz(quiz); dispatchAppend(quizId, quiz.questions.length, true); }
}

// The 📝 button on a page: first batch now, rest topped up in the background.
function PageQuizBtn({ page, book }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (busy) return;
    const text = pageText(page);
    if (text.length < 30) { setErr("kam text"); setTimeout(() => setErr(""), 1500); return; }
    setBusy(true); setErr("");
    try {
      const pk = pageKeyOf(book, page);
      // Exclude everything this page has already been quizzed on so the questions
      // are new. If that yields nothing, the page is exhausted → new cycle: forget
      // the history and generate from scratch (repeats allowed again).
      let asked = getAsked(pk);
      let first = await generateNotesQuiz(text, QUIZ_BATCH, asked);
      let fresh = freshOnly(first.questions, asked);
      if (!fresh.length) {
        clearAsked(pk); asked = [];
        first = await generateNotesQuiz(text, QUIZ_BATCH, []);
        fresh = freshOnly(first.questions, []);
      }
      if (!fresh.length) throw new Error("nahi bana");
      addAsked(pk, fresh.map((q) => q.question));

      const quizId = makeId();
      const done = fresh.length >= QUIZ_TARGET;
      saveQuiz({
        id: quizId, title: `${book?.title || "Notes"} · page ${page.book_page} quiz`,
        source: "notesquiz", createdAt: new Date().toISOString(), questions: fresh, streaming: !done,
      });
      router.push(`/quizzes/${quizId}`);
      if (!done) streamNotesQuiz(text, quizId, pk);
    } catch (e) {
      setErr(e.message === "nahi bana" ? "Quiz nahi bana — dobara try karo." : (e.message || "Error"));
      setBusy(false);
      setTimeout(() => setErr(""), 2500);
    }
  };
  return (
    <>
      <button className="nt-gemini" onClick={go} disabled={busy} title="Is page se 50-question quiz banao (har baar naye questions)">
        {busy ? "…" : "📝"}
      </button>
      {err && <span className="nt-meta" style={{ color: "var(--accent)" }}>{err}</span>}
    </>
  );
}

// Settings holds a prompt per subject plus a generic one; a GS notes page must
// carry the GS instructions. Same precedence the question cards use.
function promptFor(subject) {
  const st = getSettings();
  const perSubject = String((st.shortcutPrompts || {})[subject] || "").trim();
  return perSubject || String(st.geminiPrompt || "").trim();
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// ✨ per-page Gemini button: copies the GS prompt + this page's text and opens
// Gemini — the same gesture the question cards use, for a notes page.
function GeminiBtn({ text, subject }) {
  const [done, setDone] = useState(false);
  const go = async () => {
    const body = String(text || "").trim();
    if (!body) return;
    const pre = promptFor(subject);
    await copyText(pre ? `${pre}\n\n${body}` : body);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
    try { window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
  };
  return (
    <button
      className="nt-gemini"
      onClick={go}
      title="Is page ka text + GS prompt copy karke Gemini kholo"
    >
      {done ? "✓" : "✨"}
    </button>
  );
}

// ✨ for an IMAGE page (handwritten English Grammar): OCR the scan first — same
// as Wrong Questions reads a screenshot, so Gemini vision (if ON) or tesseract —
// then copy the subject prompt + that text and open Gemini. The R2 image comes
// through our proxy since r2.dev sends no CORS header.
function ImageGeminiBtn({ src, subject }) {
  const [state, setState] = useState(""); // "" | "…" | "NN%" | "✓" | "✕"
  const busy = state === "…" || /%$/.test(state);
  const go = async () => {
    if (busy) return;
    setState("…");
    try {
      const res = await fetch(`/api/r2/image?url=${encodeURIComponent(src)}`);
      if (!res.ok) throw new Error("img");
      const blob = await res.blob();
      const { text } = await readImageText(blob, (pr) => setState(`${Math.round(pr * 100)}%`));
      const body = String(text || "").trim();
      if (!body) { setState("✕"); setTimeout(() => setState(""), 1500); return; }
      const pre = promptFor(subject);
      await copyText(pre ? `${pre}\n\n${body}` : body);
      setState("✓");
      setTimeout(() => setState(""), 1500);
      try { window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
    } catch {
      setState("✕");
      setTimeout(() => setState(""), 1500);
    }
  };
  return (
    <button
      className="nt-gemini"
      onClick={go}
      disabled={busy}
      title="Is page ko padhkar (OCR) prompt ke saath Gemini mein copy karo"
    >
      {state || "✨"}
    </button>
  );
}

// Notes reader — a React port of polity_notes/preview.html's renderer.
//
// The transcription's inline markup is the whole contract (OBJECTIVE §3 / THEME §6):
//   **bold** → <b> (red-pen emphasis)   __underline__ → <u>
//   [?] / [?guess] → .nt-qm (a word the reader could not make out — loud yellow
//     ON PURPOSE, it tells the reader to open the scan and not trust the word)
// Everything else is literal, HTML-escaped BEFORE markup is applied.
//
// Class names are scoped under .notesdoc / prefixed nt- so they never collide
// with the site's own .card/.note/.rule classes.

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function md(s) {
  let t = esc(s).replace(/^\s*\*\s+/, ""); // drop a leading "* " bullet marker
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");  // **bold** — before single-*
  t = t.replace(/\*([^*\n]+)\*/g, "<i>$1</i>");    // *italic*
  // Any leftover lone asterisk is a transcription marker (bullet/emphasis with no
  // pair), never real content in these notes — drop it so no stray * shows.
  t = t.replace(/\*/g, "");
  t = t.replace(/__([^_]+)__/g, "<u>$1</u>");
  t = t.replace(
    /\[\?([^\]]*)\]/g,
    (m, g) =>
      '<span class="nt-qm" title="could not read this — check the original scan">' +
      (g ? esc(g) + "?" : "?") +
      "</span>"
  );
  return t;
}

// One block → HTML. Ported from each notes package's preview.html so the site
// renders with the SAME shape/size/look the data was authored against:
//   heading → a ◆ section rule (.nt-sec), sub-headings quieter (.nt-sub)
//   rule    → a statement line (.nt-stmt); grouped into a RULE card by renderBlocks
//   note    → .nt-tip (quiet) / .nt-key (boxed highlight) / .nt-tip.diag
//   list/example → hanging-dot bullets (ul.nt-pts)
function blockHtml(b, hashHierarchy) {
  // A big all-caps section banner (Parmar polity), above the ◆ sub-headings.
  if (b.type === "section") return '<div class="nt-bigsec">' + md(b.text) + "</div>";
  // A cropped figure from the book (mind-maps, diagrams) — src is a full R2 URL.
  if (b.type === "figure")
    return (
      '<figure class="nt-fig"><img loading="lazy" src="' +
      esc(b.src || "") +
      '" alt="' + esc(b.caption || "figure") + '">' +
      (b.caption ? "<figcaption>" + md(b.caption) + "</figcaption>" : "") +
      "</figure>"
    );
  if (b.type === "heading") {
    // A "# " marker means a MAIN heading (polity); a plain heading in such a book
    // is a sub-heading. Books with no markers (this one, static GK) → every
    // heading is a main section.
    const m = /^(#+)\s+/.exec(b.text);
    const text = m ? b.text.slice(m[0].length) : b.text;
    const sub = !m && hashHierarchy;
    return sub
      ? '<div class="nt-sub">' + md(text) + "</div>"
      : '<div class="nt-sec">' + md(text) + "</div>";
  }
  if (b.type === "rule") return '<div class="nt-stmt">' + md(b.text) + "</div>";
  // ⚡ Quick Revise — the highest-yield facts of a subsection, one glance (static GK).
  if (b.type === "qr") {
    const cells = (b.cells || [])
      .map(
        (c) =>
          '<div class="nt-qr-cell"><span class="k">' +
          md(c.k) +
          '</span><span class="v">' +
          md(c.v) +
          "</span></div>"
      )
      .join("");
    return (
      '<div class="nt-qr"><div class="nt-qr-hd">⚡ ' +
      esc(b.title || "Quick Revise") +
      '</div><div class="nt-qr-grid">' +
      cells +
      "</div></div>"
    );
  }
  // 📌 memory hook — a superlative / striking one-liner, pinned (static GK).
  if (b.type === "hook") return '<div class="nt-hook">' + md(b.text) + "</div>";
  if (b.type === "list")
    return (
      '<ul class="nt-pts">' +
      (b.items || []).map((i) => "<li>" + md(i) + "</li>").join("") +
      "</ul>"
    );
  if (b.type === "example")
    return (
      '<ul class="nt-pts">' +
      (b.items || [])
        .map(
          (i) =>
            "<li>" +
            (i.n != null ? "<b>" + esc(i.n) + ".</b> " : "") +
            md(i.text) +
            (i.note ? '<span class="nt-nt">' + md(i.note) + "</span>" : "") +
            "</li>"
        )
        .join("") +
      "</ul>"
    );
  if (b.type === "table") {
    const h = b.headers
      ? "<thead><tr>" +
        b.headers.map((x) => "<th>" + md(x) + "</th>").join("") +
        "</tr></thead>"
      : "";
    const r = (b.rows || [])
      .map(
        (row) =>
          "<tr>" + row.map((c) => "<td>" + md(c) + "</td>").join("") + "</tr>"
      )
      .join("");
    return '<div class="nt-scrollx"><table>' + h + "<tbody>" + r + "</tbody></table></div>";
  }
  if (b.type === "note") {
    const diag = /^\s*(📍|📐|Diagram|Map)/u.test(b.text || "");
    if (diag) return '<div class="nt-tip diag">' + md(b.text) + "</div>";
    if (b.boxed) return '<div class="nt-key">' + md(b.text) + "</div>";
    return '<div class="nt-tip">' + md(b.text) + "</div>";
  }
  return "";
}

// A "Rule-N" heading, or a `rule` block that carries examples/notes, becomes a
// bounded RULE card (badge + statement + body) so each rule reads as its own
// rule instead of flat prose — exactly what the source preview.html does.
const RULE_RE = /^\s*\**\s*rule\b/i;
const isRuleHd = (t) => RULE_RE.test(String(t || ""));
function ruleLabel(t) {
  const m = String(t || "").replace(/\*/g, "").match(/rule\s*[:\-\s]*([0-9]+[A-Za-z]?)/i);
  return m ? "RULE " + m[1].toUpperCase() : "RULE";
}
function renderBlocks(blocks, hashHierarchy) {
  const bl = blocks || [];
  let out = "";
  let i = 0;
  while (i < bl.length) {
    const b = bl[i];
    if (b.type === "heading" && isRuleHd(b.text)) {
      let j = i + 1;
      let inner = "";
      while (j < bl.length && bl[j].type !== "heading") { inner += blockHtml(bl[j], hashHierarchy); j++; }
      out += '<div class="nt-rulecard"><span class="nt-rulehd">' + esc(ruleLabel(b.text)) + "</span>" + inner + "</div>";
      i = j;
    } else if (b.type === "rule") {
      let j = i + 1;
      let body = "";
      while (j < bl.length && bl[j].type !== "heading" && bl[j].type !== "rule") { body += blockHtml(bl[j], hashHierarchy); j++; }
      if (body) {
        out += '<div class="nt-rulecard"><span class="nt-rulehd">RULE</span><div class="nt-stmt">' + md(b.text) + "</div>" + body + "</div>";
      } else {
        out += blockHtml(b, hashHierarchy); // a lone formula line stays plain
      }
      i = j;
    } else {
      out += blockHtml(b, hashHierarchy);
      i++;
    }
  }
  return out;
}

// meta.topics lists RUNS; merge by name so a chapter that appears twice cannot
// produce two nav entries that filter to the same pages. Sorted by topic_no so
// the nav follows the book's own chapter order (falls back to first page).
function navTopics(topics) {
  const seen = new Map();
  for (const t of topics || []) {
    const e = seen.get(t.topic);
    if (e) {
      e.lo = Math.min(e.lo, t.first_page);
      e.hi = Math.max(e.hi, t.last_page);
    } else {
      seen.set(t.topic, {
        topic: t.topic,
        no: t.topic_no != null ? t.topic_no : t.first_page,
        lo: t.first_page,
        hi: t.last_page,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.no - b.no);
}

// Every book uses the dropdown. Polity (12 chapters) used to get chips instead
// because it sat under an 18-chapter threshold, so the two notes books behaved
// differently for no reason the reader could see.

export default function NotesReader({ book }) {
  // The chapter comes from the MENU (?topic=…), not from a control on the page —
  // notes books pick their chapter the same way the PYQ shelves do. navTopics()
  // still merges the runs, because the menu builds its rows from the same list
  // and both must agree on what counts as one chapter.
  const params = useSearchParams();
  const topic = params.get("topic");
  const [query, setQuery] = useState("");
  // Image-mode: which scan the zoom lightbox is showing (null = closed). A page
  // scan fits the phone width, so formulas read small; tapping opens it in the
  // pinch/zoom viewer — the same "fit, then tap to zoom" the image banks use.
  const [zoom, setZoom] = useState(null);

  const meta = book?.meta || { topics: [], total_pages: 0 };
  // Image-anchored books (Brahmastra maths formulas) render every page as a
  // scan and list their chapters as plain strings; the text books transcribe
  // pages into blocks and list chapters as objects. Branch on the flag.
  const imageMode = meta.render_mode === "image";
  // Chapters come as plain strings (Brahmastra maths, History) OR as objects
  // with page ranges (Polity/English/Static). navTopics only understands the
  // object form, so for string topics use them directly.
  const topicsAreStrings = typeof (meta.topics || [])[0] === "string";
  const nav = useMemo(
    () => (topicsAreStrings ? [] : navTopics(meta.topics)),
    [meta.topics, topicsAreStrings]
  );
  const topicNames = topicsAreStrings ? (meta.topics || []) : nav.map((t) => t.topic);
  // A ?topic= that names no chapter in this book would silently show an empty
  // reader, so fall back to the whole book instead.
  const active = topicNames.includes(topic) ? topic : null;

  // Does this book use "# " heading markers for hierarchy? (polity yes, static no)
  const hashHierarchy = useMemo(
    () =>
      (book?.pages || []).some((p) =>
        (p.blocks || []).some((b) => b.type === "heading" && /^#+\s/.test(b.text))
      ),
    [book]
  );

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Skip chapter covers (decorative) and practice pages (printed MCQ/one-liner
    // sheets — History marks these kind:"practice"); their scans stay on R2.
    let ps = (book?.pages || []).filter((p) => !p.is_cover && p.kind !== "practice");
    if (active) ps = ps.filter((p) => p.topic === active);
    // Image pages have no text to search; the search box is hidden for them.
    if (q && !imageMode) ps = ps.filter((p) => JSON.stringify(p.blocks).toLowerCase().includes(q));
    return ps;
  }, [book, active, query, imageMode]);


  return (
    <div className="notesdoc">
      <aside className="notesdoc__nav">
        {!imageMode && (
          <input
            className="notesdoc__search"
            placeholder="🔍 Notes mein khojo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="notesdoc__where">
          {active ? (
            <>
              <b>{active}</b> · {pages.length} pages
            </>
          ) : (
            <>Poori book · {meta.total_pages} pages — chapter menu se chuno</>
          )}
        </div>
      </aside>

      <div className="notesdoc__main">
        {pages.length === 0 ? (
          <div className="placeholder">Kuch nahi mila. 😕</div>
        ) : imageMode ? (
          // Image-anchored: the scan IS the content. One <img> per page, lazy.
          pages.map((p) => {
            const src = `${book.scanBase}/${String(p.scan).split("/").pop()}`;
            return (
              <div className="nt-card nt-card--img" key={p.book_page}>
                <div className="nt-hd">
                  <b>{p.topic}</b>
                  <span className="nt-hd__right">
                    {book.gemini && <ImageGeminiBtn src={src} subject={book.subject} />}
                    <span className="nt-meta">page {p.book_page} · 🔍 tap to zoom</span>
                  </span>
                </div>
                <img
                  className="nt-page-img"
                  loading="lazy"
                  src={src}
                  alt={`${p.topic} — page ${p.book_page}`}
                  onClick={() => setZoom(src)}
                />
              </div>
            );
          })
        ) : (
          pages.map((p) => (
            <div className="nt-card" key={p.book_page}>
              <div className="nt-hd">
                <b>{p.topic}</b>
                <span className="nt-hd__right">
                  <PageQuizBtn page={p} book={book} />
                  <GeminiBtn text={pageText(p)} subject={book.subject} />
                  <span className="nt-meta">page {p.book_page}</span>
                </span>
              </div>
              {p.continues_from_prev && (
                <div className="nt-cont">… pichhle page se aage</div>
              )}
              <div dangerouslySetInnerHTML={{ __html: renderBlocks(p.blocks, hashHierarchy) }} />
              {p.continues_to_next && (
                <div className="nt-cont">agle page pe jaari …</div>
              )}
              <details className="nt-scan">
                <summary>📄 Original scan dekho</summary>
                <img
                  loading="lazy"
                  src={scanUrl(book.scanBase, p.book_page)}
                  alt={`original page ${p.book_page}`}
                />
              </details>
            </div>
          ))
        )}
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          <button className="lightbox__x" onClick={() => setZoom(null)}>✕</button>
          <div className="lightbox__body" onClick={(e) => e.stopPropagation()}>
            <ZoomableImage src={zoom} alt="page scan" />
          </div>
        </div>
      )}
    </div>
  );
}
