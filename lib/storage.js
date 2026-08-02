// Simple localStorage-backed store for settings & quizzes.
// (Local-first; later we can move quizzes to a DB / files.)

export const KEYS = {
  settings: "cgl.settings",
  quizzes: "cgl.quizzes",
};

export const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  // Gemini is used ONLY for the shortcut trick (if a key is set); everything else uses DeepSeek.
  geminiApiKey: "",
  geminiModel: "gemini-3-pro",
  // Master switch: turn Gemini fully off -> every feature falls back to DeepSeek.
  geminiEnabled: true,
  // Optional per-subject custom prompts for the shortcut trick (blank = built-in default).
  shortcutPrompts: { math: "", english: "", reasoning: "", gs: "" },
  // Vocab Rush: which vocab day numbers to draw words from. [] = all days.
  vocabRushDays: [],
  // "Copy & Ask": the site opened when you copy a question to ask elsewhere.
  // Use %s where the question text should be injected (URL-encoded). Blank = just copy.
  askExternalUrl: "https://www.google.com/search?q=%s",
  // Prompt prepended before the question when you press the ✨ Gemini button
  // (copied together as: prompt + blank line + question). Blank = just the question.
  geminiPrompt: "Is MCQ ka correct answer batao aur ek short Hinglish explanation do:",
  // Pomodoro timer defaults (minutes).
  pomodoroFocusMin: 25,
  pomodoroBreakMin: 5,
  // Day boundary + active window (late sleeper): day rolls over at dayEndTime,
  // and Strict Focus only nags between dayStartTime and dayEndTime.
  dayStartTime: "08:00",
  dayEndTime: "02:00",
  // Strict Focus Mode: a forced "do this now" popup for the #1 target.
  strictMode: false,
  strictIntervalMin: 2,
  // Cloud sync (Supabase, simple sync-code — no login).
  supabaseUrl: "",
  supabaseAnonKey: "",
  syncCode: "",
  syncAuto: false,
  syncLastAt: "",
  syncRemoteAt: "",   // last remote updated_at this device is in sync with
  syncPushedHash: "", // hash of the data we last pushed (to detect local changes)
};

// Sync credentials can be baked into the build (Vercel env vars) so a brand-new
// device / browser auto-syncs with ZERO in-app setup — no pasting Supabase URL,
// key, or sync code per device. They fill any field the user hasn't set, and when
// all three resolve, auto-sync is turned on by default. (These are NEXT_PUBLIC_*
// so they're inlined into the client bundle at build time.)
const ENV_SYNC = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  syncCode: process.env.NEXT_PUBLIC_SYNC_CODE || "",
};

export function getSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEYS.settings);
    const s = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    // Fill blank sync creds from the build env, so a fresh device needs no setup.
    if (!s.supabaseUrl) s.supabaseUrl = ENV_SYNC.supabaseUrl;
    if (!s.supabaseAnonKey) s.supabaseAnonKey = ENV_SYNC.supabaseAnonKey;
    if (!s.syncCode) s.syncCode = ENV_SYNC.syncCode;
    // Env-configured deployment → always auto-sync (personal, single-user app).
    if (ENV_SYNC.supabaseUrl && ENV_SYNC.supabaseAnonKey && ENV_SYNC.syncCode &&
        s.supabaseUrl && s.supabaseAnonKey && s.syncCode) {
      s.syncAuto = true;
    }
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

// True only when Gemini is switched ON *and* a key exists. Every Gemini call
// site should gate on this so the master switch reliably falls back to DeepSeek.
export function geminiActive(s) {
  const st = s || getSettings();
  return st.geminiEnabled !== false && !!(st.geminiApiKey && st.geminiApiKey.trim());
}

export function getQuizzes() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.quizzes);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Persist the quiz list, surviving a full localStorage. The list is newest-first
// (saveQuiz unshifts), so on a QuotaExceededError we drop the OLDEST quizzes and
// retry until it fits. Generated quizzes are regenerable derived data, so this
// frees space WITHOUT touching notes / vocab / progress / wrong-book / Hinglish.
// Returns the list actually stored (possibly trimmed to make room).
function persistQuizzes(all) {
  let list = all;
  while (true) {
    try {
      localStorage.setItem(KEYS.quizzes, JSON.stringify(list));
      return list;
    } catch (e) {
      if (!list.length) throw e; // nothing left to drop — genuinely out of room
      const drop = Math.max(1, Math.floor(list.length * 0.1)); // ~10% oldest per pass
      list = list.slice(0, list.length - drop);
    }
  }
}

export function saveQuiz(quiz) {
  const all = getQuizzes();
  all.unshift(quiz);
  return persistQuizzes(all);
}

// Free localStorage room for OTHER stores (wrong-book etc.) by shedding the
// oldest generated quizzes — the same regenerable data persistQuizzes sheds.
// Returns true if something was dropped, false if there is nothing left to shed.
export function shedOldQuizzes() {
  const all = getQuizzes();
  if (!all.length) return false;
  const drop = Math.max(1, Math.floor(all.length * 0.2));
  const kept = all.slice(0, all.length - drop);
  try { localStorage.setItem(KEYS.quizzes, JSON.stringify(kept)); }
  catch { persistQuizzes(kept); }
  return true;
}

export function getQuiz(id) {
  return getQuizzes().find((q) => q.id === id) || null;
}

export function deleteQuiz(id) {
  const all = getQuizzes().filter((q) => q.id !== id);
  try { localStorage.setItem(KEYS.quizzes, JSON.stringify(all)); } catch { /* full — a delete shrinks it, so this rarely throws */ }
  return all;
}

// Small id generator that doesn't rely on crypto in older browsers.
//
// Two quizzes saved in the same millisecond could draw the same 1e6 random and
// end up sharing an id — which is what produced React's "two children with the
// same key" on My Quizzes. A per-session counter makes a collision impossible
// within a session; the wider random makes one across sessions negligible.
let idSeq = 0;
export function makeId() {
  idSeq += 1;
  return (
    "q_" +
    Date.now().toString(36) +
    idSeq.toString(36) +
    Math.floor(Math.random() * 1e12).toString(36)
  );
}
