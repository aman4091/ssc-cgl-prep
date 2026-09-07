"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getQuizzes } from "@/lib/storage";

// 🔄 "Quiz jahan chhoda tha" — reference build ka floating resume chip.
//
// Submit hote hi quiz delete ho jata hai (app/quizzes/[id] ka onSubmit), isliye
// storage mein bacha hua koi bhi quiz iska matlab hai ki wo BEECH mein chhoda
// gaya tha. Sabse naya wahi hai jise abhi haath laga (saveQuiz naye ko sabse
// aage rakhta hai). Uska chuna hua option/review/position QBoard khud
// `_progress` mein bachata hai, isliye yahan sirf ginti dikhani hai.
export default function ResumeQuiz() {
  const pathname = usePathname();
  const router = useRouter();
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    const check = () => setQuiz(getQuizzes()[0] || null);
    check();
    const id = setInterval(check, 4000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", check);
    };
  }, []);

  // Test ke dauraan (exam-on) aur usi quiz ke apne page par chip dikhane ka
  // koi matlab nahi — wahin to bacha hai.
  if (!quiz) return null;
  if (pathname === `/quizzes/${quiz.id}`) return null;

  const doneN = quiz._progress ? Object.keys(quiz._progress.picks || {}).length : 0;
  const total = quiz.questions?.length || 0;

  return (
    <button className="hresume" onClick={() => router.push(`/quizzes/${quiz.id}`)}>
      🔄 Quiz jahan chhoda tha
      <span>({doneN}/{total})</span>
    </button>
  );
}
