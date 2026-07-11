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
  // Optional per-subject custom prompts for the shortcut trick (blank = built-in default).
  shortcutPrompts: { math: "", english: "", reasoning: "", gs: "" },
};

export function getSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
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

export function saveQuiz(quiz) {
  const all = getQuizzes();
  all.unshift(quiz);
  localStorage.setItem(KEYS.quizzes, JSON.stringify(all));
  return all;
}

export function getQuiz(id) {
  return getQuizzes().find((q) => q.id === id) || null;
}

export function deleteQuiz(id) {
  const all = getQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(KEYS.quizzes, JSON.stringify(all));
  return all;
}

// Small id generator that doesn't rely on crypto in older browsers.
export function makeId() {
  return "q_" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
