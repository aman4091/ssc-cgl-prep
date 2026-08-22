"use client";

import { Suspense } from "react";
import AnswersBoard from "@/components/AnswersBoard";

// 🔴 Mistake Notebook — ab Answers ke saath ek hi page hai.
//
// Alag page rakhne ka koi matlab nahi bacha tha: dono ek hi kaam karte the,
// bas question aane ki jagah alag thi (screenshot wale mock, aur quiz mein
// galat hue). Ab dono ek board par hain aur upar ke dropdown se chhante jaate
// hain — poora kaam components/AnswersBoard.js mein.
//
// /mistakes zinda isliye hai ki menu, planner aur aadhi site ke link yahin
// aate hain. Ye wahi board hai, bas dropdown pehle se "PYQ / Quiz" par aur
// subject "Sab" — yaani jo pehle yahan dikhta tha, bilkul wahi.

export default function MistakesPage() {
  return (
    <Suspense fallback={<div className="ansp"><div className="ansp__main" /></div>}>
      <AnswersBoard defaultSrc="pyq" defaultSubject="all" />
    </Suspense>
  );
}
