"use client";

// 🧹 Fact log ki "Saaf karo" — ab APNE AAP (owner).
//
// Fact log khulte hi (aur cluster fact log mein bhejte hi) jin facts ki saaf
// shakl (fmt) nahi bani aur jo chipka hua lamba paragraph hain, unhe ek-ek
// karke DeepSeek se sirf SHAKL ke liye bhejte hain (app/api/format-fact) —
// fact ek bhi nahi badalta. Ek fact par ek hi baar; jawab fmt mein bachta hai
// aur wahi har jagah final dikhta hai (lib/missionfacts factView).
//
// Ek waqt mein ek hi daud; jo fact fail ho wo is session mein dobara nahi.

import { formatFact } from "./client-ai";
import { getFacts, setFactFmt } from "./missionfacts";
import { getSettings } from "./storage";

export function needsTidy(f) {
  if (!f || f.fmt) return false;
  const t = String(f.text || "").trim();
  if (!t || t.length < 140) return false;                       // chhota hai, padh lo
  if (t.indexOf(String.fromCharCode(10)) >= 0) return false;    // pehle se alag lines
  return true;                                                  // ek chipka hua paragraph
}

let running = false;
const failed = new Set();

export async function autoTidyFacts() {
  if (running || typeof window === "undefined") return;
  if (!String(getSettings().apiKey || "").trim()) return;       // key nahi to chupchap
  running = true;
  try {
    for (let guard = 0; guard < 300; guard++) {
      const f = getFacts().find((x) => needsTidy(x) && !failed.has(x.id));
      if (!f) break;
      try {
        const { text } = await formatFact(f.text || "");
        if (String(text || "").trim()) setFactFmt(f.id, text);
        else failed.add(f.id);
      } catch {
        failed.add(f.id);
      }
    }
  } finally {
    running = false;
  }
}
