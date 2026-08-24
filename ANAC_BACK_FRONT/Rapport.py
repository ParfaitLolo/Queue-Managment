from datetime import datetime
from html import escape
from io import BytesIO
from typing import Any

from reportlab.graphics.charts.barcharts import (
    VerticalBarChart,
)
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import (
    TA_CENTER,
    TA_LEFT,
    TA_RIGHT,
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import (
    ParagraphStyle,
    getSampleStyleSheet,
)
from reportlab.lib.units import cm
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    LongTable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# ==========================================================
# CONFIGURATION
# ==========================================================

DEFAULT_ZONE_NAMES = {

    1: "Enregistrement",

    2: "Contrôle sûreté Nord",

    3: "Contrôle sûreté Sud",

    4: "Embarquement",

}


CONGESTION_PRIORITY = {

    "FAIBLE": 1,

    "MODERE": 2,

    "ELEVE": 3,

    "CRITIQUE": 4,

}


CONGESTION_LABELS = {

    "FAIBLE": "Faible",

    "MODERE": "Modéré",

    "ELEVE": "Élevé",

    "CRITIQUE": "Critique",

}


CONGESTION_COLORS = {

    "FAIBLE":
        colors.HexColor("#DCFCE7"),

    "MODERE":
        colors.HexColor("#FEF3C7"),

    "ELEVE":
        colors.HexColor("#FFEDD5"),

    "CRITIQUE":
        colors.HexColor("#FEE2E2"),

}


# ==========================================================
# OUTILS DE CONVERSION
# ==========================================================

def safe_float(
    value: Any,
    default: float = 0.0
) -> float:

    try:

        result = float(value)

        if result != result:  # NaN
            return default

        return result

    except (
        TypeError,
        ValueError
    ):

        return default


def safe_int(
    value: Any,
    default: int = 0
) -> int:

    try:

        return int(
            float(value)
        )

    except (
        TypeError,
        ValueError
    ):

        return default


def normalize_level(
    value: Any
) -> str:

    level = str(
        value or "FAIBLE"
    ).strip().upper()

    # Accepter les valeurs avec accents
    replacements = {

        "MODÉRÉ":
            "MODERE",

        "ÉLEVÉ":
            "ELEVE",

    }

    level = replacements.get(
        level,
        level
    )

    if level not in CONGESTION_PRIORITY:

        return "FAIBLE"

    return level


def format_number(
    value: float,
    decimals: int = 1
) -> str:

    return f"{value:.{decimals}f}"


# ==========================================================
# EXTRACTION DES DONNÉES
# ==========================================================

def get_waiting_minutes(
    camera_data: dict
) -> float:

    if (
        camera_data.get(
            "waiting_time_minutes"
        )
        is not None
    ):

        return safe_float(

            camera_data.get(
                "waiting_time_minutes"
            )

        )

    if (
        camera_data.get(
            "average_active_wait_seconds"
        )
        is not None
    ):

        return safe_float(

            camera_data.get(
                "average_active_wait_seconds"
            )

        ) / 60.0

    return 0.0


def get_maximum_wait_minutes(
    camera_data: dict
) -> float:

    if (
        camera_data.get(
            "maximum_wait_minutes"
        )
        is not None
    ):

        return safe_float(

            camera_data.get(
                "maximum_wait_minutes"
            )

        )

    return safe_float(

        camera_data.get(
            "maximum_active_wait_seconds",
            0
        )

    ) / 60.0


def calculate_forecast(
    current_count: int,
    arrival_rate: float,
    throughput_rate: float,
    horizon_minutes: int
) -> int:

    net_flow = (
        arrival_rate
        - throughput_rate
    )

    predicted_count = (
        current_count
        + net_flow
        * horizon_minutes
    )

    return max(
        0,
        round(predicted_count)
    )


def calculate_forecast_wait(
    predicted_count: int,
    throughput_rate: float,
    current_wait: float
) -> float:

    if predicted_count <= 0:

        return 0.0

    if throughput_rate <= 0:

        # Impossible de calculer une durée fiable
        return current_wait

    return (
        predicted_count
        / throughput_rate
    )


def normalize_camera_data(
    data: dict,
    zone_names: dict
) -> list[dict]:

    normalized = []

    for raw_camera_id, camera_data in data.items():

        try:

            camera_id = int(
                raw_camera_id
            )

        except (
            TypeError,
            ValueError
        ):

            camera_id = raw_camera_id

        camera_data = (
            camera_data
            if isinstance(
                camera_data,
                dict
            )
            else {}
        )

        person_count = safe_int(

            camera_data.get(
                "person_count",
                camera_data.get(
                    "queue_count",
                    0
                )
            )

        )

        waiting_minutes = (
            get_waiting_minutes(
                camera_data
            )
        )

        maximum_wait_minutes = (
            get_maximum_wait_minutes(
                camera_data
            )
        )

        arrival_rate = safe_float(

            camera_data.get(
                "arrival_rate_per_min",
                0
            )

        )

        throughput_rate = safe_float(

            camera_data.get(
                "throughput_rate_per_min",
                0
            )

        )

        congestion_level = (
            normalize_level(

                camera_data.get(
                    "congestion_level",
                    "FAIBLE"
                )

            )
        )

        forecast_15 = calculate_forecast(

            person_count,

            arrival_rate,

            throughput_rate,

            15

        )

        forecast_30 = calculate_forecast(

            person_count,

            arrival_rate,

            throughput_rate,

            30

        )

        forecast_wait_30 = (
            calculate_forecast_wait(

                forecast_30,

                throughput_rate,

                waiting_minutes

            )
        )

        zone_name = zone_names.get(

            camera_id,

            camera_data.get(

                "zone_name",

                f"Caméra {camera_id}"

            )

        )

        normalized.append({

            "camera_id":
                camera_id,

            "camera_name":
                camera_data.get(
                    "camera_name",
                    f"CAM-{camera_id}"
                ),

            "zone_name":
                zone_name,

            "person_count":
                person_count,

            "waiting_minutes":
                waiting_minutes,

            "maximum_wait_minutes":
                maximum_wait_minutes,

            "arrival_rate":
                arrival_rate,

            "throughput_rate":
                throughput_rate,

            "net_flow":
                arrival_rate
                - throughput_rate,

            "congestion_level":
                congestion_level,

            "forecast_15":
                forecast_15,

            "forecast_30":
                forecast_30,

            "forecast_wait_30":
                forecast_wait_30,

            "total_arrivals":
                safe_int(
                    camera_data.get(
                        "total_arrivals",
                        0
                    )
                ),

            "total_exits":
                safe_int(
                    camera_data.get(
                        "total_exits",
                        0
                    )
                ),

            "region_configured":
                bool(
                    camera_data.get(
                        "region"
                    )
                    or camera_data.get(
                        "region_configured"
                    )
                ),

        })

    normalized.sort(

        key=lambda zone:
            str(zone["camera_id"])

    )

    return normalized


# ==========================================================
# CALCUL DES INDICATEURS GLOBAUX
# ==========================================================

def calculate_global_metrics(
    zones: list[dict]
) -> dict:

    total_people = sum(

        zone["person_count"]

        for zone in zones

    )

    total_arrival_rate = sum(

        zone["arrival_rate"]

        for zone in zones

    )

    total_throughput_rate = sum(

        zone["throughput_rate"]

        for zone in zones

    )

    total_forecast_15 = sum(

        zone["forecast_15"]

        for zone in zones

    )

    total_forecast_30 = sum(

        zone["forecast_30"]

        for zone in zones

    )

    weighted_wait = sum(

        zone["waiting_minutes"]
        * zone["person_count"]

        for zone in zones

    )

    average_wait = (

        weighted_wait
        / total_people

        if total_people > 0

        else 0.0

    )

    maximum_wait = max(

        (
            zone["maximum_wait_minutes"]
            for zone in zones
        ),

        default=0.0

    )

    worst_zone = max(

        zones,

        key=lambda zone: (

            CONGESTION_PRIORITY[
                zone["congestion_level"]
            ],

            zone["forecast_30"],

            zone["person_count"]

        ),

        default=None

    )

    return {

        "total_people":
            total_people,

        "average_wait":
            average_wait,

        "maximum_wait":
            maximum_wait,

        "arrival_rate":
            total_arrival_rate,

        "throughput_rate":
            total_throughput_rate,

        "net_flow":
            total_arrival_rate
            - total_throughput_rate,

        "forecast_15":
            total_forecast_15,

        "forecast_30":
            total_forecast_30,

        "worst_zone":
            worst_zone,

    }


# ==========================================================
# STYLES DU PDF
# ==========================================================

def create_styles() -> dict:

    base_styles = getSampleStyleSheet()

    return {

        "title":
            ParagraphStyle(

                "ReportTitle",

                parent=base_styles["Title"],

                fontName="Helvetica-Bold",

                fontSize=20,

                leading=24,

                alignment=TA_CENTER,

                textColor=colors.HexColor(
                    "#0F172A"
                ),

                spaceAfter=8

            ),

        "subtitle":
            ParagraphStyle(

                "ReportSubtitle",

                parent=base_styles["Normal"],

                fontSize=9,

                leading=13,

                alignment=TA_CENTER,

                textColor=colors.HexColor(
                    "#64748B"
                ),

                spaceAfter=18

            ),

        "heading":
            ParagraphStyle(

                "SectionHeading",

                parent=base_styles["Heading2"],

                fontName="Helvetica-Bold",

                fontSize=14,

                leading=18,

                textColor=colors.HexColor(
                    "#1E3A5F"
                ),

                spaceBefore=12,

                spaceAfter=8

            ),

        "subheading":
            ParagraphStyle(

                "Subheading",

                parent=base_styles["Heading3"],

                fontName="Helvetica-Bold",

                fontSize=11,

                leading=14,

                textColor=colors.HexColor(
                    "#334155"
                ),

                spaceBefore=8,

                spaceAfter=5

            ),

        "normal":
            ParagraphStyle(

                "ReportNormal",

                parent=base_styles["Normal"],

                fontSize=9,

                leading=13,

                alignment=TA_LEFT,

                textColor=colors.HexColor(
                    "#334155"
                )

            ),

        "small":
            ParagraphStyle(

                "ReportSmall",

                parent=base_styles["Normal"],

                fontSize=7.5,

                leading=10,

                textColor=colors.HexColor(
                    "#64748B"
                )

            ),

        "table":
            ParagraphStyle(

                "TableText",

                parent=base_styles["Normal"],

                fontSize=7.5,

                leading=9,

                textColor=colors.HexColor(
                    "#1E293B"
                )

            ),

        "table_header":
            ParagraphStyle(

                "TableHeader",

                parent=base_styles["Normal"],

                fontName="Helvetica-Bold",

                fontSize=7,

                leading=9,

                alignment=TA_CENTER,

                textColor=colors.white

            ),

        "recommendation":
            ParagraphStyle(

                "Recommendation",

                parent=base_styles["Normal"],

                fontSize=10,

                leading=14,

                textColor=colors.HexColor(
                    "#0F172A"
                ),

                leftIndent=8,

                rightIndent=8

            ),

    }


# ==========================================================
# EN-TÊTE ET PIED DE PAGE
# ==========================================================

def draw_header_footer(
    canvas,
    document
) -> None:

    canvas.saveState()

    page_width, page_height = A4

    canvas.setStrokeColor(
        colors.HexColor("#CBD5E1")
    )

    canvas.setLineWidth(0.5)

    canvas.line(

        1.5 * cm,

        page_height - 1.1 * cm,

        page_width - 1.5 * cm,

        page_height - 1.1 * cm

    )

    canvas.setFont(
        "Helvetica",
        7
    )

    canvas.setFillColor(
        colors.HexColor("#64748B")
    )

    canvas.drawString(

        1.5 * cm,

        page_height - 0.85 * cm,

        "Supervision intelligente des flux passagers"

    )

    canvas.drawRightString(

        page_width - 1.5 * cm,

        0.8 * cm,

        f"Page {document.page}"

    )

    canvas.drawString(

        1.5 * cm,

        0.8 * cm,

        "Rapport généré automatiquement"

    )

    canvas.restoreState()


# ==========================================================
# TABLEAU DES INDICATEURS
# ==========================================================

def build_summary_table(
    metrics: dict,
    styles: dict
) -> Table:

    worst_zone = metrics.get(
        "worst_zone"
    )

    worst_zone_name = (

        worst_zone["zone_name"]

        if worst_zone

        else "Aucune"

    )

    data = [

        [
            Paragraph(
                "Personnes en file",
                styles["table_header"]
            ),

            Paragraph(
                "Attente moyenne",
                styles["table_header"]
            ),

            Paragraph(
                "Attente maximale",
                styles["table_header"]
            ),

            Paragraph(
                "Zone prioritaire",
                styles["table_header"]
            ),
        ],

        [
            str(
                metrics["total_people"]
            ),

            (
                f"{metrics['average_wait']:.1f} min"
            ),

            (
                f"{metrics['maximum_wait']:.1f} min"
            ),

            Paragraph(
                escape(
                    str(worst_zone_name)
                ),
                styles["table"]
            ),
        ]

    ]

    table = Table(

        data,

        colWidths=[
            4.3 * cm,
            4.3 * cm,
            4.3 * cm,
            4.3 * cm
        ]

    )

    table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#1E3A5F")
            ),

            (
                "BACKGROUND",
                (0, 1),
                (-1, 1),
                colors.HexColor("#F8FAFC")
            ),

            (
                "ALIGN",
                (0, 0),
                (-1, -1),
                "CENTER"
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

            (
                "FONTNAME",
                (0, 1),
                (-1, 1),
                "Helvetica-Bold"
            ),

            (
                "FONTSIZE",
                (0, 1),
                (-1, 1),
                12
            ),

            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.HexColor("#CBD5E1")
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                9
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                9
            ),

        ])

    )

    return table


# ==========================================================
# TABLEAU DES ZONES
# ==========================================================

def build_zone_table(
    zones: list[dict],
    styles: dict
) -> LongTable:

    table_data = [[

        Paragraph(
            "Zone",
            styles["table_header"]
        ),

        Paragraph(
            "File",
            styles["table_header"]
        ),

        Paragraph(
            "Attente moy.",
            styles["table_header"]
        ),

        Paragraph(
            "Attente max.",
            styles["table_header"]
        ),

        Paragraph(
            "Arrivées/min",
            styles["table_header"]
        ),

        Paragraph(
            "Sorties/min",
            styles["table_header"]
        ),

        Paragraph(
            "Niveau",
            styles["table_header"]
        ),

    ]]

    for zone in zones:

        table_data.append([

            Paragraph(
                escape(
                    str(zone["zone_name"])
                ),
                styles["table"]
            ),

            str(
                zone["person_count"]
            ),

            f"{zone['waiting_minutes']:.1f} min",

            f"{zone['maximum_wait_minutes']:.1f} min",

            f"{zone['arrival_rate']:.1f}",

            f"{zone['throughput_rate']:.1f}",

            CONGESTION_LABELS[
                zone["congestion_level"]
            ],

        ])

    table = LongTable(

        table_data,

        repeatRows=1,

        colWidths=[

            4.0 * cm,

            1.4 * cm,

            2.4 * cm,

            2.4 * cm,

            2.5 * cm,

            2.5 * cm,

            2.2 * cm,

        ]

    )

    style_commands = [

        (
            "BACKGROUND",
            (0, 0),
            (-1, 0),
            colors.HexColor("#1E3A5F")
        ),

        (
            "VALIGN",
            (0, 0),
            (-1, -1),
            "MIDDLE"
        ),

        (
            "ALIGN",
            (1, 1),
            (-1, -1),
            "CENTER"
        ),

        (
            "ROWBACKGROUNDS",
            (0, 1),
            (-1, -1),
            [
                colors.white,
                colors.HexColor("#F8FAFC")
            ]
        ),

        (
            "GRID",
            (0, 0),
            (-1, -1),
            0.4,
            colors.HexColor("#CBD5E1")
        ),

        (
            "TOPPADDING",
            (0, 0),
            (-1, -1),
            7
        ),

        (
            "BOTTOMPADDING",
            (0, 0),
            (-1, -1),
            7
        ),

        (
            "FONTSIZE",
            (1, 1),
            (-1, -1),
            7.5
        ),

    ]

    # Colorer la cellule de congestion
    for row_index, zone in enumerate(
        zones,
        start=1
    ):

        style_commands.append((

            "BACKGROUND",

            (6, row_index),

            (6, row_index),

            CONGESTION_COLORS[
                zone["congestion_level"]
            ]

        ))

    table.setStyle(
        TableStyle(style_commands)
    )

    return table


# ==========================================================
# TABLEAU DES PRÉVISIONS
# ==========================================================

def build_forecast_table(
    zones: list[dict],
    styles: dict
) -> LongTable:

    data = [[

        Paragraph(
            "Zone",
            styles["table_header"]
        ),

        Paragraph(
            "Actuel",
            styles["table_header"]
        ),

        Paragraph(
            "+15 min",
            styles["table_header"]
        ),

        Paragraph(
            "+30 min",
            styles["table_header"]
        ),

        Paragraph(
            "Attente prévue",
            styles["table_header"]
        ),

        Paragraph(
            "Évolution",
            styles["table_header"]
        ),

        Paragraph(
            "Risque",
            styles["table_header"]
        ),

    ]]

    for zone in zones:

        difference = (

            zone["forecast_30"]
            - zone["person_count"]

        )

        if difference > 0:

            evolution = (
                f"+{difference} personnes"
            )

        elif difference < 0:

            evolution = (
                f"{difference} personnes"
            )

        else:

            evolution = "Stable"

        data.append([

            Paragraph(
                escape(
                    str(zone["zone_name"])
                ),
                styles["table"]
            ),

            str(
                zone["person_count"]
            ),

            str(
                zone["forecast_15"]
            ),

            str(
                zone["forecast_30"]
            ),

            (
                f"{zone['forecast_wait_30']:.1f} min"
            ),

            evolution,

            CONGESTION_LABELS[
                zone["congestion_level"]
            ],

        ])

    table = LongTable(

        data,

        repeatRows=1,

        colWidths=[

            4.0 * cm,

            1.6 * cm,

            1.7 * cm,

            1.7 * cm,

            2.8 * cm,

            3.0 * cm,

            2.5 * cm,

        ]

    )

    table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor("#1E3A5F")
            ),

            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor("#F8FAFC")
                ]
            ),

            (
                "ALIGN",
                (1, 1),
                (-1, -1),
                "CENTER"
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.4,
                colors.HexColor("#CBD5E1")
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            ),

            (
                "FONTSIZE",
                (1, 1),
                (-1, -1),
                7.5
            ),

        ])

    )

    return table


# ==========================================================
# GRAPHIQUE DES PRÉVISIONS
# ==========================================================

def build_forecast_chart(
    zones: list[dict]
) -> Drawing | None:

    if not zones:

        return None

    # Éviter un graphique illisible
    visible_zones = zones[:8]

    drawing = Drawing(

        17.5 * cm,

        8.5 * cm

    )

    chart = VerticalBarChart()

    chart.x = 1.4 * cm

    chart.y = 1.5 * cm

    chart.width = 15.2 * cm

    chart.height = 5.8 * cm

    chart.data = [

        [
            zone["person_count"]
            for zone in visible_zones
        ],

        [
            zone["forecast_15"]
            for zone in visible_zones
        ],

        [
            zone["forecast_30"]
            for zone in visible_zones
        ],

    ]

    chart.categoryAxis.categoryNames = [

        str(zone["zone_name"])[:18]

        for zone in visible_zones

    ]

    chart.categoryAxis.labels.fontName = (
        "Helvetica"
    )

    chart.categoryAxis.labels.fontSize = 6.5

    chart.categoryAxis.labels.angle = 15

    chart.categoryAxis.labels.boxAnchor = "ne"

    chart.valueAxis.valueMin = 0

    maximum_value = max(

        (
            max(
                zone["person_count"],
                zone["forecast_15"],
                zone["forecast_30"]
            )
            for zone in visible_zones
        ),

        default=10

    )

    chart.valueAxis.valueMax = max(

        10,

        maximum_value * 1.2

    )

    chart.valueAxis.valueStep = max(

        1,

        round(
            chart.valueAxis.valueMax / 5
        )

    )

    chart.valueAxis.labels.fontSize = 7

    chart.bars[0].fillColor = (
        colors.HexColor("#3B82F6")
    )

    chart.bars[1].fillColor = (
        colors.HexColor("#F59E0B")
    )

    chart.bars[2].fillColor = (
        colors.HexColor("#DC2626")
    )

    chart.groupSpacing = 8

    chart.barSpacing = 2

    drawing.add(chart)

    return drawing


def build_chart_legend(
    styles: dict
) -> Table:

    data = [[

        "",

        Paragraph(
            "Actuel",
            styles["small"]
        ),

        "",

        Paragraph(
            "+15 minutes",
            styles["small"]
        ),

        "",

        Paragraph(
            "+30 minutes",
            styles["small"]
        ),

    ]]

    legend = Table(

        data,

        colWidths=[

            0.35 * cm,
            2.0 * cm,

            0.35 * cm,
            2.5 * cm,

            0.35 * cm,
            2.5 * cm,

        ],

        hAlign="CENTER"

    )

    legend.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (0, 0),
                colors.HexColor("#3B82F6")
            ),

            (
                "BACKGROUND",
                (2, 0),
                (2, 0),
                colors.HexColor("#F59E0B")
            ),

            (
                "BACKGROUND",
                (4, 0),
                (4, 0),
                colors.HexColor("#DC2626")
            ),

            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            ),

        ])

    )

    return legend


# ==========================================================
# ALERTES
# ==========================================================

def build_alerts(
    zones: list[dict],
    styles: dict
) -> list:

    alert_zones = [

        zone

        for zone in zones

        if zone["congestion_level"]
        != "FAIBLE"

    ]

    alert_zones.sort(

        key=lambda zone: (

            CONGESTION_PRIORITY[
                zone["congestion_level"]
            ],

            zone["waiting_minutes"],

            zone["person_count"]

        ),

        reverse=True

    )

    elements = []

    if not alert_zones:

        elements.append(

            Paragraph(

                (
                    "Aucune alerte active. "
                    "Toutes les zones analysées "
                    "présentent un niveau faible."
                ),

                styles["normal"]

            )

        )

        return elements

    for zone in alert_zones:

        level = CONGESTION_LABELS[
            zone["congestion_level"]
        ]

        text = (

            f"<b>{escape(str(zone['zone_name']))}</b> - "

            f"Niveau {level}. "

            f"{zone['person_count']} personne(s) en file, "

            f"attente moyenne de "
            f"{zone['waiting_minutes']:.1f} minute(s), "

            f"prévision de {zone['forecast_30']} personne(s) "
            f"dans 30 minutes."

        )

        alert_table = Table(

            [[
                Paragraph(
                    text,
                    styles["normal"]
                )
            ]],

            colWidths=[
                17.2 * cm
            ]

        )

        alert_table.setStyle(

            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, -1),
                    CONGESTION_COLORS[
                        zone[
                            "congestion_level"
                        ]
                    ]
                ),

                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.8,
                    colors.HexColor("#CBD5E1")
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    10
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    10
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    8
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    8
                ),

            ])

        )

        elements.append(
            alert_table
        )

        elements.append(
            Spacer(1, 6)
        )

    return elements


# ==========================================================
# RECOMMANDATIONS
# ==========================================================

def generate_recommendations(
    zones: list[dict],
    metrics: dict
) -> list[str]:

    recommendations = []

    sorted_zones = sorted(

        zones,

        key=lambda zone: (

            CONGESTION_PRIORITY[
                zone["congestion_level"]
            ],

            zone["forecast_30"],

            zone["waiting_minutes"]

        ),

        reverse=True

    )

    for zone in sorted_zones:

        level = zone[
            "congestion_level"
        ]

        zone_name = zone[
            "zone_name"
        ]

        if level == "CRITIQUE":

            recommendations.append(

                (
                    f"Ouvrir immédiatement un poste "
                    f"supplémentaire à {zone_name}. "
                    f"La file pourrait atteindre "
                    f"{zone['forecast_30']} personnes "
                    f"dans 30 minutes."
                )

            )

        elif level == "ELEVE":

            recommendations.append(

                (
                    f"Préparer le renforcement des moyens "
                    f"à {zone_name} et surveiller "
                    f"l'évolution toutes les 5 minutes."
                )

            )

        elif level == "MODERE":

            recommendations.append(

                (
                    f"Maintenir une surveillance renforcée "
                    f"à {zone_name}. La file actuelle est "
                    f"de {zone['person_count']} personnes."
                )

            )

        if zone["throughput_rate"] <= 0:

            if zone["person_count"] > 0:

                recommendations.append(

                    (
                        f"Vérifier la capacité de traitement "
                        f"à {zone_name} : aucun débit de sortie "
                        f"n'est actuellement mesuré."
                    )

                )

        elif (
            zone["arrival_rate"]
            > zone["throughput_rate"]
        ):

            recommendations.append(

                (
                    f"À {zone_name}, le débit d'arrivée "
                    f"({zone['arrival_rate']:.1f} pax/min) "
                    f"dépasse le débit de sortie "
                    f"({zone['throughput_rate']:.1f} pax/min)."
                )

            )

    if not recommendations:

        recommendations.append(

            (
                "Aucune action immédiate n'est nécessaire. "
                "Les flux et les files observés sont maîtrisés."
            )

        )

    # Éviter un rapport surchargé
    return recommendations[:8]


def build_recommendation_list(
    recommendations: list[str],
    styles: dict
) -> ListFlowable:

    items = [

        ListItem(

            Paragraph(
                escape(recommendation),
                styles["recommendation"]
            ),

            leftIndent=12,

            spaceAfter=5

        )

        for recommendation
        in recommendations

    ]

    return ListFlowable(

        items,

        bulletType="bullet",

        start="circle",

        leftIndent=20,

        bulletFontName="Helvetica",

        bulletFontSize=8

    )


# ==========================================================
# FONCTION PRINCIPALE
# ==========================================================

def create_pdf_report(
    data: dict,
    zone_names: dict | None = None,
    airport_name: str = "Aéroport",
    report_title: str = (
        "Rapport opérationnel des passagers"
    )
) -> bytes:

    """
    Génère un rapport PDF à partir des données des caméras.

    Args:
        data:
            Dictionnaire au format :
            {
                camera_id: camera.get_data(),
                ...
            }

        zone_names:
            Noms personnalisés des zones.

        airport_name:
            Nom de l'aéroport ou du site.

        report_title:
            Titre du rapport.

    Returns:
        Contenu du PDF sous forme de bytes.
    """

    if not isinstance(data, dict):

        raise TypeError(
            "data doit être un dictionnaire."
        )

    selected_zone_names = {

        **DEFAULT_ZONE_NAMES,

        **(zone_names or {})

    }

    zones = normalize_camera_data(

        data,

        selected_zone_names

    )

    metrics = calculate_global_metrics(
        zones
    )

    styles = create_styles()

    buffer = BytesIO()

    document = SimpleDocTemplate(

        buffer,

        pagesize=A4,

        rightMargin=1.5 * cm,

        leftMargin=1.5 * cm,

        topMargin=1.5 * cm,

        bottomMargin=1.5 * cm,

        title=report_title,

        author="Système de supervision des passagers",

        subject=(
            "Analyse des flux, files d'attente "
            "et prévisions d'affluence"
        )

    )

    elements = []


    # ------------------------------------------------------
    # PAGE DE SYNTHÈSE
    # ------------------------------------------------------

    elements.append(

        Paragraph(

            escape(report_title),

            styles["title"]

        )

    )

    elements.append(

        Paragraph(

            (
                f"{escape(airport_name)}<br/>"
                f"Généré le "
                f"{datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}"
            ),

            styles["subtitle"]

        )

    )

    if not zones:

        elements.append(

            Paragraph(

                (
                    "Aucune donnée de caméra n'était "
                    "disponible au moment de la génération."
                ),

                styles["normal"]

            )

        )

    else:

        elements.append(

            build_summary_table(
                metrics,
                styles
            )

        )

        elements.append(
            Spacer(1, 14)
        )

        worst_zone = metrics[
            "worst_zone"
        ]

        situation_text = (

            f"Le système détecte actuellement "
            f"<b>{metrics['total_people']} personne(s)</b> "
            f"dans les zones analysées. "

            f"Le temps d'attente moyen pondéré est de "
            f"<b>{metrics['average_wait']:.1f} minute(s)</b>. "

            f"Le débit global d'arrivée est de "
            f"<b>{metrics['arrival_rate']:.1f} pax/min</b>, "
            f"contre "
            f"<b>{metrics['throughput_rate']:.1f} pax/min</b> "
            f"en sortie."

        )

        if worst_zone:

            situation_text += (

                f" La zone prioritaire est "
                f"<b>{escape(str(worst_zone['zone_name']))}</b>, "
                f"avec un niveau de congestion "
                f"<b>"
                f"{CONGESTION_LABELS[worst_zone['congestion_level']]}"
                f"</b>."

            )

        elements.append(

            Paragraph(

                situation_text,

                styles["normal"]

            )

        )

        elements.append(
            Spacer(1, 10)
        )

        elements.append(

            Paragraph(

                "Situation détaillée par zone",

                styles["heading"]

            )

        )

        elements.append(

            build_zone_table(
                zones,
                styles
            )

        )


        # --------------------------------------------------
        # PRÉVISIONS
        # --------------------------------------------------

        elements.append(
            PageBreak()
        )

        elements.append(

            Paragraph(

                "Prévisions d'affluence",

                styles["heading"]

            )

        )

        elements.append(

            Paragraph(

                (
                    "Les projections suivantes supposent "
                    "que les débits d'arrivée et de sortie "
                    "mesurés au moment de la génération "
                    "restent constants."
                ),

                styles["normal"]

            )

        )

        elements.append(
            Spacer(1, 10)
        )

        elements.append(

            build_forecast_table(
                zones,
                styles
            )

        )

        elements.append(
            Spacer(1, 16)
        )

        chart = build_forecast_chart(
            zones
        )

        if chart:

            elements.append(

                KeepTogether([

                    Paragraph(

                        "Comparaison des projections",

                        styles["subheading"]

                    ),

                    chart,

                    build_chart_legend(
                        styles
                    )

                ])

            )


        # --------------------------------------------------
        # ALERTES
        # --------------------------------------------------

        elements.append(
            PageBreak()
        )

        elements.append(

            Paragraph(

                "Alertes opérationnelles",

                styles["heading"]

            )

        )

        elements.extend(

            build_alerts(
                zones,
                styles
            )

        )


        # --------------------------------------------------
        # RECOMMANDATIONS
        # --------------------------------------------------

        elements.append(

            Paragraph(

                "Recommandations",

                styles["heading"]

            )

        )

        recommendations = (
            generate_recommendations(
                zones,
                metrics
            )
        )

        elements.append(

            build_recommendation_list(

                recommendations,

                styles

            )

        )

        elements.append(
            Spacer(1, 16)
        )


        # --------------------------------------------------
        # MÉTHODOLOGIE
        # --------------------------------------------------

        elements.append(

            Paragraph(

                "Méthodologie et interprétation",

                styles["heading"]

            )

        )

        methodology = [

            (
                "<b>Nombre de personnes :</b> "
                "nombre de trajectoires détectées à "
                "l'intérieur de la région d'analyse."
            ),

            (
                "<b>Temps d'attente :</b> "
                "durée estimée entre l'entrée et la "
                "sortie d'une personne de la zone."
            ),

            (
                "<b>Débit d'arrivée :</b> "
                "nombre de personnes entrant dans la "
                "zone par minute."
            ),

            (
                "<b>Débit de sortie :</b> "
                "nombre de personnes quittant la zone "
                "par minute."
            ),

            (
                "<b>Prévision :</b> "
                "projection linéaire calculée avec la "
                "différence entre le débit d'arrivée "
                "et le débit de sortie."
            ),

        ]

        for text in methodology:

            elements.append(

                Paragraph(
                    text,
                    styles["normal"]
                )

            )

            elements.append(
                Spacer(1, 5)
            )


        # --------------------------------------------------
        # LIMITES
        # --------------------------------------------------

        elements.append(

            Paragraph(

                "Limites du rapport",

                styles["heading"]

            )

        )

        elements.append(

            Paragraph(

                (
                    "Les indicateurs reposent sur la qualité "
                    "des images, le positionnement des caméras, "
                    "la définition des régions, la stabilité du "
                    "suivi des personnes et la fenêtre utilisée "
                    "pour calculer les débits. Les prévisions "
                    "présentées sont des projections à court "
                    "terme et ne constituent pas encore un "
                    "modèle prédictif entraîné sur un historique "
                    "aéroportuaire."
                ),

                styles["normal"]

            )

        )

        elements.append(
            Spacer(1, 12)
        )

        elements.append(

            Paragraph(

                (
                    "Les données sont agrégées et ne doivent "
                    "pas être utilisées pour identifier "
                    "individuellement les passagers."
                ),

                styles["small"]

            )

        )


    # ------------------------------------------------------
    # CONSTRUCTION DU PDF
    # ------------------------------------------------------

    document.build(

        elements,

        onFirstPage=
            draw_header_footer,

        onLaterPages=
            draw_header_footer

    )

    pdf_content = buffer.getvalue()

    buffer.close()

    return pdf_content