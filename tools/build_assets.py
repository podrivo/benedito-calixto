"""Copy source PDFs into docs/ (with web-safe names), shrinking big scans, and export images."""
import fitz, os, re, shutil, subprocess, unicodedata

SRC = "/Users/pivo/Desktop/Obra Praça"
ROOT = os.path.join(os.path.dirname(__file__), "..")
DOCS = os.path.join(ROOT, "docs")
IMG = os.path.join(ROOT, "assets", "img")
os.makedirs(DOCS, exist_ok=True)
os.makedirs(IMG, exist_ok=True)

SKIP = {"ATA_SEGUNDA_SESSAO (1).pdf",
        "TERMO_DE_CONTRATO_014_SUB_PI_2026___PRACA_BENEDITO_CALIXTO___CONSTRUTORA_PROGREDIOR (1).pdf"}


def slug(name):
    s = unicodedata.normalize("NFKD", name[:-4]).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s + ".pdf"


for name in sorted(os.listdir(SRC)):
    if not name.endswith(".pdf") or name in SKIP:
        continue
    src = os.path.join(SRC, name)
    dst = os.path.join(DOCS, slug(name))
    size = os.path.getsize(src)
    if size > 8_000_000:
        doc = fitz.open(src)
        doc.rewrite_images(dpi_threshold=160, dpi_target=130, quality=55)
        doc.save(dst, garbage=4, deflate=True)
    else:
        shutil.copy(src, dst)
    print(f"{size/1e6:7.1f}MB -> {os.path.getsize(dst)/1e6:6.1f}MB  {slug(name)}")

# Site plan (the official project drawing)
p = fitz.open(os.path.join(SRC, "_PROJETO___PC_BC_SUBPI_1.pdf"))[0]
z = 3600 / p.rect.width
p.get_pixmap(matrix=fitz.Matrix(z, z)).save(os.path.join(IMG, "projeto-full.png"))
# crop: just the square strip
strip = fitz.Rect(0.05 * p.rect.width, 0.26 * p.rect.height, 0.96 * p.rect.width, 0.54 * p.rect.height)
z = 3000 / strip.width
p.get_pixmap(matrix=fitz.Matrix(z, z), clip=strip).save(os.path.join(IMG, "projeto-planta.png"))
# high-res version for the zoom viewer (dimension labels need ~2x to be legible)
z = 6000 / strip.width
p.get_pixmap(matrix=fitz.Matrix(z, z), clip=strip).save(os.path.join(IMG, "projeto-planta-zoom.jpg"), jpg_quality=72)
