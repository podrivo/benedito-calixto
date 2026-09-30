import fitz, os, sys, re

SRC = "/Users/pivo/Desktop/Obra Praça"
OUT = os.path.join(os.path.dirname(__file__), "..", "research", "text")
os.makedirs(OUT, exist_ok=True)

for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith(".pdf"):
        continue
    doc = fitz.open(os.path.join(SRC, name))
    parts = []
    chars = 0
    for i, page in enumerate(doc):
        t = page.get_text()
        chars += len(t.strip())
        parts.append(f"\n===== PAGE {i+1} =====\n{t}")
    base = re.sub(r"[^\w\-.]+", "_", name[:-4])
    with open(os.path.join(OUT, base + ".txt"), "w") as f:
        f.write("".join(parts))
    print(f"{doc.page_count:4d}p {chars:8d}c  {name}")
