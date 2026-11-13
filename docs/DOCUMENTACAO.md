# Rádio Leonida — Documentação técnica

> Projeto de fã, sem afiliação com a Rockstar Games ou a Take-Two Interactive.
> Para uma visão rápida e os comandos básicos, veja o [README](../README.md).

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Estrutura de arquivos](#3-estrutura-de-arquivos)
4. [Modelos de dados](#4-modelos-de-dados)
5. [Programação ao vivo (sincronização)](#5-programação-ao-vivo-sincronização)
6. [Player](#6-player)
7. [Notícias e navegação](#7-notícias-e-navegação)
8. [Animações (fx)](#8-animações-fx)
9. [Visual](#9-visual)
10. [Scripts de geração](#10-scripts-de-geração)
11. [Guias rápidos](#11-guias-rápidos)
12. [Rodar e publicar](#12-rodar-e-publicar)
13. [Licenças e aspectos legais](#13-licenças-e-aspectos-legais)
14. [Limitações conhecidas](#14-limitações-conhecidas)
15. [Roadmap](#15-roadmap)

---

## 1. Visão geral

A Rádio Leonida é uma rádio online inspirada nas estações de GTA VI. O site tem duas telas:

- **Rádio:** seis estações tocando 24 h por dia, com músicas Creative Commons do Jamendo e falas de locutores intercaladas.
- **Notícias (Vice City Dispatch):** matérias fictícias sobre Leonida, com filtro por categoria.

Todos os ouvintes ouvem **a mesma faixa no mesmo ponto**. O site não tem servidor de streaming: a posição "ao vivo" é calculada pelo relógio do navegador.

| Item | Valor |
|---|---|
| Tipo | Site estático (HTML + CSS + JavaScript puro, sem build e sem dependências) |
| Áudio | Arquivos MP3 do Jamendo (músicas) e locais (locutores) |
| Ferramentas | Python 3 (scripts em `tools/`) |
| Idioma da interface | Português (pt-BR) |

## 2. Arquitetura

```
                ┌──────────────────── geração (offline) ────────────────────┐
 API Jamendo ──▶│ tools/build_playlists.py ──▶ playlists.js                 │
 stations.js ──▶│   (lê as tags de cada estação)                            │
                │                                                           │
 locutores/  ──▶│ tools/build_locutores.py ──▶ locutores.js                 │
 texts + audios │   (lê a duração de cada MP3)                              │
                └───────────────────────────────────────────────────────────┘

                ┌──────────────────── navegador ────────────────────────────┐
                │ stations.js + playlists.js + locutores.js                 │
                │        └──▶ app.js: monta a grade, calcula "agora", player│
                │ noticias.js + noticias-credits.js                         │
                │        └──▶ noticias-app.js: cards, filtros, roteador     │
                │ fx.js: animações em cima do que os scripts acima criam    │
                └───────────────────────────────────────────────────────────┘
```

Os arquivos de dados (`stations.js`, `playlists.js`, `locutores.js`, `noticias.js` e `noticias-credits.js`) apenas definem variáveis globais em `window`. Os scripts são carregados em ordem no fim do `index.html`, então os dados existem antes da lógica:

```
stations.js → playlists.js → locutores.js → app.js →
noticias.js → noticias-credits.js → noticias-app.js → fx.js
```

Cada script de lógica é uma IIFE `(() => { ... })()` e não deixa variáveis globais.

## 3. Estrutura de arquivos

| Caminho | Função | Editar à mão? |
|---|---|---|
| `index.html` | Página única: hero, grade de estações, tela de notícias, player fixo | Sim |
| `noticias.html` | Redireciona para `index.html#noticias` (mantém links antigos) | — |
| `style.css` | Visual geral, cards e player | Sim |
| `noticias.css` | Visual da tela de notícias | Sim |
| `fx.css` / `fx.js` | Animações | Sim |
| `stations.js` | Cadastro das estações (`window.STATIONS`) | Sim |
| `playlists.js` | Músicas de cada estação (`window.PLAYLISTS`), ~25 mil linhas | **Não** (é gerado) |
| `locutores.js` | Falas e durações (`window.LOCUTORES`) | **Não** (é gerado) |
| `app.js` | Grade ao vivo e player | Sim |
| `noticias.js` | Matérias (`window.NEWS`) | Sim |
| `noticias-credits.js` | Créditos das fotos (`window.NEWS_CREDITS`) | Sim |
| `noticias-app.js` | Renderiza as notícias e troca de tela | Sim |
| `tools/build_playlists.py` | Gera `playlists.js` a partir do Jamendo | Sim |
| `tools/build_locutores.py` | Gera `locutores.js` | Sim |
| `assets/logos/<id>.png` | Logo de cada estação | — |
| `assets/bg/<id>.jpg` | Fundo do card de cada estação (`radio-desktop.jpg` é o do hero) | — |
| `assets/news/*.svg` | Ilustrações das notícias (usadas quando não há foto) | — |
| `assets/news/photos/*.jpg` | Fotos livres do Wikimedia Commons | — |
| `locutores/texts/<id>.txt` | Roteiro das falas, uma por linha | Sim |
| `locutores/audios/<id>/N.mp3` | Áudio da linha N do roteiro | — |

O `id` da estação liga tudo: logo, fundo, playlist, roteiro e pasta de áudios usam o mesmo nome.

## 4. Modelos de dados

### Estação (`stations.js`)

```js
{
  id: "flash",                                   // chave usada em todos os arquivos
  tags: ["pop", "synthpop", "electropop", "80s", "synthwave"], // gêneros buscados no Jamendo
  name: "Flash FM",
  genre: "Pop",
  desc: "O clássico de Vice City de volta, com o melhor do pop.",
  djs: ["Robyn", "Alex"],
  colors: ["#f03090", "#ffb3d1"],                // colors[0] vira a cor de destaque (--a / --c)
}
```

> `build_playlists.py` lê `id` e `tags` com uma expressão regular. Mantenha `tags` **logo depois de** `id`, numa linha só, com aspas duplas.

### Faixa de música (`playlists.js`)

```js
{
  id: "2027007",
  title: "VIRADINHA - PEDRO ALVES",
  artist: "Pedrinho Alves",
  duration: 140,                 // segundos (inteiro, informado pelo Jamendo)
  src: "https://prod-1.storage.jamendo.com/?trackid=...", // link do MP3 (pode expirar)
  license: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
  page: "https://www.jamendo.com/track/2027007",
}
```

### Fala de locutor (`locutores.js`)

```js
{ dj: "La Gata", text: "Aquí La Gata...", src: "locutores/audios/cocoteo/2.mp3", duration: 8.52 }
```

Dentro da grade, `app.js` converte cada fala numa "faixa" com `dj: true`:
`{ dj: true, title: <nome do DJ>, artist: "Locutor", duration, src }`.

### Notícia (`noticias.js`)

```js
{
  id: "jacare-banco",            // também é a chave em NEWS_CREDITS
  cat: "Policial",               // vira um botão de filtro automaticamente
  img: "gator-bank",             // SVG em assets/news/ (sem extensão = .svg)
  date: "2026-11-08",            // AAAA-MM-DD; a mais recente vira destaque
  author: "Mel Ortega",
  title: "...",
  lead: "...",                   // linha fina, sempre visível
  body: ["parágrafo 1", "parágrafo 2"], // aparece em "Ler matéria"
}
```

As categorias atuais são Cidade, Clima, Cultura, Economia, Policial e Política.

### Crédito de foto (`noticias-credits.js`)

```js
"jacare-banco": {
  file: "photos/jacare-banco.jpg",   // substitui o SVG de `img`
  artist: "Zygy",
  license: "CC0",
  licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
  page: "https://commons.wikimedia.org/wiki/File:...",
}
```

## 5. Programação ao vivo (sincronização)

### Montagem da grade

Ao carregar, `app.js` monta para cada estação a lista `P[id]`, intercalando músicas e falas:

```
música, música, FALA 1, música, música, FALA 2, ...   (EVERY = 2)
```

As falas seguem em ordem e recomeçam do início quando acabam. A playlist já vem embaralhada com uma semente fixa (`random.Random(id)` no script), então **a grade é idêntica em todos os navegadores**.

### Cálculo do "agora" — `nowOn(sid)`

```
total = soma das durações da grade
pos   = (Date.now() / 1000) % total      // segundos desde 1970, em loop
percorre a grade subtraindo durações até achar a faixa onde `pos` cai
→ { i: índice, offset: segundos dentro da faixa, track }
```

Como depende só do relógio, dois ouvintes em lugares diferentes chegam ao mesmo resultado. A precisão depende de:
- o relógio do computador estar certo;
- `duration` bater com a duração real do arquivo. O Jamendo informa números inteiros, então pode haver diferenças de até ~1 s por faixa.

### Sintonizar — `tuneIn()`

Carrega o `src` da faixa atual e, no evento `loadedmetadata`, pula para `offset` (limitado a `duração − 1 s`).

## 6. Player

| Evento / ação | Comportamento |
|---|---|
| Botão do card | Seleciona a estação e toca; se já está tocando, pausa |
| `prev` / `next` | Estação anterior/próxima (circular); mantém tocando se já estava |
| "Ligar o rádio" (hero) | Toca a última estação e rola até a grade |
| `ended` | Recalcula `nowOn` e sintoniza a próxima faixa (continua "ao vivo") |
| `error` | Mostra "Faixa indisponível, pulando…" e carrega a faixa seguinte da grade |
| `playing` / `pause` / `waiting` | Atualizam ícone, estado dos cards e texto de status (`aria-live`) |
| `timeupdate` | Barra de progresso e tempo `m:ss / m:ss` |
| Volume | Controle deslizante de 0 a 1 (padrão 0,8) |

Detalhes:
- A última estação escolhida fica salva em `localStorage["gtaradio:last"]`.
- O "Agora" de todos os cards é atualizado a cada 15 s (`refreshCards`).
- Para músicas, o crédito no player leva à licença CC. Para falas, aparece "Locutor da estação".
- O autoplay só acontece depois de um clique, por regra dos navegadores.

## 7. Notícias e navegação

- `index.html` contém as duas telas: `#view-radio` e `#view-news`.
- `noticias-app.js` tem um **roteador por hash**: `#noticias` mostra as notícias e qualquer outro hash mostra a rádio. Como a página nunca recarrega, **o áudio continua tocando** ao navegar.
- O título da aba muda conforme a tela.
- As notícias são ordenadas por data (mais nova primeiro). A primeira vira o destaque (`#featured`) e as demais vão para a grade (`#newsGrid`).
- Os filtros são criados a partir das categorias existentes e usam `aria-pressed`.
- Para a imagem, vale a foto de `NEWS_CREDITS` quando existe (com legenda de autor e licença); se não, o SVG indicado em `img`.
- Todo o texto é inserido com `textContent`, o que evita injeção de HTML.

## 8. Animações (fx)

`fx.js` atua sobre os elementos criados pelos outros scripts:

| Efeito | Como funciona |
|---|---|
| Reveal ao rolar | `IntersectionObserver` adiciona `.in`; atraso escalonado (`--d`, até 8 × 70 ms) |
| Inclinação 3D + brilho | `pointermove` (só mouse) define `--rx`, `--ry`, `--mx`, `--my` |
| Título letra a letra | Quebra o `h1` em `<span class="ch">` preservando os elementos internos (`<em>`) |
| Ticker de manchetes | Faixa com os títulos de `NEWS`, duplicada para o loop contínuo |
| Barra de progresso de rolagem | `.scrollbar` no topo |
| Parallax do hero | Move o `background-position` com `requestAnimationFrame` |

- Um `MutationObserver` em `#grid`, `#featured` e `#newsGrid` aplica os efeitos aos cards novos (por exemplo, ao trocar de filtro).
- Com `prefers-reduced-motion: reduce`, as animações são desligadas.

## 9. Visual

Variáveis principais em `style.css`:

| Variável | Valor | Uso |
|---|---|---|
| `--ink` | `#0d0c1a` | Fundo |
| `--plum` / `--wine` | `#31223e` / `#6b2e47` | Gradientes |
| `--gold` / `--peach` | `#ffdf80` / `#f5c089` | Destaques |
| `--a` | cor da estação ativa | Definida por `app.js` em `<html>` |
| `--c` | cor da estação do card | Definida por card |
| `--display` | Big Shoulders Display | Títulos |
| `--body` | Inter | Texto |

Acessibilidade já presente: link "Pular para as estações", `aria-label` nos botões, `aria-live` no status, `aria-expanded` e `aria-pressed`, texto `.sr` para leitores de tela e respeito a `prefers-reduced-motion`.

## 10. Scripts de geração

### `tools/build_playlists.py`

```bash
JAMENDO_CLIENT_ID=seu_client_id python3 tools/build_playlists.py [--per-tag 200]
```

1. Lê `id` e `tags` de cada estação em `stations.js`.
2. Para cada tag, busca até `--per-tag` faixas na API v3 do Jamendo (ordenadas por popularidade do mês, em páginas de 100, com até 4 tentativas).
3. Filtra:
   - duração entre **90 e 420 s**;
   - título sem indícios de cover, remix, karaokê, música de banco etc. (regex `BAD_TITLE`);
   - a tag buscada precisa estar **entre os 3 primeiros gêneros** da faixa;
   - sem faixas repetidas.
4. Embaralha com semente fixa por estação e grava `playlists.js`.

Só usa a biblioteca padrão do Python. O Client Secret não é necessário, e o Client ID **não deve ser commitado** (o `.gitignore` já ignora `.env`).

### `tools/build_locutores.py`

```bash
pip install mutagen
python3 tools/build_locutores.py
```

Para cada `locutores/texts/<id>.txt`, lê as linhas com `|` e procura `locutores/audios/<id>/N.mp3`, onde N é a linha de fala começando em 1. Linhas sem áudio são ignoradas. Mede a duração com `mutagen` e grava `locutores.js`.

## 11. Guias rápidos

### Adicionar uma estação
1. Acrescente o objeto em `stations.js`, com `tags` logo depois de `id`.
2. Adicione `assets/logos/<id>.png` e `assets/bg/<id>.jpg`.
3. Rode `build_playlists.py`.
4. (Opcional) Crie as falas, como no guia abaixo.

### Adicionar falas de locutor
1. Escreva em `locutores/texts/<id>.txt`, uma por linha: `NomeDoDJ | texto da fala`.
2. Grave ou gere os áudios como `locutores/audios/<id>/1.mp3`, `2.mp3`, … seguindo a ordem das linhas.
3. Rode `build_locutores.py`.

> Mudar a quantidade de falas ou a constante `EVERY` muda a grade inteira, então a "posição ao vivo" de todos salta para outro ponto. Isso é esperado.

### Publicar uma notícia
1. Adicione o objeto em `noticias.js`. Uma categoria nova vira filtro sozinha.
2. Imagem: crie `assets/news/<img>.svg`, **ou** coloque uma foto em `assets/news/photos/` e registre o crédito em `noticias-credits.js` com o mesmo `id`.

## 12. Rodar e publicar

```bash
python3 -m http.server       # na raiz do projeto
# abra http://localhost:8000
```

Abrir o `index.html` direto pelo arquivo (`file://`) costuma funcionar, mas um servidor local evita problemas do navegador com áudio e caminhos.

**Publicação (GitHub Pages):** o site é servido direto da branch `main`, sem build.

1. No GitHub: *Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save*. Só precisa ser feito uma vez.
2. A cada `git push` na `main`, o site é atualizado em 1 a 2 minutos em <https://rianaugust00.github.io/leonidaradio/>.

Arquivos que existem por causa da publicação:

| Arquivo | Função |
|---|---|
| `.nojekyll` | Faz o Pages servir os arquivos como estão, sem passar pelo Jekyll |
| `404.html` | Página de erro com link de volta para a rádio |
| `favicon.svg` | Ícone da aba |
| `manifest.webmanifest` | Nome, cores e ícone ao instalar o site no celular |
| Tags `og:*` e `canonical` no `index.html` | Prévia com imagem ao compartilhar o link |

> O endereço `https://rianaugust00.github.io/leonidaradio/` aparece nas tags `canonical` e `og:*` do `index.html` e nos links do `404.html`. Se o site mudar de endereço (domínio próprio, Netlify etc.), atualize esses dois arquivos.

Todos os caminhos do site são relativos, então ele funciona tanto na subpasta `/leonidaradio/` quanto na raiz de um domínio próprio.

## 13. Licenças e aspectos legais

- **Músicas:** cada faixa tem sua licença CC, mostrada no player. Na playlist atual:

  | Licença | Faixas |
  |---|---|
  | BY-NC-ND | 1.609 |
  | BY-NC-SA | 347 |
  | BY-SA | 315 |
  | BY | 297 |
  | BY-ND | 166 |
  | BY-NC | 126 |

  Cerca de **73 % são NC (não comercial)**. Se o site tiver anúncios ou outra receita, essas faixas precisam sair (filtrar por `license` no script) ou ser licenciadas pelo Jamendo Licensing.
- **Fotos das notícias:** domínio público ou CC, do Wikimedia Commons, com o crédito exibido na legenda.
- **Fontes:** Google Fonts (licença OFL).
- **Marcas:** nomes, logos e personagens das estações pertencem à Rockstar Games. Num projeto público ou comercial, prefira identidade própria.
- **Músicas famosas:** não podem ser hospedadas nem transmitidas sem licença. Os caminhos possíveis são licença de web rádio (ECAD no Brasil, Live365 nos EUA, Canadá e México) ou players oficiais embutidos (YouTube, Spotify), cada um com suas regras.

## 14. Limitações conhecidas

- **Só a Cocoteo FM tem áudios de locutor.** As outras 5 estações têm roteiro (10 falas cada), mas ainda não têm MP3.
- **Links do Jamendo expiram.** Quando as faixas param de tocar, é preciso rodar `build_playlists.py` de novo.
- **Sincronia aproximada:** depende do relógio do aparelho e das durações inteiras do Jamendo.
- **Pulo após erro:** quando uma faixa falha, a seguinte começa do zero e não no ponto ao vivo. A sincronia volta na próxima troca de faixa.
- **`playlists.js` grande** (~25 mil linhas, 2.863 faixas), carregado inteiro na abertura. Poderia ser minificado ou carregado por estação.
- **Celular:** a reprodução em segundo plano depende do navegador, e ainda não há Media Session (controles na tela de bloqueio).
- Em `build_playlists.py`, a checagem `not t.get("audio")` aparece duplicada. Não causa problema, mas é redundante.

## 15. Roadmap

As ideias de curto prazo estão no [README](../README.md#próximos-passos). Direções maiores em discussão:

1. **Fórum de descobertas dos jogadores:** postagens com categorias (descoberta, easter egg, bug, local), tag de spoiler, votos e selo de "confirmado", pinos no mapa de Leonida. Backend sugerido: Supabase (login, banco e upload).
2. **Ligar o fórum à tela de notícias:** as postagens mais votadas viram manchetes.
3. **Boletim falado:** os locutores leem as manchetes em destaque na rádio.
4. **Automação:** um GitHub Action semanal para regenerar `playlists.js`, e deploy no GitHub Pages.
5. **Licença de rádio** apenas se houver público e receita.

Se houver login e conteúdo de usuários, o projeto passa a exigir moderação, termos de uso e política de privacidade (LGPD).
