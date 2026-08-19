"use client";

import { createContext, useContext } from "react";

// Test aur question card ke beech ka pul.
//
// Prop se nahi bhej sakte: card ko QBoard nahi, PAGE banata hai (renderCard),
// aur aise aath page hain. Context se ek jagah likho, teeno card khud padh
// lete hain, aur baaki jagah (jahan koi test nahi hai) context null hota hai
// to card apne purane tareeke se chalta hai.
//
// QBoard har card ke aas-paas apna alag slot lagata hai, isliye is context ke
// andar us ek question ki baat hoti hai:
//
//   locked    = timer chal raha hai. Jawab abhi mat batao — na sahi/galat ka
//               rang, na answer block, na "Saved to Wrong" wali line. Bas
//               chuna hua option neela dikhe. Quiz aisa hi hota hai; warna
//               timer ka koi matlab hi nahi rehta.
//   revealAll = Submit ho gaya. Har question ka answer khol do — jo chhoda
//               tha usme bhi.
//   pick      = pehle se chuna hua option (solutions dobara khologe to card
//               wahi dikhata hai jo tumne chuna tha). undefined = chhoda hua.
//   onPick    = card ne option chuna. Board isi se palette ka rang, ginti aur
//               natija banata hai — question ka koi key milana nahi padta,
//               kyunki slot ko apna number pehle se pata hai.
const ExamModeContext = createContext(null);

export const ExamModeProvider = ExamModeContext.Provider;

export function useExamMode() {
  return useContext(ExamModeContext);
}
