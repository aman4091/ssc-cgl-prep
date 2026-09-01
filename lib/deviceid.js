// Is device ki pehchaan — ek hi jagah, taaki sync aur counter dono ek hi naam
// se is device ko pukarein.
//
// Pehle ye sirf sync.js ke andar tha. Counter ko bhi iski zaroorat padi (har
// device apni ginti apne khaane mein rakhta hai), aur counter ko sync.js se
// nahi jodna tha — isliye alag file. Key wahi purani hai, isliye jo device
// pehle se sync kar rahe hain unki pehchaan badalti nahi.

const KEY = "cgl.sync.device";   // LOCAL_ONLY — ye kabhi sync nahi hoti

export function deviceId() {
  try {
    let d = localStorage.getItem(KEY);
    if (!d) {
      d = "d_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(KEY, d);
    }
    return d;
  } catch {
    return "d_anon";
  }
}
