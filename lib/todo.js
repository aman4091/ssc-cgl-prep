// ✅ To-do list — homepage par, aur PC ke apne to-do overlay par bhi
// (D:\over\todo_app.py). Dono ek hi list dekhte hain.
//
// localStorage ki `cgl.todos` — baaki `cgl.` keys ki tarah sync hoti hai, har
// kaam ek alag record ("L#<id>") ban kar. PC ka overlay usi Supabase record ko
// padhta hai aur wahin ✅ likhta hai (sirf badli hui rows — egress nahi
// bharta), aur yahan wo agli sync par aa jaata hai. Isliye har kaam ki `id`
// pakki rehni chahiye aur record chhota — sirf text aur haal.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.todos";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(storeGet(KEY) || "[]");
    return Array.isArray(v) ? v.filter((t) => t && t.id) : [];
  } catch { return []; }
}
function write(list) { storeSet(KEY, JSON.stringify(list)); }

const newId = () => `td_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// Baaki wale pehle (jis kram mein jode), phir ho chuke (sabse naya upar).
export function sortTodos(list) {
  const open = list.filter((t) => !t.done).sort((a, b) => (a.at || "").localeCompare(b.at || ""));
  const done = list.filter((t) => t.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  return [...open, ...done];
}

export function getTodos() { return sortTodos(read()); }

// Kuch badla ya nahi — card har kuch second isi se dekhta hai (PC se ✅
// sync ke raaste aata hai).
export const todoSig = (list) => list.map((t) => `${t.id}:${t.done ? 1 : 0}:${t.text}`).join("|");

export function addTodo(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const rec = { id: newId(), text: t.slice(0, 300), done: false, at: new Date().toISOString() };
  write([...read(), rec]);
  return rec;
}

export function toggleTodo(id) {
  write(read().map((t) => {
    if (t.id !== id) return t;
    if (t.done) {
      const next = { ...t, done: false };
      delete next.doneAt;
      return next;
    }
    return { ...t, done: true, doneAt: new Date().toISOString() };
  }));
}

export function removeTodo(id) { write(read().filter((t) => t.id !== id)); }

export function clearDone() { write(read().filter((t) => !t.done)); }
