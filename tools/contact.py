import fitz, os, sys

# usage: contact.py <pages_dir> <out_prefix> [cols] [rows]
src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 5
files = sorted(f for f in os.listdir(src) if f.endswith(".jpg"))
W, H = 1800, 1500
cw, ch = W / cols, H / rows
per = cols * rows
for s in range(0, len(files), per):
    doc = fitz.open()
    page = doc.new_page(width=W, height=H)
    for i, f in enumerate(files[s:s + per]):
        r, c = divmod(i, cols)
        rect = fitz.Rect(c * cw + 4, r * ch + 18, (c + 1) * cw - 4, (r + 1) * ch - 4)
        page.insert_image(rect, filename=os.path.join(src, f), keep_proportion=True)
        page.insert_text((c * cw + 6, r * ch + 14), f, fontsize=12, color=(1, 0, 0))
    page.get_pixmap(matrix=fitz.Matrix(1, 1)).save(f"{out}_{s // per + 1:02d}.png")
    print(f"{out}_{s // per + 1:02d}.png")
