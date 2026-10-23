// 📘 Notes ka Flashcards / Quiz — desktop wale "SSC Notes" ke study-addon
// (owner ne wahan joda) ka hi port. Book ke har topic ki HTML se: "Check
// yourself" ke sawaal + tables → flashcards (1, 2, 4, 8, 16 din wala box
// system); tables / chhote jawaab → roz ka 15 sawaal ka quiz. Jagah yaad
// isi browser mein (localStorage), book ke hisaab se.
//
// mountStudy(els, sources, key) → { open(mode), stop() } — stop keydown hatata hai.
//   els: { dock, panel, inner }   sources: [{ g: "topic ka naam", html }]

export function mountStudy(els, sources, key) {
  const dock = els.dock, panel = els.panel, IN = els.inner;
  const KEY = `studyaddon.${key}`;
  let st = { c: {}, s: { last: "", n: 0 }, q: {}, g: "__all" };
  try { const raw = localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); st.c = o.c || {}; st.s = o.s || st.s; st.q = o.q || {}; st.g = o.g || "__all"; } } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* quota */ } };
  const ds = (d) => { const m = d.getMonth() + 1, x = d.getDate(); return `${d.getFullYear()}-${m < 10 ? "0" : ""}${m}-${x < 10 ? "0" : ""}${x}`; };
  const today = () => ds(new Date());
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ds(d); };
  const studied = () => { const t = today(), y = addDays(-1); if (st.s.last === t) return; st.s.n = st.s.last === y ? st.s.n + 1 : 1; st.s.last = t; save(); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const seeded = (str) => { let h = 2166136261; for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (a, r) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); const t = a[k]; a[k] = a[j]; a[j] = t; } return a; };
  const clip = (s, n) => { s = s.trim(); return s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s; };
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".tag,svg,script,style,button").forEach((x) => x.remove());
    c.querySelectorAll("br,li,p,tr,div").forEach((x) => x.insertAdjacentText("beforebegin", " "));
    return (c.textContent || "").replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  };

  // ---------- har topic se cards / sawaal ----------
  let CARDS = null, QUIZ = null;
  const GROUPS = [];
  function build() {
    if (CARDS) return;
    CARDS = []; QUIZ = [];
    const seen = {}, gi = {};
    const uniq = (a) => { const o = [], m = {}; a.forEach((v) => { v = (v || "").trim(); if (v && !m[v.toLowerCase()]) { m[v.toLowerCase()] = 1; o.push(v); } }); return o; };
    const rowText = (h, c) => c.map((v, k) => (h && h[k] ? `${h[k]}: ` : "") + v).filter(Boolean).join("\n");
    const add = (G, g, topic, f, b) => {
      const k = `${f}|${b}`; if (seen[k]) return; seen[k] = 1;
      CARDS.push({ id: hash(k), f, b, g, t: topic }); G.cards++;
    };
    const pushQ = (G, g, topic, q, ans, pool, exp) => {
      const others = pool.filter((v) => v.toLowerCase() !== ans.toLowerCase());
      if (others.length < 3) return;
      QUIZ.push({ q, a: ans, pool: others, g, t: topic, e: clip(exp, 360), id: hash(`${q}|${ans}`) }); G.qs++;
    };
    sources.forEach((R) => {
      const root = new DOMParser().parseFromString(`<div>${R.html}</div>`, "text/html").body;
      if (!(R.g in gi)) { gi[R.g] = GROUPS.length; GROUPS.push({ name: R.g, cards: 0, qs: 0 }); }
      const G = GROUPS[gi[R.g]];
      let secs = [...root.querySelectorAll("section")];
      if (!secs.length) secs = [root];
      secs.forEach((sec) => {
        const h2 = sec.querySelector("h2"), topic = h2 ? txt(h2) : R.g;
        const shortAns = [];
        // 1) check-yourself sawaal
        sec.querySelectorAll("details").forEach((d) => {
          const sm = d.querySelector("summary"); if (!sm) return;
          const f = txt(sm); const c = d.cloneNode(true); const s2 = c.querySelector("summary"); if (s2) s2.remove();
          const b = txt(c); if (f.length < 3 || b.length < 1) return;
          add(G, R.g, topic, f, clip(b, 420));
          if (b.length <= 70) shortAns.push({ q: f, a: b });
        });
        // 2) table ki lines
        sec.querySelectorAll("table").forEach((tb) => {
          let rows = [...tb.querySelectorAll("tr")];
          let head = null;
          if (rows.length && rows[0].querySelector("th")) { head = [...rows[0].children].map(txt); rows = rows.slice(1); }
          let data = rows.map((r) => [...r.children].map(txt));
          // pehla column sirf number / Q-no ho to hatao
          const idCol = /^(#|q|q\.?\s?no\.?|no\.?|s\.?\s?no\.?|sr\.?(\s?no\.?)?)$/i.test((head && head[0]) || "")
            || (data.length > 1 && data.every((c) => /^(q\s?\d+[a-z]?\b.*|\d{1,3}[a-z]?\.?)$/i.test(c[0] || "")));
          if (idCol) { data = data.map((c) => c.slice(1)); if (head) head = head.slice(1); }
          data = data.filter((c) => c.length >= 2 && c[0] && c.slice(1).join("").length > 1);
          data.forEach((c) => {
            const front = c[0], rest = [];
            for (let k = 1; k < c.length; k++) { if (!c[k]) continue; rest.push((head && head[k] ? `${head[k]}: ` : "") + c[k]); }
            if (front.length < 2 || front.length > 140) return;
            const f = head && head[0] && front.length <= 4 ? `${head[0]} ${front}` : front;
            add(G, R.g, topic, f + (head && head[1] && rest.length === 1 ? `  →  ${head[1]}?` : ""), clip(rest.join("\n"), 420));
          });
          // table se MCQ
          if (data.length >= 4) {
            const c0 = uniq(data.map((c) => c[0])), c1 = uniq(data.map((c) => c[1] || ""));
            const shortC1 = c1.length >= 4 && c1.every((v) => v && v.length <= 70);
            const shortC0 = c0.length >= 4 && c0.every((v) => v.length <= 70);
            data.forEach((c) => {
              if (shortC1 && c[1]) {
                const lab = head && head[1] ? head[1] : "Answer";
                const q = `${head && head[0] ? `${head[0]}: ` : ""}${c[0]}\nWhich ${lab.toLowerCase()}?`;
                pushQ(G, R.g, topic, q, c[1], c1, rowText(head, c));
              } else if (shortC0 && c.slice(1).join(" ").length > 8) {
                const lab0 = head && head[0] ? head[0] : "Which one";
                const clue = []; for (let k = 1; k < c.length; k++) { if (c[k]) clue.push((head && head[k] ? `${head[k]}: ` : "") + c[k]); }
                pushQ(G, R.g, topic, `Which ${lab0.toLowerCase()} fits?\n${clip(clue.join("\n"), 220)}`, c[0], c0, rowText(head, c));
              }
            });
          }
        });
        // chhote jawaab wale check-yourself se MCQ
        if (shortAns.length >= 4) {
          const pool = uniq(shortAns.map((x) => x.a));
          shortAns.forEach((x) => pushQ(G, R.g, topic, x.q, x.a, pool, ""));
        }
      });
    });
  }

  // ---------- panel ----------
  let mode = "notes";
  const $ = (id) => IN.querySelector(`#${id}`);
  function setMode(m) {
    mode = m;
    dock.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
    if (m === "notes") { panel.hidden = true; document.documentElement.style.overflow = ""; return; }
    build(); panel.hidden = false; document.documentElement.style.overflow = "hidden"; panel.scrollTop = 0;
    if (m === "cards") { queue = []; done = 0; total = 0; flipped = false; renderCards(); } else { qs = []; renderQuiz(); }
  }
  const onDock = (e) => { const b = e.target.closest("button[data-m]"); if (b) setMode(b.dataset.m); };
  dock.addEventListener("click", onDock);

  const inGroup = (x) => st.g === "__all" || x.g === st.g;
  const groupSelect = (kind) => {
    const opts = `<option value="__all">Saare topics</option>${GROUPS.map((g) => { const n = kind === "cards" ? g.cards : g.qs; return n ? `<option value="${esc(g.name)}"${st.g === g.name ? " selected" : ""}>${esc(g.name)} (${n})</option>` : ""; }).join("")}`;
    return `<label class="nst-sel">Topic<select id="nst-g">${opts}</select></label>`;
  };
  const bindGroup = () => { const s = $("nst-g"); if (!s) return; if (st.g !== "__all" && !GROUPS.some((g) => g.name === st.g)) st.g = "__all"; s.value = st.g; s.onchange = () => { st.g = s.value; save(); setMode(mode); }; };
  const strip = () => {
    const t = today(), y = addDays(-1);
    let due = 0, nw = 0;
    CARDS.forEach((c) => { if (!inGroup(c)) return; const s = st.c[c.id]; if (!s) nw++; else if (s.d <= t) due++; });
    const qt = st.q[t];
    return `<div class="nst-strip"><span class="nst-pill hot">Streak <b>${(st.s.last === t || st.s.last === y) ? st.s.n : 0}</b> din</span><span class="nst-pill">Revise baaki <b>${due}</b></span><span class="nst-pill">Naye cards <b>${nw}</b></span><span class="nst-pill">Aaj ka quiz <b>${qt == null ? "abhi nahi" : `${qt.s} / ${qt.n}`}</b></span></div>`;
  };

  // ---------- flashcards ----------
  const IV = [0, 1, 2, 4, 8, 16], NEW_PER_ROUND = 20;
  let queue = [], done = 0, total = 0, flipped = false;
  function buildQueue() {
    const t = today(), due = [], fresh = [];
    CARDS.forEach((c, i) => { if (!inGroup(c)) return; const s = st.c[c.id]; if (!s) fresh.push(i); else if (s.d <= t) due.push(i); });
    shuffle(due, Math.random);
    queue = due.slice(0, 40).concat(fresh.slice(0, NEW_PER_ROUND)); total = queue.length; done = 0; flipped = false;
  }
  function renderCards() {
    if (!queue.length && !done) buildQueue();
    const head = `<div class="nst-head"><h2>Flashcards</h2>${groupSelect("cards")}</div>${strip()}<div class="nst-bar"><i style="width:${total ? (100 * done) / total : 0}%"></i></div>`;
    const lv = [0, 0, 0, 0, 0]; CARDS.forEach((c) => { if (!inGroup(c)) return; const s = st.c[c.id]; lv[s ? Math.min(s.b, 4) : 0]++; });
    const boxes = `<div class="nst-boxes">${["Naye", "Level 1", "Level 2", "Level 3", "Level 4+"].map((n, k) => `<div><b>${lv[k]}</b>${n}</div>`).join("")}</div>`;
    const note = `<p class="nst-note">Cards notes ke "Check yourself" sawaalon aur tables se bane hain. Har round: pehle revise wale, phir ${NEW_PER_ROUND} naye. Sahi wale 1, 2, 4, 8, 16 din baad wapas aate hain. Jagah isi browser mein yaad rehti hai.</p>`;
    if (!queue.length) {
      IN.innerHTML = `${head}<div class="nst-done"><h3>Round khatam</h3><p>Agle naye cards ke liye ek aur round, ya aaj ka quiz.</p><div class="nst-act"><button class="nst-btn pri" id="nst-more">Agla round<small>revise + ${NEW_PER_ROUND} naye</small></button><button class="nst-btn" id="nst-toq">Aaj ka quiz<small>15 sawaal</small></button></div></div>${boxes}${note}`;
      bindGroup();
      $("nst-more").onclick = () => { buildQueue(); if (!queue.length) { IN.querySelector(".nst-done p").textContent = "Is topic mein kuch baaki nahi: na revise, na naye cards."; return; } renderCards(); };
      $("nst-toq").onclick = () => setMode("quiz");
      return;
    }
    const c = CARDS[queue[0]], s = st.c[c.id] || { b: 0 };
    IN.innerHTML = `${head}<button class="nst-card" id="nst-flip"><span class="nst-side">${flipped ? "Jawaab" : "Sawaal"} · ${done + 1} / ${total}</span><span class="nst-front">${esc(c.f)}</span>${flipped ? `<span class="nst-back">${esc(c.b)}</span>` : ""}<span class="nst-topic">${esc(c.t)}</span></button>${
      flipped ? `<div class="nst-act"><button class="nst-btn bad" id="nst-no">Nahi aaya<small>isi round mein phir</small></button><button class="nst-btn ok" id="nst-yes">Aata tha<small>${IV[Math.min((s.b || 0) + 1, 5)]} din baad</small></button></div>`
        : `<div class="nst-act"><button class="nst-btn pri wide" id="nst-show">Jawaab dikhao<small>Space</small></button></div>`}${boxes}${note}`;
    bindGroup();
    $("nst-flip").onclick = () => { if (!flipped) { flipped = true; renderCards(); } };
    if (flipped) { $("nst-no").onclick = () => grade(false); $("nst-yes").onclick = () => grade(true); }
    else $("nst-show").onclick = () => { flipped = true; renderCards(); };
  }
  function grade(ok) {
    const i = queue.shift(), c = CARDS[i], s = st.c[c.id] || { b: 0, d: "" };
    if (ok) { s.b = Math.min((s.b || 0) + 1, 5); s.d = addDays(IV[s.b]); done++; } else { s.b = 1; s.d = today(); queue.push(i); }
    st.c[c.id] = s; flipped = false; studied(); save(); renderCards();
  }
  const onKey = (e) => {
    if (panel.hidden) return;
    if (e.key === "Escape") { setMode("notes"); return; }
    if (mode !== "cards" || !queue.length) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === "Space") { e.preventDefault(); if (!flipped) { flipped = true; renderCards(); } }
    else if (flipped && (e.key === "1" || e.key === "ArrowLeft")) grade(false);
    else if (flipped && (e.key === "2" || e.key === "ArrowRight")) grade(true);
  };
  document.addEventListener("keydown", onKey);

  // ---------- quiz ----------
  const QN = 15;
  let round = 0, qs = [], qi = 0, picks = [];
  function newQuiz() {
    const pool = QUIZ.filter(inGroup), r = seeded(`${today()}#${round}#${st.g}`), idx = shuffle(pool.map((_, k) => k), r);
    qs = idx.slice(0, QN).map((k) => { const q = pool[k]; const ops = shuffle(q.pool.slice(), r).slice(0, 3).concat([q.a]); shuffle(ops, r); return { q: q.q, a: ops.indexOf(q.a), o: ops, e: q.e, t: q.t }; });
    qi = 0; picks = [];
  }
  function renderQuiz() {
    if (!qs.length) newQuiz();
    const head = `<div class="nst-head"><h2>Aaj ka quiz</h2>${groupSelect("quiz")}</div>${strip()}<div class="nst-bar"><i style="width:${qs.length ? (100 * picks.length) / qs.length : 0}%"></i></div>`;
    if (!qs.length) { IN.innerHTML = `${head}<p class="nst-note">Is topic mein quiz banane layak table / chhote jawaab nahi. Doosra topic chuno.</p>`; bindGroup(); return; }
    if (qi >= qs.length) {
      const sc = picks.filter((p, k) => p === qs[k].a).length, t = today(), pv = st.q[t];
      if (!pv || sc > pv.s) st.q[t] = { s: sc, n: qs.length };
      studied(); save();
      const wrong = qs.map((q, k) => (picks[k] === q.a ? "" : `<li>${esc(q.q.replace(/\n/g, " · "))} <b>${esc(q.o[q.a])}</b></li>`)).join("");
      IN.innerHTML = `${head}<div class="nst-q"><span class="nst-score">${sc} / ${qs.length}</span><p>${sc === qs.length ? "Poore number. Ek aur set karo." : sc >= 11 ? "Achha score. Neeche wale ek baar aur dekh lo." : "Inhe notes mein padho, phir ek aur set."}</p>${wrong ? `<ol class="nst-list">${wrong}</ol>` : ""}<div class="nst-act"><button class="nst-btn pri" id="nst-again">Ek aur set<small>15 naye sawaal</small></button><button class="nst-btn" id="nst-toc">Flashcards</button></div></div>`;
      bindGroup();
      $("nst-again").onclick = () => { round++; newQuiz(); renderQuiz(); };
      $("nst-toc").onclick = () => setMode("cards");
      return;
    }
    const q = qs[qi], ans = picks.length > qi;
    let h = `<div class="nst-q"><span class="nst-tag">${esc(clip(q.t, 60))}</span><p class="nst-qt">${esc(q.q)}</p><div class="nst-opts">`;
    q.o.forEach((o, k) => { let cl = "nst-opt"; if (ans) { if (k === q.a) cl += " right"; else if (k === picks[qi]) cl += " wrong"; } h += `<button class="${cl}" data-k="${k}"${ans ? " disabled" : ""}><span class="l">${"abcd"[k]}</span><span>${esc(o)}</span></button>`; });
    h += "</div>";
    if (ans) h += `<p class="nst-exp"><b>${picks[qi] === q.a ? "Sahi." : `Jawaab: ${esc(q.o[q.a])}`}</b>${q.e ? `\n${esc(q.e)}` : ""}</p><div class="nst-act"><button class="nst-btn pri wide" id="nst-next">${qi + 1 < qs.length ? "Agla sawaal" : "Score dekho"}</button></div>`;
    h += `</div><p class="nst-note">Sawaal ${qi + 1} / ${qs.length}. Sawaal notes ki tables aur chhote jawaabon se bante hain; set roz badalta hai.</p>`;
    IN.innerHTML = head + h; bindGroup();
    if (!ans) IN.querySelectorAll(".nst-opt").forEach((b) => { b.onclick = () => { picks[qi] = +b.dataset.k; renderQuiz(); }; });
    else { const n = $("nst-next"); n.onclick = () => { qi++; renderQuiz(); }; n.focus(); }
  }

  return {
    open: setMode,
    stop: () => {
      dock.removeEventListener("click", onDock);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    },
  };
}
