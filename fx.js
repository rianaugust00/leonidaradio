// Animações do site: reveal ao rolar, inclinação 3D, parallax, ticker e título animado.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);

  // ---- Reveal ao entrar na tela ----
  const io = "IntersectionObserver" in window && !reduce
    ? new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }), { threshold: 0.12 })
    : null;

  // ---- Inclinação 3D + brilho que segue o mouse ----
  function enhance(el, i = 0) {
    if (el.dataset.fx) return;
    el.dataset.fx = "1";
    el.classList.add("reveal");
    el.style.setProperty("--d", `${Math.min(i, 8) * 70}ms`);
    if (io) io.observe(el); else el.classList.add("in");
    if (reduce) return;
    const glow = document.createElement("span");
    glow.className = "glow";
    el.appendChild(glow);
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add("tilt");
      el.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
    el.addEventListener("pointerleave", () => el.classList.remove("tilt"));
  }
  function scan() {
    document.querySelectorAll(".card:not([data-fx]), .story:not([data-fx])").forEach((el, i) => enhance(el, i));
  }

  // Cards e matérias são criados por JS: observa as listas.
  ["grid", "featured", "newsGrid"].forEach((id) => {
    const t = document.getElementById(id);
    if (t) new MutationObserver(scan).observe(t, { childList: true });
  });
  scan();

  // ---- Título letra a letra ----
  function splitTitle(h) {
    if (!h || reduce || h.dataset.split) return;
    h.dataset.split = "1";
    let n = 0;
    const walk = (node) => [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        [...c.textContent].forEach((ch) => {
          if (ch === " ") { f.append(" "); return; }
          const s = document.createElement("span");
          s.className = "ch"; s.style.setProperty("--i", n++); s.textContent = ch;
          f.append(s);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1) walk(c);
    });
    walk(h);
  }
  splitTitle($(".hero h1"));
  splitTitle($(".news-head h1"));

  // ---- Ticker de manchetes (tela de notícias) ----
  if (window.NEWS) {
    const head = $(".news-head");
    const t = document.createElement("div");
    t.className = "ticker"; t.setAttribute("aria-hidden", "true");
    const items = window.NEWS.map((n) => `<span>${n.title.replace(/</g, "&lt;")}</span>`).join("");
    t.innerHTML = `<div class="ticker-track">${items}${items}</div>`;
    head.appendChild(t);
  }

  // ---- Barra de progresso + parallax do hero ----
  const bar = document.createElement("div");
  bar.className = "scrollbar";
  document.body.appendChild(bar);
  const hero = $(".hero");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = max > 0 ? `${(scrollY / max) * 100}%` : "0";
      if (hero && !reduce && scrollY < innerHeight * 1.2) hero.style.backgroundPosition = `center, center, center calc(50% + ${scrollY * 0.25}px)`;
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reaplica o reveal quando a tela de notícias é mostrada.
  addEventListener("hashchange", () => setTimeout(scan, 0));
})();
