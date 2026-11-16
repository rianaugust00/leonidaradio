-- Fórum de descobertas — Rádio Leonida
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez).
-- Depois, em Authentication > URL Configuration, coloque o endereço do site
-- em "Site URL" e em "Redirect URLs".

-- ---------- Tabelas ----------

-- Apelido público de cada usuário (o e-mail nunca é exposto).
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique
    check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);

create table public.posts (
  id bigint generated always as identity primary key,
  author uuid not null default auth.uid() references public.profiles on delete cascade,
  category text not null
    check (category in ('descoberta', 'easter-egg', 'bug', 'local')),
  title text not null check (char_length(title) between 4 and 120),
  body text not null check (char_length(body) between 10 and 4000),
  spoiler boolean not null default false,
  confirmed boolean not null default false,  -- só a moderação muda (pelo painel)
  score integer not null default 0,          -- mantido pelo gatilho de votos
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_score_idx on public.posts (score desc);

-- Um voto por usuário em cada postagem.
create table public.votes (
  post_id bigint not null references public.posts on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------- Placar ----------

create function public.votes_sync_score() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set score = score + 1 where id = new.post_id;
  else
    update posts set score = score - 1 where id = old.post_id;
  end if;
  return null;
end $$;

create trigger votes_score after insert or delete on public.votes
  for each row execute function public.votes_sync_score();

-- ---------- Permissões ----------
-- Visitantes só leem. Usuários logados só escrevem as colunas liberadas:
-- "confirmed", "score" e "author" não podem ser forjados pelo navegador.

revoke all on public.profiles, public.posts, public.votes from anon, authenticated;

grant select on public.profiles, public.posts to anon, authenticated;
grant insert (id, username) on public.profiles to authenticated;
grant insert (category, title, body, spoiler) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant select, delete on public.votes to authenticated;
grant insert (post_id) on public.votes to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.votes enable row level security;

create policy "perfis são públicos" on public.profiles
  for select using (true);
create policy "cada um cria o próprio perfil" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy "postagens são públicas" on public.posts
  for select using (true);
create policy "postar como si mesmo" on public.posts
  for insert to authenticated with check (author = (select auth.uid()));
create policy "apagar a própria postagem" on public.posts
  for delete to authenticated using (author = (select auth.uid()));

create policy "ver os próprios votos" on public.votes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "votar como si mesmo" on public.votes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "retirar o próprio voto" on public.votes
  for delete to authenticated using (user_id = (select auth.uid()));
