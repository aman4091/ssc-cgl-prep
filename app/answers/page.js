"use client";

import { Suspense } from "react";
import AnswersBoard from "@/components/AnswersBoard";

// 📖 Answers — ab Mistake Notebook bhi isi page par hai.
//
// Poora kaam components/AnswersBoard.js mein hai, kyunki /mistakes bhi wahi
// board kholta hai (bas dropdown pehle se "PYQ / Quiz" par). Do URL, ek page —
// purane link, bookmark aur menu sab jaise the waise chalte rehte hain.
//
// Bina kisi param ke: 🧮 Maths, aur SAB (screenshot wale bhi, quiz ke
// galat bhi). Pehle yahan default "External Mock" tha — us alag shelf ke
// saath. Wo chhaanti hata di gayi, aur default uske saath reh gaya to menu
// se koi bhi subject dabane par page khali khulta tha (us subject ka koi
// screenshot na ho to kuch dikhta hi nahi).

export default function AnswersPage() {
  // useSearchParams ko Suspense chahiye, warna poora route static rendering se
  // bahar ho jata hai.
  return (
    <Suspense fallback={<div className="ansp"><div className="ansp__main" /></div>}>
      <AnswersBoard defaultSrc="all" defaultSubject="math" />
    </Suspense>
  );
}
