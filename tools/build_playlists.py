#!/usr/bin/env python3
"""Monta as playlists de cada estação com músicas Creative Commons do Jamendo.

Uso:  JAMENDO_CLIENT_ID=xxxx python3 tools/build_playlists.py [--per-tag 40]
Chave gratuita: https://devportal.jamendo.com  (crie um app e copie o client_id)
Saída: playlists.js  (window.PLAYLISTS = {estacao: [faixas...]})
"""
import argparse, html, json, os, random, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://api.jamendo.com/v3.0/tracks/"
MIN_DUR, MAX_DUR = 90, 420  # segundos
# Títulos que indicam cover/remix de música protegida ou música de banco de som.
BAD_TITLE = re.compile(
    r"cover|reprod|remix|bootleg|tribute|karaoke|instrumental version|"
    r"commercial|promotional|royalty|background|advert|podcast|jingle|intro\b|"
    r"\bvs\.?\b|\bx\b|\bft\.?\s|\(.*\bby\b.*\)", re.I)

def load_stations():
    src = open(os.path.join(ROOT, "stations.js"), encoding="utf-8").read()
    out = []
    for m in re.finditer(r'id: "(\w+)",\s*tags: (\[[^\]]*\])', src):
        out.append((m.group(1), json.loads(m.group(2))))
    return out

def fetch(cid, tag, total):
    """Busca até `total` faixas da tag, em páginas de 100, com retry (a API às vezes devolve vazio)."""
    out = []
    for offset in range(0, total, 100):
        q = urllib.parse.urlencode({
            "client_id": cid, "format": "json", "limit": 100, "offset": offset, "tags": tag,
            "audioformat": "mp32", "order": "popularity_month", "include": "musicinfo",
        })
        req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "radiogta/1.0"})
        page = []
        for attempt in range(4):
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.load(r)
            if data["headers"].get("status") != "success":
                sys.exit(f"Erro Jamendo: {data['headers']}")
            page = data["results"]
            if page or offset > 0:
                break
            time.sleep(1.5 * (attempt + 1))
        out += page
        if len(page) < 100:
            break
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-tag", type=int, default=200)
    args = ap.parse_args()
    cid = os.environ.get("JAMENDO_CLIENT_ID")
    if not cid:
        sys.exit("Defina JAMENDO_CLIENT_ID (veja o topo deste arquivo).")

    playlists = {}
    for sid, tags in load_stations():
        seen, tracks = set(), []
        for tag in tags:
            for t in fetch(cid, tag, args.per_tag):
                if t["id"] in seen or not t.get("audio") or not t.get("audio"):
                    continue
                if not (MIN_DUR <= int(t["duration"]) <= MAX_DUR):
                    continue
                if BAD_TITLE.search(html.unescape(t["name"])):
                    continue
                genres = ((t.get("musicinfo") or {}).get("tags") or {}).get("genres") or []
                if tag not in genres[:3]:  # o gênero buscado tem de ser um dos principais
                    continue
                seen.add(t["id"])
                tracks.append({
                    "id": t["id"], "title": html.unescape(t["name"]), "artist": html.unescape(t["artist_name"]),
                    "duration": int(t["duration"]), "src": t["audio"],
                    "license": t.get("license_ccurl", ""),
                    "page": t.get("shareurl", ""),
                })
        random.Random(sid).shuffle(tracks)  # ordem fixa: todos ouvem o mesmo
        playlists[sid] = tracks
        hours = sum(x["duration"] for x in tracks) / 3600
        print(f"{sid:12} {len(tracks):3} faixas  {hours:4.1f} h")

    with open(os.path.join(ROOT, "playlists.js"), "w", encoding="utf-8") as f:
        f.write("// Gerado por tools/build_playlists.py — não editar à mão.\n")
        f.write("window.PLAYLISTS = " + json.dumps(playlists, ensure_ascii=False, indent=1) + ";\n")
    print("playlists.js criado.")

if __name__ == "__main__":
    main()
