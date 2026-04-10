from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
import io

def generate_pdf(data):
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    elements = []

    # Title
    elements.append(Paragraph(data.title, styles['Title']))
    elements.append(Spacer(1, 20))

    # Paragraphs
    for para in data.paragraphs:
        elements.append(Paragraph(para, styles['BodyText']))
        elements.append(Spacer(1, 12))

    doc.build(elements)

    buffer.seek(0)
    return buffer
