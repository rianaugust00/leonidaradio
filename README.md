# Rádio Leonida 📻

Rádio online **fan-made** inspirada nas estações de rádio reveladas para **GTA VI**.
São seis estações tocando 24 horas por dia, com músicas de artistas independentes sob licença **Creative Commons** (via [Jamendo](https://www.jamendo.com)).

> Projeto de fã, sem afiliação com a Rockstar Games ou a Take-Two Interactive.
> Nomes, logos e imagens das estações pertencem aos seus respectivos donos.

## Estações

| Estação | Gênero | Locutores |
|---|---|---|
| **Cocoteo FM** | Latina moderna (bachata, merengue, dembow, reggaeton) | El Martillo, La Gata |
| **Rádio Back Country** | Country renegado | MW, Delta Dawne, Mud Dog Mike (tempo) |
| **AfroBank FM** | Amapiano, 3-step, clássicos africanos | Burna, Palmsy |
| **The Chamber 106.6** | Metal | DJ Kerry, DJ Tom |
| **Flash FM** | Pop | Robyn, Alex |
| **Dirty South Classics** | Rap e hip-hop sulista | Trick, Trina |

## Como funciona

- **Programação 24/7 sincronizada:** a faixa que toca e o ponto exato dentro dela são calculados pelo relógio. Assim, todos os ouvintes escutam a mesma coisa ao mesmo tempo, como numa rádio de verdade. A playlist de cada estação repete em loop.
- **Sem servidor de streaming:** é um site estático (HTML + CSS + JS puro). O áudio vem direto do Jamendo.
- **Músicas Creative Commons:** cada faixa mostra no player o artista e o link da licença, como as licenças CC exigem.

## Rodando localmente

```bash
python3 -m http.server
# abra http://localhost:8000
```

## Atualizando as playlists

As playlists (`playlists.js`) são geradas por um script que busca as músicas no Jamendo pelas tags de gênero de cada estação (definidas em `stations.js`).

1. Crie uma conta e um app em <https://devportal.jamendo.com> e copie o **Client ID**. O Client Secret não é necessário.
2. Rode:

```bash
JAMENDO_CLIENT_ID=seu_client_id python3 tools/build_playlists.py
```

O script descarta covers, remixes e música de banco de som, e exige que o gênero buscado esteja entre os principais gêneros da faixa.

> Os links de áudio do Jamendo podem expirar. Se as faixas pararem de tocar, rode o script de novo.
> Nunca faça commit do Client ID nem do Client Secret.

## Estrutura

Documentação técnica completa: [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md)

```
index.html               página
style.css                visual (inspirado na página de música de GTA VI)
app.js                   player e lógica da programação ao vivo
stations.js              estações: nome, gênero, locutores, cores e tags
playlists.js             playlists geradas (não editar à mão)
tools/build_playlists.py gera playlists.js a partir do Jamendo
noticias.js              notícias fictícias (tela #noticias do index.html, renderizada por noticias-app.js)
noticias.html            redireciona para index.html#noticias
assets/news/             ilustrações das notícias (SVG)
assets/logos/            logos das estações
assets/bg/               imagens de fundo
locutores/texts/         falas dos locutores (formato "DJ | fala")
locutores/audios/<est>/  áudios das falas (N.mp3 = linha N do .txt)
locutores.js             falas + durações (gerado por tools/build_locutores.py)
```

## Próximos passos

- [ ] Gerar as vozes dos locutores com IA (ElevenLabs ou OpenAI TTS) a partir de `locutores/`
- [ ] Tocar as falas entre as músicas, mantendo a sincronia ao vivo
- [ ] (Opcional) Stream 24/7 em servidor próprio (Icecast + Liquidsoap ou AzuraCast)

### Ideias futuras

- [ ] **Efeito de troca de estação:** chiado de estática curto (~0,5 s) ao mudar de estação, gerado com a Web Audio API (sem arquivo)
- [ ] **Vinhetas e jingles:** clipes curtos com o nome da estação, intercalados na grade com frequência própria (ex.: a cada 5 músicas)
- [ ] **Falas por horário:** falas de manhã, tarde e madrugada escolhidas pelo relógio, marcadas no `.txt` (ex.: `manhã | DJ | fala`)
- [ ] **Comerciais fictícios:** anúncios paródicos de empresas inventadas de Leonida, inseridos na grade como as falas
- [ ] **Boletim de notícias falado:** locutor lê as manchetes de `noticias.js` na rádio, ligando as duas partes do site
- [ ] **Visualizador de áudio:** espectro com `AnalyserNode` nas cores da estação (verificar CORS do áudio do Jamendo)
- [ ] **PWA:** instalar no celular, com ícone e tela cheia

## Créditos

- Músicas: artistas independentes do [Jamendo](https://www.jamendo.com), sob licenças Creative Commons
- Fontes: [Big Shoulders Display](https://fonts.google.com/specimen/Big+Shoulders+Display) e [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)
- Estações e personagens: Rockstar Games (GTA VI)
