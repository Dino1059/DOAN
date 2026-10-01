"""M11: render(markdown) -> PDF bytes, bằng fpdf2 (thuần Python, không cần cairo/pango như WeasyPrint)."""
from fpdf import FPDF

_MARGIN = 15


def render(markdown: str) -> bytes:
    pdf = FPDF(format="A4")
    pdf.set_margins(_MARGIN, _MARGIN, _MARGIN)
    pdf.set_auto_page_break(auto=True, margin=_MARGIN)
    pdf.add_page()

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()
        pdf.set_x(_MARGIN)  # multi_cell(w=0) để lại con trỏ ở lề phải — phải tự đưa về lề trái trước mỗi dòng
        if not line:
            pdf.ln(3)
            continue
        if line.startswith("# "):
            pdf.set_font("Helvetica", "B", 16)
            pdf.multi_cell(0, 9, _plain(line[2:]))
        elif line.startswith("## "):
            pdf.set_font("Helvetica", "B", 12)
            pdf.ln(2)
            pdf.multi_cell(0, 7, _plain(line[3:]))
        elif line.startswith("|"):
            pdf.set_font("Courier", "", 7)
            pdf.multi_cell(0, 4, _plain(line))
        elif line.startswith("- "):
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(0, 5, f"- {_plain(line[2:])}")
        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(0, 5, _plain(line))

    return bytes(pdf.output())


def _plain(text: str) -> str:
    """Bỏ markup Markdown đơn giản (**bold**) và chữ ngoài Latin-1 (font chuẩn PDF không có) để không bao giờ lỗi."""
    text = text.replace("**", "").replace("`", "").replace("_", "")
    return text.encode("latin-1", errors="replace").decode("latin-1")
