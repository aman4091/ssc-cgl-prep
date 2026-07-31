import HomeFeed from "@/components/HomeFeed";

// The home page is a curated "study feed": a big dropdown of items the user adds
// via ➕ Add items — the Vocab item (auto-advances to the next un-quizzed day) and
// notes topics (their own Hindi/Hinglish notes, whole chapter, scrollable).
export default function Home() {
  return <HomeFeed />;
}
