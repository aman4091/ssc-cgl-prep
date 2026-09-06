"use client";

import { Suspense } from "react";
import AnswersBoard from "@/components/AnswersBoard";

// 📖 Answers — ab Mistake Notebook bhi isi page par hai.
//
// Poora kaam components/AnswersBoard.js mein hai, kyunki /mistakes bhi wahi
// board kholta hai (bas dropdown pehle se "PYQ / Quiz" par). Do URL, ek page —
// purane link, bookmark aur menu sab jaise the waise chalte rehte hain.
//
// Yahan bina kisi param ke aane par: 🧮 Maths shelf, aur dropdown "External
// Mock (screenshot)" par — yaani sirf wrong book, "Sab" nahi. Wajah: overlay
// (Mock Test Helper) ka right-edge panel isi wrong book se apna kram leta hai,
// PYQ/quiz ke galat question use pata hi nahi chalte (unki koi image/qid nahi
// hoti). "Sab" default hone par is page ka Question 1 aksar koi purana quiz-
// mistake hota, jo overlay ke Question 1 se kabhi match nahi karta — dropdown
// se "Sab" chun kar wo dono ab bhi ek saath dekhe ja sakte hain.

export default function AnswersPage() {
  // useSearchParams ko Suspense chahiye, warna poora route static rendering se
  // bahar ho jata hai.
  return (
    <Suspense fallback={<div className="ansp"><div className="ansp__main" /></div>}>
      <AnswersBoard defaultSrc="mock" defaultSubject="math" />
    </Suspense>
  );
}
