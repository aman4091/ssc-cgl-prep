import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";

// No chapter index page. The chapters ARE the left menu now — opening
// "Maths 2025" in the sidebar lists all 29 — so landing here just goes to the
// first one. Server-side, so nothing renders and nothing flashes.
export const metadata = { title: "Maths 2025 · SSC CGL Prep" };

export default function SscMaths2025Index() {
  let first = "";
  try {
    const idx = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "sscmaths2025", "index.json"), "utf8")
    );
    first = idx.chapters?.[0]?.slug || "";
  } catch { /* bank missing */ }
  redirect(first ? `/pyq/maths2025/${first}` : "/pyq");
}
