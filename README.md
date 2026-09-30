# Obra da Praça Benedito Calixto

Static page (Portuguese) that tells the story of the renovation of Praça Benedito Calixto, Pinheiros, São Paulo, using the public documents of process SEI 6050.2026/0010848-0 (and 6050.2026/0017937-9).

- `index.html`, `styles.css`, `script.js`: the site. No build step.
- `docs/`: the source PDFs with web-safe names. Scans over 8 MB were recompressed. The site links to copies in a [public Google Drive folder](https://drive.google.com/drive/folders/1I9BEnzk4rgKj1O4pXs5-718h6hL83qUr) (file IDs in `DRIVE` in `script.js`), and `docs/` is not deployed.
- `assets/img/`: the site plan and a selection of "before" photos from the inspection report.
- `tools/`: scripts used to extract text/OCR and build the assets (`build_assets.py` reads from `~/Desktop/Obra Praça`).

Run locally:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

Official sources:

- https://processos.prefeitura.sp.gov.br/Forms/ConsultarProcessos.aspx?numeroprocesso=6050202600108480#!
- https://processos.prefeitura.sp.gov.br/Forms/ConsultarProcessos.aspx?numeroprocesso=6050202600179379#!
- https://diariooficial.prefeitura.sp.gov.br/md_epubli_controlador.php?acao=materias_pesquisar (search "Praça Benedito Calixto")
