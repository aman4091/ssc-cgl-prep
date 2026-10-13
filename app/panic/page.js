"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PanicPlayer from "@/components/PanicPlayer";

// 🚨 /panic — seedha player. App icon ka shortcut (app/manifest.js) aur desktop
// ka hamesha-upar wala button (over/panic_app.py) yahi kholte hain.
//
// ?desk=1 = desktop ki alag Chrome khidki. Wahan band karne ka matlab khidki
// hi band — wo sirf isi ke liye khuli thi. Baaki jagah site par wapas.
function PanicPage() {
  const router = useRouter();
  const desk = useSearchParams().get("desk") === "1";

  const onClose = (reason) => {
    if (reason === "nav") return;
    if (desk) {
      window.close();
      return;
    }
    router.replace("/");
  };

  return <PanicPlayer onClose={onClose} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PanicPage />
    </Suspense>
  );
}
