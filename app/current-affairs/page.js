import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { redirect } from "next/navigation";
import { caBankId } from "@/lib/cabank";

// There is no Current Affairs index any more — no grid of every date.
//
// It used to render that grid and then a useEffect would router.replace() to the
// newest entry, which is why the grid flashed up for an instant on every visit.
// This is a SERVER component: it reads the bank, works out the newest period and
// redirects before anything reaches the browser, so nothing flashes because
// nothing renders.
//
// Moving between dates is the dropdown on the entry itself.
export const metadata = { title: "Current Affairs · SSC CGL Prep" };

function newest(list) {
  return [...(list || [])].sort((a, b) => (a.period < b.period ? 1 : -1))[0];
}

export default async function CurrentAffairsIndex({ searchParams }) {
  const sp = await searchParams;
  const tab = sp?.tab || "daily";

  let index = { days: [], months: [] };
  try {
    index = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "cabank", "index.json"), "utf8")
    );
  } catch {
    /* bank missing — fall through to the message below */
  }

  const top = newest(tab === "monthly" ? index.months : tab === "daily" ? index.days : null);
  if (top) redirect(`/current-affairs/${caBankId(top.period)}`);

  // Only Yearly reaches here: the bank ships daily and monthly compilations and
  // nothing yearly, so there is no entry to open.
  return (
    <section className="hero">
      <span className="hero__eyebrow">📰 Current Affairs</span>
      <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
        Yearly <span className="grad">abhi khaali hai</span>
      </h1>
      <p className="hero__sub">Is compilation mein daily aur monthly hi hain.</p>
      <div className="row mt-16" style={{ gap: 8 }}>
        <Link href="/current-affairs?tab=daily" className="btn btn--primary btn--sm">🗓️ Daily</Link>
        <Link href="/current-affairs?tab=monthly" className="btn btn--ghost btn--sm">🗓️ Monthly</Link>
      </div>
    </section>
  );
}
