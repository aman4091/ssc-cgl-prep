import { NextResponse } from "next/server";
import { r2Config } from "@/lib/r2server";

// 🚨 Panic button ki list — R2 ka panic/index.json (scripts/panic-upload.mjs
// likhta hai). Browser seedha r2.dev se nahi padhta kyunki us bucket par CORS
// nahi hai; server se padhne mein CORS ka sawaal hi nahi. Videos khud <video
// src> se seedhe r2.dev se aati hain — un par CORS lagta hi nahi.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = r2Config();
  if (!cfg.ok) {
    return NextResponse.json({ error: "R2 configured nahi hai.", items: [] }, { status: 501 });
  }
  try {
    // ?t= — r2.dev apni taraf cache kar leta hai; nayi upload turant dikhe.
    const res = await fetch(`${cfg.publicBase}/panic/index.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `index.json nahi mila (${res.status}) — pehle npm run panic:upload chalao.`, items: [] },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(
      { items: Array.isArray(data?.items) ? data.items : [], updated: data?.updated || "" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e), items: [] }, { status: 500 });
  }
}
