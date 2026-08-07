"use client";

import { useEffect, useState } from "react";
import { imageKey } from "./wrongbook";
import { getFile } from "./filestore";

// Display URLs for a Wrong-Question record's images. An R2 image is already a
// URL; a local fallback has to be read out of IndexedDB and object-URL'd (and
// revoked). `missing` counts local blobs this device doesn't have — what a
// synced record looks like when its image never made it to R2.
//
// /wrong ka card aur /wrong/solve dono isko use karte hain. Pehle ye hook
// app/wrong/page.js ke andar hi rehta tha; solve view aaya to do copies rakhne
// ke bajay yahan nikaal diya, warna dono dhire-dhire alag ho jate.
export function useImageUrls(images) {
  const [state, setState] = useState({ urls: [], missing: 0, loading: true });
  const key = (images || []).map(imageKey).join(",");
  useEffect(() => {
    let alive = true;
    const made = [];
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const out = [];
      let gone = 0;
      for (const img of images || []) {
        if (img.url) { out.push(img.url); continue; }
        const blob = await getFile(img.id).catch(() => null);
        if (!blob) { gone += 1; continue; }
        const u = URL.createObjectURL(blob);
        made.push(u);
        out.push(u);
      }
      if (alive) setState({ urls: out, missing: gone, loading: false });
      else made.forEach((u) => URL.revokeObjectURL(u));
    })();
    return () => { alive = false; made.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
