"use client";

// Text ke andar ke NAAM nikaalna (Hornbill Festival, ISRO, Konark Temple).
//
// Iska ek hi kaam bacha hai: 💬 Poochho panel mein follow-up sawaal ki
// tasveer kis cheez ki dhoondhein, ye tay karna — "Konark Temple kab bana?"
// se "Konark Temple".
//
// Naam kaise pehchaante hain: bade akshar se shuru hone wale shabd, aur agar
// aise do shabd saath-saath hon to unka joda ek naam. Akela shabd tabhi jab
// wo neeche wali aam-shabdon ki list mein na ho.

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
  "Tha", "Thi", "Yaad", "Note", "Answer", "Kyun", "Trick", "Matlab",
  "Sirf", "Bas", "Phir", "Fir", "Lekin", "Kyunki", "Isliye", "Agar", "Jab",
  "Samjhao", "Batao", "Kya", "Kaise", "Kab", "Kahan", "Kaun",
  // Site ke apne shabd — inpar tasveer dhoondhne ka koi matlab nahi
  "SSC", "CGL", "PYQ", "GS", "CA", "Exam", "Shift", "Question", "Fact",
]);

// Bade akshar wale shabd, aur beech mein aane wale chhote jodne wale shabd
// (King *of* Chemicals, Battle *of* Plassey).
//
// Jaan-boojh kar sirf EK aage tak: "Hornbill Festival Nagaland" ko poora ek
// naam maan lena galat hai — wahan do alag naam hain.
const TERM = /[A-Z][A-Za-z'’.-]*(?:\s+(?:of|the|de|el|and|&|ka|ke|ki)\s+[A-Z][A-Za-z'’.-]*|\s+[A-Z][A-Za-z'’.-]*)?/g;

export function termsOf(text) {
  const src = String(text || "");
  const out = [];
  TERM.lastIndex = 0;
  let m;
  while ((m = TERM.exec(src))) {
    // Aakhir mein laga full-stop / comma naam ka hissa nahi.
    const term = m[0].replace(/[.,;:'’-]+$/, "");
    if (!term) continue;
    const words = term.split(/\s+/);
    if (words.length > 1 || (term.length >= 4 && !STOP.has(term))) out.push(term);
  }
  return out;
}
