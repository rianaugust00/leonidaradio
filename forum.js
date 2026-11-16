// Fórum de descobertas: postagens com categoria, spoiler e votos.
// Tem duas "fontes de dados" com a mesma interface:
//   - remote(): Supabase (login por e-mail, banco de verdade)
//   - local():  modo demonstração, tudo no localStorage
// A escolha depende de forum-config.js estar preenchido.
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$("view-forum")) return;

  const CATS = {
    descoberta: "Descoberta",
    "easter-egg": "Easter egg",
    bug: "Bug",
    local: "Local",
  };
  const NAME_RE = /^[A-Za-z0-9_]{3,24}$/;
  const NAME_HELP = "O apelido deve ter de 3 a 24 letras, números ou _.";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const cfg = window.FORUM_CONFIG || {};

  // ---------- Fonte de dados: demonstração ----------
  function local() {
    const KEY = "gtaradio:forum-demo";
    const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
    const seed = () => ({
      me: null, votes: [], next: 100,
      posts: [
        { id: 1, category: "easter-egg", title: "Exemplo: pichação misteriosa atrás do motel", body: "Esta é uma postagem de exemplo. Descreva aqui o que encontrou, onde fica e como chegar lá.", spoiler: false, confirmed: true, score: 12, created_at: ago(5), author_id: "x1", author_name: "jacare_de_terno" },
        { id: 2, category: "local", title: "Exemplo: mirante escondido nos Keys", body: "Postagem de exemplo com a categoria Local. No futuro, cada local poderá ganhar um pino no mapa de Leonida.", spoiler: false, confirmed: false, score: 7, created_at: ago(26), author_id: "x2", author_name: "MudDogFan" },
        { id: 3, category: "descoberta", title: "Exemplo: o final da missão do porto", body: "Texto escondido até o leitor escolher ver. Use a marcação de spoiler para tudo o que revela a história.", spoiler: true, confirmed: false, score: 4, created_at: ago(50), author_id: "x3", author_name: "vice_1986" },
        { id: 4, category: "bug", title: "Exemplo: carro atravessa a ponte", body: "Postagem de exemplo com a categoria Bug. Conte o que aconteceu e como repetir.", spoiler: false, confirmed: false, score: 2, created_at: ago(80), author_id: "x4", author_name: "LaGata_FM" },
      ],
    });
    let db;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    if (!db || !Array.isArray(db.posts)) db = seed();
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) {} };
    return {
      demo: true,
      me: () => db.me,
      async loadMe() {},
      onAuth() {},
      async signIn(name) {
        if (!NAME_RE.test(name)) throw new Error(NAME_HELP);
        db.me = { id: "me", name }; save();
      },
      async setName() {},
      async signOut() { db.me = null; save(); },
      async list() { return db.posts.map((p) => ({ ...p, voted: db.votes.includes(p.id) })); },
      async create(p) {
        db.posts.push({ ...p, id: db.next++, confirmed: false, score: 0, created_at: new Date().toISOString(), author_id: "me", author_name: db.me.name });
        save();
      },
      async remove(id) { db.posts = db.posts.filter((p) => p.id !== id); save(); },
      async vote(id, on) {
        const p = db.posts.find((x) => x.id === id), had = db.votes.includes(id);
        if (!p || had === on) return;
        db.votes = on ? [...db.votes, id] : db.votes.filter((v) => v !== id);
        p.score += on ? 1 : -1; save();
      },
    };
  }

  // ---------- Fonte de dados: Supabase ----------
  function remote(sb) {
    let me = null;
    const ok = ({ error }) => { if (error) throw error; };
    return {
      demo: false,
      me: () => me,
      async loadMe() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { me = null; return; }
        const { data } = await sb.from("profiles").select("username").eq("id", session.user.id).maybeSingle();
        me = { id: session.user.id, name: data ? data.username : null };
      },
      // Não chama o Supabase de dentro do aviso de login (pode travar): adia.
      onAuth(cb) { sb.auth.onAuthStateChange(() => setTimeout(cb, 0)); },
      async signIn(email) {
        // O link do e-mail volta para a página; a marca abaixo reabre o fórum.
        localStorage.setItem("gtaradio:forum-login", "1");
        ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }));
      },
      async setName(name) {
        if (!NAME_RE.test(name)) throw new Error(NAME_HELP);
        const r = await sb.from("profiles").insert({ id: me.id, username: name });
        if (r.error && r.error.code === "23505") throw new Error("Esse apelido já está em uso.");
        ok(r);
        me.name = name;
      },
      async signOut() { ok(await sb.auth.signOut()); me = null; },
      async list() {
        const r = await sb.from("posts")
          .select("id,category,title,body,spoiler,confirmed,score,created_at,author,profiles(username)")
          .order("created_at", { ascending: false }).limit(100);
        ok(r);
        const mine = new Set();
        if (me) {
          const v = await sb.from("votes").select("post_id").eq("user_id", me.id);
          (v.data || []).forEach((x) => mine.add(x.post_id));
        }
        return r.data.map((p) => ({ ...p, author_id: p.author, author_name: p.profiles ? p.profiles.username : "anônimo", voted: mine.has(p.id) }));
      },
      async create(p) { ok(await sb.from("posts").insert(p)); },
      async remove(id) { ok(await sb.from("posts").delete().eq("id", id)); },
      async vote(id, on) {
        ok(on ? await sb.from("votes").insert({ post_id: id })
              : await sb.from("votes").delete().eq("post_id", id).eq("user_id", me.id));
      },
    };
  }

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error("Não foi possível carregar o fórum."));
    document.head.appendChild(s);
  });

  // ---------- Interface ----------
  let api, posts = [], cat = "todas", sort = "recentes", lastUser;
  const form = $("forumForm"), list = $("forumList");
  const msg = (t) => ($("forumMsg").textContent = t || "");
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const fail = (e) => msg((e && e.message) || "Algo deu errado. Tente de novo.");

  function chips(box, options, get, set) {
    Object.entries(options).forEach(([key, label]) => {
      const b = el("button", "chip", label);
      b.type = "button";
      b.setAttribute("aria-pressed", key === get());
      b.onclick = () => {
        set(key);
        [...box.children].forEach((x) => x.setAttribute("aria-pressed", x === b));
        render();
      };
      box.appendChild(b);
    });
  }

  function when(iso) {
    const min = Math.max(0, (Date.now() - new Date(iso)) / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${Math.floor(min)} min`;
    if (min < 1440) return `há ${Math.floor(min / 60)} h`;
    if (min < 43200) return `há ${Math.floor(min / 1440)} d`;
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  function postCard(p) {
    const me = api.me();
    const art = el("article", "post");

    const vote = el("button", "vote");
    vote.type = "button";
    vote.setAttribute("aria-pressed", p.voted);
    vote.setAttribute("aria-label", `${p.voted ? "Retirar voto" : "Votar"} (${p.score} votos)`);
    vote.append(el("span", "arrow", "▲"), el("b", null, p.score));
    vote.onclick = async () => {
      if (!me || !me.name) { msg("Entre no fórum para votar."); $("forumAuth").scrollIntoView({ block: "center" }); return; }
      vote.disabled = true;
      try { await api.vote(p.id, !p.voted); await refresh(); } catch (e) { fail(e); vote.disabled = false; }
    };

    const main = el("div", "post-main");
    const meta = el("p", "meta");
    meta.append(el("span", "cat", CATS[p.category] || p.category));
    if (p.confirmed) meta.append(el("span", "badge ok", "✓ Confirmado"));
    if (p.spoiler) meta.append(el("span", "badge warn", "Spoiler"));
    meta.append(el("span", null, `${p.author_name} · ${when(p.created_at)}`));

    const body = el("p", "post-body", p.body);
    main.append(meta, el("h3", "post-title", p.title), body);

    if (p.spoiler) {
      body.classList.add("hidden-spoiler");
      body.setAttribute("aria-hidden", "true");
      const show = el("button", "btn small", "Mostrar spoiler");
      show.type = "button";
      show.onclick = () => { body.classList.remove("hidden-spoiler"); body.removeAttribute("aria-hidden"); show.remove(); };
      main.append(show);
    }
    if (me && me.id === p.author_id) {
      const del = el("button", "btn small danger", "Apagar");
      del.type = "button";
      del.onclick = async () => {
        if (!confirm("Apagar esta postagem?")) return;
        try { await api.remove(p.id); await refresh(); msg("Postagem apagada."); } catch (e) { fail(e); }
      };
      main.append(del);
    }
    art.append(vote, main);
    return art;
  }

  function render() {
    const shown = posts
      .filter((p) => cat === "todas" || p.category === cat)
      .sort((a, b) => (sort === "votados" && b.score - a.score) || b.created_at.localeCompare(a.created_at));
    list.replaceChildren(...(shown.length ? shown.map(postCard) : [el("p", "forum-empty", "Nenhuma postagem aqui ainda. Seja a primeira pessoa a postar.")]));
  }

  async function refresh() {
    posts = await api.list();
    render();
  }

  // Barra de acesso: entrar, escolher apelido ou postar.
  function renderAuth() {
    const box = $("forumAuth"), me = api.me();
    box.replaceChildren();
    const mini = (label, type, placeholder, button, action) => {
      const f = el("form", "forum-login");
      const lab = el("label", null, label + " ");
      const inp = el("input");
      inp.type = type; inp.required = true; inp.placeholder = placeholder; inp.autocomplete = type === "email" ? "email" : "off";
      lab.append(inp);
      const b = el("button", "btn primary", button);
      b.type = "submit";
      f.append(lab, b);
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        b.disabled = true; msg("");
        try { await action(inp.value.trim()); } catch (e) { fail(e); }
        b.disabled = false;
      };
      box.append(f);
    };

    if (!me) {
      form.hidden = true;
      if (api.demo) mini("Apelido", "text", "seu_apelido", "Entrar", async (v) => { await api.signIn(v); await sync(); });
      else {
        mini("E-mail", "email", "voce@exemplo.com", "Receber link de acesso", async (v) => {
          await api.signIn(v);
          msg("Enviamos um link de acesso para o seu e-mail. Abra-o neste navegador.");
        });
        box.append(el("p", "forum-note", "Seu e-mail é usado só para o login e nunca aparece no fórum."));
      }
    } else if (!me.name) {
      form.hidden = true;
      mini("Escolha um apelido", "text", "seu_apelido", "Salvar apelido", async (v) => { await api.setName(v); await sync(); });
    } else {
      const hello = el("p", "forum-hello");
      hello.append("Olá, ", el("b", null, me.name));
      const nw = el("button", "btn primary", "Nova postagem");
      nw.type = "button";
      nw.onclick = () => { form.hidden = false; form.elements.title.focus(); };
      const out = el("button", "btn", "Sair");
      out.type = "button";
      out.onclick = async () => { try { await api.signOut(); await sync(); } catch (e) { fail(e); } };
      box.append(hello, nw, out);
    }
  }

  // Recarrega usuário + lista. Só refaz a barra de acesso se o usuário mudou,
  // para não apagar o que a pessoa está digitando.
  async function sync() {
    try {
      await api.loadMe();
      const me = api.me(), key = me ? `${me.id}:${me.name}` : "";
      if (key !== lastUser) { lastUser = key; renderAuth(); }
      await refresh();
      if (me && localStorage.getItem("gtaradio:forum-login")) {
        localStorage.removeItem("gtaradio:forum-login");
        location.hash = "#forum";
      }
    } catch (e) { fail(e); }
  }

  Object.entries(CATS).forEach(([k, v]) => form.elements.category.append(new Option(v, k)));
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const f = form.elements, btn = form.querySelector("[type=submit]");
    btn.disabled = true; msg("");
    try {
      await api.create({ category: f.category.value, title: f.title.value.trim(), body: f.body.value.trim(), spoiler: f.spoiler.checked });
      form.reset(); form.hidden = true;
      await refresh();
      msg("Postagem publicada.");
    } catch (e) { fail(e); }
    btn.disabled = false;
  };
  $("forumCancel").onclick = () => { form.hidden = true; };

  chips($("forumFilters"), { todas: "Todas", ...CATS }, () => cat, (v) => (cat = v));
  chips($("forumSort"), { recentes: "Recentes", votados: "Mais votados" }, () => sort, (v) => (sort = v));

  (async () => {
    if (cfg.url && cfg.anonKey) {
      try {
        await loadScript(SUPABASE_CDN);
        api = remote(window.supabase.createClient(cfg.url, cfg.anonKey));
      } catch (e) { fail(e); return; }
    } else {
      api = local();
      $("forumDemo").hidden = false;
    }
    api.onAuth(sync);
    await sync();
  })();
})();
