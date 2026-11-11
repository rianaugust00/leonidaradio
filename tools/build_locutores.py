#!/usr/bin/env python3
"""Gera locutores.js com as falas dos locutores e a duração exata de cada áudio.

Uso:  pip install mutagen && python tools/build_locutores.py
Entrada: locutores/texts/<estacao>.txt (linhas "DJ | fala") e locutores/audios/<estacao>/N.mp3
         (N = número da linha de fala, começando em 1).
Saída:   locutores.js  (window.LOCUTORES = {estacao: [{dj, text, src, duration}]})
"""
import json, os
from mutagen.mp3 import MP3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOC = os.path.join(ROOT, "locutores")
TXT = os.path.join(LOC, "texts")

def main():
    out = {}
    for fn in sorted(os.listdir(TXT)):
        if not fn.endswith(".txt"):
            continue
        sid = fn[:-4]
        lines = [l.strip() for l in open(os.path.join(TXT, fn), encoding="utf-8") if "|" in l]
        clips = []
        for n, line in enumerate(lines, 1):
            path = os.path.join(LOC, "audios", sid, f"{n}.mp3")
            if not os.path.isfile(path):
                continue
            dj, text = (x.strip() for x in line.split("|", 1))
            clips.append({
                "dj": dj, "text": text,
                "src": f"locutores/audios/{sid}/{n}.mp3",
                "duration": round(MP3(path).info.length, 2),
            })
        if clips:
            out[sid] = clips
            print(f"{sid:12} {len(clips):3} falas  {sum(c['duration'] for c in clips):.0f} s")
    with open(os.path.join(ROOT, "locutores.js"), "w", encoding="utf-8") as f:
        f.write("// Gerado por tools/build_locutores.py — não editar à mão.\n")
        f.write("window.LOCUTORES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
    print("locutores.js criado.")

if __name__ == "__main__":
    main()
