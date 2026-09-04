"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadMixCatalog, buildMixTest, partInfo, minutesFor, MIX_LIMIT,
  getMixDraft, setMixDraft,
} from "@/lib/mixtest";

// 🧪 Apna test banao — chapter khud chuno, ginti khud tay karo.
//
// "Aaj ka set" faisla chheen leta hai (chapter khud chun leta hai), aur wo
// theek hai jab pata na ho ki kya karna hai. Par jab pata HO — aaj Trigonometry
// aur Biology padhi thi — tab wahi sabse badi rukawat ban jata hai. Ye page us
// din ke liye hai.
//
// Do hi cheez maangta hai: kaunsa chapter, aur usmein se kitne question. Kul ki
// ek hadd hai (25 default) taaki baithak lambi na ho jaye, aur wo hadd bhi
// badal sakti hai. Poore 25 ek hi chapter ke lene ho to wo bhi ho jayega.
//
// Chapter ki list bina ek bhi question fetch kiye banti hai (sirf index.json),
// isliye page turant khulta hai. Question tabhi khulte hain jab "Test banao"
// dabate ho — aur sirf wahi chapter jo chune gaye.

const PRESETS = [10, 25, 50, 100];
const STEP = 5;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Ek chapter ki line. Component BAAHAR hai, andar nahi: andar banaya jata to
// har render par nayi shakl ban jati, React use naya component samajh kar
// dobara lagata, aur ginti wale khaane mein type karte hi ungli bahar ho jati.
function MktRow({ p, sub, n, left, onSet }) {
  const max = Math.min(p.count, n + left);
  return (
    <div className={`mkt__row${n ? " is-on" : ""}`}>
      <button
        className="mkt__name"
        onClick={() => onSet(p.key, n ? 0 : Math.min(STEP, max))}
        title={n ? "Hata do" : `${Math.min(STEP, max)} question daalo`}
      >
        <b>{p.name}</b>
        <span className="mkt__sub">{sub} · {p.count.toLocaleString("en-IN")} Q</span>
      </button>
      <div className="mkt__step">
        <button className="btn btn--ghost btn--sm" disabled={!n}
          onClick={() => onSet(p.key, n - STEP)}>−</button>
        <input
          className="input mkt__num" type="number" inputMode="numeric"
          min="0" max={p.count} value={n || ""} placeholder="0"
          onChange={(e) => onSet(p.key, e.target.value)}
        />
        <button className="btn btn--ghost btn--sm" disabled={n >= max}
          onClick={() => onSet(p.key, n + STEP)}>+</button>
      </div>
    </div>
  );
}

export default function MakeTestPage() {
  const router = useRouter();
  const [cat, setCat] = useState(null);
  const [ready, setReady] = useState(false);
  const [limit, setLimit] = useState(MIX_LIMIT);
  // Kram maayne rakhta hai — test mein chapter isi kram mein aate hain, isliye
  // list hai, object nahi.
  const [picks, setPicks] = useState([]);       // [{ key, n }]
  const [open, setOpen] = useState("");         // kaunsa subject khula hai
  const [query, setQuery] = useState("");
  const [mixAll, setMixAll] = useState(false);
  const [skipDone, setSkipDone] = useState(true);
  const [mins, setMins] = useState("");         // khaali = apne aap
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    loadMixCatalog().then((c) => {
      if (!alive) return;
      setCat(c);
      // Pichhli baar ka chunaav wapas — roz ka revision aksar wahi rehta hai.
      // Jo chapter ab hai hi nahi (book hata di) wo chup-chaap gir jata hai.
      const d = getMixDraft();
      if (d) {
        setLimit(Number(d.limit) || MIX_LIMIT);
        setMixAll(!!d.mixAll);
        setSkipDone(d.skipDone !== false);
        setMins(d.mins || "");
        setPicks((d.picks || []).filter((p) => partInfo(p.key)).map((p) => ({ key: p.key, n: p.n })));
      }
      if (c.length) setOpen(c[0].slug);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  // Har badlav yaad — par tabhi jab pichhla chunaav padha ja chuka ho, warna
  // khaali shuruaati haalat use mita deti.
  useEffect(() => {
    if (!ready) return;
    setMixDraft({ limit, mixAll, skipDone, mins, picks });
  }, [ready, limit, mixAll, skipDone, mins, picks]);

  const chosen = picks.reduce((a, p) => a + p.n, 0);
  const left = Math.max(0, limit - chosen);

  const setPick = useCallback((key, n) => {
    setErr("");
    setPicks((prev) => {
      const info = partInfo(key);
      const cur = prev.find((p) => p.key === key)?.n || 0;
      const used = prev.reduce((a, p) => a + p.n, 0);
      // Hadd do taraf se: chapter mein jitne hain utne se zyada nahi, aur kul
      // hadd se aage bhi nahi.
      const room = Math.max(0, limit - used) + cur;
      const val = clamp(Math.floor(Number(n) || 0), 0, Math.min(info?.count || 0, room));
      if (val === cur) return prev;
      if (!val) return prev.filter((p) => p.key !== key);
      const at = prev.findIndex((p) => p.key === key);
      if (at < 0) return [...prev, { key, n: val }];
      const copy = [...prev];
      copy[at] = { key, n: val };
      return copy;
    });
  }, [limit]);

  const nOf = (key) => picks.find((p) => p.key === key)?.n || 0;

  // Khoj — chapter ke naam par, saare subject ke aar-paar. "trigo" likho to
  // dono maths bank ka Trigonometry ek saath saamne.
  const found = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t || !cat) return null;
    const out = [];
    for (const s of cat) {
      for (const src of s.sources) {
        for (const p of src.parts) {
          if (p.name.toLowerCase().includes(t)) out.push({ ...p, subj: s, src });
        }
      }
    }
    return out.slice(0, 60);
  }, [query, cat]);

  const build = async () => {
    if (!picks.length) { setErr("Pehle koi chapter chuno."); return; }
    setErr(""); setBusy("shuru…");
    try {
      const made = await buildMixTest(picks, {
        minutes: mins ? Number(mins) : undefined,
        mix: mixAll,
        skipDone,
        onStep: (d, t, name) => setBusy(`${d}/${t} · ${name}`),
      });
      if (!made) { setErr("In chapters se koi question nahi mila."); setBusy(""); return; }
      router.push(`/quizzes/${made.id}`);
    } catch (e) {
      setErr(e?.message || "Test nahi ban paya.");
      setBusy("");
    }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧪 Apna test</span>
          <Link href="/" className="btn btn--ghost btn--sm">← Home</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Test <span className="grad">khud banao</span>
        </h1>
        <p className="hero__sub">
          Trigonometry ke 10, Biology ke 5, Percentage ke 10 — ek hi test.
          Chapter chuno, ginti chuno, bas. Galat hue question apne-apne chapter ke
          naam se Mistake Notebook mein jayenge, aur ginti apne-apne ring mein.
        </p>
      </section>

      {/* Kul kitne — hadd yahin se tay hoti hai. */}
      <section className="section" style={{ marginTop: 4 }}>
        <div className="mkt__bar">
          <b>Kul kitne?</b>
          {PRESETS.map((v) => (
            <button key={v}
              className={`btn btn--sm ${limit === v ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setLimit(v)}>{v}</button>
          ))}
          <input className="input mkt__num" type="number" inputMode="numeric" min="1" max="200"
            value={limit}
            onChange={(e) => setLimit(clamp(Math.floor(Number(e.target.value) || 0), 1, 200))} />
          <label className="mkt__chk" title="Chapter-wise blocks ki jagah sab mila kar — asli mock jaisa">
            <input type="checkbox" checked={mixAll} onChange={(e) => setMixAll(e.target.checked)} />
            🔀 Mila do
          </label>
          <label className="mkt__chk" title="Jo question pehle ✅ ho chuke hain unhe chhod do">
            <input type="checkbox" checked={skipDone} onChange={(e) => setSkipDone(e.target.checked)} />
            ✅ Ho chuke chhodo
          </label>
          <label className="mkt__chk" title="Khaali chhodo to apne aap — SSC ki raftaar par">
            ⏱️
            <input className="input mkt__num" type="number" inputMode="numeric" min="1" max="180"
              placeholder={String(minutesFor(chosen || limit))}
              value={mins} onChange={(e) => setMins(e.target.value)} />
            min
          </label>
        </div>
      </section>

      {/* Jo chuna hua hai — hamesha saamne, taaki 40 chapter ki list mein
          neeche jaane par bhi pata rahe ki test mein kya hai. */}
      {picks.length > 0 && (
        <section className="section" style={{ marginTop: 0 }}>
          <div className="mkt__chosen">
            {picks.map((p) => {
              const info = partInfo(p.key);
              return (
                <button key={p.key} className="chip mkt__chip" onClick={() => setPick(p.key, 0)}
                  title="Hata do">
                  <b>{info?.name || p.key}</b> · {p.n} ✕
                </button>
              );
            })}
            <button className="btn btn--ghost btn--sm" onClick={() => setPicks([])}>♻️ Saaf karo</button>
          </div>
        </section>
      )}

      <section className="section" style={{ marginTop: 0 }}>
        <input
          className="input" style={{ maxWidth: 340 }}
          placeholder="🔍 Chapter dhoondho — trigo, biology, tense…"
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="section" style={{ marginTop: 0, paddingBottom: 130 }}>
        {!cat ? (
          <div className="placeholder">Chapter ki list aa rahi hai…</div>
        ) : found ? (
          <div className="mkt__list">
            {found.length === 0
              ? <p className="muted">Is naam ka koi chapter nahi mila.</p>
              : found.map((p) => (
                <MktRow key={p.key} p={p} n={nOf(p.key)} left={left} onSet={setPick}
                  sub={`${p.subj.icon} ${p.subj.label} · ${p.src.label}`} />
              ))}
          </div>
        ) : (
          cat.map((s) => (
            <div key={s.slug} className="mkt__grp">
              <button className="mkt__grphead" onClick={() => setOpen(open === s.slug ? "" : s.slug)}>
                <span>{s.icon} <b>{s.label}</b></span>
                <span className="muted">{s.total.toLocaleString("en-IN")} Q · {open === s.slug ? "▲" : "▼"}</span>
              </button>
              {open === s.slug && s.sources.map((src) => (
                <div key={src.id} className="mkt__src">
                  <div className="mkt__srchead">{src.icon} {src.label} · {src.total.toLocaleString("en-IN")}</div>
                  <div className="mkt__list">
                    {src.parts.map((p) => (
                      <MktRow key={p.key} p={p} n={nOf(p.key)} left={left} onSet={setPick} sub={src.label} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      {/* Neeche chipki hui patti — ginti aur "banao" hamesha ungli ke paas. */}
      <div className="mkt__go">
        <span className="mkt__count">
          <b>{chosen}</b> / {limit}
          {left > 0 ? <span className="muted"> · {left} aur</span> : <span className="muted"> · poora</span>}
        </span>
        {err && <span className="mkt__err">{err}</span>}
        <button className="btn btn--primary" disabled={!!busy || !picks.length} onClick={build}>
          {busy ? `⏳ ${busy}` : `▶ Test banao (${chosen})`}
        </button>
      </div>
    </>
  );
}
