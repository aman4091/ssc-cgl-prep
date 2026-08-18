// Ek store ko RECORDS mein todna, aur records se wapas store banana.
//
// KYUN: ab tak har cheez "poora store" thi. Device cloud se kehta tha "meri
// poori list ye hai" — aur us ek vaakya ka matlab hota tha "jo ismein nahi hai
// wo hai hi nahi". Purana device jo 1000 naye question ke baare mein kuch jaanta
// hi nahi tha, wo bhi unke baare mein bayaan de deta tha, aur wo ud jate the.
//
// Per-record sync mein wo vaakya bolna MUMKIN NAHI. Device sirf un records ke
// baare mein bolta hai jo uske paas hain. Jo uske paas nahi, uske baare mein wo
// kuch keh hi nahi sakta — isliye use uda bhi nahi sakta. Yahi asli farak hai,
// koi guard nahi.
//
// Shakl khud value se pehchani jati hai, kisi store ka naam yahan likha NAHI hai:
//
//   [ {id:..}, .. ]        -> har element ek record   ("L#<id>")
//   [ 5, "x", .. ]         -> har element ek record, id = uska apna hash ("L~..")
//   { k: [ .. ] }          -> us list ka har element ek record ("M:k/L#..")
//   { k: value }           -> har key ek record        ("M:k")
//   koi aur                -> poora store ek record    ("B")
//
// Record id mein shakl ghusi hui hai (L / M: / B), isliye sirf ids dekh kar
// wapas jodna mumkin hai — bhale local par wo store abhi khaali ho.

// Device ka apna data — na sync hota hai, na backup mein jata hai.
export const LOCAL_ONLY = new Set([
  "cgl.pomodoro.state", // chalta hua timer
  "cgl.sync.device",    // is device ki pehchaan (doosre device par bekaar)
  "cgl.sync.base",      // v2 ka bacha hua nishan — naya code ise nahi likhta
  // "abhi kaunsa chapter khula hai" — ye DATA nahi, is device ki nazar hai.
  // Ise sync karne ka matlab tha: doosre device par Vocab khula hai, to yahan
  // padhte-padhte screen Vocab par chali jaye. Scroll position ki tarah, ye
  // device ka apna maamla hai.
  "cgl.home.active",
]);

const enc = encodeURIComponent;
const dec = decodeURIComponent;

export function hashStr(s) {
  let h = 5381;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function parse(s) { try { return JSON.parse(s); } catch { return undefined; } }
function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

// List ke element ki pehchaan: apna id ho to wahi, warna uska content.
// Content-hash ka matlab: wahi element dobara aaye to wahi record hai (do baar
// nahi jodta), aur badal jaye to naya record ban kar purana hat jata hai.
function elemKey(el) {
  const id = isObj(el) ? (el.id ?? el.key ?? el.slug) : null;
  return id != null ? "L#" + enc(String(id)) : "L~" + hashStr(JSON.stringify(el));
}

// Ek hi list mein bilkul ek jaisi do cheezein ho sakti hain (do baar wahi
// timing, wahi id do baar). Dono ka record id ek hi banta, aur Map mein doosri
// pehli ko kha jati — yaani sync har baar ek entry GIRA deta, aur store har baar
// "badla hua" dikhta (jisse page baar-baar reload hota). Isliye dohraav par
// ginti jodi jati hai: pehli waisi hi, doosri "~2", teesri "~3".
function put(out, key, val) {
  if (!out.has(key)) { out.set(key, val); return; }
  let n = 2;
  while (out.has(`${key}~${n}`)) n++;
  out.set(`${key}~${n}`, val);
}

// storeJson (string) -> Map<recordId, value>. Kram wahi jo store mein tha.
export function shred(storeJson) {
  const out = new Map();
  if (storeJson == null) return out;
  const v = parse(storeJson);
  if (v === undefined) { out.set("B", storeJson); return out; }   // JSON hai hi nahi
  if (Array.isArray(v)) {
    for (const el of v) put(out, elemKey(el), el);
    return out;
  }
  if (isObj(v)) {
    for (const k of Object.keys(v)) {
      const child = v[k];
      // Khaali list ko todne se kuch nahi milta, aur uska record baad mein
      // hatana padta — isliye khaali list poori key ke saath ek hi record hai.
      if (Array.isArray(child) && child.length) {
        for (const el of child) put(out, "M:" + enc(k) + "/" + elemKey(el), el);
      } else {
        put(out, "M:" + enc(k), child);
      }
    }
    return out;
  }
  out.set("B", v);
  return out;
}

// Map<recordId, value> -> storeJson (string). null = store hi khatam.
// Kram Map ka kram hai, isliye caller local kram pehle rakhta hai aur naye
// records aakhir mein jodta hai (kram sync nahi hota — app khud sort karti hai
// jahan zaroori hai).
export function rebuild(records) {
  const ids = [...records.keys()];
  if (ids.length === 0) return null;
  if (records.has("B")) {
    const v = records.get("B");
    return typeof v === "string" ? v : JSON.stringify(v);
  }
  if (!ids.some((id) => id.startsWith("M:"))) {
    return JSON.stringify(ids.map((id) => records.get(id)));
  }
  const obj = {};
  for (const id of ids) {
    if (!id.startsWith("M:")) continue;                  // mili-juli shakl — chhodo
    const body = id.slice(2);
    const slash = body.indexOf("/");
    if (slash < 0) obj[dec(body)] = records.get(id);
    else {
      const k = dec(body.slice(0, slash));
      if (!Array.isArray(obj[k])) obj[k] = [];
      obj[k].push(records.get(id));
    }
  }
  return JSON.stringify(obj);
}

export function hashRecords(recs) {
  const out = {};
  for (const [id, v] of recs) out[id] = hashStr(JSON.stringify(v));
  return out;
}

/**
 * Ek store ka faisla: remote se aaye rows lagao, aur batao ki ab cloud ko kya
 * bhejna hai. Yahi wo jagah hai jahan "kaun jeeta" tay hota hai — aur niyam ek
 * hi hai: jis record ko HUMNE nahi chhua, uspar remote ki chalegi; jise humne
 * chhua, wo hum bhejenge.
 *
 * @param localJson  is device ka store (string|null)
 * @param sentHashes { recordId: hash } — pichhli sync par is store ka jo haal tha
 * @param rows       [{ item_id, deleted, data }] — cloud se aaye naye rows
 * @param tombIds    [recordId] — jo app ne SACH MEIN delete kiye (bigstore ki khabar)
 * @returns { nextJson, changed, toSend, hashes, missing }
 */
export function reconcileStore(localJson, sentHashes, rows, tombIds) {
  const recs = shred(localJson);
  const localHashes = hashRecords(recs);
  const sent = sentHashes || {};
  // Cloud se jo record abhi mila, uske baare mein ab hum aur cloud ek hi baat
  // jaante hain — yaani ab wo "humne bheja hua" jitna hi taaza hai. Isliye known
  // ko saath-saath update karna zaroori hai, warna abhi utara hua record turant
  // wapas push ho jayega, aur cloud se aaya DELETE wapas "add" ban kar laut
  // jayega (yaani delete kabhi tikega hi nahi).
  const known = { ...sent };

  for (const row of rows || []) {
    const id = row.item_id;
    const lh = localHashes[id] ?? null;
    const sh = sent[id] ?? null;
    // Humne is record ko khud badla hai (ya banaya hai) -> hamara wala rahega
    // aur neeche push mein chala jayega. Baaki har haal mein remote ki chalegi.
    if (lh !== sh) continue;
    if (row.deleted) {
      recs.delete(id); delete localHashes[id]; delete known[id];
    } else {
      const h = hashStr(JSON.stringify(row.data));
      recs.set(id, row.data); localHashes[id] = h; known[id] = h;
    }
  }

  const toSend = [];
  for (const [id, v] of recs) {
    if (localHashes[id] !== (known[id] ?? null)) toSend.push({ item_id: id, deleted: false, data: v });
  }
  // Delete SIRF wahan se aata hai jahan app ne sach mein delete kiya
  // (bigstore ne likhte waqt darj kiya). "Record gayab hai" ab delete ka saboot
  // NAHI hai — kyunki gayab hone ki wajah kharab IDB row ya fail hui write bhi
  // ho sakti hai, aur us surat mein doosre devices se bhi record uda dena sabse
  // bada nuksaan hoga.
  const tomb = new Set(tombIds || []);
  const missing = [];
  for (const id of Object.keys(known)) {
    if (recs.has(id)) continue;
    if (tomb.has(id)) toSend.push({ item_id: id, deleted: true, data: null });
    else missing.push(id);   // bina khabar ke gayab — cloud par zinda rehne do
  }

  // Khaali list/map ko rebuild "kuch bacha hi nahi" (null) bata deta hai, kyunki
  // records se ye pata nahi chalta ki container [] tha ya {}. Store pehle se hi
  // khaali tha to use waise hi rehne do — warna har sync use hataane ki koshish
  // karti rahegi.
  const nextJson = recs.size === 0 && localJson != null && shred(localJson).size === 0
    ? localJson
    : rebuild(recs);
  return { nextJson, changed: nextJson !== localJson, toSend, hashes: localHashes, missing };
}
