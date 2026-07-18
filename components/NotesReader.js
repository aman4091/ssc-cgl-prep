"use client";

import { useMemo, useState } from "react";
import { scanUrl } from "@/lib/notesbank";

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

// Chips read well up to a point; past this many chapters a dropdown is compact.
const CHIP_LIMIT = 18;

export default function NotesReader({ book }) {
  const [topic, setTopic] = useState(null);
  const [query, setQuery] = useState("");

  const meta = book?.meta || { topics: [], total_pages: 0 };
  const nav = useMemo(() => navTopics(meta.topics), [meta.topics]);

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
    // Chapter cover pages are decorative collages with no content — skip them.
    let ps = (book?.pages || []).filter((p) => !p.is_cover);
    if (topic) ps = ps.filter((p) => p.topic === topic);
    if (q) ps = ps.filter((p) => JSON.stringify(p.blocks).toLowerCase().includes(q));
    return ps;
  }, [book, topic, query]);

  const useDropdown = nav.length > CHIP_LIMIT;

  return (
    <div className="notesdoc">
      <aside className="notesdoc__nav">
        <input
          className="notesdoc__search"
          placeholder="🔍 Notes mein khojo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {useDropdown ? (
          // 84 chapters is too many chips — a select stays compact.
          <select
            className="notesdoc__select"
            value={topic || ""}
            onChange={(e) => {
              setTopic(e.target.value || null);
              window.scrollTo(0, 0);
            }}
          >
            <option value="">All chapters ({meta.total_pages} pages)</option>
            {nav.map((t) => (
              <option key={t.topic} value={t.topic}>
                {t.no ? `${t.no}. ` : ""}
                {t.topic} ({t.lo}-{t.hi})
              </option>
            ))}
          </select>
        ) : (
          <nav className="nt-nav">
            <a
              href="#"
              className={topic === null ? "on" : ""}
              onClick={(e) => {
                e.preventDefault();
                setTopic(null);
                window.scrollTo(0, 0);
              }}
            >
              All chapters<span>{meta.total_pages}</span>
            </a>
            {nav.map((t) => (
              <a
                key={t.topic}
                href="#"
                className={topic === t.topic ? "on" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  setTopic(t.topic);
                  window.scrollTo(0, 0);
                }}
              >
                {t.topic}
                <span>
                  {t.lo}-{t.hi}
                </span>
              </a>
            ))}
          </nav>
        )}
      </aside>

      <div className="notesdoc__main">
        {pages.length === 0 ? (
          <div className="placeholder">Kuch nahi mila. 😕</div>
        ) : (
          pages.map((p) => (
            <div className="nt-card" key={p.book_page}>
              <div className="nt-hd">
                <b>{p.topic}</b>
                <span className="nt-meta">page {p.book_page}</span>
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
    </div>
  );
}
