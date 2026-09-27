"use client";

// Homepage ke wo roop jo abhi muqable mein hain — HomePreview ki patti isi
// kram mein dikhati hai.
//
// Shuru mein chaudah the (A–N). Owner ne teen chhod kar baaki gyaarah hata
// diye: "e, i, l chhod kar sab hata de — unme se comparison karna hai."
// Unke id wahi (E, I, L) rakhe hain, naye A/B/C nahi kiye — jiske browser
// mein "l" chuna pada hai uska chunaav bana rehna chahiye.

import { HomeScore, HomeSubjects } from "./HomeMore1";
import { HomeBrief } from "./HomeMore2";
import "./home2.css";

export const HOMES = [
  { id: "e", name: "Scoreboard", C: HomeScore },
  { id: "i", name: "Subject Hub", C: HomeSubjects },
  { id: "l", name: "Subah ki Khabar", C: HomeBrief },
];
