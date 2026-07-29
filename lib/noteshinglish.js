// Per-page Hinglish that the reader pastes in themselves, to read alongside a
// notes page. Lives in ONE synced localStorage key (cgl.notesHinglish) as
// { [pageKey]: "hinglish text" }, so it rides Supabase sync to every device.
// It NEVER touches the shipped notes JSON — this is purely the reader's own
// side-text, keyed by the page's scan URL + book page (unique per book).

const KEY = "cgl.notesHinglish";

function readAll() {
  if (typeof window === "undefined") return {};
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

// Stable per-page key. Parmar page numbers are unique across the whole book and
// all its subjects share one scanBase, so this is unique and stable.
export function hinglishKey(book, page) {
  return `${book?.scanBase || ""}#${page?.book_page}`;
}

export function getHinglish(k) {
  return String(readAll()[k] || "");
}

// Save trimmed text. An empty/blank value is NEVER written — it would only wipe
// the reader's own paste; a blank save is treated as "no change" by the caller.
// Returns the saved text on success, or null if the write did NOT persist (e.g.
// localStorage is full) — the caller must surface that instead of pretending it
// saved, otherwise the paste is silently lost and the reader sees a blank column.
export function setHinglish(k, text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const all = readAll();
  all[k] = t;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    return null; // quota / storage blocked — old pages stay intact, this one didn't save
  }
  // Verify it actually landed (a full quota can fail without throwing on some
  // browsers) — only report success if we can read the exact text back.
  return getHinglish(k) === t ? t : null;
}
