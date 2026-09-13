import MissionToday from "@/components/MissionToday";
import TodayGate from "@/components/TodayGate";

// Homepage = "abhi kya karna hai".
//
// Sabse upar CGL Mission (18 din, exam tak): clock ke hisaab se ABHI ka kaam,
// uska seedha button, aur din ki poori timeline. Neeche pehle wala "Aaj ka
// kaam" (TodayGate) — roz ke question ki ginti aur Weak Topics — jaisa tha.
//
// Notes/vocab ka feed ab bhi yahan nahi aata: homepage kholte hi padhne ki
// cheez saamne ho to din bina ek bhi question kiye nikal jata tha. Notes menu
// ke 📚 Notes group mein hain, vocab /vocab par.
export default function Home() {
  return (
    <>
      <MissionToday />
      <div className="section" style={{ marginTop: 28 }}>
        <TodayGate />
      </div>
    </>
  );
}
