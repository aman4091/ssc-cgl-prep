// ↩️ "Jahan se aaye the" — quiz band karne par wahi jagah wapas.
//
// Quiz ka Exit hamesha /answers par le jata tha. Wo tab likha gaya tha jab quiz
// sirf Answers se hi khulte the. Ab wo har jagah se khulte hain — vocab ke din
// se, homepage ki ring se, notes se, Quiz Bank se — aur har baar Answers par
// pahunchna sirf raasta bhatakna hai. Vocab ka din poora karke Answers par aa
// jana to seedha kaam todta hai: wapas us din tak pahunchne mein hi mann ud
// jata hai.
//
// Isliye ek chhota sa yaaddasht: jo bhi aakhri "aam" page khula tha wo yaad
// rehta hai, aur quiz ka Exit wahin lauta deta hai. Khud quiz ke page yaad
// nahi rakhe jaate — warna quiz se nikalne par wahi quiz wapas khul jata.
//
// sessionStorage mein hai, localStorage mein nahi: ye is TAB ka raasta hai,
// data nahi. Doosre tab (ya doosre device) par iska koi matlab nahi, aur na hi
// ise sync hona chahiye.

const KEY = "cgl.backto";

// Ye page "kahan se aaye the" ban hi nahi sakte — ye khud quiz wale parde hain.
const SKIP = ["/quizzes/", "/wrong/solve"];

export const isQuizPath = (path) => SKIP.some((p) => String(path || "").startsWith(p));

export function rememberPath(path) {
  if (!path || isQuizPath(path)) return;
  try { sessionStorage.setItem(KEY, path); } catch { /* private mode */ }
}

// Seedhe link se aaye ho (ya tab naya ho) to yaaddasht khaali hogi — tab
// fallback. Isliye har jagah fallback wahi rakhna jo us surat mein sabse theek
// ho, /answers nahi.
export function backTo(fallback = "/") {
  try { return sessionStorage.getItem(KEY) || fallback; } catch { return fallback; }
}
