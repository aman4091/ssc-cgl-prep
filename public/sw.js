/* Service worker — haath se likha, koi dependency nahi.
 *
 * next-pwa App Router/Next 16 ke saath nahi chalta, aur serwist Workbox +
 * next.config wrapper + build step le aata hai. Yahan sirf chaar rule chahiye,
 * jo saade JS mein aa jate hain — wahi soch jo lib/r2server.js mein SigV4 khud
 * sign karne ke peeche hai.
 *
 * V badloge to purane caches apne aap saaf ho jayenge.
 */
// V badalte hi purane caches activate par saaf ho jate hain. Jab bhi is file ka
// vyavhaar badle ya purana cache shaq ke ghere mein aaye, ise badha dena.
const V = "v18";
const SHELL = `cgl-shell-${V}`;
const BLOBS = `cgl-r2-${V}`;

// addAll ATOMIC hai — ek bhi URL 404 de to poora precache reject ho jata hai aur
// shell cache khaali reh jata hai (aur .catch() ki wajah se chupchaap). Isliye
// yahan sirf wahi raste rakho jo pakka maujood hain. /wrong hata diya gaya hai —
// ab app /answers par khulti hai.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/answers", "/manifest.webmanifest", "/icon-192.png"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== BLOBS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()).catch(() => {});
  return res;
}

// Question banks (/errorprobank/*.json, /engbank/*.json, …) badalte rehte hain —
// naye chapter judte hain, counts badhte hain. cacheFirst unhe hamesha ke liye
// jama kar leta tha, isliye jis device ne bank ek baar khola, use naya chapter
// kabhi dikhta hi nahi tha. Ab: cache turant do (offline chalta rahe), saath hi
// chupchaap network se laa kar cache badal do — agli baar naya data.
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fresh = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  return hit || (await fresh) || Response.error();
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    // Offline aur ye page cache mein nahi — /answers par gira do, wahi app ka
    // ghar hai (pehle /wrong tha, jo ab maujood hi nahi).
    return (await cache.match(req)) || (await cache.match("/answers")) || Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                     // upload/delete kabhi cache nahi
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  // R2 ki images seedhe pub-*.r2.dev se aati hain. Cross-origin hone ke bawajood
  // cache ho sakti hain — SW opaque response bhi rakh leta hai aur <img> use kar
  // leta hai. Filenames content-addressed hain, isliye cache kabhi stale nahi hoti.
  if (!same) {
    if (/\.r2\.dev$/.test(url.hostname)) e.respondWith(cacheFirst(req, BLOBS));
    return;                                             // Supabase, Gemini, baaki sab — network
  }

  // Ink aur images ka apna proxy (/api/r2/image?url=…) — har upload nayi random
  // key banata hai, to ye URLs immutable hain.
  if (url.pathname === "/api/r2/image") { e.respondWith(cacheFirst(req, BLOBS)); return; }

  // Baaki API kabhi cache nahi — warna purana AI jawab ya toota hua upload milega.
  if (url.pathname.startsWith("/api/")) return;

  // Next ke hashed chunks — immutable. Yahi wo cheez hai jo app ko bina signal
  // ke khulne deti hai.
  if (url.pathname.startsWith("/_next/static/")) { e.respondWith(cacheFirst(req, SHELL)); return; }

  if (req.mode === "navigate") { e.respondWith(networkFirst(req)); return; }

  // JSON = data (question banks, notes index). Kabhi immutable nahi — SWR.
  if (/\.json$/.test(url.pathname)) { e.respondWith(staleWhileRevalidate(req, SHELL)); return; }

  if (/\.(?:png|jpe?g|webp|gif|svg|woff2?|css)$/.test(url.pathname)) {
    e.respondWith(cacheFirst(req, SHELL));
  }
});

// "⬇️ Offline" button yahan URLs bhejta hai. Chhote batches mein, warna 200
// images ek saath tablet ka network chok kar deti hain.
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "PRECACHE_URLS") {
    const port = e.ports && e.ports[0];
    e.waitUntil((async () => {
      const cache = await caches.open(BLOBS);
      const urls = d.urls || [];
      let cached = 0;
      for (let i = 0; i < urls.length; i += 6) {
        await Promise.all(urls.slice(i, i + 6).map(async (u) => {
          try {
            const cross = new URL(u, self.location.origin).origin !== self.location.origin;
            const res = await fetch(u, cross ? { mode: "no-cors" } : undefined);
            if (res && (res.ok || res.type === "opaque")) { await cache.put(u, res.clone()); cached += 1; }
          } catch { /* ek image na utri to poora download na ruke */ }
        }));
        port?.postMessage({ progress: Math.min(i + 6, urls.length), total: urls.length });
      }
      port?.postMessage({ done: true, cached });
    })());
  }
  if (d.type === "PURGE") caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
});
