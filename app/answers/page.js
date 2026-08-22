"use client";

import { Suspense } from "react";
import AnswersBoard from "@/components/AnswersBoard";

// 📖 Answers — ab Mistake Notebook bhi isi page par hai.
//
// Poora kaam components/AnswersBoard.js mein hai, kyunki /mistakes bhi wahi
// board kholta hai (bas dropdown pehle se "PYQ / Quiz" par). Do URL, ek page —
// purane link, bookmark aur menu sab jaise the waise chalte rehte hain.
//
// Yahan bina kisi param ke aane par pehle jaisa hi: 🧮 Maths shelf. Bas
// dropdown "Sab" par khulta hai, isliye usi subject ke quiz-waale galat
// question bhi saath dikh jaate hain.

export default function AnswersPage() {
  // useSearchParams ko Suspense chahiye, warna poora route static rendering se
  // bahar ho jata hai.
  return (
    <Suspense fallback={<div className="ansp"><div className="ansp__main" /></div>}>
      <AnswersBoard defaultSrc="all" defaultSubject="math" />
    </Suspense>
  );
}
