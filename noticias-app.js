(() => {
  const N = window.NEWS.slice().sort((a, b) => b.date.localeCompare(a.date));
  const $ = (id) => document.getElementById(id);
  const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  let cat = "Todas";

  const cats = ["Todas", ...new Set(N.map((n) => n.cat))];
  cats.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = c; b.className = "chip";
    b.setAttribute("aria-pressed", c === cat);
    b.onclick = () => {
      cat = c;
      [...$("filters").children].forEach((x) => x.setAttribute("aria-pressed", x === b));
      render();
    };
    $("filters").appendChild(b);
  });

  function card(n, big) {
    const el = document.createElement("article");
    el.className = big ? "story big" : "story";
    const cr = (window.NEWS_CREDITS || {})[n.id];
    const file = cr ? cr.file : (/\.\w+$/.test(n.img) ? n.img : n.img + ".svg");
    el.innerHTML = `
      <figure class="pic">
        <img src="assets/news/${file}" alt="" loading="lazy">
        <figcaption class="credit" hidden></figcaption>
      </figure>
      <div class="txt">
        <p class="meta"><span class="cat"></span><time></time></p>
        <h2 class="t"></h2>
        <p class="lead2"></p>
        <div class="more" hidden></div>
        <button type="button" class="read" aria-expanded="false">Ler matéria</button>
      </div>`;
    el.querySelector(".cat").textContent = n.cat;
    el.querySelector("time").textContent = fmtDate(n.date) + " · " + n.author;
    el.querySelector(".t").textContent = n.title;
    el.querySelector(".lead2").textContent = n.lead;
    if (cr) {
      const fc = el.querySelector(".credit");
      fc.hidden = false;
      fc.append("Foto: " + cr.artist + " · ");
      const a = document.createElement("a");
      a.href = cr.page; a.target = "_blank"; a.rel = "noopener"; a.textContent = cr.license + " · Wikimedia Commons";
      fc.appendChild(a);
    }
    const more = el.querySelector(".more"), btn = el.querySelector(".read");
    n.body.forEach((p) => { const e = document.createElement("p"); e.textContent = p; more.appendChild(e); });
    btn.onclick = () => {
      const open = more.hidden;
      more.hidden = !open;
      btn.setAttribute("aria-expanded", open);
      btn.textContent = open ? "Fechar" : "Ler matéria";
    };
    return el;
  }

  function render() {
    const list = N.filter((n) => cat === "Todas" || n.cat === cat);
    $("featured").replaceChildren(...(list[0] ? [card(list[0], true)] : []));
    $("newsGrid").replaceChildren(...list.slice(1).map((n) => card(n)));
  }
  render();

  // Roteador por hash: troca de tela sem recarregar, então o áudio não para.
  const vr = $("view-radio"), vn = $("view-news");
  function route() {
    const news = location.hash === "#noticias";
    vr.hidden = news; vn.hidden = !news;
    $("navNews").toggleAttribute("aria-current", news);
    $("navRadio").toggleAttribute("aria-current", !news);
    document.title = news ? "Vice City Dispatch — Notícias de Leonida (fan-made)" : "Rádio Leonida — Estações de GTA VI (fan-made)";
    if (news) window.scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  route();
})();
