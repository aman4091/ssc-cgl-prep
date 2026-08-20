// Sthir (deterministic) shuffle.
//
// "All" wali list bank aur chapter ke kram mein aati hai, isliye Set 1 poora ek
// hi chapter ka ban jata tha. Ise milana zaroori hai — par Math.random se NAHI.
//
// Wajah: har set ka natija uske NUMBER par sanjoya jata hai (settests mein
// `chapterKey#setIdx`). Agar har baar list naye kram mein aaye to "Set 3 ka
// natija" har reload par doosre 25 question ka ho jayega — natija, "ho gaya"
// aur dobara-attempt sab bekaar. Isliye kram beej (seed) se banta hai: wahi
// filter, wahi kram — aaj bhi, kal bhi, doosre device par bhi.

// mulberry32 — chhota, tez, aur seed se poori tarah tay.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  let h = 5381;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

// Nayi array, wahi elements — kram beej se tay. Fisher-Yates.
export function seededShuffle(list, seed) {
  const out = [...(list || [])];
  const next = rng(hash(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
