#!/usr/bin/env python3
"""Build the CV from cv/cv.yaml, no Figma needed.

    npm run cv                    # both looks
    python3 cv/build_cv.py --look current
    python3 cv/build_cv.py --look grid

current  fills cv/template-current.pdf (hero, rules, headings, QR and
         contacts are fixed there) and writes public/files/sinaida-krivchenko-cv.pdf
grid     hands the same content to the sinaida-grid-style skill and writes
         cv/out/sinaida-krivchenko-cv-grid.pdf

Needs PyMuPDF and PyYAML. Exits non-zero when copy overflows its box.
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import fitz
import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FONT = Path.home() / "dev/design-system-docs/fonts/GeistPixel-Regular.ttf"
GRID_BUILD = Path.home() / ".claude/skills/sinaida-grid-style/scripts/build.py"
TEMPLATE = HERE / "template-current.pdf"
OUT_CURRENT = ROOT / "public/files/sinaida-krivchenko-cv.pdf"
OUT_GRID = HERE / "out/sinaida-krivchenko-cv-grid.pdf"

NBSP = " "
INK = (5 / 255,) * 3
RED = (205 / 255, 0, 0)
GREY = (0x73 / 255,) * 3
BODY = 6          # pt, body copy in the current look
LEAD = 8          # pt, baseline step
TITLE = 11        # pt, card titles

# Boxes of the current look, in PDF points (from the Figma export).
STATEMENT_COLS = [20, 133, 244, 356]
STATEMENT_TOP, STATEMENT_BOTTOM, STATEMENT_W = 369.6, 488, 95
WHERE_COLS, WHERE_TOP, WHERE_BOTTOM, WHERE_W = [20, 133], 542, 700, 96
SKILL_COLS, SKILL_TOP, SKILL_W = [244, 352], 542, 104
BACK_X, BACK_TOP, BACK_BOTTOM, BACK_W = 244, 673, 760, 214
CARD_W = 103
FOOTER_RIGHT, FOOTER_Y = 578.97, 831.4

SHORT = r"(?:a|an|the|in|of|to|at|by|on|and|I|A)"

overflow = []


def glue(text):
    """Non-breaking space after short words, and no one-word last line."""
    text = re.sub(r"(?<= )(" + SHORT + r") ", lambda m: m.group(1) + NBSP, " " + text)[1:]
    return re.sub(r" (\S+)$", NBSP + r"\1", text)


def words(text):
    """Split '[accent] words' into tokens; a token is a list of (segment, colour)
    pairs joined by non-breaking spaces, so only the bracketed word turns red."""
    out = []
    for tok in glue(text.strip()).split(" "):
        segs = []
        for seg in tok.split(NBSP):
            red = seg.startswith("[") or "]" in seg
            segs.append((seg.replace("[", "").replace("]", ""), RED if red else INK))
        out.append(segs)
    return out


def text_of(token):
    return NBSP.join(seg for seg, _ in token)


def wrap(text, font, width, size=BODY):
    lines, cur = [], []
    for w in words(text):
        trial = " ".join(text_of(t) for t in cur + [w])
        if cur and font.text_length(trial, size) > width:
            lines.append(cur)
            cur = [w]
        else:
            cur.append(w)
    return lines + [cur] if cur else lines


def draw_line(page, font, x, y, line, size=BODY):
    for i, token in enumerate(line):
        for j, (seg, colour) in enumerate(token):
            page.insert_text((x, y), seg, fontname="gp", fontsize=size, color=colour)
            x += font.text_length(seg + (NBSP if j < len(token) - 1 else ""), size)
        x += font.text_length(" ", size) if i < len(line) - 1 else 0


def paragraphs(body):
    return [p.replace("\n", " ") for p in body.strip().split("\n\n")]


def flow(page, font, paras, cols, top, bottom, width, name):
    """Keep paragraphs whole and balance them across the columns."""
    wrapped = [wrap(p, font, width) for p in paras]
    total = sum(len(w) for w in wrapped) + len(wrapped) - 1
    target = total / len(cols)
    col, y, used = 0, top, 0
    for w in wrapped:
        if used and used + len(w) / 2 > target and col < len(cols) - 1:
            col, y, used = col + 1, top, 0
        for line in w:
            if y > bottom:
                overflow.append(name)
            draw_line(page, font, cols[col], y, line)
            y += LEAD
        y += LEAD
        used += len(w) + 1


def section(spec, heading):
    for s in spec["sections"]:
        if s.get("heading", "").lower() == heading:
            return s
    raise SystemExit("cv.yaml has no section '%s'" % heading)


def build_current(spec):
    doc = fitz.open(TEMPLATE)
    page = doc[0]
    page.insert_font(fontname="gp", fontfile=str(FONT))
    font = fitz.Font(fontfile=str(FONT))

    flow(page, font, paragraphs(section(spec, "statement")["body"]),
         STATEMENT_COLS, STATEMENT_TOP, STATEMENT_BOTTOM, STATEMENT_W, "statement")
    flow(page, font, paragraphs(section(spec, "where next")["body"]),
         WHERE_COLS, WHERE_TOP, WHERE_BOTTOM, WHERE_W, "where next")

    skills = [s for s in section(spec, "selected skills")["body"].splitlines() if s.strip()]
    half = (len(skills) + 1) // 2
    for ci, chunk in enumerate([skills[:half], skills[half:]]):
        for i, s in enumerate(chunk):
            if font.text_length(s, BODY) > SKILL_W:
                overflow.append("skill '%s' too wide" % s)
            page.insert_text((SKILL_COLS[ci], SKILL_TOP + LEAD * i), s,
                             fontname="gp", fontsize=BODY, color=INK)

    y = BACK_TOP
    for p in paragraphs(section(spec, "background")["body"]):
        for line in wrap(p, font, BACK_W):
            if y > BACK_BOTTOM:
                overflow.append("background")
            draw_line(page, font, BACK_X, y, line)
            y += LEAD
        y += LEAD

    # the three card images in the sidebar, top to bottom
    slots = sorted(((page.get_image_rects(x[0])[0], x[0]) for x in page.get_images()),
                   key=lambda r: r[0].y0)
    for (box, xref), card in zip(slots, spec["cards"]):
        page.replace_image(xref, filename=str((HERE / card["image"]).resolve()))
        x, y = box.x0, box.y1 + 16
        title = card["title"].upper()
        page.insert_text((x, y), title, fontname="gp", fontsize=TITLE, color=RED)
        tw = font.text_length(title, TITLE)
        page.draw_rect(fitz.Rect(x, y + 1.375, x + tw, y + 1.925), color=None, fill=RED, width=0)
        if card.get("url"):
            page.insert_link({"kind": fitz.LINK_URI, "uri": card["url"],
                              "from": fitz.Rect(x, y - 9, x + tw, y + 2)})
        y += 14
        for line in wrap(card["body"], font, CARD_W):
            draw_line(page, font, x, y, line)
            y += LEAD
        y += LEAD
        meta = card.get("meta", "").upper()
        if font.text_length(meta, BODY) > CARD_W + 7:
            overflow.append("card meta '%s' too wide" % meta)
        page.insert_text((x, y), meta, fontname="gp", fontsize=BODY, color=GREY)
        if y > box.y1 + 90:
            overflow.append("card '%s'" % card["title"])

    footer = spec["footer"].upper()
    page.insert_text((FOOTER_RIGHT - font.text_length(footer, BODY), FOOTER_Y), footer,
                     fontname="gp", fontsize=BODY, color=GREY)

    d = spec["doc"]
    doc.set_metadata({"title": d.get("title", ""), "author": d.get("author", ""),
                      "subject": d.get("subject", ""),
                      "keywords": ", ".join(d.get("keywords", [])),
                      "creator": "cv/build_cv.py", "producer": "PyMuPDF"})
    OUT_CURRENT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT_CURRENT, garbage=3, deflate=True)
    print("current ->", OUT_CURRENT.relative_to(ROOT))


def build_grid(spec):
    if not GRID_BUILD.exists():
        raise SystemExit("sinaida-grid-style skill not found at %s" % GRID_BUILD)
    spec = yaml.safe_load(yaml.safe_dump(spec))
    spec["doc"]["output"] = str(OUT_GRID)
    for card in spec["cards"]:
        card["image"] = str((HERE / card["image"]).resolve())
    OUT_GRID.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False) as tmp:
        yaml.safe_dump(spec, tmp, allow_unicode=True, sort_keys=False)
    subprocess.run([sys.executable, str(GRID_BUILD), tmp.name, "--allow-shrink"], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--look", choices=["current", "grid", "both"], default="both")
    args = ap.parse_args()
    spec = yaml.safe_load((HERE / "cv.yaml").read_text())
    if args.look in ("current", "both"):
        build_current(spec)
    if args.look in ("grid", "both"):
        build_grid(spec)
    if overflow:
        sys.exit("OVERFLOW, cut copy: " + "; ".join(overflow))


if __name__ == "__main__":
    main()

# Je suis le spectre d'une rose que tu portais hier au bal.
