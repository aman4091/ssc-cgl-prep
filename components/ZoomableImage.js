"use client";

import { useRef, useState } from "react";

// Pinch / wheel / double-tap zoom + drag-to-pan image viewer. Used inside the
// notes lightbox (GS theory/notes images) and anywhere a zoomable image helps.
export default function ZoomableImage({ src, alt }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const movedRef = useRef(false);

  const clamp = (s) => Math.min(6, Math.max(1, s));
  const reset = () => { setScale(1); setTx(0); setTy(0); };
  const zoomBy = (f) => setScale((s) => {
    const ns = clamp(s * f);
    if (ns === 1) { setTx(0); setTy(0); }
    return ns;
  });

  const onWheel = (e) => {
    if (e.cancelable) e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18);
  };
  const onDblClick = () => {
    if (scale > 1) reset(); else setScale(2.5);
  };

  // mouse drag pan
  const onMouseDown = (e) => {
    if (scale <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    movedRef.current = false;
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    movedRef.current = true;
    setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
    setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
  };
  const onMouseUp = () => { dragRef.current = null; };

  // touch: 1-finger pan (when zoomed) + 2-finger pinch
  const distOf = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = { d: distOf(e.touches), s: scale };
    } else if (e.touches.length === 1 && scale > 1) {
      dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx, ty };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      if (e.cancelable) e.preventDefault();
      const ns = clamp(pinchRef.current.s * (distOf(e.touches) / pinchRef.current.d));
      setScale(ns);
      if (ns === 1) { setTx(0); setTy(0); }
    } else if (e.touches.length === 1 && dragRef.current) {
      if (e.cancelable) e.preventDefault();
      setTx(dragRef.current.tx + (e.touches[0].clientX - dragRef.current.x));
      setTy(dragRef.current.ty + (e.touches[0].clientY - dragRef.current.y));
    }
  };
  const onTouchEnd = (e) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) dragRef.current = null;
  };

  return (
    <div
      className="zoomimg"
      onWheel={onWheel}
      onDoubleClick={onDblClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          cursor: scale > 1 ? "grab" : "zoom-in",
          transition: dragRef.current || pinchRef.current ? "none" : "transform 0.12s ease-out",
        }}
      />
      <div className="zoomimg__ctrl" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(1 / 1.4)} title="Zoom out">−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => zoomBy(1.4)} title="Zoom in">+</button>
        <button onClick={reset} title="Reset" disabled={scale === 1 && tx === 0 && ty === 0}>⤢</button>
      </div>
    </div>
  );
}
