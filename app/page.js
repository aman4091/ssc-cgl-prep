import TodayGate from "@/components/TodayGate";

// Homepage ab sirf "Aaj ka kaam" hai.
//
// Pehle yahan notes/vocab ka feed tha — homepage kholte hi padhne ki cheez
// saamne. Exam sar par hai aur wahi feed sabse bada risaav nikla: page khulta
// tha, notes khul jaate the, aur din bina ek bhi question kiye nikal jata tha.
//
// Notes kahin gaye nahi — menu ke 📚 Notes group mein pehle jaise hain, aur
// vocab /vocab par. Bas ab wo homepage par saamne nahi aate; homepage sirf
// itna poochta hai ki aaj ke question hue ya nahi.
export default function Home() {
  return <TodayGate />;
}
