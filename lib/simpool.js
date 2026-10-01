"use client";

// 🎯 Similar — ek jagah jama hote saare "similar" question (page: /similar).
//
// Kisi bhi question par 🎯 (Answers page, PYQ — kahin se bhi) → Gemini ka
// likha hua question paste → yahan line mein lagta hai aur PEECHHE 🐋 DeepSeek
// us jaise 5 naye question banata hai. Har baar ke 5 ek "group" hain; page par
// sab mila-jula aata hai, ek hi group ke do lagatar nahi (arrange).
//
//   cgl.simpool        [{ id, g, gl, subject, question, options, answer, explanation, at }]
//   cgl.simpool.order  [id] — dikhane ka kram (jo ho chuke wo apni jagah tike)

import { generateSimilar } from "./client-ai";

const KEY = "cgl.simpool";
const OKEY = "cgl.simpool.order";
export const SIM_PER = 5;

const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:simpool")); } catch { /* ignore */ } };

export function getPool() { const v = read(KEY, []); return Array.isArray(v) ? v : []; }

// ── peechhe banane ki line (ek waqt mein ek) ─────────────────────────────
const jobs = [];
let running = false;
export function pendingCount() { return jobs.length + (running ? 1 : 0); }

const clean = (s) => String(s || "").replace(/[\uD800-\uDFFF]/g, "").replace(/\s+/g, " ").trim();

async function run() {
  if (running) return;
  running = true;
  while (jobs.length) {
    const j = jobs.shift();
    ping();
    let made = 0;
    for (let tries = 0; made < SIM_PER && tries < 4; tries++) {
      let qs = [];
      try {
        const r = await generateSimilar({ question: j.text, options: [] }, SIM_PER - made, j.subject);
        qs = (r && r.questions) || [];
      } catch { qs = []; }
      qs = qs.filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer));
      if (!qs.length) continue;
      const add = qs.slice(0, SIM_PER - made).map((q, i) => ({
        id: `sm_${Date.now().toString(36)}_${made + i}_${Math.random().toString(36).slice(2, 5)}`,
        g: j.g, gl: j.gl, subject: j.subject,
        question: String(q.question), options: q.options.map(String), answer: q.answer,
        explanation: String(q.explanation || ""), ...(q.diagram ? { diagram: q.diagram } : {}),
        at: Date.now(),
      }));
      write(KEY, [...getPool(), ...add]);
      made += add.length;
      ping();
    }
  }
  running = false;
  ping();
}

// -> group id. Turant laut-ta hai; question peechhe bante rehte hain.
export function addSimilar(text, subject, label) {
  const t = clean(text);
  if (!t) throw new Error("Question khaali hai — Gemini ka likha hua paste karo.");
  const g = `sg_${Date.now().toString(36)}`;
  jobs.push({ g, gl: label || t.slice(0, 60), text: t, subject: subject || "math" });
  ping();
  run();
  return g;
}

export function removeGroup(g) {
  write(KEY, getPool().filter((x) => x.g !== g));
  ping();
}

// ── kram: random, par ek group ke do lagatar nahi ────────────────────────
function arrange(items, prevG) {
  const by = new Map();
  for (const x of items) { if (!by.has(x.g)) by.set(x.g, []); by.get(x.g).push(x); }
  for (const [k, a] of by) by.set(k, a.sort(() => Math.random() - 0.5));
  const out = [];
  let last = prevG;
  let left = items.length;
  // Aisa chuno ki baaki bache hue bhi bina lagatar ke lag sakein.
  const ok = (k, rest) => {
    for (const [g, a] of by) {
      const c = a.length - (g === k ? 1 : 0);
      const cap = g === k ? Math.floor(rest / 2) : Math.ceil(rest / 2);
      if (c > cap) return false;
    }
    return true;
  };
  while (left > 0) {
    const gs = [...by.entries()].filter(([, a]) => a.length);
    let cand = gs.filter(([k]) => k !== last);
    if (!cand.length) cand = gs;            // bacha hi ek group — majboori
    const safe = cand.filter(([k]) => ok(k, left - 1));
    const pickFrom = safe.length ? safe : cand;
    const total = pickFrom.reduce((sum, [, a]) => sum + a.length, 0);
    let r = Math.random() * total;
    const [k, a] = pickFrom.find(([, a2]) => (r -= a2.length) < 0) || pickFrom[0];
    out.push(a.shift());
    last = k;
    left--;
  }
  return out;
}

// done(id) → kya ye ho chuka (option laga). Jo ho chuke aur unse pehle ke —
// apni jagah; baaki + naye phir se mila-jula.
export function orderedPool(done) {
  const pool = getPool();
  const byId = new Map(pool.map((x) => [x.id, x]));
  let order = (read(OKEY, []) || []).filter((id) => byId.has(id));
  const fresh = pool.filter((x) => !order.includes(x.id)).map((x) => x.id);
  if (fresh.length || order.length !== pool.length) {
    let last = -1;
    order.forEach((id, i) => { if (done(id)) last = i; });
    const head = order.slice(0, last + 1);
    const tail = [...order.slice(last + 1), ...fresh].map((id) => byId.get(id));
    const prevG = head.length ? byId.get(head[head.length - 1]).g : null;
    order = [...head, ...arrange(tail, prevG).map((x) => x.id)];
    write(OKEY, order);
  }
  return order.map((id) => byId.get(id));
}
