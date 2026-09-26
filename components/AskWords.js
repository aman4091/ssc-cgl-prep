"use client";

// 🔎 Naam par click karo — dayein taraf uske baare mein sab aa jata hai.
//
// Text ke andar jo NAAM hain (Hornbill Festival, ISRO, Sardar Vallabhbhai
// Patel) unhe click karne layak bana deta hai. Click par SelectAsk ka wahi
// panel khulta hai jo select karne par khulta tha — DeepSeek ka jawab aur
// Wikipedia ki tasveer, dono apne aap.
//
// Kaam ke liye sirf ek cheez chahiye: text. Isliye ise kahin bhi lagaya ja
// sakta hai —
//     <p><AskWords>{fact.main}</AskWords></p>
//
// Naam kaise pehchaante hain: bade akshar se shuru hone wale shabd, aur agar
// aise shabd saath-saath hon to poora tukda ek naam ("Hornbill Festival").
// Akela shabd tabhi click hota hai jab wo neeche wali aam-shabdon ki list
// mein na ho — warna har vaakya ka pehla shabd click hone layak ban jata.

import { useMemo } from "react";

// Ye bade akshar se shuru zaroor hote hain (vaakya ki shuruaat), par naam
// nahi hain.
const STOP = new Set([
  "The", "This", "That", "These", "Those", "There", "Then", "They", "Them", "Their",
  "It", "Its", "He", "She", "His", "Her", "We", "You", "Your", "I", "A", "An",
  "In", "On", "At", "To", "For", "From", "With", "And", "But", "Or", "So", "If",
  "When", "Where", "What", "Why", "How", "Who", "Which", "All", "Any", "Both",
  "Not", "No", "Yes", "Now", "New", "Old", "One", "Two", "Three", "First", "Last",
  // Hinglish
  "Ye", "Yeh", "Wo", "Woh", "Is", "Isme", "Isko", "Iska", "Iski", "Isne", "Iske",
  "Uska", "Uski", "Usko", "Uske", "Inka", "Inke", "Inki", "Unke", "Unki", "Inhe",
  "Unka", "Jo", "Ek", "Aur", "Par", "Se", "Ko", "Ka", "Ke", "Ki", "Hai", "Hain",
  "Tha", "Thi", "The", "Yaad", "Note", "Answer", "Kyun", "Trick", "Matlab",
  "Sirf", "Bas", "Phir", "Fir", "Lekin", "Kyunki", "Isliye", "Agar", "Jab",
  // Site ke apne shabd — inpar click ka koi matlab nahi
  "SSC", "CGL", "PYQ", "GS", "CA", "Exam", "Shift", "Question", "Fact",
]);

// Bade akshar wale shabd, aur beech mein aane wale chhote jodne wale shabd
// (King *of* Chemicals, Battle *of* Plassey).
//
// Jaan-boojh kar sirf EK aage tak: "Hornbill Festival Nagaland" ko poora ek
// naam maan lena galat hai — wahan do alag naam hain. Do-do karke todne par
// "Hornbill Festival" aur "Nagaland" dono apne-apne click ban jaate hain.
const TERM = /[A-Z][A-Za-z'’.-]*(?:\s+(?:of|the|de|el|and|&|ka|ke|ki)\s+[A-Z][A-Za-z'’.-]*|\s+[A-Z][A-Za-z'’.-]*)?/g;

function splitTerms(text) {
  const src = String(text || "");
  const out = [];
  let at = 0;
  TERM.lastIndex = 0;
  let m;
  while ((m = TERM.exec(src))) {
    // Aakhir mein laga full-stop / comma naam ka hissa nahi.
    let term = m[0].replace(/[.,;:'’-]+$/, "");
    if (!term) continue;
    const words = term.split(/\s+/);
    const ok = words.length > 1
      ? true
      : term.length >= 4 && !STOP.has(term);
    if (!ok) continue;
    if (m.index > at) out.push({ t: src.slice(at, m.index) });
    out.push({ term });
    at = m.index + term.length;
  }
  if (at < src.length) out.push({ t: src.slice(at) });
  return out;
}

// Sirf naam nikaalo — tasveer dhoondhne ke liye kaam ka sawaal banane mein
// (SelectAsk) is se pata chalta hai ki follow-up kis cheez ke baare mein hai.
export function termsOf(text) {
  return splitTerms(text).filter((x) => x.term).map((x) => x.term);
}

// Panel kholne ki khabar. SelectAsk (layout mein baitha hua) isse sunta hai —
// isliye AskWords ko us panel ke baare mein kuch jaanna nahi padta.
export function askTerm(text) {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent("cgl:ask-term", { detail: { text: String(text || "") } })); }
  catch { /* ignore */ }
}

export default function AskWords({ children }) {
  const parts = useMemo(() => splitTerms(children), [children]);
  return (
    <>
      {parts.map((p, i) => (
        p.term
          ? (
            <button
              key={i}
              type="button"
              className="askword"
              title={`${p.term} — iske baare mein dekho`}
              // Recall ka poora card khud ek click-patti hai (tap karo to
              // jawab khulta hai) — naam par click use nahi chhedna chahiye.
              onClick={(e) => { e.stopPropagation(); askTerm(p.term); }}
            >{p.term}</button>
          )
          : <span key={i}>{p.t}</span>
      ))}
    </>
  );
}
