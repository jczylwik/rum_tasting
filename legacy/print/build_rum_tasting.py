from pathlib import Path

try:
    import markdown
except ImportError:
    raise SystemExit(
        "Fehler: Das Python-Paket 'markdown' ist nicht installiert. Installiere es mit:\n"
        "    pip install markdown"
    )

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_FILE = BASE_DIR / "rum_tasting_template.html"
SOURCE_FILE = BASE_DIR / "content.md"
OUTPUT_HTML = BASE_DIR / "rum_tasting_print.html"
OUTPUT_PDF = BASE_DIR / "rum_tasting_print.pdf"

if not TEMPLATE_FILE.exists():
    raise SystemExit(f"Vorlage fehlt: {TEMPLATE_FILE}")

if not SOURCE_FILE.exists():
    raise SystemExit(f"Markdown-Datei fehlt: {SOURCE_FILE}")

markdown_text = SOURCE_FILE.read_text(encoding="utf-8")
html_body = markdown.markdown(
    markdown_text,
    extensions=["extra"],
    output_format="html5",
)

page_marker = "<h1>Snacks &amp; Zigarren</h1>"
if page_marker in html_body:
    html_body = html_body.replace(
        page_marker,
        "</div></div></div>\n<div class=\"page\"><div class=\"paper\"><div class=\"content\">\n" + page_marker,
        1,
    )

html_page = TEMPLATE_FILE.read_text(encoding="utf-8").replace("{{ content }}", html_body)
OUTPUT_HTML.write_text(html_page, encoding="utf-8")
print(f"HTML-Datei erzeugt: {OUTPUT_HTML}")

try:
    from weasyprint import HTML

    HTML(string=html_page, base_url=BASE_DIR.as_uri()).write_pdf(OUTPUT_PDF)
    print(f"PDF-Datei erzeugt: {OUTPUT_PDF}")
except ImportError:
    print("WeasyPrint nicht installiert. Installiere es mit:\n    pip install weasyprint\noder nutze das erzeugte HTML im Browser.")
except Exception as exc:
    print("PDF-Konvertierung fehlgeschlagen:", exc)
    print("Das HTML ist erzeugt, versuche eine alternative PDF-Erstellung oder installiere WeasyPrint korrekt.")
