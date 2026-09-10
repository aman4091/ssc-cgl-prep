// 🚨 Panic button ki videos R2 par — `npm run panic:upload`.
//
// Instagram downloader ki gallery mein jo post "Instant" mein daali gayi, wahi
// panic button chalata hai. Ye script us folder ki har video/photo ko R2 ke
// panic/ folder mein daalti hai aur ek panic/index.json likhti hai — site
// (/api/panic) wahi list padhti hai.
//
// Dobara chalana safe hai: jo file R2 par pehle se usi size ki padi hai wo
// skip hoti hai, sirf nayi jaati hain. Folder se koi post hata di to wo index
// se bhi hat jaati hai (R2 par file padi rehti hai, par dikhegi nahi).
//
//   npm run panic:upload
//   npm run panic:upload -- --src "E:\kahin\aur\Instant"
//
// lib/r2server.js ESM hai par package CommonJS, isliye test-sync.mjs ki tarah
// source ko ek temp .mjs mein copy karke import karte hain — SigV4 wahi ek jagah.
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const DOWNLOADER = "D:\\insta-saved-downloader";
const argSrc = process.argv.indexOf("--src");
const SRC = argSrc > -1 ? process.argv[argSrc + 1] : join(DOWNLOADER, "sorted", "Instant");
const META = join(DOWNLOADER, "metadata.jsonl");
const PREFIX = "panic";
const PARALLEL = 3;

const TYPES = {
  ".mp4": ["video", "video/mp4"],
  ".jpg": ["image", "image/jpeg"],
  ".jpeg": ["image", "image/jpeg"],
  ".png": ["image", "image/png"],
  ".webp": ["image", "image/webp"],
};

// .env.local -> process.env (Next ke bahar koi use padhta nahi).
const envFile = new URL("../.env.local", import.meta.url);
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const src = readFileSync(new URL("../lib/r2server.js", import.meta.url), "utf8");
const tmp = join(mkdtempSync(join(tmpdir(), "r2server-")), "r2server.mjs");
writeFileSync(tmp, src);
const { r2Config, r2Put } = await import(pathToFileURL(tmp).href);

const cfg = r2Config();
if (!cfg.ok) {
  console.error("R2 configured nahi hai — .env.local mein R2_* vars chahiye.");
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`Folder nahi mila: ${SRC}`);
  process.exit(1);
}

// shortcode -> kisne daala, caption. Ek post collection mein bhi ho to do line
// hoti hain — pehli kaafi hai.
const meta = new Map();
if (existsSync(META)) {
  for (const line of readFileSync(META, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      if (d.shortcode && !meta.has(d.shortcode)) meta.set(d.shortcode, d);
    } catch { /* ek kharab line poori list na roke */ }
  }
}

// "2026-08-29_DcoDE2iBqjE_2.mp4" -> { code: "DcoDE2iBqjE", part: 2 }
function parseName(name) {
  const stem = basename(name, extname(name));
  const m = stem.match(/^\d{4}-\d{2}-\d{2}_(.+?)(?:_(\d+))?$/);
  return m ? { code: m[1], part: m[2] ? Number(m[2]) : 0 } : { code: stem, part: 0 };
}

const files = readdirSync(SRC)
  .filter((n) => TYPES[extname(n).toLowerCase()])
  .sort();

const publicUrl = (key) => `${cfg.publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function alreadyThere(key, size) {
  try {
    const res = await fetch(publicUrl(key), { method: "HEAD" });
    return res.ok && Number(res.headers.get("content-length")) === size;
  } catch {
    return false;
  }
}

let uploaded = 0, skipped = 0, failed = 0;
// shortcode -> { part -> {type,url} }. Carousel ke 13 photo 13 alag item
// nahi, EK post hain — shuffle mein bikhar jaate to unka kram hi toot jata.
const posts = new Map();

async function handle(name) {
  const full = join(SRC, name);
  const [type, contentType] = TYPES[extname(name).toLowerCase()];
  const key = `${PREFIX}/${name}`;
  const size = statSync(full).size;
  const { code, part } = parseName(name);

  if (await alreadyThere(key, size)) {
    skipped++;
  } else {
    try {
      await r2Put(key, readFileSync(full), contentType);
      uploaded++;
      console.log(`  ↑ ${name}  (${(size / 1048576).toFixed(1)} MB)`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${name}  ${e.message}`);
      return;
    }
  }
  if (!posts.has(code)) posts.set(code, new Map());
  posts.get(code).set(part, { type, url: publicUrl(key) });
}

console.log(`\n${files.length} file mili: ${SRC}\n`);
for (let i = 0; i < files.length; i += PARALLEL) {
  await Promise.all(files.slice(i, i + PARALLEL).map(handle));
}

if (failed) {
  // Adhoori list upload karne se achha purani hi rahe — dobara chalao, sirf
  // bachi hui jaayengi.
  console.log(`\n${failed} file fail hui — index.json nahi badla. Script dobara chalao.`);
  process.exit(1);
}

// { id, username, caption, media: [{type, url}, …] } — media carousel ke kram mein.
const items = [...posts.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, parts]) => {
    const m = meta.get(code) || {};
    return {
      id: code,
      username: m.username || "",
      caption: String(m.caption || "").slice(0, 200),
      media: [...parts.entries()].sort(([a], [b]) => a - b).map(([, v]) => v),
    };
  });
const index = { updated: new Date().toISOString(), items };
await r2Put(`${PREFIX}/index.json`, Buffer.from(JSON.stringify(index)), "application/json");

console.log(`\nHo gaya — ${uploaded} upload, ${skipped} pehle se thi. index.json mein ${items.length} post.`);
