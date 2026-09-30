import fitz, os, re, subprocess, sys

SRC = "/Users/pivo/Desktop/Obra Praça"
ROOT = os.path.join(os.path.dirname(__file__), "..")
IMG = os.path.join(ROOT, "research", "pages")
OUT = os.path.join(ROOT, "research", "ocr")
OCR = os.path.join(ROOT, "tools", "ocr")
os.makedirs(IMG, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith(".pdf") or "(1)" in name:
        continue
    doc = fitz.open(os.path.join(SRC, name))
    if sum(len(p.get_text().strip()) for p in doc) > 200:
        continue
    base = re.sub(r"[^\w\-.]+", "_", name[:-4])
    d = os.path.join(IMG, base)
    os.makedirs(d, exist_ok=True)
    paths = []
    for i, page in enumerate(doc):
        p = os.path.join(d, f"p{i+1:03d}.jpg")
        if not os.path.exists(p):
            zoom = min(2.0, 2200 / max(page.rect.width, page.rect.height))
            page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).save(p, jpg_quality=80)
        paths.append(p)
    res = subprocess.run([OCR] + paths, capture_output=True, text=True)
    with open(os.path.join(OUT, base + ".txt"), "w") as f:
        f.write(res.stdout)
    print(f"done {doc.page_count}p {name}", flush=True)
