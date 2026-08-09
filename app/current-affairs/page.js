"use client";

// There is no Current Affairs index/grid — this route just opens the NEWEST
// entry of the requested tab and redirects to it.
//
// It used to be a server component reading only public/cabank/index.json, but
// the user's own imported entries live in localStorage — a freshly imported
// "July 2026" is newer than the bank's June yet the tab kept opening June. So
// this is now a tiny client resolver: merge the built-in periods with the
// user's entries of that bucket, pick the newest, replace() to it.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadCaBankIndex, caBankId } from "@/lib/cabank";
import { getEntries } from "@/lib/feed";

function sortKeyOfEntry(e) {
  // `period` is the sortable form ("2026-07"); `date` may be a pretty label
  // ("July 2026") that doesn't compare against ISO periods.
  return e.period || (/^\d{4}/.test(e.date || "") ? e.date : "") || (e.createdAt || "").slice(0, 10);
}

function Resolver() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "daily";
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (tab !== "daily" && tab !== "monthly") { setEmpty(true); return; }
    let alive = true;
    loadCaBankIndex().then((b) => {
      if (!alive) return;
      const list = (tab === "daily" ? b?.days : b?.months) || [];
      const candidates = [
        ...list.map((p) => ({ id: caBankId(p.period), sort: p.period })),
        ...getEntries("current", tab).map((e) => ({ id: e.id, sort: sortKeyOfEntry(e) })),
      ].sort((x, y) => (x.sort < y.sort ? 1 : -1));
      if (candidates[0]) router.replace(`/current-affairs/${candidates[0].id}`);
      else setEmpty(true);
    });
    return () => { alive = false; };
  }, [tab, router]);

  if (!empty) return null; // redirecting — render nothing, no flash
  return (
    <section className="hero">
      <span className="hero__eyebrow">📰 Current Affairs</span>
      <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
        {tab === "yearly" ? "Yearly" : "Yahan"} <span className="grad">abhi khaali hai</span>
      </h1>
      <p className="hero__sub">Is compilation mein daily aur monthly hi hain.</p>
      <div className="row mt-16" style={{ gap: 8 }}>
        <Link href="/current-affairs?tab=daily" className="btn btn--primary btn--sm">🗓️ Daily</Link>
        <Link href="/current-affairs?tab=monthly" className="btn btn--ghost btn--sm">🗓️ Monthly</Link>
      </div>
    </section>
  );
}

export default function CurrentAffairsIndex() {
  return (
    <Suspense fallback={null}>
      <Resolver />
    </Suspense>
  );
}
