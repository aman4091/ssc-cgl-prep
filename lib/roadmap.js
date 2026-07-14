// AI Roadmap — a living 45-day SSC CGL study plan driven by Gemini.
// Stores the macro (weekly) skeleton + a concrete per-day task list, learns from
// mock scores + missed tasks, and materializes each day's tasks into cgl.targets
// so the Today page, timer and strict Focus Enforcer all work on them for free.
import { makeId } from "./storage";
import { dayKey } from "./daytime";
import { totalDays as vocabTotalDays, PER_DAY as VOCAB_PER_DAY } from "./vocab";
import { SUBJECTS, SUGGESTED, getChapters, addChapter } from "./grammar";
import { addTarget, getTargets, deleteTarget, setTargetDone } from "./targets";

const KEY = "cgl.roadmap";

// ---------- store ----------
export function blankRoadmap() {
  return {
    examDate: "", startKey: "", onboarded: false, lastActiveDay: "",
    profile: {
      hoursWeekday: 4, hoursWeekend: 6, studyWindowsText: "", offDays: [],
      weakSubjects: [], strongSubjects: [], startVocabDay: 1, notes: "",
    },
    macro: [], days: {}, usedBankIds: [],
    metrics: { mockScores: [], lastReplanAt: "" },
  };
}

// Signature used to drop duplicate tasks inside a single day (Gemini sometimes
// repeats the same drill). Same kind + same target = duplicate.
function taskSig(t) {
  const r = t.ref || {};
  const core =
    t.kind === "vocab" ? `d${r.day || ""}${r.type || ""}` :
    t.kind === "theory" ? `${r.subject || ""}:${String(r.chapter || "").toLowerCase()}` :
    (t.kind === "mock" || t.kind === "sectional" || t.kind === "topic") ? String(r.category || r.bankId || "") :
    t.kind === "ca" ? String(r.bucket || "") :
    String(t.title || "").toLowerCase().trim();
  return `${t.kind}|${core}`;
}
export function dedupeTasks(tasks) {
  const seen = new Set();
  const out = [];
  for (const t of tasks || []) {
    const s = taskSig(t);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(t);
  }
  return out;
}

export function getRoadmap() {
  if (typeof window === "undefined") return blankRoadmap();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankRoadmap();
    return { ...blankRoadmap(), ...JSON.parse(raw) };
  } catch { return blankRoadmap(); }
}

export function saveRoadmap(rm) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(rm));
}

export function isOnboarded() {
  const rm = getRoadmap();
  return !!(rm.onboarded && rm.startKey);
}

// ---------- dates ----------
function parseKey(k) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || ""));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
function diffDays(a, b) { // whole days from b -> a
  const da = parseKey(a), db = parseKey(b);
  if (!da || !db) return 0;
  return Math.round((da - db) / 86400000);
}

export function daysToExam(rm = getRoadmap()) {
  if (!rm.examDate) return 0;
  return Math.max(0, diffDays(rm.examDate, dayKey()));
}
export function totalPlanDays(rm = getRoadmap()) {
  if (!rm.startKey || !rm.examDate) return 45;
  return Math.max(1, diffDays(rm.examDate, rm.startKey) + 1);
}
export function dayIndex(rm = getRoadmap()) { // 1-based day number in the plan
  if (!rm.startKey) return 1;
  return Math.max(1, diffDays(dayKey(), rm.startKey) + 1);
}

function formatKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
// date key for plan-day number n (1-based), anchored at startKey
export function keyForDayIndex(n, rm = getRoadmap()) {
  const base = parseKey(rm.startKey);
  if (!base) return dayKey();
  return formatKey(new Date(base.getTime() + (n - 1) * 86400000));
}

let _tidn = 0;
function stampTask(t) {
  return {
    tid: t.tid || ("rt_" + makeId() + "_" + (_tidn++)),
    kind: t.kind || "custom",
    title: String(t.title || t.kind || "Task"),
    detail: String(t.detail || ""),
    durationMin: Number(t.durationMin) || 0,
    priority: Number(t.priority) || 99,
    ref: t.ref && typeof t.ref === "object" ? t.ref : {},
    done: false, doneAt: "",
  };
}

// Merge Gemini's numbered days into rm.days, keeping any tasks already done that
// day (so a re-plan never erases completed work). `days` is keyed by plan-day nums.
export function applyGeneratedDays(rm, days) {
  for (const [numStr, day] of Object.entries(days || {})) {
    const n = parseInt(numStr, 10);
    if (!n || !day) continue;
    const dk = keyForDayIndex(n, rm);
    const doneOnes = (rm.days?.[dk]?.tasks || []).filter((t) => t.done);
    const fresh = (day.tasks || []).map(stampTask).sort((a, b) => a.priority - b.priority);
    rm.days = rm.days || {};
    rm.days[dk] = {
      generatedAt: new Date().toISOString(),
      theme: day.theme || "", coachNote: day.coachNote || "",
      tasks: dedupeTasks([...doneOnes, ...fresh]), // keep done first, drop repeats
    };
  }
  return rm;
}

// Finish the intake form -> seed the roadmap ready for the first plan.
export function startOnboarding(profile, examDate) {
  const rm = getRoadmap();
  rm.profile = { ...rm.profile, ...profile };
  rm.examDate = examDate;
  rm.startKey = dayKey();
  rm.onboarded = true;
  saveRoadmap(rm);
  return rm;
}

// ---------- per-day plan ----------
export function getDayPlan(dk = dayKey(), rm = getRoadmap()) {
  return rm.days?.[dk] || null;
}

// mark a task done/undone (roadmap is the source of truth for completion)
export function setTaskDone(dk, tid, done = true) {
  const rm = getRoadmap();
  const day = rm.days?.[dk];
  if (!day) return rm;
  day.tasks = (day.tasks || []).map((t) =>
    t.tid === tid ? { ...t, done, doneAt: done ? new Date().toISOString() : "" } : t);
  saveRoadmap(rm);
  return rm;
}

// Move a previous day's undone tasks into today's plan (carry-forward), tagged so
// the UI can show "kal se". Missed work never disappears — it stacks on today.
export function carryForward(fromKey, toKey, rm = getRoadmap()) {
  const from = rm.days?.[fromKey];
  if (!from || fromKey === toKey) return rm;
  const undone = (from.tasks || []).filter((t) => !t.done);
  if (!undone.length) return rm;
  const today = rm.days[toKey] || { generatedAt: new Date().toISOString(), theme: "", coachNote: "", tasks: [] };
  const have = new Set((today.tasks || []).map((t) => t.tid));
  const moved = undone
    .filter((t) => !have.has(t.tid))
    .map((t) => ({ ...t, carriedFrom: t.carriedFrom || fromKey }));
  today.tasks = [...moved, ...(today.tasks || [])]; // carried work goes on top
  from.tasks = (from.tasks || []).map((t) => (t.done ? t : { ...t, movedTo: toKey }));
  rm.days[toKey] = today;
  saveRoadmap(rm);
  return rm;
}

export function logMockScore(entry) {
  const rm = getRoadmap();
  rm.metrics = rm.metrics || { mockScores: [], lastReplanAt: "" };
  rm.metrics.mockScores = [...(rm.metrics.mockScores || []), { dateKey: dayKey(), ...entry }];
  saveRoadmap(rm);
  return rm;
}

// ---------- catalog (compact resource summary for the Gemini prompt) ----------
export function buildCatalog(bankIndex = [], rm = getRoadmap()) {
  const used = new Set(rm.usedBankIds || []);
  const byCat = {};
  for (const e of bankIndex) {
    const g = e.group === "mock" ? "mock" : "topic";
    const c = byCat[g] || (byCat[g] = {});
    const row = c[e.category] || (c[e.category] = { total: 0, used: 0 });
    row.total++;
    if (used.has(e.id)) row.used++;
  }
  const fmt = (obj) => Object.entries(obj || {})
    .map(([cat, r]) => ({ category: cat, remaining: r.total - r.used, total: r.total }));

  const subjects = {};
  for (const key of Object.keys(SUBJECTS)) {
    const existing = getChapters(key).map((c) => c.name);
    subjects[key] = { label: SUBJECTS[key].label, suggested: SUGGESTED[key] || [], yourChapters: existing };
  }

  return {
    mocks: fmt(byCat.mock),
    topics: fmt(byCat.topic),
    vocab: { totalDays: vocabTotalDays(), perDay: VOCAB_PER_DAY, startFromDay: rm.profile?.startVocabDay || 1, types: ["ows", "idiom", "vocab"] },
    subjects,
    currentAffairs: { buckets: ["daily", "weekly", "monthly", "yearly"], route: "/current-affairs" },
  };
}

// ---------- resolve a task -> a launch URL ----------
// Bank tasks (mock/sectional/topic) get a stable bank_ id assigned the first time
// they're resolved (skipping already-used ids), so the same task always opens the
// same test and "which mock next" keeps advancing. Mutates + persists rm.
export function taskHref(task, bankIndex = [], rm = getRoadmap()) {
  const k = task.kind;
  if (k === "mock" || k === "sectional" || k === "topic") {
    if (task.ref?.bankId) return `/quizzes/${task.ref.bankId}`;
    const wantGroup = k === "topic" ? "topic" : "mock";
    const cat = task.ref?.category;
    const used = new Set(rm.usedBankIds || []);
    const pool = bankIndex.filter((e) => (e.group === wantGroup) && (!cat || e.category === cat) && !used.has(e.id));
    const pick = pool[0] || bankIndex.filter((e) => e.group === wantGroup && !used.has(e.id))[0];
    if (pick) {
      task.ref = { ...(task.ref || {}), bankId: pick.id, bankTitle: pick.title };
      rm.usedBankIds = [...(rm.usedBankIds || []), pick.id];
      // persist the assignment back into the stored day
      const day = rm.days?.[task._dk];
      if (day) day.tasks = day.tasks.map((t) => (t.tid === task.tid ? task : t));
      saveRoadmap(rm);
      return `/quizzes/${pick.id}`;
    }
    return "/mock-tests";
  }
  if (k === "vocab") {
    const d = task.ref?.day || 1;
    return task.ref?.type ? `/vocab/${d}/${task.ref.type}` : `/vocab/${d}`;
  }
  if (k === "theory") {
    const subj = SUBJECTS[task.ref?.subject] ? task.ref.subject : "math";
    const name = String(task.ref?.chapter || "").trim();
    if (!name) return `/study/${subj}`;
    // Auto-create the chapter if the plan names one you haven't added yet, so the
    // task deep-links to a real chapter page you can fill with notes/PDFs later.
    const existing = getChapters(subj).find((c) => c.name.toLowerCase() === name.toLowerCase());
    const ch = existing || addChapter(subj, name);
    return ch ? `/study/${subj}/${ch.id}` : `/study/${subj}`;
  }
  if (k === "ca") return "/current-affairs";
  if (k === "calc") return "/calculation";
  if (k === "revision") return task.ref?.url || "/mistakes";
  return task.ref?.url || "";
}

// ---------- materialize today's tasks into cgl.targets ----------
const EMOJI = { mock: "📝", sectional: "🎯", topic: "🧩", vocab: "🔤", theory: "📚", ca: "📰", calc: "🧮", revision: "♻️", custom: "✍️" };

// Rebuild cgl.targets to mirror today's undone roadmap tasks. First syncs any
// targets the user completed on the Today page back into the roadmap, then wipes
// old roadmap targets and re-adds today's pending ones (top task = #1).
export function materializeToday(bankIndex = []) {
  const rm = getRoadmap();
  const dk = dayKey();
  const day = rm.days?.[dk];

  // 1) pull done-state from existing roadmap targets back into the plan
  const existing = getTargets().filter((t) => t.ref?.fromRoadmap);
  if (day) {
    const doneTids = new Set(existing.filter((t) => t.done).map((t) => t.ref?.roadmapTid));
    if (doneTids.size) {
      day.tasks = (day.tasks || []).map((t) => (doneTids.has(t.tid) && !t.done ? { ...t, done: true, doneAt: new Date().toISOString() } : t));
      saveRoadmap(rm);
    }
  }

  // 2) clear all previously-materialized roadmap targets
  existing.forEach((t) => deleteTarget(t.id));

  // 3) add today's pending tasks (in plan order -> first is #1), de-duped
  if (day) {
    dedupeTasks(day.tasks || []).forEach((task) => {
      if (task.done) return;
      task._dk = dk;
      const href = taskHref(task, bankIndex, rm);
      const title = `${EMOJI[task.kind] || "•"} ${task.title || task.kind}`;
      const ref = { fromRoadmap: true, roadmapTid: task.tid, roadmapDay: dk, url: href };
      if (task.durationMin) ref.durationMin = task.durationMin;
      addTarget({ type: "custom", title, ref });
    });
  }
  try { window.dispatchEvent(new CustomEvent("cgl:targets-changed")); } catch { /* ignore */ }
  return rm;
}
