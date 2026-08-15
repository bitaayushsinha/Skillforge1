import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.units import inch

def generate_analytics_report_pdf(
    student_name: str,
    student_id: str,
    exam_title: str,
    level: str,
    score: float,
    passed: bool,
    topic_breakdown: dict = None,
    booking_ref: str = "N/A",
    session_ref: str = "N/A",
    date_str: str = None
) -> bytes:
    """Generate a professional PDF report containing comprehensive student assessment analytics."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    story = []
    styles = getSampleStyleSheet()

    # Title Style
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=12
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=6
    )
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1e293b')
    )
    cell_bold_style = ParagraphStyle(
        'CellBoldText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a')
    )

    story.append(Paragraph("SKILLFORGE LMS • ASSESSMENT ANALYTICS REPORT", title_style))
    story.append(Paragraph("Official Performance & Competency Evaluation Document • IBM SkillsBuild Aligned", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceBefore=4, spaceAfter=14))

    # 1. Candidate & Assessment Information
    story.append(Paragraph("1. Candidate & Session Metadata", heading_style))
    info_data = [
        [Paragraph("Candidate Name", cell_bold_style), Paragraph(str(student_name), cell_style),
         Paragraph("Assessment Tier", cell_bold_style), Paragraph(str(level), cell_style)],
        [Paragraph("Student ID", cell_bold_style), Paragraph(str(student_id), cell_style),
         Paragraph("Exam Subject", cell_bold_style), Paragraph(str(exam_title), cell_style)],
        [Paragraph("Booking Reference", cell_bold_style), Paragraph(str(booking_ref), cell_style),
         Paragraph("Session Reference", cell_bold_style), Paragraph(str(session_ref), cell_style)],
        [Paragraph("Evaluation Date", cell_bold_style), Paragraph(date_str or datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'), cell_style),
         Paragraph("Result Status", cell_bold_style), Paragraph("QUALIFIED (PASS)" if passed else "NOT QUALIFIED (FAIL)", cell_bold_style)]
    ]
    t_info = Table(info_data, colWidths=[1.4*inch, 2.2*inch, 1.4*inch, 2.2*inch])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 14))

    # 2. Score Summary Card
    story.append(Paragraph("2. Overall Competency Score", heading_style))
    pass_mark = 50.0 if str(level).strip().lower() == "district" else (60.0 if str(level).strip().lower() == "state" else 80.0)
    score_data = [
        [Paragraph("Metric", cell_bold_style), Paragraph("Value", cell_bold_style), Paragraph("Threshold Required", cell_bold_style), Paragraph("Outcome", cell_bold_style)],
        [
            Paragraph("Assessment Score Percentage", cell_style),
            Paragraph(f"<b>{score}%</b>", cell_style),
            Paragraph(f">={pass_mark}% ({level} Tier)", cell_style),
            Paragraph(
                f"<font color='{'#10b981' if passed else '#ef4444'}'><b>{'PASSED / QUALIFIED' if passed else 'FAILED / NOT QUALIFIED'}</b></font>",
                cell_style
            )
        ]
    ]
    t_score = Table(score_data, colWidths=[2.2*inch, 1.2*inch, 1.8*inch, 2.0*inch])
    t_score.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_score)
    story.append(Spacer(1, 14))

    # 3. Topic Breakdown Table
    story.append(Paragraph("3. Topic-Wise Granular Performance Breakdown", heading_style))
    tb_header = [
        Paragraph("Topic Tag / Knowledge Domain", cell_bold_style),
        Paragraph("Correct Answers", cell_bold_style),
        Paragraph("Total Questions", cell_bold_style),
        Paragraph("Accuracy Rate", cell_bold_style)
    ]
    tb_rows = [tb_header]
    if topic_breakdown and isinstance(topic_breakdown, dict) and len(topic_breakdown) > 0:
        for tag, st in topic_breakdown.items():
            corr = st.get("correct", 0)
            tot = st.get("total", 0)
            acc = st.get("accuracy", 0.0)
            tb_rows.append([
                Paragraph(str(tag), cell_style),
                Paragraph(str(corr), cell_style),
                Paragraph(str(tot), cell_style),
                Paragraph(f"{acc}%", cell_style)
            ])
    else:
        tb_rows.append([
            Paragraph("General Assessment Topics", cell_style),
            Paragraph("-", cell_style),
            Paragraph("-", cell_style),
            Paragraph(f"{score}%", cell_style)
        ])
    t_tb = Table(tb_rows, colWidths=[2.8*inch, 1.4*inch, 1.4*inch, 1.6*inch])
    t_tb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_tb)
    story.append(Spacer(1, 24))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceBefore=8, spaceAfter=8))
    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b'),
        alignment=1
    )
    story.append(Paragraph("This document is an officially generated analytical performance report by SkillForge LMS Authority.<br/>Verify credentials and assessment validity at https://skillforge.lms/verify", footer_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
