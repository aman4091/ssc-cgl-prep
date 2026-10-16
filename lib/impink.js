// ⭐ IMP — Answers ke har sawaal ka ALAG stylus page (owner): tablet ke ✍️
// writing view mein "⭐ IMP" dabao, jo zaroori lage likho. Natije (result)
// mein dikhta hai — desktop par sawaal ke bagal mein, phone/tablet par sawaal
// aur jawab ke beech.
//
// Wahi ink machinery (lib/ink) — doc ki id "<record id>~imp", aur record par
// alag pointer: impUrl / impAt / impRev / impStrokes / impH / impPrev. Solution
// wali writing (inkUrl…) se bilkul alag, isliye ek doosre ko kabhi nahi dabate.

import { setInk, setImpInk, getWrongById } from "./wrongbook";

export const IMP = "~imp";
export const isImpId = (id) => String(id || "").endsWith(IMP);
const baseId = (id) => String(id).slice(0, -IMP.length);

// Record → lib/ink jaisa "record" (inkUrl/inkRev… ki jagah imp wale).
export function impRec(r) {
  if (!r) return null;
  return { id: `${r.id}${IMP}`, inkUrl: r.impUrl || "", inkRev: r.impRev || 0, inkAt: r.impAt || "", inkPrev: r.impPrev || "" };
}
// pushInk / flushInkQueue ke liye — id dekh kar sahi khaana.
export function inkSetter(id, f) { return isImpId(id) ? setImpInk(baseId(id), f) : setInk(id, f); }
export function inkRecord(id) { return isImpId(id) ? impRec(getWrongById(baseId(id))) : getWrongById(id); }
export const hasImp = (r) => !!(r && (r.impUrl || r.impStrokes));
