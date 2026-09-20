"use client";

// 🖥️ Overlay se baat — 127.0.0.1 par chalta Mock Test Helper (D:\over).
//
// /ai-run ko iski zaroorat hai kyunki browser khud wo nahi kar sakta jo is
// flow mein chahiye: Gemini COOP bhejta hai, isliye site ka khola hua tab
// uske haath se nikal jata hai — na band kar sakti hai, na dobara use. Overlay
// ke paas clipboard, tab aur Ctrl+W teeno hain.
//
// Overlay band ho to kuch tootta nahi: page khud clipboard par copy karke tab
// khol deta hai aur jawab tum paste kar dete ho (page ka apna manual mode).

const PORTS = [5000, 5001, 5002];   // overlay ka pick_port busy hone par aage

let base = "";           // jis port par mila tha
let lastTry = 0;

async function tryPort(port, timeoutMs = 700) {
  const url = `http://127.0.0.1:${port}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${url}/run/answer`, { cache: "no-store", signal: ctl.signal });
    return r.ok ? url : "";
  } catch { return ""; }
  finally { clearTimeout(t); }
}

/** -> overlay ka base URL, ya "" (mila hi nahi). 10s tak yaad rakhta hai. */
export async function overlayBase() {
  if (base && Date.now() - lastTry < 10000) return base;
  for (const p of PORTS) {
    // eslint-disable-next-line no-await-in-loop
    const u = await tryPort(p);
    if (u) { base = u; lastTry = Date.now(); return u; }
  }
  base = "";
  lastTry = Date.now();
  return "";
}

/** Ek question overlay ko: clipboard + AI site + jawab ka intezaar. */
export async function overlayAsk({ text = "", imageB64 = "", imageUrl = "", subject = "" }) {
  const b = await overlayBase();
  if (!b) return false;
  try {
    const r = await fetch(`${b}/run/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, image_b64: imageB64, image_url: imageUrl, subject }),
    });
    return r.ok;
  } catch { return false; }
}

/** -> { ready, text } — jawab aaya ya nahi (aaya to ek hi baar milega). */
export async function overlayAnswer() {
  const b = base || (await overlayBase());
  if (!b) return { ready: false, text: "" };
  try {
    const r = await fetch(`${b}/run/answer`, { cache: "no-store" });
    if (!r.ok) return { ready: false, text: "" };
    return await r.json();
  } catch { return { ready: false, text: "" }; }
}

export async function overlayStop() {
  const b = base;
  if (!b) return;
  try { await fetch(`${b}/run/stop`, { method: "POST" }); } catch { /* band hoga */ }
}

/** Blob -> base64 (overlay ko tasveer isi shakl mein jati hai). */
export function blobToB64(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result || "").split(",").pop());
    fr.onerror = () => rej(new Error("image padha nahi gaya"));
    fr.readAsDataURL(blob);
  });
}
