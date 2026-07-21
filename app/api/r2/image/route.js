import { r2Config } from "@/lib/r2server";

// Same-origin passthrough for our own R2 images.
//
// r2.dev serves no Access-Control-Allow-Origin, so the page cannot fetch the
// bytes of a screenshot it just uploaded — which OCR needs, since tesseract
// runs in the browser. Proxying makes it same-origin.
//
// Restricted to our own public base and the wrong/ prefix, so this can't be
// turned into an open proxy or pointed at an internal address.
export const runtime = "nodejs";

export async function GET(req) {
  const cfg = r2Config();
  if (!cfg.ok) return new Response("R2 not configured", { status: 501 });

  const url = new URL(req.url).searchParams.get("url") || "";
  const prefix = `${cfg.publicBase}/wrong/`;
  if (!url.startsWith(prefix)) {
    return new Response("Not an image from this store", { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) return new Response("Image fetch failed", { status: res.status });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
