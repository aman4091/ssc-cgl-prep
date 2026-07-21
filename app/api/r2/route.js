import { NextResponse } from "next/server";
import { r2Config, r2Put, r2Delete, keyFromPublicUrl } from "@/lib/r2server";

// Upload / delete Wrong-Question images on R2. The browser never sees the R2
// keys — they live in Vercel env vars and only this route signs with them.
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // a compressed screenshot is ~150KB; this is the sane ceiling
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

// The page asks on load whether uploading is even possible, so it can fall back
// to device-local storage instead of failing on the first paste.
export async function GET() {
  const cfg = r2Config();
  return NextResponse.json({ configured: cfg.ok, publicBase: cfg.ok ? cfg.publicBase : "" });
}

export async function POST(req) {
  if (!r2Config().ok) {
    return NextResponse.json({ error: "R2 configured nahi hai — env vars missing." }, { status: 501 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Koi file nahi mili." }, { status: 400 });
    }
    const type = String(file.type || "").toLowerCase();
    if (!EXT[type]) {
      return NextResponse.json({ error: `Image type '${type || "unknown"}' allowed nahi hai.` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (!buf.length) return NextResponse.json({ error: "File khaali hai." }, { status: 400 });
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: "Image bahut badi hai (8MB se zyada)." }, { status: 413 });
    }

    // Key is generated here, never taken from the client — a caller cannot
    // choose a path and overwrite the maths/reasoning banks in the same bucket.
    const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${EXT[type]}`;
    const url = await r2Put(`wrong/${name}`, buf, type);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req) {
  if (!r2Config().ok) {
    return NextResponse.json({ error: "R2 configured nahi hai." }, { status: 501 });
  }
  try {
    const { url } = await req.json().catch(() => ({}));
    const key = keyFromPublicUrl(url);
    if (!key) return NextResponse.json({ error: "Ye URL is bucket ka nahi hai." }, { status: 400 });
    await r2Delete(key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
