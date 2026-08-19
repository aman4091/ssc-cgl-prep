"use client";

import { createContext, useContext } from "react";

// Test chal raha hai ya nahi — ye khabar QBoard se seedhe question card tak
// jaati hai.
//
// Prop se nahi bhej sakte: card ko QBoard nahi, PAGE banata hai (renderCard),
// aur aise aath page hain. Context se ek jagah likho, teeno card khud padh
// lete hain, aur baaki jagah (jahan koi test nahi hai) context hai hi nahi to
// card apne purane tareeke se chalta hai.
//
//   locked    = timer chal raha hai. Jawab abhi mat batao — na sahi/galat ka
//               rang, na answer block, na "Saved to Wrong" wali line. Bas
//               chuna hua option neela dikhe. Quiz aisa hi hota hai; warna
//               timer ka koi matlab hi nahi rehta.
//   revealAll = Submit ho gaya. Ab har question ka answer khol do — jo chhoda
//               tha usme bhi.
const ExamModeContext = createContext(null);

export const ExamModeProvider = ExamModeContext.Provider;

export function useExamMode() {
  return useContext(ExamModeContext);
}
