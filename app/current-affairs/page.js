"use client";

// /current-affairs — koi grid nahi: sabse naya MAHINA kholta hai.
//
// Daily aur Yearly hata diye gaye (owner ka faisla), isliye yahan koi tab
// nahi bacha — menu ka button seedha isi par aata hai aur ye newest month
// par bhej deta hai. Mahina badalna upar ke dropdown se.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadCaBankIndex } from "@/lib/cabank";
import { monthList } from "./[id]/page";

export default function CurrentAffairsIndex() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCaBankIndex().then((b) => {
      if (!alive) return;
      const first = monthList(b)[0];
      if (first) router.replace(`/current-affairs/${first.id}`);
      else setEmpty(true);
    });
    return () => { alive = false; };
  }, [router]);

  if (!empty) return null;
  return <div className="placeholder">Abhi koi mahina nahi hai — PDF import karo.</div>;
}
