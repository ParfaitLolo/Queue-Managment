from datetime import datetime
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph
from reportlab.platypus import SimpleDocTemplate
from reportlab.platypus import Spacer


def create_pdf_report():

    buffer = BytesIO()

    document = SimpleDocTemplate(

        buffer,

        pagesize=A4,

        title="Rapport passagers"

    )

    styles = getSampleStyleSheet()

    elements = [

        Paragraph(
            "Rapport opérationnel des passagers",
            styles["Title"]
        ),

        Spacer(1, 20),

        Paragraph(
            datetime.now().strftime(
                "Généré le %d/%m/%Y à %H:%M:%S"
            ),
            styles["Normal"]
        )

    ]

    document.build(
        elements
    )

    pdf_content = buffer.getvalue()

    buffer.close()

    return pdf_content