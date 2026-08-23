"use client";

// The homepage study feed. A big dropdown switches between the items the user
// curates (➕ Add items): the Vocab singleton (auto-advances to the next
// un-quizzed day via nextUp) and any notes topics (their Hindi/Hinglish notes).
// Replaces the old always-on full-page vocab widget — vocab is now one item.

import Link from "next/link";
import { useEffect, useState } from "react";
import { nextUp } from "@/lib/vocab";
import { getItems, getActiveId, setActiveId, removeItem, subscribeHome } from "@/lib/homefeed";
import HomeVocab from "@/components/HomeVocab";
import NotesChapterView from "@/components/NotesChapterView";
import AddItemsModal from "@/components/AddItemsModal";
import TodayGate from "@/components/TodayGate";

export default function HomeFeed() {
  const [ready, setReady] = useState(false); // localStorage → only after mount
  const [items, setItems] = useState([]);
  const [activeId, setActive] = useState(null);
  const [adding, setAdding] = useState(false);
  // Aaj ka kaam poora hua ya nahi — TodayGate batata hai.
  const [dayDone, setDayDone] = useState(true);
  const [peek, setPeek] = useState(false);   // "phir bhi kholo" — sirf is baar

  useEffect(() => {
    const sync = () => { setItems(getItems()); setActive(getActiveId()); };
    // Restore the open chapter from the URL (?sel=). This is ALSO what gives each
    // chapter a DISTINCT address, so Edge/Chrome "reading mode" — which caches its
    // reader view per URL — doesn't keep showing the first chapter it captured.
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("sel");
      if (fromUrl && getItems().some((it) => it.id === fromUrl)) setActiveId(fromUrl);
    } catch { /* ignore */ }
    sync();
    setReady(true);
    // Doosre device se data aane par ye screen KHUD taazi ho jati hai. Pehle
    // iske liye poora page reload hota tha — aur wahi quiz ke beech answers kha
    // jata tha. Ab sync bas ek event chhodta hai aur jise zaroorat hai wo sun
    // leta hai; kisi ka kaam beech mein nahi tootta.
    const unsubHome = subscribeHome(sync);
    // Sync se sirf LIST taazi hoti hai — jo chapter tum khole baithe ho use
    // haath nahi lagana. Pehle poora sync() chalta tha aur active bhi badal
    // jata tha, yaani padhte-padhte screen doosre chapter par chali jati thi.
    const listOnly = () => setItems(getItems());
    window.addEventListener("cgl:sync-applied", listOnly);
    return () => { unsubHome(); window.removeEventListener("cgl:sync-applied", listOnly); };
  }, []);

  // Keep the URL in step with the open chapter (shallow — no reload), so reading
  // mode / share / back-button each see a unique address per chapter.
  useEffect(() => {
    if (!ready || !activeId) return;
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get("sel") !== activeId) {
        u.searchParams.set("sel", activeId);
        window.history.replaceState(null, "", u.toString());
      }
    } catch { /* ignore */ }
  }, [activeId, ready]);

  if (!ready) return <section className="section"><div className="placeholder">…</div></section>;

  const active = items.find((it) => it.id === activeId) || items[0];

  const bar = (
    <section className="section" style={{ paddingBottom: 0 }}>
      <div className="row between" style={{ gap: 8 }}>
        <select
          className="input"
          value={active?.id || ""}
          onChange={(e) => setActiveId(e.target.value)}
          style={{ maxWidth: 320, fontSize: "1.05rem", fontWeight: 600 }}
        >
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.label}</option>
          ))}
        </select>
        <span className="row" style={{ gap: 6 }}>
          {active && active.kind === "notes" && (
            <button className="btn btn--ghost btn--sm" onClick={() => removeItem(active.id)} title="Is chapter ko list se hatao">🗑️</button>
          )}
          <button className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>➕ Add items</button>
        </span>
      </div>
    </section>
  );

  let body;
  if (!active || active.kind === "vocab") {
    const n = nextUp();
    body = n ? (
      <HomeVocab key="vocab" day={n.day} type={n.type} />
    ) : (
      <section className="section">
        <div className="home-head"><h1>Aage kya</h1></div>
        <p className="muted">Sab ho gaya — ya abhi koi word add nahi kiya.</p>
        <Link href="/vocab" className="btn btn--primary mt-16">🔤 Vocab kholo</Link>
      </section>
    );
  } else {
    body = <NotesChapterView key={active.id} slug={active.slug} topic={active.topic} />;
  }

  // Roz ka kaam baaki ho to feed band.
  //
  // Notes padhna bura nahi hai — par homepage kholte hi notes mein ghus jaana
  // hi wo aadat thi jisme sabse zyada waqt jata tha aur sabse kamzor subject
  // sabse zyada talta tha. Isliye pehle aaj ka kaam, phir feed.
  //
  // Taala poora nahi hai: ek line ka "phir bhi kholo" hai. Maqsad rokna nahi,
  // ek baar sochne par majboor karna hai.
  const locked = !dayDone && !peek;

  return (
    <>
      <TodayGate onStateChange={setDayDone} />
      {locked ? (
        <section className="section">
          <p className="muted">
            📖 Notes aur vocab feed aaj ka kaam poora hone par khul jayega.
          </p>
          <button className="btn btn--ghost btn--sm mt-8" onClick={() => setPeek(true)}>
            Phir bhi kholo
          </button>
        </section>
      ) : (
        <>
          {bar}
          {body}
        </>
      )}
      {adding && <AddItemsModal onClose={() => setAdding(false)} />}
    </>
  );
}
