"use client";

// 🎨 Menu ke 15 roop — owner upar patti ke dropdown se dekh kar ek chunega.
// Sab ek hi model par chalte hain jo components/Navbar banata hai:
//   menu.top          — sabse upar ke khaane (Fact log, groups, Settings…)
//   menu.level(trail) — kisi khaane ke andar ki list { title, icon, items }
//   menu.need(trail)  — bank ho to uske chapter mangwa lo
// Har item: { id, icon, label, href } (seedha link) ya { …, trail } (andar
// ek aur level). Isliye kisi roop mein menu ki koi line chhooti nahi —
// sirf dikhne ka dhang badalta hai. Page ke liye jagah (sidebar / neeche ki
// patti) app/looks/menus.css mein <html data-menu="N"> se chhodi jati hai.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export const MENU_LAYOUTS = [
  { id: "1", name: "Tree sidebar" },
  { id: "2", name: "Upar nav bar + dropdown" },
  { id: "3", name: "Neeche tabs (app jaisa)" },
  { id: "4", name: "Icon rail + flyout" },
  { id: "5", name: "Command palette (Ctrl K)" },
  { id: "6", name: "Mega menu" },
  { id: "7", name: "Columns (Finder jaisa)" },
  { id: "8", name: "Launcher — app grid" },
  { id: "9", name: "Daayen drawer + search" },
  { id: "10", name: "Dock (neeche beech mein)" },
  { id: "11", name: "Gol (radial) menu" },
  { id: "12", name: "Chips ki patti" },
  { id: "13", name: "Do-pane (Discord jaisa)" },
  { id: "14", name: "Card drawer" },
  { id: "15", name: "Full-screen bade akshar" },
];

const short = (l) => String(l).split(" · ")[0];
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Kisi trail ke bank ko (ek baar) mangwao — render mein nahi, effect mein.
function useNeed(menu, t) {
  const k = (t || []).join("/");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { menu.need(t); }, [k]);
}
// Esc se band.
function useEsc(on, close) {
  useEffect(() => {
    if (!on) return undefined;
    const f = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [on, close]);
}

function Row({ it, onGroup, cls = "mnu-row", chev = true }) {
  const c = `${cls}${it.active ? " is-on" : ""}`;
  if (it.href) return <Link href={it.href} className={c}><i>{it.icon}</i><span>{it.label}</span></Link>;
  return (
    <button type="button" className={c} onClick={() => onGroup(it)}>
      <i>{it.icon}</i><span>{it.label}</span>{chev && <b>›</b>}
    </button>
  );
}

// Ek jagah wala drill-down: us level ki list, gehre level par upar "← wapas".
function Drill({ menu, trail, setTrail, root = [], rowCls, cls = "mnu-drill" }) {
  useNeed(menu, trail);
  const lv = menu.level(trail);
  if (!lv) return null;
  return (
    <div className={cls}>
      {trail.length > root.length && (
        <button type="button" className="mnu-back" onClick={() => setTrail(trail.slice(0, -1))}>
          <b>←</b> <i>{lv.icon}</i> <span>{lv.title}</span>
        </button>
      )}
      {lv.items.map((it) => <Row key={it.id} it={it} cls={rowCls} onGroup={(g) => setTrail(g.trail)} />)}
      {lv.loading && <span className="mnu-dim">Loading…</span>}
      {!lv.loading && !lv.items.length && <span className="mnu-dim">Kuch nahi</span>}
    </div>
  );
}

function Head({ mark, onClose, title }) {
  return (
    <div className="mnu-head">
      <Link href="/" className="mnu-brand">{mark}<span><strong>SSC CGL Pre</strong><small>{title || "Prep Hub · Prelims"}</small></span></Link>
      {onClose && <button type="button" className="mnu-x" aria-label="Band karo" onClick={onClose}>✕</button>}
    </div>
  );
}

// Poora menu ek seedhi list mein — search ke liye. Bank ke chapter tabhi
// jab wo pehle khul chuke hon (sab bank ek saath mangwana bhaari hai).
function useFlat(menu) {
  const out = [];
  const walk = (items, path, depth) => {
    for (const it of items) {
      out.push({ it, path });
      if (it.trail && depth < 4) {
        const lv = menu.level(it.trail);
        if (lv && lv.items.length) walk(lv.items, [...path, short(it.label)], depth + 1);
      }
    }
  };
  walk(menu.top, [], 0);
  return out;
}
const hit = (e, q) => `${e.it.label} ${e.path.join(" ")}`.toLowerCase().includes(q);

// ─── 1 · Tree sidebar ───
function TreeNode({ menu, it, depth }) {
  const [op, setOp] = useState(() => !!it.trail && same(menu.pathTrail.slice(0, it.trail.length), it.trail));
  useNeed(menu, op ? it.trail : null);
  if (it.href) {
    return <Link href={it.href} className={`mnu1-leaf${it.active ? " is-on" : ""}`} style={{ "--d": depth }}><i>{it.icon}</i><span>{it.label}</span></Link>;
  }
  const lv = op ? menu.level(it.trail) : null;
  return (
    <div className="mnu1-node">
      <button type="button" className={`mnu1-hd${op ? " is-open" : ""}${it.active ? " is-on" : ""}`} style={{ "--d": depth }} onClick={() => setOp(!op)}>
        <b>▸</b><i>{it.icon}</i><span>{it.label}</span>
      </button>
      {lv && (
        <div className="mnu1-kids">
          {lv.items.map((k) => <TreeNode key={k.id} menu={menu} it={k} depth={depth + 1} />)}
          {lv.loading && <span className="mnu-dim" style={{ paddingLeft: 30 + depth * 14 }}>Loading…</span>}
        </div>
      )}
    </div>
  );
}
function Tree({ menu, open, setOpen, mark }) {
  return (
    <>
      {open && <div className="mnu-bd mnu-bd--m" onClick={() => setOpen(false)} />}
      <aside className={`mnu mnu1${open ? " is-open" : ""}`}>
        <Head mark={mark} onClose={() => setOpen(false)} />
        <nav>{menu.top.map((it) => <TreeNode key={it.id} menu={menu} it={it} depth={0} />)}</nav>
      </aside>
    </>
  );
}

// ─── 2 · Upar nav bar + dropdown ───
function TopNav({ menu, open, setOpen }) {
  const [drop, setDrop] = useState(null);
  const ref = useRef(null);
  useEsc(!!drop, () => setDrop(null));
  useEffect(() => {
    if (!drop) return undefined;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setDrop(null); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [drop]);
  return (
    <>
      {open && <div className="mnu-bd mnu-bd--m" onClick={() => setOpen(false)} />}
      <nav ref={ref} className={`mnu mnu2${open ? " is-open" : ""}`}>
        {menu.top.map((it) => (it.href
          ? <Link key={it.id} href={it.href} className={`mnu2-top${it.active ? " is-on" : ""}`}><i>{it.icon}</i>{short(it.label)}</Link>
          : (
            <div key={it.id} className="mnu2-g">
              <button type="button" className={`mnu2-top${it.active ? " is-on" : ""}${drop && drop[0] === it.trail[0] ? " is-drop" : ""}`}
                onClick={() => setDrop(drop && drop[0] === it.trail[0] ? null : it.trail)}>
                <i>{it.icon}</i>{short(it.label)} <b>▾</b>
              </button>
              {drop && drop[0] === it.trail[0] && (
                <div className="mnu2-drop"><Drill menu={menu} trail={drop} setTrail={setDrop} root={it.trail} /></div>
              )}
            </div>
          )))}
      </nav>
    </>
  );
}

// ─── 3 · Neeche tabs ───
function Tabs({ menu, open, setOpen, trail, setTrail }) {
  const tabs = menu.top.slice(0, 4);
  return (
    <>
      <nav className="mnu mnu3">
        {tabs.map((it) => (it.href
          ? <Link key={it.id} href={it.href} className={`mnu3-tab${it.active ? " is-on" : ""}`}><i>{it.icon}</i><span>{short(it.label)}</span></Link>
          : <button key={it.id} type="button" className={`mnu3-tab${it.active ? " is-on" : ""}`} onClick={() => { setTrail(it.trail); setOpen(true); }}><i>{it.icon}</i><span>{short(it.label)}</span></button>))}
        <button type="button" className={`mnu3-tab${open ? " is-on" : ""}`} onClick={() => { setTrail([]); setOpen(!open); }}><i>☰</i><span>Aur</span></button>
      </nav>
      {open && (
        <>
          <div className="mnu-bd" onClick={() => setOpen(false)} />
          <div className="mnu3-sheet">
            <span className="mnu3-grip" />
            <Drill menu={menu} trail={trail} setTrail={setTrail} />
          </div>
        </>
      )}
    </>
  );
}

// ─── 4 · Icon rail + flyout ───
function Rail({ menu, open, setOpen, mark }) {
  const [fly, setFly] = useState(null);
  useEsc(!!fly, () => setFly(null));
  const flyLv = fly ? menu.level([fly[0]]) : null;
  return (
    <>
      {(open || fly) && <div className="mnu-bd mnu-bd--clear" onClick={() => { setFly(null); setOpen(false); }} />}
      <nav className={`mnu mnu4${open ? " is-open" : ""}`}>
        <Link href="/" className="mnu4-logo">{mark}</Link>
        {menu.top.map((it) => (it.href
          ? <Link key={it.id} href={it.href} className={`mnu4-i${it.active ? " is-on" : ""}`} title={it.label}><i>{it.icon}</i><small>{short(it.label)}</small></Link>
          : <button key={it.id} type="button" title={it.label} className={`mnu4-i${it.active ? " is-on" : ""}${fly && fly[0] === it.trail[0] ? " is-fly" : ""}`}
            onClick={() => setFly(fly && fly[0] === it.trail[0] ? null : it.trail)}><i>{it.icon}</i><small>{short(it.label)}</small></button>))}
      </nav>
      {fly && flyLv && (
        <div className="mnu4-fly">
          <h3><i>{flyLv.icon}</i> {flyLv.title}</h3>
          <Drill menu={menu} trail={fly} setTrail={setFly} root={[fly[0]]} />
        </div>
      )}
    </>
  );
}

// ─── 5 · Command palette ───
function Palette({ menu, open, setOpen }) {
  const [q, setQ] = useState("");
  const [k, setK] = useState(0);
  const [drill, setDrill] = useState(null);
  const inp = useRef(null);
  const router = useRouter();
  const flat = useFlat(menu);
  useEffect(() => {
    const f = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); } };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [setOpen]);
  useEffect(() => { if (open) { setQ(""); setK(0); setDrill(null); setTimeout(() => inp.current?.focus(), 30); } }, [open]);
  const t = q.trim().toLowerCase();
  const res = t ? flat.filter((e) => hit(e, t)).slice(0, 40) : menu.top.map((it) => ({ it, path: [] }));
  const cur = Math.min(k, Math.max(0, res.length - 1));
  const go = (e) => { if (e.it.trail) setDrill(e.it.trail); else if (e.it.href) { setOpen(false); router.push(e.it.href); } };
  return (
    <>
      <button type="button" className="mnu5-open" onClick={() => setOpen(true)}>🔎 <span>Menu khojo…</span> <kbd>Ctrl K</kbd></button>
      {open && (
        <>
          <div className="mnu-bd mnu-bd--blur" onClick={() => setOpen(false)} />
          <div className="mnu mnu5" role="dialog">
            <div className="mnu5-box">
              <span>🔎</span>
              <input ref={inp} value={q} placeholder="Kahan jaana hai? — Polity, Sprint, Mock…" onChange={(e) => { setQ(e.target.value); setK(0); setDrill(null); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { setK(Math.min(res.length - 1, cur + 1)); e.preventDefault(); }
                  else if (e.key === "ArrowUp") { setK(Math.max(0, cur - 1)); e.preventDefault(); }
                  else if (e.key === "Enter" && res[cur]) { e.preventDefault(); go(res[cur]); }
                  else if (e.key === "Escape") setOpen(false);
                }} />
              <kbd>Esc</kbd>
            </div>
            {drill ? (
              <Drill menu={menu} trail={drill} setTrail={(t2) => setDrill(t2.length ? t2 : null)} root={[]} cls="mnu-drill mnu5-list" />
            ) : (
              <div className="mnu5-list">
                {res.map((e, i) => (
                  e.it.href
                    ? <Link key={`${e.it.id}${i}`} href={e.it.href} className={`mnu5-r${i === cur ? " is-k" : ""}`} onMouseEnter={() => setK(i)}><i>{e.it.icon}</i><span>{e.it.label}</span><small>{e.path.join(" › ")}</small></Link>
                    : <button key={`${e.it.id}${i}`} type="button" className={`mnu5-r${i === cur ? " is-k" : ""}`} onMouseEnter={() => setK(i)} onClick={() => go(e)}><i>{e.it.icon}</i><span>{e.it.label}</span><small>{e.path.join(" › ")} ›</small></button>
                ))}
                {!res.length && <span className="mnu-dim">Kuch nahi mila</span>}
              </div>
            )}
            <footer>↑↓ chuno · Enter kholo · Ctrl K kahin se bhi</footer>
          </div>
        </>
      )}
    </>
  );
}

// ─── 6 · Mega menu ───
function MegaCol({ menu, it }) {
  const [t, setT] = useState(it.trail);
  return (
    <section className="mnu6-col">
      <h4><i>{it.icon}</i> {it.label}</h4>
      <Drill menu={menu} trail={t} setTrail={setT} root={it.trail} />
    </section>
  );
}
function Mega({ menu, open, setOpen }) {
  const links = menu.top.filter((it) => it.href);
  const groups = menu.top.filter((it) => it.trail);
  return (
    <>
      {open && (
        <>
          <div className="mnu-bd" onClick={() => setOpen(false)} />
          <div className="mnu mnu6">
            <div className="mnu6-pins">
              {links.map((it) => <Link key={it.id} href={it.href} className={`mnu6-pin${it.active ? " is-on" : ""}`}><i>{it.icon}</i>{it.label}</Link>)}
            </div>
            <div className="mnu6-grid">{groups.map((it) => <MegaCol key={it.id} menu={menu} it={it} />)}</div>
          </div>
        </>
      )}
    </>
  );
}

// ─── 7 · Columns (Finder) ───
function Columns({ menu, open, setOpen, mark }) {
  const [t, setT] = useState(menu.pathTrail);
  useNeed(menu, t);
  const cols = [{ trail: [], lv: { title: "Menu", items: menu.top } }];
  for (let i = 1; i <= t.length; i++) {
    const lv = menu.level(t.slice(0, i));
    if (lv) cols.push({ trail: t.slice(0, i), lv });
  }
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollLeft = box.current.scrollWidth; }, [t.length, open]);
  if (!open) return null;
  return (
    <>
      <div className="mnu-bd" onClick={() => setOpen(false)} />
      <div className="mnu mnu7">
        <Head mark={mark} onClose={() => setOpen(false)} title={t.length ? cols.slice(1).map((c) => short(c.lv.title)).join(" › ") : "Prep Hub"} />
        <div className="mnu7-cols" ref={box}>
          {cols.map((c, ci) => (
            <div key={c.trail.join("/") || "root"} className="mnu7-col">
              {c.lv.items.map((it) => (it.href
                ? <Link key={it.id} href={it.href} className={`mnu7-r${it.active ? " is-on" : ""}`}><i>{it.icon}</i><span>{it.label}</span></Link>
                : <button key={it.id} type="button" className={`mnu7-r${t[ci] === it.trail[ci] ? " is-sel" : ""}`} onClick={() => setT(it.trail)}><i>{it.icon}</i><span>{it.label}</span><b>›</b></button>))}
              {c.lv.loading && <span className="mnu-dim">Loading…</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── 8 · Launcher ───
function Launcher({ menu, open, setOpen, trail, setTrail }) {
  useNeed(menu, trail);
  if (!open) return null;
  const lv = menu.level(trail) || { title: "Menu", items: menu.top };
  return (
    <div className="mnu mnu8">
      <header>
        {trail.length ? <button type="button" onClick={() => setTrail(trail.slice(0, -1))}>← Wapas</button> : <span />}
        <h2>{lv.icon && trail.length ? `${lv.icon} ` : ""}{trail.length ? lv.title : "Kahan chalein?"}</h2>
        <button type="button" onClick={() => setOpen(false)}>✕</button>
      </header>
      <div className="mnu8-grid">
        {lv.items.map((it) => <Row key={it.id} it={it.icon ? it : { ...it, icon: it.label.slice(0, 1) }} cls="mnu8-app" chev={false} onGroup={(g) => setTrail(g.trail)} />)}
        {lv.loading && <span className="mnu-dim">Loading…</span>}
      </div>
    </div>
  );
}

// ─── 9 · Daayen drawer + search ───
function RightDrawer({ menu, open, setOpen, trail, setTrail, mark }) {
  const [q, setQ] = useState("");
  const flat = useFlat(menu);
  const t = q.trim().toLowerCase();
  return (
    <>
      {open && <div className="mnu-bd" onClick={() => setOpen(false)} />}
      <aside className={`mnu mnu9${open ? " is-open" : ""}`}>
        <Head mark={mark} onClose={() => setOpen(false)} />
        <div className="mnu9-search"><span>🔎</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Menu mein dhoondo" /></div>
        {t ? (
          <div className="mnu-drill">
            {flat.filter((e) => hit(e, t)).slice(0, 50).map((e, i) => (
              <Row key={`${e.it.id}${i}`} it={{ ...e.it, label: e.path.length ? `${e.it.label}  ·  ${e.path.join(" › ")}` : e.it.label }}
                onGroup={(g) => { setQ(""); setTrail(g.trail); }} />
            ))}
          </div>
        ) : <Drill menu={menu} trail={trail} setTrail={setTrail} />}
      </aside>
    </>
  );
}

// ─── 10 · Dock ───
function Dock({ menu }) {
  const [pop, setPop] = useState(null);
  const ref = useRef(null);
  useEsc(!!pop, () => setPop(null));
  useEffect(() => {
    if (!pop) return undefined;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setPop(null); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [pop]);
  return (
    <div className="mnu mnu10" ref={ref}>
      {pop && (
        <div className="mnu10-pop">
          <h4>{menu.level([pop[0]])?.icon} {menu.level([pop[0]])?.title}</h4>
          <Drill menu={menu} trail={pop} setTrail={setPop} root={[pop[0]]} />
        </div>
      )}
      <nav>
        {menu.top.map((it) => (it.href
          ? <Link key={it.id} href={it.href} className={`mnu10-i${it.active ? " is-on" : ""}`}><i>{it.icon}</i><em>{short(it.label)}</em></Link>
          : <button key={it.id} type="button" className={`mnu10-i${it.active ? " is-on" : ""}${pop && pop[0] === it.trail[0] ? " is-pop" : ""}`} onClick={() => setPop(pop && pop[0] === it.trail[0] ? null : it.trail)}><i>{it.icon}</i><em>{short(it.label)}</em></button>))}
      </nav>
    </div>
  );
}

// ─── 11 · Gol (radial) ───
function Radial({ menu, open, setOpen }) {
  const [t, setT] = useState(null);
  useEffect(() => { if (!open) setT(null); }, [open]);
  const n = menu.top.length;
  return (
    <>
      <button type="button" className={`mnu11-fab${open ? " is-on" : ""}`} onClick={() => setOpen(!open)} aria-label="Menu">{open ? "✕" : "☰"}</button>
      {open && (
        <>
          <div className="mnu-bd mnu-bd--blur" onClick={() => setOpen(false)} />
          <div className="mnu mnu11">
            <div className="mnu11-ring">
              {menu.top.map((it, i) => {
                const a = (i / n) * 360 - 90;
                const on = t && it.trail && t[0] === it.trail[0];
                const st = { "--a": `${a}deg` };
                return it.href
                  ? <Link key={it.id} href={it.href} className={`mnu11-i${it.active ? " is-on" : ""}`} style={st} title={it.label}><i>{it.icon}</i><em>{short(it.label)}</em></Link>
                  : <button key={it.id} type="button" className={`mnu11-i${it.active ? " is-on" : ""}${on ? " is-sel" : ""}`} style={st} title={it.label} onClick={() => setT(on ? null : it.trail)}><i>{it.icon}</i><em>{short(it.label)}</em></button>;
              })}
              <div className="mnu11-core">
                {t
                  ? <Drill menu={menu} trail={t} setTrail={(x) => setT(x.length ? x : null)} root={[t[0]]} />
                  : <p>Gole par koi khaana chuno<br /><small>seedhe link turant khulte hain</small></p>}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── 12 · Chips ki patti ───
function Chips({ menu, trail, setTrail }) {
  useNeed(menu, trail);
  const lv = menu.level(trail) || { items: menu.top };
  const crumbs = trail.map((_, i) => menu.level(trail.slice(0, i + 1))).filter(Boolean);
  return (
    <nav className="mnu mnu12">
      <div className="mnu12-crumbs">
        <button type="button" className={trail.length ? "" : "is-on"} onClick={() => setTrail([])}>🏠</button>
        {crumbs.map((c, i) => (
          <button key={i} type="button" className={i === crumbs.length - 1 ? "is-on" : ""} onClick={() => setTrail(trail.slice(0, i + 1))}>› {c.icon} {short(c.title)}</button>
        ))}
      </div>
      <div className="mnu12-strip">
        {lv.items.map((it) => (it.href
          ? <Link key={it.id} href={it.href} className={`mnu12-c${it.active ? " is-on" : ""}`}><i>{it.icon}</i>{it.label}</Link>
          : <button key={it.id} type="button" className={`mnu12-c is-g${it.active ? " is-on" : ""}`} onClick={() => setTrail(it.trail)}><i>{it.icon}</i>{it.label} ›</button>))}
        {lv.loading && <span className="mnu-dim">Loading…</span>}
      </div>
    </nav>
  );
}

// ─── 13 · Do-pane (Discord) ───
function TwoPane({ menu, open, setOpen, mark }) {
  const firstG = menu.top.find((it) => it.trail);
  const [t, setT] = useState(() => (menu.pathTrail.length ? menu.pathTrail : firstG ? firstG.trail : []));
  const rootLv = t.length ? menu.level([t[0]]) : null;
  return (
    <>
      {open && <div className="mnu-bd mnu-bd--m" onClick={() => setOpen(false)} />}
      <aside className={`mnu mnu13${open ? " is-open" : ""}`}>
        <nav className="mnu13-srv">
          <Link href="/" className="mnu13-home">{mark}</Link>
          {menu.top.map((it) => (it.href
            ? <Link key={it.id} href={it.href} className={`mnu13-s${it.active ? " is-on" : ""}`} title={it.label}>{it.icon}</Link>
            : <button key={it.id} type="button" title={it.label} className={`mnu13-s${t[0] === it.trail[0] ? " is-sel" : ""}`} onClick={() => setT(it.trail)}>{it.icon}</button>))}
        </nav>
        <div className="mnu13-ch">
          {rootLv ? (
            <>
              <h3>{rootLv.title}</h3>
              <Drill menu={menu} trail={t} setTrail={setT} root={[t[0]]} />
            </>
          ) : <p className="mnu-dim">Baayen se chuno</p>}
          <div className="mnu13-direct">
            {menu.top.filter((it) => it.href).map((it) => <Link key={it.id} href={it.href} className={it.active ? "is-on" : ""}># {short(it.label)}</Link>)}
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── 14 · Card drawer ───
const CARD_C = ["#f5c451", "#60a5fa", "#34d399", "#f472b6", "#a78bfa", "#fb923c", "#22d3ee"];
function CardDrawer({ menu, open, setOpen, mark }) {
  const [t, setT] = useState(null);
  useEffect(() => { if (!open) setT(null); }, [open]);
  const links = menu.top.filter((it) => it.href);
  const groups = menu.top.filter((it) => it.trail);
  return (
    <>
      {open && <div className="mnu-bd" onClick={() => setOpen(false)} />}
      <aside className={`mnu mnu14${open ? " is-open" : ""}`}>
        <Head mark={mark} onClose={() => setOpen(false)} />
        {t ? (
          <Drill menu={menu} trail={t} setTrail={(x) => setT(x.length ? x : null)} root={[]} />
        ) : (
          <div className="mnu14-body">
            <div className="mnu14-pins">
              {links.map((it) => <Link key={it.id} href={it.href} className={it.active ? "is-on" : ""}><i>{it.icon}</i><span>{short(it.label)}</span></Link>)}
            </div>
            {groups.map((g, i) => {
              const lv = menu.level(g.trail);
              const quick = (lv?.items || []).slice(0, 3);
              return (
                <div key={g.id} className={`mnu14-card${g.active ? " is-on" : ""}`} style={{ "--c": CARD_C[i % CARD_C.length] }}>
                  <button type="button" className="mnu14-hd" onClick={() => setT(g.trail)}>
                    <i>{g.icon}</i><span>{g.label}</span><em>{lv?.items.length || ""} ›</em>
                  </button>
                  <div className="mnu14-q">
                    {quick.map((q) => (q.href
                      ? <Link key={q.id} href={q.href}>{short(q.label)}</Link>
                      : <button key={q.id} type="button" onClick={() => setT(q.trail)}>{q.icon} {short(q.label)}</button>))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}

// ─── 15 · Full-screen bade akshar ───
function BigType({ menu, open, setOpen, trail, setTrail }) {
  useNeed(menu, trail);
  if (!open) return null;
  const lv = menu.level(trail) || { items: menu.top };
  return (
    <div className="mnu mnu15">
      <header>
        <span>{trail.length ? <button type="button" onClick={() => setTrail(trail.slice(0, -1))}>← {short(lv.title)}</button> : "MENU"}</span>
        <button type="button" onClick={() => setOpen(false)}>Band ✕</button>
      </header>
      <ol>
        {lv.items.map((it, i) => (
          <li key={it.id}>
            {it.href
              ? <Link href={it.href} className={it.active ? "is-on" : ""}><small>{String(i + 1).padStart(2, "0")}</small>{it.label}</Link>
              : <button type="button" className={it.active ? "is-on" : ""} onClick={() => setTrail(it.trail)}><small>{String(i + 1).padStart(2, "0")}</small>{it.label} <b>→</b></button>}
          </li>
        ))}
        {lv.loading && <li className="mnu-dim">Loading…</li>}
      </ol>
    </div>
  );
}

const COMP = { 1: Tree, 2: TopNav, 3: Tabs, 4: Rail, 5: Palette, 6: Mega, 7: Columns, 8: Launcher, 9: RightDrawer, 10: Dock, 11: Radial, 12: Chips, 13: TwoPane, 14: CardDrawer, 15: BigType };

export default function MenuVariants(props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const C = COMP[props.lay];
  // Page badla to roop ki apni khuli cheezein (dropdown, flyout) band — naya
  // mount sabse saaf tareeka hai; khule khaane path se phir ban jaate hain.
  const k = useMemo(() => `${props.lay}|${pathname}?${params.toString()}`, [props.lay, pathname, params]);
  if (!C) return null;
  return <C key={k} {...props} />;
}
