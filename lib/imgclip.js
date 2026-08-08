// Question ki tasveer clipboard par — taaki wo seedhi Gemini mein paste ho sake.
//
// Ye teeno helpers pehle app/wrong/page.js ke andar the. Wo page hata diya gaya,
// aur ab Answers page ko yahi chahiye, isliye alag file mein aa gaye.
//
// Image bhejna OCR se behtar hai: fractions, figures aur diagrams jaise-ke-taise
// jaate hain, jabki OCR unhe toot-phoot kar text banata hai.

import { getFile } from "./filestore";

// Kisi bhi image blob ko PNG mein dobara bana do.
//
// Clipboard par browser bharose se sirf PNG lete hain — JPEG/WebP ko
// clipboard.write() chupchaap mana kar deta hai. Jo pehle se PNG hai wo waise hi
// nikal jata hai.
export function blobToPng(blob) {
  if (blob?.type === "image/png") return Promise.resolve(blob);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        c.toBlob(
          (b) => { URL.revokeObjectURL(url); if (b) resolve(b); else reject(new Error("PNG banana fail")); },
          "image/png"
        );
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load fail")); };
    img.src = url;
  });
}

// `getBlob` JAAN-BOOJH KAR lazily ClipboardItem ke andar call hota hai, taaki
// navigator.clipboard.write click ke gesture ke andar hi chal jaye (browser blob
// ka khud intezaar kar leta hai). Pehle await karte to gesture khatam ho jata
// aur write mana kar diya jata.
//
// -> false jab browser image-clipboard support hi nahi karta (zyadatar mobile),
// taaki caller kuch aur raasta le sake.
export async function copyImageToClipboard(getBlob) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
  try {
    const item = new ClipboardItem({ "image/png": (async () => blobToPng(await getBlob()))() });
    await navigator.clipboard.write([item]);
    return true;
  } catch { return false; }
}

// Ek image ke bytes lao. R2 wali apne hi proxy se aati hai (r2.dev CORS header
// bhejta hi nahi), aur device-local wali IndexedDB se.
export async function imageBlob(im) {
  if (im?.url) {
    const res = await fetch(`/api/r2/image?url=${encodeURIComponent(im.url)}`);
    if (!res.ok) throw new Error("Image load nahi hui.");
    return res.blob();
  }
  const blob = await getFile(im?.id).catch(() => null);
  if (!blob) throw new Error("Image is device par nahi hai.");
  return blob;
}
