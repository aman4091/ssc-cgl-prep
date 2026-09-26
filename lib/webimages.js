"use client";

// 🖼 Tasveer — Wikipedia aur Wikimedia Commons se.
//
// Google ka Images API paid hai (aur key chahiye), isliye wo nahi. Wikipedia
// ka API muft hai, key nahi maangta, aur `origin=*` ke saath browser se
// seedha chalta hai — matlab koi server route nahi, koi paisa nahi.
//
// Do jagah se aata hai:
//   1. Wikipedia ke ARTICLE ki apni mukhya tasveer — "Ghoomar" jaisi cheez
//      par sabse sahi wahi hoti hai.
//   2. Commons mein usi naam ki files — ek se zyada photo chahiye to.
// Dono milakar, ek hi tasveer do baar na aaye.

const WIKI = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Wikipedia ne ${r.status} bheja`);
  return r.json();
}

// Selected text poora vaakya ho sakta hai; search ke liye shuru ke kuch shabd
// hi kaam ke hain.
export function imageQuery(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ")
    .slice(0, 90);
}

async function fromWiki(q) {
  const url = `${WIKI}?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=4`
    + "&prop=pageimages&piprop=thumbnail%7Coriginal&pithumbsize=400&format=json&origin=*";
  const d = await getJson(url);
  const pages = Object.values((d && d.query && d.query.pages) || {});
  // `index` wahi kram hai jo search ne diya tha — object ki chaabi se nahi.
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));
  return pages
    .filter((p) => p.thumbnail && p.thumbnail.source)
    .map((p) => ({
      thumb: p.thumbnail.source,
      full: (p.original && p.original.source) || p.thumbnail.source,
      title: p.title,
      page: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, "_"))}`,
    }));
}

async function fromCommons(q) {
  const url = `${COMMONS}?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}`
    + "&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=360&format=json&origin=*";
  const d = await getJson(url);
  const pages = Object.values((d && d.query && d.query.pages) || {});
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));
  return pages
    .map((p) => {
      const ii = (p.imageinfo || [])[0];
      if (!ii || !ii.thumburl) return null;
      // Sirf photo — pdf/svg/ogv jaisi cheezein grid mein bekaar lagti hain.
      // Naam ke baad Wikimedia apna `?utm_source=…` jodta hai, isliye pehle
      // wo kaat do — warna ye jaanch har baar fail hoti hai aur Commons ka
      // poora hissa chup-chaap gir jata hai.
      const name = String(ii.url || "").split("?")[0];
      if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) return null;
      return {
        thumb: ii.thumburl,
        full: ii.url,
        title: String(p.title || "").replace(/^File:/, ""),
        page: ii.descriptionurl || ii.url,
      };
    })
    .filter(Boolean);
}

// Dono jagah se, ek saath. Ek gir jaye to doosri se hi kaam chal jata hai.
export async function searchImages(text) {
  const q = imageQuery(text);
  if (!q) return [];
  const [a, b] = await Promise.all([
    fromWiki(q).catch(() => []),
    fromCommons(q).catch(() => []),
  ]);
  const seen = new Set();
  const out = [];
  for (const im of [...a, ...b]) {
    const k = im.full || im.thumb;
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(im);
    if (out.length >= 10) break;
  }
  return out;
}
