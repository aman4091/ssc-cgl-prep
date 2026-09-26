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

// Badi tasveer ke liye asli file (kai MB ki ho sakti hai) nahi — Wikimedia
// ka apna 1280px wala roop. Pata wahi hota hai, bas "360px-" ki jagah
// "1280px-". Ye dhaancha na mile to asli file hi sahi.
function bigOf(thumb, full) {
  const t = String(thumb || "");
  return /\/\d+px-/.test(t) ? t.replace(/\/\d+px-/, "/1280px-") : (full || t);
}

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
  // Par jis article ka naam THEEK wahi hai jo maanga tha, wo sabse pehle:
  // "Hornbill Festival" dhoondhne par Wikipedia pehle "Hornbill" (chidiya)
  // laata hai, aur pehli tasveer chidiya ki aa jati thi.
  const want = q.trim().toLowerCase();
  const exact = (x) => (String(x.title || "").toLowerCase() === want ? 0 : 1);
  pages.sort((a, b) => exact(a) - exact(b) || (a.index || 0) - (b.index || 0));
  // Sabse sahi article ke paas apni tasveer hai ya nahi — searchImages isi se
  // tay karta hai ki pehle Wikipedia dikhaye ya Commons. ("Hornbill Festival"
  // ka article hai par uspar koi lead image nahi; bina is jaanch ke pehli
  // tasveer "Hornbill" chidiya ki aa jati thi.)
  const top = pages[0];
  const topHasImage = !!(top && top.thumbnail && top.thumbnail.source);
  const list = pages
    .filter((p) => p.thumbnail && p.thumbnail.source)
    .map((p) => ({
      thumb: p.thumbnail.source,
      big: bigOf(p.thumbnail.source, p.original && p.original.source),
      full: (p.original && p.original.source) || p.thumbnail.source,
      title: p.title,
      page: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, "_"))}`,
    }));
  return { list, topHasImage };
}

// Commons ka search file ke ANDAR ka likha hua bhi dekhta hai, isliye
// "Hornbill Festival" par kisi gaanv ki photo bhi aa jati thi. Pehle sirf
// FILE KE NAAM mein poora naam dhoondhte hain (intitle:"…") — wahi sabse
// saaf milta hai. Kuch na mile tabhi aam search.
async function commonsHits(q, exact) {
  const search = exact ? `intitle:"${q}"` : q;
  const url = `${COMMONS}?action=query&generator=search&gsrsearch=${encodeURIComponent(search)}`
    + "&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=360&format=json&origin=*";
  const d = await getJson(url);
  return Object.values((d && d.query && d.query.pages) || {});
}

async function fromCommons(q) {
  let pages = await commonsHits(q, true).catch(() => []);
  if (!pages.length) pages = await commonsHits(q, false).catch(() => []);
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
        big: bigOf(ii.thumburl, ii.url),
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
  const [w, c] = await Promise.all([
    fromWiki(q).catch(() => ({ list: [], topHasImage: false })),
    fromCommons(q).catch(() => []),
  ]);
  // Sabse sahi article par apni tasveer ho to wahi sabse pehle. Na ho to
  // Commons pehle — warna Wikipedia ka DOOSRA (aksar galat) article upar
  // aa jata hai.
  const order = w.topHasImage ? [...w.list, ...c] : [...c, ...w.list];
  const seen = new Set();
  const out = [];
  for (const im of order) {
    const k = im.full || im.thumb;
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(im);
    if (out.length >= 10) break;
  }
  return out;
}
