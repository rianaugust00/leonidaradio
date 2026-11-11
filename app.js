(() => {
  const S = window.STATIONS;
  const P = window.PLAYLISTS || {};
  const $ = (id) => document.getElementById(id);
  const audio = $("audio"), player = $("player"), grid = $("grid");
  const logo = (s) => `assets/logos/${s.id}.png`;
  const bg = (s) => `assets/bg/${s.id}.jpg`;
  const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  const ICON_PAUSE = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';

  let cur = Number(localStorage.getItem("gtaradio:last")) || 0;
  if (cur >= S.length) cur = 0;
  let wantPlay = false;
  let track = null;

  // Programação 24/7: a posição "ao vivo" vem do relógio, então a playlist
  // repete em loop e todos os ouvintes escutam o mesmo ponto.
  function nowOn(sid) {
    const tr = P[sid] || [];
    if (!tr.length) return null;
    const total = tr.reduce((a, t) => a + t.duration, 0);
    let pos = (Date.now() / 1000) % total;
    for (let i = 0; i < tr.length; i++) {
      if (pos < tr[i].duration) return { i, offset: pos, track: tr[i] };
      pos -= tr[i].duration;
    }
    return { i: 0, offset: 0, track: tr[0] };
  }

  // ---------- Cards ----------
  const cards = S.map((s, i) => {
    const el = document.createElement("article");
    el.className = "card";
    el.style.setProperty("--bg", `url("${bg(s)}")`);
    el.style.setProperty("--c", s.colors[0]);
    el.innerHTML = `
      <img class="logo" alt="" loading="lazy">
      <p class="desc"></p>
      <p class="djs"></p>
      <p class="now"><span>Agora</span><b></b></p>
      <button type="button" class="listen"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="lbl">Ouvir estação</span></button>`;
    el.querySelector(".logo").src = logo(s);
    el.querySelector(".logo").alt = s.name;
    el.querySelector(".desc").textContent = s.desc;
    el.querySelector(".djs").textContent = s.djs.join(" · ");
    el.querySelector(".listen").setAttribute("aria-label", `Ouvir ${s.name}`);
    el.querySelector(".listen").onclick = () => (i === cur && !audio.paused ? pause() : select(i, true));
    grid.appendChild(el);
    return el;
  });

  // Atualiza o "tocando agora" de todas as estações.
  function refreshCards() {
    S.forEach((s, i) => {
      const n = nowOn(s.id);
      cards[i].querySelector(".now b").textContent = n ? `${n.track.title} — ${n.track.artist}` : "Sem programação";
    });
  }

  // ---------- Player ----------
  const setStatus = (t) => ($("status").textContent = t);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function showTrack(t) {
    track = t;
    $("pTrack").textContent = t ? `${t.title} — ${t.artist}` : "Sem programação: rode tools/build_playlists.py";
    const a = $("pCredit");
    a.textContent = t ? "Licença Creative Commons · Jamendo" : "";
    if (t) a.href = t.license || t.page || "#"; else a.removeAttribute("href");
  }

  function setPlaying(on) {
    player.classList.toggle("playing", on);
    cards.forEach((c, k) => {
      c.classList.toggle("playing", on && k === cur);
      c.querySelector(".lbl").textContent = on && k === cur ? "No ar" : "Ouvir estação";
    });
    $("playIcon").innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    $("play").setAttribute("aria-label", on ? "Pausar" : "Tocar");
  }

  // Carrega a faixa que está "no ar" agora, no ponto certo.
  function tuneIn() {
    const n = nowOn(S[cur].id);
    if (!n) { audio.removeAttribute("src"); showTrack(null); return false; }
    showTrack(n.track);
    audio.src = n.track.src;
    audio.addEventListener("loadedmetadata", () => {
      try { audio.currentTime = Math.min(n.offset, (audio.duration || n.track.duration) - 1); } catch (_) {}
    }, { once: true });
    return true;
  }

  function select(i, autoplay) {
    cur = (i + S.length) % S.length;
    const s = S[cur];
    localStorage.setItem("gtaradio:last", cur);
    document.documentElement.style.setProperty("--a", s.colors[0]);
    $("pStation").textContent = s.name;
    $("pLogo").src = logo(s);
    $("pLogo").alt = s.name;
    cards.forEach((c, k) => c.classList.toggle("on", k === cur));
    setPlaying(false);
    const ok = tuneIn();
    if (autoplay && ok) play();
  }

  function play() {
    wantPlay = true;
    if (!audio.getAttribute("src") && !tuneIn()) return;
    setStatus("Sintonizando…");
    audio.play().catch(() => setStatus("Não foi possível tocar. Clique em tocar."));
  }
  function pause() { wantPlay = false; audio.pause(); }

  // Ao terminar, segue a grade (mantém o "ao vivo").
  audio.addEventListener("ended", () => { refreshCards(); if (tuneIn() && wantPlay) audio.play().catch(() => {}); });
  // Faixa quebrada: pula para a próxima da grade.
  audio.addEventListener("error", () => {
    if (!audio.getAttribute("src")) return;
    const n = nowOn(S[cur].id);
    if (!n) return;
    const tr = P[S[cur].id], nxt = tr[(n.i + 1) % tr.length];
    setStatus("Faixa indisponível, pulando…");
    showTrack(nxt);
    audio.src = nxt.src;
    if (wantPlay) audio.play().catch(() => {});
  });
  audio.addEventListener("playing", () => { setPlaying(true); setStatus("Ao vivo: " + S[cur].name); });
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("waiting", () => setStatus("Carregando…"));
  audio.addEventListener("timeupdate", () => {
    const d = (track && track.duration) || audio.duration || 0;
    $("bar").style.width = d ? `${Math.min(100, (audio.currentTime / d) * 100)}%` : "0";
    $("time").textContent = `${fmt(audio.currentTime)} / ${fmt(d)}`;
  });

  $("play").onclick = () => (audio.paused ? play() : pause());
  $("prev").onclick = () => select(cur - 1, wantPlay);
  $("next").onclick = () => select(cur + 1, wantPlay);
  $("heroPlay").onclick = () => { select(cur, true); document.getElementById("stations").scrollIntoView(); };
  $("vol").oninput = (e) => (audio.volume = e.target.value);
  audio.volume = 0.8;

  refreshCards();
  setInterval(refreshCards, 15000);
  select(cur, false);
})();
