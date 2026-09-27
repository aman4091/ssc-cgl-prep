"use client";

// Saare homepage roop — HomePreview ki patti isi kram mein dikhati hai.
import HomeControl from "./HomeControl";
import HomeTimeline from "./HomeTimeline";
import HomeMap from "./HomeMap";
import HomeFocus from "./HomeFocus";

export const HOMES = [
  { id: "a", name: "Mission Control", C: HomeControl },
  { id: "b", name: "Din ki Timeline", C: HomeTimeline },
  { id: "c", name: "32 din ka Naksha", C: HomeMap },
  { id: "d", name: "Focus", C: HomeFocus },
];
