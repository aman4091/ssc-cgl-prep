"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { scanUrl } from "@/lib/notesbank";
import { getSettings } from "@/lib/storage";
import ZoomableImage from "@/components/ZoomableImage";

// Plain text of a page's blocks — what the ✨ Gemini button sends. Strips the
// transcription markup (**bold**, __underline__, [?…] unsure marks) to words.
function stripMd(s) {
  return String(s || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
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
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
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

function blockHtml(b, hashHierarchy) {
  if (b.type === "heading") {
    // Some books mark a main section heading with a leading "# " (polity: 368 of
    // 593); subheadings have none. Strip the marker (transcriber markup, not book
    // text). Only split hierarchy when the book actually USES "#": then "# …" is
    // an h3 main heading and a plain one is a quieter h4. When no heading in the
    // book carries a marker (static GK: 0 of 1017), every heading is an h3.
    const m = /^(#+)\s+/.exec(b.text);
    const text = m ? b.text.slice(m[0].length) : b.text;
    return m || !hashHierarchy
      ? "<h3>" + md(text) + "</h3>"
      : "<h4>" + md(text) + "</h4>";
  }
  if (b.type === "rule") return '<div class="nt-rule">' + md(b.text) + "</div>";
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
      '<ul class="nt-list">' +
      (b.items || []).map((i) => "<li>" + md(i) + "</li>").join("") +
      "</ul>"
    );
  if (b.type === "example")
    return (b.items || [])
      .map(
        (i) =>
          '<div class="nt-ex">' +
          (i.n != null ? '<span class="nt-n">' + esc(i.n) + ".</span>" : "") +
          md(i.text) +
          (i.note ? '<span class="nt-nt">' + md(i.note) + "</span>" : "") +
          "</div>"
      )
      .join("");
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
  if (b.type === "note")
    return '<div class="nt-note' + (b.boxed ? " box" : "") + '">' + md(b.text) + "</div>";
  // No "figure" branch — text-only dataset by the owner's decision. Diagrams are
  // transcribed into words; the scan at the foot of the page carries the drawing.
  return "";
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
                  <span className="nt-meta">page {p.book_page} · 🔍 tap to zoom</span>
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
                  <GeminiBtn text={pageText(p)} subject={book.subject} />
                  <span className="nt-meta">page {p.book_page}</span>
                </span>
              </div>
              {p.continues_from_prev && (
                <div className="nt-cont">… pichhle page se aage</div>
              )}
              {p.blocks.map((b, i) => (
                <div
                  key={i}
                  dangerouslySetInnerHTML={{ __html: blockHtml(b, hashHierarchy) }}
                />
              ))}
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
