"use client";

// 🏠 Homepage — Scoreboard.
//
// Yahan kabhi chaudah roop ek saath the aur upar ek patti se chun-chun kar
// compare kiye jaate the. Owner ne Scoreboard (jo "E" tha) final kar diya,
// isliye ab na patti hai na chunaav — seedha wahi.
//
// Ek hi apwaad: mission abhi setup par ho (start date pad hi nahi) to naya
// roop dikhane ko kuch hai hi nahi — tab purana Home (children) hi aata hai,
// jahan setup ka card hai.

import HomeScore from "./HomeScore";
import useMissionHome from "./useMissionHome";
import "./home.css";

export default function HomeScreen({ children }) {
  const d = useMissionHome();
  if (!d || d.setup) return children;
  return <HomeScore d={d} />;
}
