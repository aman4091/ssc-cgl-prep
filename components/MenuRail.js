"use client";

// 🧭 Menu — ICON RAIL. Baayen patli patti: har khaane ka icon aur neeche
// chhota naam. Seedha link turant khulta hai; group (PYQ Bank, Notes…) dabane
// par bagal mein FLYOUT khulta hai jisme andar ke level drill-down se — bank
// ke chapter tak. Owner ne 15 roop mein se yahi chuna.
//
// Data components/Navbar ka model deta hai:
//   menu.top          — sabse upar ke khaane
//   menu.level(trail) — kisi khaane ke andar ki list { title, icon, items }
//   menu.need(trail)  — bank ho to uske chapter mangwa lo
// Page ki jagah aur phone ka parda app/looks/menus.css mein.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const short = (l) => String(l).split(" · ")[0];

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

export default function MenuRail(props) {
  const pathname = usePathname();
  const params = useSearchParams();
  // Page badla to flyout band — naya mount sabse saaf tareeka hai.
  return <Rail key={`${pathname}?${params.toString()}`} {...props} />;
}
