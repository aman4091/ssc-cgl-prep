"use client";

// 🧭 Menu ke 15 naye roop — sab UPAR, website jaisi fix patti (baayen ki
// patti nahi). Upar ke dropdown se chunte hain; "4 · Icon rail" abhi wala.
//
// Sab components/Navbar ke model par chalte hain:
//   menu.top          — sabse upar ke khaane
//   menu.level(trail) — kisi khaane ke andar ki list { title, icon, items }
//   menu.need(trail)  — bank ho to uske chapter mangwa lo
//   menu.pathTrail    — abhi khule page ka raasta (breadcrumb ke liye)
// Patti ki unchai aur page ki jagah app/looks/menutop.css mein
// (<html data-menu="t1"> … "t15").
//
// Dropdown patti ke andar nahi, `position: fixed` hote hain — patti mein
// khaane zyada hon to wo bagal mein scroll hoti hai aur andar ka dropdown
// kat jata.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const TOP_LAYOUTS = [
  { id: "t1", name: "Upar patti — classic dropdown" },
  { id: "t2", name: "Do line — upar group, neeche uske page" },
  { id: "t3", name: "Mega menu — poori chaudai ka panel" },
  { id: "t4", name: "Tairti goli (pill) — beech mein" },
  { id: "t5", name: "Tabs + Aur ▾" },
  { id: "t6", name: "Icon toolbar — icon ke neeche naam" },
  { id: "t7", name: "Search bar — likho aur jao" },
  { id: "t8", name: "☰ Upar se girta parda (tiles)" },
  { id: "t9", name: "Breadcrumb — Ghar › Group › Page" },
  { id: "t10", name: "Jaldi wale links + Sab menu ▾" },
  { id: "t11", name: "Scroll par chhupne wali patti" },
  { id: "t12", name: "Start menu — cascade" },
  { id: "t13", name: "Upar dock — hover par bade icon" },
  { id: "t14", name: "Ribbon (Office jaisa)" },
  { id: "t15", name: "Beech mein logo, dono taraf menu" },
];

const short = (l) => String(l).split(" · ")[0];

function useNeed(menu, t) {
  const k = (t || []).join("/");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (t && t.length) menu.need(t); }, [k]);
}
function useEsc(on, close) {
  useEffect(() => {
    if (!on) return undefined;
    const f = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [on, close]);
}
// Patti ke neeche wali lakeer aur daayen ka kinara (DeepSeek chat docked ho
// to uske baayen tak).
function barBottom() {
  const b = document.querySelector(".mtp");
  return b ? Math.round(b.getBoundingClientRect().bottom) : 56;
}
function rightEdge() {
  const p = document.querySelector(".sa-panel");
  if (p && document.body.classList.contains("sa-docked") && window.innerWidth >= 1100) return Math.round(p.getBoundingClientRect().left);
  return window.innerWidth;
}
// Button ke neeche dropdown ki jagah (screen se bahar na jaye).
function placeUnder(el, w = 300) {
  const r = el.getBoundingClientRect();
  const right = rightEdge();
  return { top: barBottom() + 6, left: Math.max(8, Math.min(r.left, right - w - 8)), width: w };
}

function Row({ it, onGroup, cls = "mnu-row" }) {
  const c = `${cls}${it.active ? " is-on" : ""}`;
  if (it.href) return <Link href={it.href} className={c}><i>{it.icon}</i><span>{it.label}</span></Link>;
  return (
    <button type="button" className={c} onClick={() => onGroup(it)}>
      <i>{it.icon}</i><span>{it.label}</span><b>›</b>
    </button>
  );
}

// List / drill-down. `items` ho to sabse upar wahi list (root), warna
// `start` trail se shuru. Gehre level par "← wapas".
function Drill({ menu, start = [], items = null, rowCls, cls = "mnu-drill" }) {
  const [trail, setTrail] = useState(start);
  useNeed(menu, trail);
  const atRoot = items ? trail.length === 0 : trail.length <= start.length;
  const lv = trail.length ? menu.level(trail) : (items ? { title: "", items } : menu.level([]));
  if (!lv) return null;
  return (
    <div className={cls}>
      {!atRoot && (
        <button type="button" className="mnu-back" onClick={() => setTrail(items && trail.length <= 1 ? [] : trail.slice(0, -1))}>
          <b>←</b> <i>{lv.icon}</i> <span>{lv.title}</span>
        </button>
      )}
      {lv.items.map((it) => <Row key={it.id} it={it} cls={rowCls} onGroup={(g) => setTrail(g.trail)} />)}
      {lv.loading && <span className="mnu-dim">Loading…</span>}
      {!lv.loading && !lv.items.length && <span className="mnu-dim">Kuch nahi</span>}
    </div>
  );
}

// Patti ke neeche khulne wala panel. body mein portal — patti par
// backdrop-filter hai, uske andar `fixed` panel patti ke hisaab se kat jata.
function Pop({ pos, title, icon, children, cls = "", onClose }) {
  useEsc(true, onClose);
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="mtp-bd" onClick={onClose} />
      <div className={`mtp-pop ${cls}`} style={pos}>
        {title ? <h3><i>{icon}</i> {title}</h3> : null}
        {children}
      </div>
    </>,
    document.body,
  );
}

// Har roop ka khol: desktop par apni patti, phone par logo + ☰ aur upar se
// poora menu.
// Mouse se bagal mein scroll: pahiya (upar-neeche) patti ko daayen-baayen
// chalata hai, aur dabakar khinchne se bhi chalti hai (tablet + mouse).
function useMouseScroll(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const offs = [];
    for (const row of root.querySelectorAll(".mtp-row")) {
      const wheel = (e) => {
        if (row.scrollWidth <= row.clientWidth + 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        row.scrollLeft += e.deltaY;
        e.preventDefault();
      };
      let x0 = null, s0 = 0, moved = false;
      const down = (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; x0 = e.clientX; s0 = row.scrollLeft; moved = false; };
      const move = (e) => {
        if (x0 == null) return;
        const dx = e.clientX - x0;
        if (!moved && Math.abs(dx) > 5) { moved = true; row.classList.add("is-drag"); }
        if (moved) row.scrollLeft = s0 - dx;
      };
      const up = () => { x0 = null; row.classList.remove("is-drag"); };
      // Khinchne ke baad chhodne par link na khule.
      const click = (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
      row.addEventListener("wheel", wheel, { passive: false });
      row.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      row.addEventListener("click", click, true);
      offs.push(() => {
        row.removeEventListener("wheel", wheel);
        row.removeEventListener("pointerdown", down);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        row.removeEventListener("click", click, true);
      });
    }
    return () => offs.forEach((f) => f());
  });
}

function Bar({ id, mark, open, setOpen, menu, children, hidden = false, right = null }) {
  const ref = useRef(null);
  useMouseScroll(ref);
  return (
    <header ref={ref} className={`mtp mtp-${id}${hidden ? " is-hid" : ""}`}>
      <div className="mtp-d">{children}{right ? <span className="mtp-right">{right}</span> : null}</div>
      <div className="mtp-m">
        <Link href="/" className="mtp-logo">{mark}<b>SSC CGL Pre</b></Link>
        {right ? <span className="mtp-right">{right}</span> : null}
        <button type="button" className="mtp-burger" onClick={() => setOpen(!open)} aria-label="Menu">{open ? "✕" : "☰"}</button>
      </div>
      {open && (
        <Pop pos={{ top: barBottom() + 4, left: 8, right: 8 }} cls="mtp-pop--m" onClose={() => setOpen(false)}>
          <Drill menu={menu} />
        </Pop>
      )}
    </header>
  );
}

// Ek khaana patti par: seedha link, ya group jo dropdown kholta hai.
function Item({ it, drop, setDrop, cls = "mtp-i", children, w }) {
  const c = `${cls}${it.active ? " is-on" : ""}`;
  const body = children || <><i>{it.icon}</i><span>{short(it.label)}</span></>;
  if (it.href) return <Link href={it.href} className={c} title={it.label}>{body}</Link>;
  const on = drop && drop.it.id === it.id;
  return (
    <button type="button" title={it.label} className={`${c}${on ? " is-drop" : ""}`}
      onClick={(e) => setDrop(on ? null : { it, pos: placeUnder(e.currentTarget, w) })}>
      {body}<b className="mtp-car">▾</b>
    </button>
  );
}
function GroupPop({ menu, drop, setDrop }) {
  if (!drop) return null;
  const lv = menu.level(drop.it.trail);
  return (
    <Pop pos={drop.pos} title={lv ? lv.title : drop.it.label} icon={drop.it.icon} onClose={() => setDrop(null)}>
      <Drill menu={menu} start={drop.it.trail} />
    </Pop>
  );
}

// Upar ke khaane do hisson mein: "⭐ Jaldi" (seedhe link) aur groups.
function cats(menu) {
  const links = menu.top.filter((it) => it.href);
  const groups = menu.top.filter((it) => !it.href);
  return [{ id: "__jaldi", icon: "⭐", label: "Jaldi", items: links, active: links.some((x) => x.active) }, ...groups];
}
function catItems(menu, c) {
  if (c.items) return { items: c.items, loading: false };
  const lv = menu.level(c.trail);
  return lv ? { items: lv.items, loading: lv.loading } : { items: [], loading: false };
}
function useCat(menu) {
  const cs = cats(menu);
  const start = (cs.find((c) => !c.items && c.trail && menu.pathTrail[0] === c.trail[0]) || cs[0]).id;
  const [cur, setCur] = useState(start);
  return [cs, cs.find((c) => c.id === cur) || cs[0], setCur];
}

const Logo = ({ mark }) => <Link href="/" className="mtp-logo">{mark}<b>SSC CGL Pre</b></Link>;

// ─── t1 · classic ───
function Classic(p) {
  const [drop, setDrop] = useState(null);
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <nav className="mtp-row">{p.menu.top.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} />)}</nav>
      <GroupPop menu={p.menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t2 · do line ───
function TwoLine(p) {
  const { menu } = p;
  const [cs, cur, setCur] = useCat(menu);
  const [drop, setDrop] = useState(null);
  useNeed(menu, cur.trail);
  const sub = catItems(menu, cur);
  return (
    <Bar {...p}>
      <div className="mtp2-a">
        <Logo mark={p.mark} />
        <nav className="mtp-row">
          {cs.map((c) => (
            <button key={c.id} type="button" className={`mtp2-cat${c.id === cur.id ? " is-sel" : ""}${c.active ? " is-on" : ""}`} onClick={() => setCur(c.id)}>
              <i>{c.icon}</i>{short(c.label)}
            </button>
          ))}
        </nav>
      </div>
      <nav className="mtp-row mtp2-b">
        {sub.items.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp2-s" />)}
        {sub.loading && <span className="mnu-dim">Loading…</span>}
      </nav>
      <GroupPop menu={menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t3 · mega ───
function MegaCol({ menu, it, go }) {
  useNeed(menu, it.trail);
  const lv = menu.level(it.trail);
  return (
    <div className="mtp3-col">
      <h4><i>{it.icon}</i> {it.label}</h4>
      {lv && lv.items.slice(0, 14).map((x) => (x.href
        ? <Link key={x.id} href={x.href} className={x.active ? "is-on" : ""}>{x.label}</Link>
        : <button key={x.id} type="button" onClick={() => go(x.trail)}>{x.label} ›</button>))}
      {lv && lv.items.length > 14 && <button type="button" className="mtp3-more" onClick={() => go(it.trail)}>Saare {lv.items.length} ›</button>}
      {lv && lv.loading && <span className="mnu-dim">Loading…</span>}
    </div>
  );
}
function Mega(p) {
  const { menu } = p;
  const cs = cats(menu);
  const [mt, setMt] = useState(null);   // { c, trail }
  useNeed(menu, mt && mt.trail);
  const lv = mt ? (mt.trail ? menu.level(mt.trail) : { title: "Jaldi", items: mt.c.items }) : null;
  const links = lv ? lv.items.filter((x) => x.href) : [];
  const groups = lv ? lv.items.filter((x) => !x.href) : [];
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <nav className="mtp-row">
        {cs.map((c) => (
          <button key={c.id} type="button" className={`mtp-i${c.active ? " is-on" : ""}${mt && mt.c.id === c.id ? " is-drop" : ""}`}
            onClick={() => setMt(mt && mt.c.id === c.id ? null : { c, trail: c.items ? null : c.trail })}>
            <i>{c.icon}</i><span>{short(c.label)}</span><b className="mtp-car">▾</b>
          </button>
        ))}
      </nav>
      {mt && lv && (
        <Pop pos={{ top: barBottom(), left: 0, right: typeof window !== "undefined" ? window.innerWidth - rightEdge() : 0 }} cls="mtp3-pan" onClose={() => setMt(null)}>
          <div className="mtp3-hd">
            {mt.trail && mt.trail.length > 1 ? <button type="button" onClick={() => setMt({ ...mt, trail: mt.trail.slice(0, -1) })}>← wapas</button> : null}
            <b><i>{lv.icon || mt.c.icon}</i> {lv.title}</b>
          </div>
          {links.length > 0 && (
            <div className="mtp3-links">
              {links.map((x) => <Link key={x.id} href={x.href} className={x.active ? "is-on" : ""}><i>{x.icon}</i> {x.label}</Link>)}
            </div>
          )}
          {groups.length > 0 && <div className="mtp3-cols">{groups.map((g) => <MegaCol key={g.id} menu={menu} it={g} go={(t) => setMt({ ...mt, trail: t })} />)}</div>}
          {lv.loading && <span className="mnu-dim">Loading…</span>}
        </Pop>
      )}
    </Bar>
  );
}

// ─── t4 · tairti goli ───
function Pill(p) {
  const [drop, setDrop] = useState(null);
  return (
    <Bar {...p}>
      <nav className="mtp4-pill">
        <Link href="/" className="mtp4-home" title="Home">{p.mark}</Link>
        {p.menu.top.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp4-i"><i>{it.icon}</i><span>{short(it.label)}</span></Item>)}
      </nav>
      <GroupPop menu={p.menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t5 · tabs + aur ───
function Tabs(p) {
  const { menu } = p;
  const [drop, setDrop] = useState(null);
  const [more, setMore] = useState(null);
  const K = 7;
  const head = menu.top.slice(0, K);
  const rest = menu.top.slice(K);
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <nav className="mtp-row mtp5-tabs">
        {head.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp5-t" />)}
        {rest.length > 0 && (
          <button type="button" className={`mtp5-t${more ? " is-drop" : ""}${rest.some((x) => x.active) ? " is-on" : ""}`}
            onClick={(e) => setMore(more ? null : placeUnder(e.currentTarget, 300))}>
            <span>Aur ({rest.length})</span><b className="mtp-car">▾</b>
          </button>
        )}
      </nav>
      <GroupPop menu={menu} drop={drop} setDrop={setDrop} />
      {more && <Pop pos={more} title="Aur" icon="☰" onClose={() => setMore(null)}><Drill menu={menu} items={rest} /></Pop>}
    </Bar>
  );
}

// ─── t6 · icon toolbar ───
function Toolbar(p) {
  const [drop, setDrop] = useState(null);
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <nav className="mtp-row mtp6-row">
        {p.menu.top.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp6-i"><i>{it.icon}</i><small>{short(it.label)}</small></Item>)}
      </nav>
      <GroupPop menu={p.menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t7 · search ───
function useFlat(menu) {
  // Seedhe link + har group / andar ke group ka naam (bank ke chapter tabhi
  // jab wo ek baar khul chuke hon — bina khole sab mangwana bhaari hai).
  const out = [];
  const walk = (items, path, depth) => {
    for (const x of items || []) {
      out.push({ it: x, path });
      if (!x.href && depth < 2) {
        const lv = menu.level(x.trail);
        walk(lv && lv.items, [...path, x.label], depth + 1);
      }
    }
  };
  walk(menu.top, [], 0);
  return out;
}
function Search(p) {
  const { menu } = p;
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [grp, setGrp] = useState(null);   // group result → uska drill
  const flat = useFlat(menu);
  const s = q.trim().toLowerCase();
  const hits = s ? flat.filter((e) => `${e.it.label} ${e.path.join(" ")}`.toLowerCase().includes(s)).slice(0, 14) : [];
  const quick = menu.top.filter((it) => it.href).slice(0, 4);
  const box = useRef(null);
  const close = () => { setQ(""); setFocus(false); };
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <div className="mtp7-box" ref={box}>
        <span>🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) {
              if (hits[0].it.href) router.push(hits[0].it.href);
              else setGrp({ it: hits[0].it, pos: placeUnder(box.current, 320) });
              close();
            }
            if (e.key === "Escape") close();
          }}
          placeholder="Menu mein dhoondo — Polity, Vocab, Answers…" />
      </div>
      <nav className="mtp-row mtp7-quick">
        {quick.map((it) => <Link key={it.id} href={it.href} className={`mtp7-q${it.active ? " is-on" : ""}`}><i>{it.icon}</i>{short(it.label)}</Link>)}
      </nav>
      {focus && s && box.current && (
        <Pop pos={placeUnder(box.current, Math.max(320, box.current.getBoundingClientRect().width))} cls="mtp7-res" onClose={() => setFocus(false)}>
          {hits.length ? hits.map((e) => {
            const body = <><i>{e.it.icon}</i><span>{e.it.label}{e.path.length ? <small> · {e.path.join(" › ")}</small> : null}</span></>;
            const k = `${e.it.id}|${e.path.join("/")}`;
            return e.it.href
              ? <Link key={k} href={e.it.href} className="mnu-row" onClick={close}>{body}</Link>
              : <button key={k} type="button" className="mnu-row" onClick={() => { setGrp({ it: e.it, pos: placeUnder(box.current, 320) }); close(); }}>{body}<b>›</b></button>;
          }) : <span className="mnu-dim">Kuch nahi mila</span>}
        </Pop>
      )}
      {grp && <GroupPop menu={menu} drop={grp} setDrop={setGrp} />}
    </Bar>
  );
}

// ─── t8 · upar se girta parda ───
function Tiles({ menu }) {
  const [trail, setTrail] = useState([]);
  useNeed(menu, trail);
  const lv = menu.level(trail);
  if (!lv) return null;
  return (
    <>
      {trail.length > 0 && <button type="button" className="mtp8-back" onClick={() => setTrail(trail.slice(0, -1))}>← {lv.icon} {lv.title}</button>}
      <div className="mtp8-grid">
        {lv.items.map((it) => (it.href
          ? <Link key={it.id} href={it.href} className={`mtp8-t${it.active ? " is-on" : ""}`}><i>{it.icon}</i><span>{it.label}</span></Link>
          : <button key={it.id} type="button" className={`mtp8-t${it.active ? " is-on" : ""}`} onClick={() => setTrail(it.trail)}><i>{it.icon}</i><span>{it.label} ›</span></button>))}
      </div>
      {lv.loading && <span className="mnu-dim">Loading…</span>}
    </>
  );
}
function Sheet(p) {
  const [on, setOn] = useState(false);
  const quick = p.menu.top.filter((it) => it.href).slice(0, 4);
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <button type="button" className={`mtp8-btn${on ? " is-drop" : ""}`} onClick={() => setOn(!on)}>{on ? "✕ Band" : "☰ Saara menu"}</button>
      <nav className="mtp-row">{quick.map((it) => <Link key={it.id} href={it.href} className={`mtp-i${it.active ? " is-on" : ""}`}><i>{it.icon}</i><span>{short(it.label)}</span></Link>)}</nav>
      {on && (
        <Pop pos={{ top: barBottom(), left: 0, right: typeof window !== "undefined" ? window.innerWidth - rightEdge() : 0 }} cls="mtp8-sheet" onClose={() => setOn(false)}>
          <Tiles menu={p.menu} />
        </Pop>
      )}
    </Bar>
  );
}

// ─── t9 · breadcrumb ───
function Crumbs(p) {
  const { menu } = p;
  const [drop, setDrop] = useState(null);   // { t, pos }
  const t = menu.pathTrail || [];
  const crumbs = [{ t: [], label: "Ghar", icon: "🏠" }];
  for (let i = 1; i <= t.length; i++) {
    const lv = menu.level(t.slice(0, i));
    if (lv) crumbs.push({ t: t.slice(0, i), label: lv.title, icon: lv.icon });
  }
  const page = menu.top.find((x) => x.href && x.active);
  const dl = drop ? (drop.t.length ? menu.level(drop.t) : null) : null;
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <nav className="mtp-row mtp9-row">
        {crumbs.map((c, i) => (
          <span key={c.t.join("/") || "root"} className="mtp9-c">
            {i > 0 && <em>›</em>}
            <button type="button" className={drop && drop.t.join("/") === c.t.join("/") ? "is-drop" : ""}
              onClick={(e) => setDrop(drop && drop.t.join("/") === c.t.join("/") ? null : { t: c.t, pos: placeUnder(e.currentTarget, 300) })}>
              <i>{c.icon}</i>{c.label}<b className="mtp-car">▾</b>
            </button>
          </span>
        ))}
        {!t.length && page && <span className="mtp9-c"><em>›</em><b className="mtp9-page"><i>{page.icon}</i>{page.label}</b></span>}
      </nav>
      {drop && (
        <Pop pos={drop.pos} title={dl ? dl.title : "Menu"} icon={dl ? dl.icon : "🏠"} onClose={() => setDrop(null)}>
          <Drill key={drop.t.join("/")} menu={menu} start={drop.t} />
        </Pop>
      )}
    </Bar>
  );
}

// ─── t10 · jaldi + sab menu ───
function Split(p) {
  const [all, setAll] = useState(null);
  const quick = p.menu.top.filter((it) => it.href).slice(0, 6);
  return (
    <Bar {...p}>
      <Logo mark={p.mark} />
      <nav className="mtp-row mtp10-q">{quick.map((it) => <Link key={it.id} href={it.href} className={`mtp10-l${it.active ? " is-on" : ""}`}>{short(it.label)}</Link>)}</nav>
      <span className="mtp-sp" />
      <button type="button" className={`mtp10-all${all ? " is-drop" : ""}`} onClick={(e) => setAll(all ? null : (() => { const r = e.currentTarget.getBoundingClientRect(); return { top: barBottom() + 6, left: Math.max(8, r.right - 560), width: 560 }; })())}>
        ☰ Sab menu <b className="mtp-car">▾</b>
      </button>
      {all && <Pop pos={all} title="Saara menu" icon="☰" cls="mtp10-pan" onClose={() => setAll(null)}><Drill menu={p.menu} /></Pop>}
    </Bar>
  );
}

// ─── t11 · scroll par chhupe ───
function AutoHide(p) {
  const [drop, setDrop] = useState(null);
  const [hid, setHid] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const f = () => {
      const y = window.scrollY;
      if (y > last + 6 && y > 80) setHid(true);
      else if (y < last - 6 || y < 40) setHid(false);
      last = y;
    };
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <Bar {...p} hidden={hid && !drop && !p.open}>
      <Logo mark={p.mark} />
      <nav className="mtp-row">{p.menu.top.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} />)}</nav>
      <GroupPop menu={p.menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t12 · start menu cascade ───
function CasCol({ menu, trail, sel, onPick }) {
  useNeed(menu, trail);
  const lv = menu.level(trail);
  if (!lv) return null;
  return (
    <div className="mtp12-col">
      {trail.length > 0 && <h4><i>{lv.icon}</i> {lv.title}</h4>}
      {lv.items.map((it) => (it.href
        ? <Link key={it.id} href={it.href} className={`mnu-row${it.active ? " is-on" : ""}`}><i>{it.icon}</i><span>{it.label}</span></Link>
        : <button key={it.id} type="button" className={`mnu-row${it.active ? " is-on" : ""}${sel === it.id ? " is-sel" : ""}`} onMouseEnter={() => onPick(it)} onClick={() => onPick(it)}>
          <i>{it.icon}</i><span>{it.label}</span><b>›</b>
        </button>))}
      {lv.loading && <span className="mnu-dim">Loading…</span>}
    </div>
  );
}
function Start(p) {
  const [on, setOn] = useState(null);
  const [c1, setC1] = useState(null);
  const [c2, setC2] = useState(null);
  const quick = p.menu.top.filter((it) => it.href).slice(0, 6);
  return (
    <Bar {...p}>
      <button type="button" className={`mtp12-start${on ? " is-drop" : ""}`} onClick={(e) => { setC1(null); setC2(null); setOn(on ? null : { top: barBottom() + 6, left: Math.max(8, e.currentTarget.getBoundingClientRect().left) }); }}>
        ⊞ <b>Start</b>
      </button>
      <Logo mark={p.mark} />
      <nav className="mtp-row">{quick.map((it) => <Link key={it.id} href={it.href} className={`mtp-i${it.active ? " is-on" : ""}`}><i>{it.icon}</i><span>{short(it.label)}</span></Link>)}</nav>
      {on && (
        <Pop pos={on} cls="mtp12-pan" onClose={() => setOn(null)}>
          <CasCol menu={p.menu} trail={[]} sel={c1 && c1.id} onPick={(it) => { setC1(it); setC2(null); }} />
          {c1 && <CasCol menu={p.menu} trail={c1.trail} sel={c2 && c2.id} onPick={(it) => setC2(it)} />}
          {c2 && <CasCol menu={p.menu} trail={c2.trail} onPick={() => {}} />}
        </Pop>
      )}
    </Bar>
  );
}

// ─── t13 · dock ───
function Dock(p) {
  const [drop, setDrop] = useState(null);
  return (
    <Bar {...p}>
      <nav className="mtp13-dock">
        <Link href="/" className="mtp13-i" title="Home"><i>{p.mark}</i><small>Home</small></Link>
        {p.menu.top.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp13-i"><i>{it.icon}</i><small>{short(it.label)}</small></Item>)}
      </nav>
      <GroupPop menu={p.menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t14 · ribbon ───
function Ribbon(p) {
  const { menu } = p;
  const [cs, cur, setCur] = useCat(menu);
  const [drop, setDrop] = useState(null);
  useNeed(menu, cur.trail);
  const sub = catItems(menu, cur);
  return (
    <Bar {...p}>
      <div className="mtp14-tabs">
        <Logo mark={p.mark} />
        <nav className="mtp-row">
          {cs.map((c) => (
            <button key={c.id} type="button" className={`mtp14-tab${c.id === cur.id ? " is-sel" : ""}${c.active ? " is-on" : ""}`} onClick={() => setCur(c.id)}>
              {short(c.label)}
            </button>
          ))}
        </nav>
      </div>
      <nav className="mtp-row mtp14-rib">
        {sub.items.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp14-b"><i>{it.icon || "•"}</i><small>{short(it.label)}</small></Item>)}
        {sub.loading && <span className="mnu-dim">Loading…</span>}
      </nav>
      <GroupPop menu={menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

// ─── t15 · beech mein logo ───
function Center(p) {
  const [drop, setDrop] = useState(null);
  const half = Math.ceil(p.menu.top.length / 2);
  const L = p.menu.top.slice(0, half);
  const R = p.menu.top.slice(half);
  return (
    <Bar {...p}>
      <nav className="mtp-row mtp15-l">{L.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp15-i"><span>{short(it.label)}</span></Item>)}</nav>
      <Link href="/" className="mtp15-logo">{p.mark}<b>SSC CGL</b></Link>
      <nav className="mtp-row mtp15-r">{R.map((it) => <Item key={it.id} it={it} drop={drop} setDrop={setDrop} cls="mtp15-i"><span>{short(it.label)}</span></Item>)}</nav>
      <GroupPop menu={p.menu} drop={drop} setDrop={setDrop} />
    </Bar>
  );
}

const COMP = { t1: Classic, t2: TwoLine, t3: Mega, t4: Pill, t5: Tabs, t6: Toolbar, t7: Search, t8: Sheet, t9: Crumbs, t10: Split, t11: AutoHide, t12: Start, t13: Dock, t14: Ribbon, t15: Center };

export default function MenuTop(props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const C = COMP[props.lay];
  // Page badla to khule dropdown band — naya mount sabse saaf tareeka hai.
  const k = useMemo(() => `${props.lay}|${pathname}?${params.toString()}`, [props.lay, pathname, params]);
  if (!C) return null;
  return <C key={k} id={props.lay} {...props} />;
}
