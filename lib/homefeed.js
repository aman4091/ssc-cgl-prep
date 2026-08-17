// The homepage "study feed" list: an ordered set of items the user curates via
// the ➕ Add items picker. Two kinds:
//   • vocab  — a singleton that always shows the next un-quizzed day (nextUp()).
//   • notes  — one notes TOPIC (chapter) whose Hindi/Hinglish notes are shown.
// Stored under cgl.home.* so it rides the existing Supabase sync snapshot.
// Synchronous localStorage (same style as lib/vocab.js) + a subscribe/notify so
// the feed and the dropdown re-render on any change.

import { storeGet, storeSet, storeRemove } from "./bigstore";

const ITEMS_KEY = "cgl.home.items";
const ACTIVE_KEY = "cgl.home.active";

export const VOCAB_ITEM = { id: "vocab", kind: "vocab", label: "🔤 Vocab" };

const subs = new Set();
function notify() { for (const fn of subs) { try { fn(); } catch { /* ignore */ } } }
export function subscribeHome(fn) { subs.add(fn); return () => subs.delete(fn); }

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = storeGet(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, val) {
  try { storeSet(key, JSON.stringify(val)); } catch { /* full — non-critical */ }
}

// A stable id per notes topic so the same chapter is never added twice.
export function notesItemId(slug, topic) { return `notes:${slug}#${topic}`; }

// The list always leads with the Vocab item (so the home page is never empty and
// vocab stays one tap away), followed by the saved notes topics in add-order.
export function getItems() {
  const saved = read(ITEMS_KEY, null);
  const notes = Array.isArray(saved) ? saved.filter((it) => it && it.kind === "notes") : [];
  return [VOCAB_ITEM, ...notes];
}

// Only the notes items are persisted; the vocab singleton is implicit.
function saveNotes(notes) {
  write(ITEMS_KEY, notes);
  notify();
}

export function hasNotesItem(slug, topic) {
  const id = notesItemId(slug, topic);
  return getItems().some((it) => it.id === id);
}

export function addNotesItem(slug, topic, label) {
  const id = notesItemId(slug, topic);
  const notes = getItems().filter((it) => it.kind === "notes");
  if (notes.some((it) => it.id === id)) return;
  notes.push({ id, kind: "notes", slug, topic, label: label || topic });
  saveNotes(notes);
}

export function removeItem(id) {
  if (id === VOCAB_ITEM.id) return; // vocab is a fixed singleton, not removable
  const notes = getItems().filter((it) => it.kind === "notes" && it.id !== id);
  saveNotes(notes);
  if (getActiveId() === id) setActiveId(VOCAB_ITEM.id);
}

export function getActiveId() {
  const id = read(ACTIVE_KEY, VOCAB_ITEM.id);
  // Guard against a stale id (topic since removed) — fall back to Vocab.
  return getItems().some((it) => it.id === id) ? id : VOCAB_ITEM.id;
}

export function setActiveId(id) {
  write(ACTIVE_KEY, id);
  notify();
}
