import Link from "next/link";
import MissionToday from "@/components/MissionToday";
import TodayGate from "@/components/TodayGate";

// Homepage = "abhi kya karna hai".
//
// Sabse upar CGL Mission ka FOCUS view: ek patli line, ABHI ka ek kaam poori
// screen par, aur neeche band pada "Aaj ka din".
//
// Purana "Aaj ka kaam" (TodayGate — roz ke question ki ginti, weak topics,
// mock check) ab ek band fold ke andar hai. Wo gaya nahi, bas default view se
// hata: Home kholte hi do dashboard saamne aayein to "ek screen, ek kaam" ka
// matlab hi khatam ho jata hai. Ek tap par poora ka poora wahi hai.
//
// Fact log aur "Zaroori baatein" ki pattiyan yahan se hata di gayi hain: fact
// log ki ginti ab usi 08:00 wale revision block ke andar dikhti hai jahan wo
// kaam hai, aur Zaroori baatein menu mein hai. Home par ek waqt ek hi cheez.
//
// Notes/vocab ka feed ab bhi yahan nahi aata: homepage kholte hi padhne ki
// cheez saamne ho to din bina ek bhi question kiye nikal jata tha. Notes menu
// ke 📚 Notes group mein hain, vocab /vocab par.
export default function Home() {
  return (
    <>
      <MissionToday />
      {/* ⚡ Sprint — ek hi button, kyunki Home par ek waqt ek hi cheez.
          Jab din ka kaam poora ho jaye ya sirf question peelne ho, ye ek tap
          door hai (owner ne kaha "iska button homepage par bhi de do"). */}
      <div className="section" style={{ marginTop: 14 }}>
        <Link href="/pyq/sprint" className="btn btn--primary">⚡ Sprint — 100 Q, 1 ghanta</Link>
      </div>
      <div className="section" style={{ marginTop: 18 }}>
        <details className="fold">
          <summary className="fold__hd">Aaj ka kaam — question ki ginti</summary>
          <div className="fold__body"><TodayGate /></div>
        </details>
      </div>
    </>
  );
}
