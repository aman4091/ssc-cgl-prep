"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { UNIT_W, emptyDoc } from "@/lib/ink";

// Stylus se likhne ki surface. Storage ke baare mein kuch nahi jaanti — doc leti
// hai, doc wapas deti hai. Saara save/upload solve view karta hai. Isi wajah se
// aage kabhi native editor lagana pade to sirf ye file badlegi.
//
// ── Teen canvas, ek ke upar ek ──────────────────────────────────────────────
// done : sab committed strokes. Sirf scroll/undo/erase/zoom par redraw hota hai,
//        aur tab bhi sirf wahi strokes jo screen par hain (bbox culling).
// live : abhi chal raha stroke, INCREMENTALLY — har pointermove par sirf naye
//        segment. Poora stroke har move par dobara banana hi wo cheez hai jo web
//        ink ko laggy banati hai.
// pred : getPredictedEvents() ki poonch. Har move par mit'ti hai aur KABHI
//        commit nahi hoti — prediction mud'ne par aage nikal jaati hai, wo
//        permanent ho gayi to stroke tedha reh jayega.
//
// ── Canvas viewport ke barabar hai, page ke barabar NAHI ────────────────────
// Poore page jitna tall canvas banana bada jaal hai: DPR 3 par 1000×8000 CSS px
// = 3000×24000 device px ≈ 288 MB ek layer ka, aur Chrome ki 16384 px ki limit
// bhi paar. Isliye canvases sirf viewport jitne hain aur `position: sticky` se
// tike rehte hain; scroll spacer div karta hai aur hum ctx transform mein
// scrollTop ghusa dete hain. Yahi trick "jitni chahiye utni jagah" ko sach
// banati hai.

export const PALETTE = [
  // Har rang ke do roop — kaunsa chalega ye kaagaz ke rang par depend karta hai,
  // isliye stroke mein sirf INDEX save hota hai. Theme badle to purani writing
  // apne aap padhne layak rehti hai.
  { name: "Ink", light: "#1a1a1e", dark: "#eceff4" },
  { name: "Blue", light: "#1d4ed8", dark: "#7dd3fc" },
  { name: "Red", light: "#dc2626", dark: "#fca5a5" },
  { name: "Green", light: "#15803d", dark: "#86efac" },
];
export const PEN_SIZES = [2.5, 4.5, 8];
export const HL_SIZE = 20;

const MAX_H = 40000;      // ink units — bas ek runaway guard, practically infinite
const GROW_BY = 900;
const GROW_NEAR = 260;    // itna paas likha to apne aap jagah badhao
const ERASE_R = 11;       // ink units
const MIN_STEP = 0.7;     // isse paas ke points phenk do — jitter aur size dono kam
const UNDO_MAX = 100;

const penSeen = {
  get() { try { return localStorage.getItem("ink.penSeen") === "1"; } catch { return false; } },
  // `cgl.` prefix jaan-boojh kar nahi — ye device ki apni baat hai, sync par
  // jaane ki koi wajah nahi.
  set() { try { localStorage.setItem("ink.penSeen", "1"); } catch { /* ignore */ } },
};

const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

// Point se segment ki doori — eraser ka hit test yahi hai.
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  if (!len) return Math.sqrt(dist2(px, py, ax, ay));
  let t = ((px - ax) * dx + (py - ay) * dy) / len;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(px, py, ax + t * dx, ay + t * dy));
}

function bboxOf(stroke) {
  if (stroke._bb) return stroke._bb;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of stroke.points) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  const pad = (stroke.size || 4) * 1.5;
  // Cache — culling har scroll frame par chalta hai, dobara ginna faltu hai.
  stroke._bb = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  return stroke._bb;
}

const InkCanvas = forwardRef(function InkCanvas(
  { initialDoc, tool, colorIdx, sizeIdx, dark, onChange, onStats },
  ref
) {
  const surfaceRef = useRef(null);
  const doneRef = useRef(null);
  const liveRef = useRef(null);
  const predRef = useRef(null);

  const docRef = useRef(initialDoc || emptyDoc());
  const undoRef = useRef([]);
  const redoRef = useRef([]);
  const drawRef = useRef(null);   // abhi chal raha stroke
  const eraseRef = useRef(null);  // abhi chal raha eraser drag
  const touchRef = useRef(null);  // 1-finger pan / 2-finger pinch
  const predBoxRef = useRef(null); // pichhli prediction ka dabba (CSS px) — sirf itna clear hota hai
  const viewRef = useRef({ w: 0, h: 0, dpr: 1, unitPx: 1 });
  const zoomRef = useRef(1);

  const [, bump] = useState(0);           // toolbar ke undo/redo enable karne ke liye
  const rerender = () => bump((n) => n + 1);

  // tool/color/size ko ref mein bhi rakho — native listeners closure mein purani
  // value pakad lete hain warna, aur listeners dobara bandhna mehnga hai.
  const optRef = useRef({ tool, colorIdx, sizeIdx, dark });
  optRef.current = { tool, colorIdx, sizeIdx, dark };

  // Callbacks bhi ref mein: parent har render par naya onChange deta hai, aur
  // agar wo commit → pointer-listener effect ki dependency ban jaye to har
  // render par listeners dobara bandhte — beech mein chal raha stroke toot jata.
  const cbRef = useRef({ onChange, onStats });
  cbRef.current = { onChange, onStats };

  const colorOf = useCallback((idx) => {
    const c = PALETTE[idx] || PALETTE[0];
    return optRef.current.dark ? c.dark : c.light;
  }, []);

  // ── geometry ───────────────────────────────────────────────────────────────

  const measure = useCallback(() => {
    const s = surfaceRef.current;
    if (!s) return viewRef.current;
    const w = s.clientWidth;
    const h = s.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3); // 3 se aage sirf memory jalti hai
    const unitPx = (w / UNIT_W) * zoomRef.current;
    viewRef.current = { w, h, dpr, unitPx };
    for (const c of [doneRef.current, liveRef.current, predRef.current]) {
      if (!c) continue;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    return viewRef.current;
  }, []);

  // Ink units mein transform: uske baad sab drawing seedhe ink coordinates mein
  // hoti hai, aur lineWidth bhi apne aap sahi scale par aa jati hai.
  const applyTf = useCallback((ctx) => {
    const s = surfaceRef.current;
    const { dpr, unitPx } = viewRef.current;
    const k = dpr * unitPx;
    ctx.setTransform(k, 0, 0, k, -(s?.scrollLeft || 0) * dpr, -(s?.scrollTop || 0) * dpr);
  }, []);

  // Screen se ink coordinates. Origin (rect + scroll) EK BAAR per event padha
  // jata hai, har point par nahi.
  //
  // Ye seedha latency ka sawaal hai: getBoundingClientRect() aur scrollTop dono
  // browser se layout ginwate hain, aur ek pointermove mein coalesced points
  // 20-30 tak aa sakte hain. Per-point padhne par har stroke browser ko
  // sainkdon baar layout dobara ginwa raha tha — pen ke peeche latakti line ka
  // sabse bada hissa yahi tha.
  const originRef = useRef({ left: 0, top: 0, sx: 0, sy: 0 });
  const syncOrigin = useCallback(() => {
    const s = surfaceRef.current;
    if (!s) return;
    const r = s.getBoundingClientRect();
    originRef.current = { left: r.left, top: r.top, sx: s.scrollLeft, sy: s.scrollTop };
  }, []);

  const toInk = useCallback((clientX, clientY) => {
    const { unitPx } = viewRef.current;
    const o = originRef.current;
    return {
      x: (clientX - o.left + o.sx) / unitPx,
      y: (clientY - o.top + o.sy) / unitPx,
    };
  }, []);

  // ── drawing ────────────────────────────────────────────────────────────────

  // Ek stroke ko segment-by-segment kheencho. Midpoints ke through quadratic:
  // har raw sample control point ban jata hai aur curve midpoints se guzarti
  // hai — ek hi pass mein smooth, bina kisi lookahead ke.
  function paintStroke(ctx, st, from = 0) {
    const pts = st.points;
    if (!pts.length) return;
    const col = st._col;
    ctx.strokeStyle = col;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = st.tool === "hl" ? 0.32 : 1;

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, (st.size * widthOf(st, pts[0].p)) / 2, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const start = Math.max(1, from);
    for (let i = start; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const m0 = i === 1 ? p0 : { x: (pts[i - 2].x + p0.x) / 2, y: (pts[i - 2].y + p0.y) / 2 };
      const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(m0.x, m0.y);
      ctx.quadraticCurveTo(p0.x, p0.y, m1.x, m1.y);
      ctx.lineWidth = st.size * widthOf(st, p1.p);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Pressure ko motai mein badlo. Highlighter par pressure bekaar hai. Jis
  // device par pressure aata hi nahi (mouse hamesha 0.5, kuch styli 0) wahan
  // seedhi constant width — warna line bewajah patli-moti dikhti hai.
  function widthOf(st, pr) {
    if (st.tool === "hl" || !st._hasPressure) return 1;
    return Math.max(0.3, Math.min(1.6, 0.35 + 0.65 * (pr == null ? 0.5 : pr)));
  }

  const redrawDone = useCallback(() => {
    const c = doneRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const { w, h, dpr, unitPx } = viewRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    applyTf(ctx);

    const s = surfaceRef.current;
    const top = (s?.scrollTop || 0) / unitPx;
    const bot = top + h / unitPx;
    const left = (s?.scrollLeft || 0) / unitPx;
    const right = left + w / unitPx;

    for (const st of docRef.current.strokes) {
      const b = bboxOf(st);
      if (b.y1 < top || b.y0 > bot || b.x1 < left || b.x0 > right) continue; // screen par hai hi nahi
      if (!st._col) st._col = colorOf(st.color);
      paintStroke(ctx, st);
    }
  }, [applyTf, colorOf]);

  const clearLayer = useCallback((cvs) => {
    const c = cvs.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const { w, h, dpr } = viewRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w * dpr, h * dpr);
  }, []);

  // ── doc plumbing ───────────────────────────────────────────────────────────

  const commit = useCallback((next, op) => {
    if (op) {
      undoRef.current.push(op);
      if (undoRef.current.length > UNDO_MAX) undoRef.current.shift();
      redoRef.current = [];
    }
    docRef.current = next;
    cbRef.current.onChange?.(next);
    cbRef.current.onStats?.({ strokes: next.strokes.length, h: next.h });
    rerender();
  }, []);

  const grow = useCallback((by = GROW_BY) => {
    const d = docRef.current;
    const h = Math.min(MAX_H, d.h + by);
    if (h === d.h) return;
    commit({ ...d, h }, null);
  }, [commit]);

  // ── pointer handling ───────────────────────────────────────────────────────

  useEffect(() => {
    const stack = doneRef.current?.parentElement;
    const surface = surfaceRef.current;
    if (!stack || !surface) return undefined;

    const startStroke = (e) => {
      const { tool: t, colorIdx: ci, sizeIdx: si } = optRef.current;
      const isEraser = e.pointerType === "eraser" || (e.buttons & 32) === 32 || t === "eraser";
      const p = toInk(e.clientX, e.clientY);
      if (isEraser) {
        eraseRef.current = { last: p, removed: [], idx: [] };
        return;
      }
      const st = {
        color: ci,
        size: t === "hl" ? HL_SIZE : PEN_SIZES[si] || PEN_SIZES[1],
        tool: t === "hl" ? "hl" : "pen",
        points: [{ x: p.x, y: p.y, p: e.pressure || 0.5 }],
        _col: colorOf(ci),
        _hasPressure: false,
        _drawn: 0,
      };
      drawRef.current = st;
    };

    const addPoints = (evs) => {
      const st = drawRef.current;
      if (!st) return;
      for (const ev of evs) {
        const p = toInk(ev.clientX, ev.clientY);
        const last = st.points[st.points.length - 1];
        if (dist2(p.x, p.y, last.x, last.y) < MIN_STEP * MIN_STEP) continue;
        const pr = ev.pressure;
        // Asli pressure sirf tab maano jab wo 0 aur 0.5 se alag ho — mouse
        // hamesha 0.5 bhejta hai aur kuch styli pehle move tak 0.
        if (pr > 0 && Math.abs(pr - 0.5) > 0.02) st._hasPressure = true;
        st.points.push({ x: p.x, y: p.y, p: pr || 0.5 });
      }
    };

    const eraseAt = (p) => {
      const er = eraseRef.current;
      if (!er) return;
      const d = docRef.current;
      const keep = [];
      let hit = false;
      for (let i = 0; i < d.strokes.length; i++) {
        const st = d.strokes[i];
        const b = bboxOf(st);
        if (p.x < b.x0 - ERASE_R || p.x > b.x1 + ERASE_R || p.y < b.y0 - ERASE_R || p.y > b.y1 + ERASE_R) {
          keep.push(st);
          continue;
        }
        let touched = false;
        const pts = st.points;
        if (pts.length === 1) {
          touched = Math.sqrt(dist2(p.x, p.y, pts[0].x, pts[0].y)) < ERASE_R + st.size;
        } else {
          for (let j = 1; j < pts.length && !touched; j++) {
            if (distToSeg(p.x, p.y, pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y) < ERASE_R + st.size / 2) {
              touched = true;
            }
          }
        }
        if (touched) { er.removed.push(st); er.idx.push(i); hit = true; }
        else keep.push(st);
      }
      if (hit) {
        docRef.current = { ...d, strokes: keep };
        redrawDone();
      }
    };

    const onDown = (e) => {
      if (e.pointerType === "pen" || e.pointerType === "eraser") penSeen.set();
      const pen = e.pointerType === "pen" || e.pointerType === "eraser";
      const mouse = e.pointerType === "mouse";

      // Palm rejection: jis din is device par pen chala, us din se ungli sirf
      // navigation hai. Pen se pehle ungli likh sakti hai, warna bina-stylus
      // device par feature hi mar jata.
      if (e.pointerType === "touch" && penSeen.get()) {
        const t = touchRef.current;
        if (!t) {
          touchRef.current = { ids: [e.pointerId], y: e.clientY, x: e.clientX, top: surface.scrollTop, left: surface.scrollLeft };
        } else if (t.ids.length === 1) {
          t.ids.push(e.pointerId);
          t.pts = { [t.ids[0]]: { x: t.x, y: t.y }, [e.pointerId]: { x: e.clientX, y: e.clientY } };
          t.z0 = zoomRef.current;
          t.d0 = 0;
        }
        return;
      }
      if (!pen && !mouse && !(e.pointerType === "touch")) return;

      e.preventDefault();
      try { stack.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      syncOrigin();
      startStroke(e);
    };

    const onMove = (e) => {
      // do ungli / ek ungli — pan aur pinch
      const t = touchRef.current;
      if (t && t.ids.includes(e.pointerId)) {
        e.preventDefault();
        if (t.ids.length === 2 && t.pts) {
          t.pts[e.pointerId] = { x: e.clientX, y: e.clientY };
          const [a, b] = t.ids.map((id) => t.pts[id]);
          if (!a || !b) return;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (!t.d0) { t.d0 = d; return; }
          const z = Math.max(0.5, Math.min(3, t.z0 * (d / t.d0)));
          if (Math.abs(z - zoomRef.current) > 0.005) {
            zoomRef.current = z;
            measure();
            redrawDone();
            rerender();
          }
        } else {
          surface.scrollTop = t.top - (e.clientY - t.y);
          surface.scrollLeft = t.left - (e.clientX - t.x);
        }
        return;
      }

      if (eraseRef.current) {
        e.preventDefault();
        syncOrigin();
        const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        for (const ev of evs) eraseAt(toInk(ev.clientX, ev.clientY));
        return;
      }

      const st = drawRef.current;
      if (!st) return;
      e.preventDefault();
      syncOrigin();

      // S Pen 120-240 Hz par sample karta hai jabki pointermove ek frame mein ek
      // baar hi aata hai. Coalesced na lein to aadhe se zyada samples phenk denge
      // aur tez stroke polygon jaisa dikhega. Ye optimisation nahi, buniyaad hai.
      addPoints(e.getCoalescedEvents ? e.getCoalescedEvents() : [e]);

      const lctx = liveRef.current.getContext("2d");
      applyTf(lctx);
      paintStroke(lctx, st, st._drawn); // sirf naya hissa
      st._drawn = st.points.length;

      // Prediction: asli latency kam nahi hoti, par ink nib ke neeche baithti
      // dikhti hai. Apni layer par, har move par mit'ti hui — commit kabhi nahi.
      // Prediction ki poonch apni layer par — aur sirf PICHHLA chhota dabba
      // clear hota hai, poora canvas nahi.
      //
      // Poora clearRect DPR 3 par ~70 lakh pixel chhoota hai, aur ye har move
      // par chalta hai — 120 baar per second. Wahi kaam main thread ko atkata
      // hai, jisse browser samples jama karke ek saath deta hai (pen test page
      // par coalesced ka bada number theek yahi batata hai). Poonch do-teen
      // point ki hoti hai, to uska dabba bhi utna hi chhota hai.
      const pctx = predRef.current.getContext("2d");
      const { dpr } = viewRef.current;
      const pb = predBoxRef.current;
      if (pb) {
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        // "full" = pichhli baar dabba bharosemand nahi tha, to poora saaf karo.
        // Safety valve: dabbe ka hisaab kabhi galat nikla to zyada se zyada ek
        // frame ka nishan rahega, chipka hua kachra nahi.
        if (pb === "full") {
          const v = viewRef.current;
          pctx.clearRect(0, 0, v.w * dpr, v.h * dpr);
        } else {
          pctx.clearRect(pb.x * dpr, pb.y * dpr, pb.w * dpr, pb.h * dpr);
        }
        predBoxRef.current = null;
      }
      const pred = e.getPredictedEvents ? e.getPredictedEvents() : [];
      if (pred.length) {
        applyTf(pctx);
        const tail = { ...st, points: [st.points[st.points.length - 1]], _drawn: 0 };
        for (const ev of pred.slice(0, 2)) {
          const p = toInk(ev.clientX, ev.clientY);
          tail.points.push({ x: p.x, y: p.y, p: ev.pressure || 0.5 });
        }
        pctx.globalAlpha = 0.75;
        paintStroke(pctx, tail);
        pctx.globalAlpha = 1;

        // Agli baar isi dabbe ko clear karna hai — CSS px mein yaad rakh lo.
        let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
        for (const p of tail.points) {
          if (p.x < x0) x0 = p.x;
          if (p.x > x1) x1 = p.x;
          if (p.y < y0) y0 = p.y;
          if (p.y > y1) y1 = p.y;
        }
        const o = originRef.current;
        const upx = viewRef.current.unitPx;
        const pad = st.size * 2 + 6;
        predBoxRef.current = [x0, y0, x1, y1].every(Number.isFinite)
          ? {
            x: (x0 - pad) * upx - o.sx,
            y: (y0 - pad) * upx - o.sy,
            w: (x1 - x0 + pad * 2) * upx,
            h: (y1 - y0 + pad * 2) * upx,
          }
          : "full";
      }
    };

    const onUp = (e) => {
      const t = touchRef.current;
      if (t && t.ids.includes(e.pointerId)) {
        t.ids = t.ids.filter((id) => id !== e.pointerId);
        if (!t.ids.length) touchRef.current = null;
        else { t.pts = null; t.d0 = 0; t.y = e.clientY; t.x = e.clientX; t.top = surface.scrollTop; t.left = surface.scrollLeft; }
        return;
      }

      if (eraseRef.current) {
        const er = eraseRef.current;
        eraseRef.current = null;
        if (er.removed.length) commit(docRef.current, { type: "erase", strokes: er.removed, idx: er.idx });
        return;
      }

      const st = drawRef.current;
      drawRef.current = null;
      if (!st) return;
      try { stack.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

      const d = docRef.current;
      const strokes = [...d.strokes, st];
      // Neeche tak pahunch gaye to apne aap jagah badha do — soch ke beech mein
      // deewar nahi aani chahiye.
      let h = d.h;
      const b = bboxOf(st);
      if (b.y1 > h - GROW_NEAR) h = Math.min(MAX_H, h + GROW_BY);

      commit({ ...d, h, strokes }, { type: "add", strokes: [st] });
      // Sirf naya stroke done layer par chipkao. Pehle yahan poora redrawDone()
      // tha, jo har visible stroke dobara banata — matlab jitna page bharta
      // jata, pen uthate hi utna bada jhatka lagta. Naya stroke to pehle se
      // sahi jagah par hai, use bas ek baar draw karna hai.
      const dctx = doneRef.current.getContext("2d");
      applyTf(dctx);
      paintStroke(dctx, st);
      clearLayer(liveRef);
      clearLayer(predRef);
      predBoxRef.current = null;
    };

    const onCancel = (e) => { onUp(e); };

    const onScroll = () => {
      syncOrigin();
      redrawDone();
      clearLayer(liveRef);
      clearLayer(predRef);
      predBoxRef.current = null;
    };

    stack.addEventListener("pointerdown", onDown, { passive: false });
    stack.addEventListener("pointermove", onMove, { passive: false });
    stack.addEventListener("pointerup", onUp);
    stack.addEventListener("pointercancel", onCancel);
    surface.addEventListener("scroll", onScroll, { passive: true });
    // Long-press ka context menu stylus ke saath aa jata hai aur stroke tod deta hai.
    const noMenu = (e) => e.preventDefault();
    stack.addEventListener("contextmenu", noMenu);

    return () => {
      stack.removeEventListener("pointerdown", onDown);
      stack.removeEventListener("pointermove", onMove);
      stack.removeEventListener("pointerup", onUp);
      stack.removeEventListener("pointercancel", onCancel);
      stack.removeEventListener("contextmenu", noMenu);
      surface.removeEventListener("scroll", onScroll);
    };
  }, [applyTf, clearLayer, colorOf, commit, measure, redrawDone, toInk]);

  // ── size / theme / doc changes ─────────────────────────────────────────────

  useEffect(() => {
    measure();
    redrawDone();
    const ro = new ResizeObserver(() => { measure(); redrawDone(); });
    if (surfaceRef.current) ro.observe(surfaceRef.current);
    const onRot = () => { setTimeout(() => { measure(); redrawDone(); }, 120); };
    window.addEventListener("orientationchange", onRot);
    return () => { ro.disconnect(); window.removeEventListener("orientationchange", onRot); };
  }, [measure, redrawDone]);

  // Theme badla to har stroke ka cached rang bhool jao aur dobara resolve karo.
  useEffect(() => {
    for (const st of docRef.current.strokes) st._col = null;
    redrawDone();
  }, [dark, redrawDone]);

  // Naya question khula — doc badal do aur history saaf.
  useEffect(() => {
    docRef.current = initialDoc || emptyDoc();
    undoRef.current = [];
    redoRef.current = [];
    zoomRef.current = 1;
    if (surfaceRef.current) surfaceRef.current.scrollTop = 0;
    measure();
    redrawDone();
    clearLayer(liveRef);
    clearLayer(predRef);
    rerender();
  }, [initialDoc, measure, redrawDone, clearLayer]);

  // ── toolbar ke liye imperative API ─────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    canUndo: () => undoRef.current.length > 0,
    canRedo: () => redoRef.current.length > 0,
    // Abhi pen kaagaz par hai? Save/upload karne wale iska intezaar karte hain —
    // encodeDoc har stroke ka har point ghoomta hai, aur wo stroke ke beech chal
    // gaya to nib wahin ruk jati hai.
    isDrawing: () => !!drawRef.current || !!eraseRef.current,
    zoom: () => zoomRef.current,
    undo() {
      const op = undoRef.current.pop();
      if (!op) return;
      const d = docRef.current;
      let strokes;
      if (op.type === "add") strokes = d.strokes.filter((s) => !op.strokes.includes(s));
      else {
        // erase/clear ko wapas laao — wahi jagah par, taaki upar-neeche ka
        // kram (overlap) waisa hi rahe jaisa likhte waqt tha.
        strokes = [...d.strokes];
        for (let k = 0; k < op.strokes.length; k++) {
          strokes.splice(Math.min(op.idx?.[k] ?? strokes.length, strokes.length), 0, op.strokes[k]);
        }
      }
      redoRef.current.push(op);
      commit({ ...d, strokes }, null);
      redrawDone();
    },
    redo() {
      const op = redoRef.current.pop();
      if (!op) return;
      const d = docRef.current;
      const strokes = op.type === "add"
        ? [...d.strokes, ...op.strokes]
        : d.strokes.filter((s) => !op.strokes.includes(s));
      undoRef.current.push(op);
      commit({ ...d, strokes }, null);
      redrawDone();
    },
    clear() {
      const d = docRef.current;
      if (!d.strokes.length) return;
      commit({ ...d, strokes: [] }, { type: "clear", strokes: d.strokes, idx: d.strokes.map((_, i) => i) });
      redrawDone();
    },
    grow,
    setZoom(z) {
      zoomRef.current = Math.max(0.5, Math.min(3, z));
      measure();
      redrawDone();
      rerender();
    },
    doc: () => docRef.current,
  }), [commit, grow, measure, redrawDone]);

  const d = docRef.current;
  const { unitPx } = viewRef.current;
  const pxH = Math.max(1, d.h * (unitPx || 1));
  const pxW = UNIT_W * (unitPx || 1);

  return (
    <div className="ink-surface" ref={surfaceRef}>
      {/* Spacer scroll deta hai; canvases sticky reh kar sirf viewport ka hissa
          dikhate hain. Ruled lines CSS gradient se — canvas par khinchte to har
          scroll par dobara banani padti. */}
      <div className="ink-spacer" style={{ height: pxH, width: pxW }}>
        <div className="ink-stack">
          <canvas ref={doneRef} className="ink-c" />
          <canvas ref={liveRef} className="ink-c" />
          <canvas ref={predRef} className="ink-c" />
        </div>
      </div>
    </div>
  );
});

export default InkCanvas;
