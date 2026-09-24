from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs("video_production/slides", exist_ok=True)

# Colors
BG_COLOR = (247, 245, 238)       # #F7F5EE Parchment
CARD_BG = (255, 255, 255)        # Pure White
FOREST_GREEN = (35, 61, 34)      # #233D22
DEEP_GREEN = (24, 45, 24)        # #182D18
BORDER_COLOR = (215, 204, 188)   # #D7CCBC
TEXT_DARK = (30, 34, 27)         # #1E221B
TEXT_MUTED = (99, 104, 88)       # #636858
GOLD = (189, 135, 40)            # #BD8728
ACCENT_GREEN = (46, 125, 50)     # #2E7D32
RED_ACCENT = (198, 40, 40)       # #C62828

def get_font(size, bold=False):
    # Try standard Windows fonts
    font_names = [
        "C:\\Windows\\Fonts\\georgiab.ttf" if bold else "C:\\Windows\\Fonts\\georgia.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf" if bold else "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf" if bold else "C:\\Windows\\Fonts\\segoeui.ttf",
    ]
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                continue
    return ImageFont.load_default()

# -------------------------------------------------------------
# SLIDE 1: Title & The National Problem (0:00 - 0:40)
# -------------------------------------------------------------
def make_slide_1():
    img = Image.new("RGB", (1920, 1080), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Top Tag
    draw.rounded_rectangle([120, 70, 850, 115], radius=8, fill=FOREST_GREEN)
    font_tag = get_font(20, bold=True)
    draw.text((140, 80), "SMART INDIA HACKATHON 2026 • PROBLEM STATEMENT 26033", font=font_tag, fill=(247, 245, 238))

    # Main Brand & Title
    font_brand = get_font(72, bold=True)
    draw.text((120, 135), "Aroha", font=font_brand, fill=FOREST_GREEN)
    
    font_subtitle = get_font(32, bold=False)
    draw.text((120, 220), "India's Definitive Agricultural Trade & Logistics Platform", font=font_subtitle, fill=TEXT_DARK)

    # Crisis Box / Problem Stat Container
    draw.rounded_rectangle([120, 290, 1800, 980], radius=16, fill=CARD_BG, outline=BORDER_COLOR, width=2)
    
    # Section Header
    font_sec = get_font(28, bold=True)
    draw.text((160, 320), "THE NATIONAL CRISIS: CRITICAL BOTTLENECKS IN SMALLHOLDER TRADE", font=font_sec, fill=RED_ACCENT)

    # 3 Stat Columns
    col_w = 490
    col_y = 390
    
    # Stat 1
    draw.rounded_rectangle([160, col_y, 160 + col_w, col_y + 360], radius=12, fill=(253, 245, 245), outline=(235, 180, 180), width=1)
    draw.text((190, col_y + 30), "20% – 35%", font=get_font(52, bold=True), fill=RED_ACCENT)
    draw.text((190, col_y + 105), "Value Leakage to Middlemen", font=get_font(24, bold=True), fill=TEXT_DARK)
    desc1 = "Cartelized commission agents\n(Arhtiyas) and opaque mandi\nsurcharges strip away hard-earned\nharvest profits before payout."
    draw.text((190, col_y + 155), desc1, font=get_font(20), fill=TEXT_MUTED, spacing=8)

    # Stat 2
    col2_x = 160 + col_w + 30
    draw.rounded_rectangle([col2_x, col_y, col2_x + col_w, col_y + 360], radius=12, fill=(255, 250, 240), outline=(240, 215, 160), width=1)
    draw.text((col2_x + 30, col_y + 30), "140M+", font=get_font(52, bold=True), fill=GOLD)
    draw.text((col2_x + 30, col_y + 105), "Information Asymmetry", font=get_font(24, bold=True), fill=TEXT_DARK)
    desc2 = "Smallholders sell at local farmgate\nwithout real-time visibility into\ninter-mandi price arbitrage\nand high-demand buyers."
    draw.text((col2_x + 30, col_y + 155), desc2, font=get_font(20), fill=TEXT_MUTED, spacing=8)

    # Stat 3
    col3_x = col2_x + col_w + 30
    draw.rounded_rectangle([col3_x, col_y, col3_x + col_w, col_y + 360], radius=12, fill=(245, 250, 245), outline=(190, 225, 190), width=1)
    draw.text((col3_x + 30, col_y + 30), "0 Transp.", font=get_font(52, bold=True), fill=ACCENT_GREEN)
    draw.text((col3_x + 30, col_y + 105), "Unorganized Freight & Trust", font=get_font(24, bold=True), fill=TEXT_DARK)
    desc3 = "Lack of deterministic route\ncosting, verified assaying,\nand escrow settlement leads to\nfrequent transit spoilage & disputes."
    draw.text((col3_x + 30, col_y + 155), desc3, font=get_font(20), fill=TEXT_MUTED, spacing=8)

    # Bottom Banner inside card
    draw.rounded_rectangle([160, 780, 1760, 940], radius=12, fill=FOREST_GREEN)
    draw.text((190, 805), "THE AROHA PARADIGM SHIFT", font=get_font(22, bold=True), fill=GOLD)
    draw.text((190, 845), "Empowering Indian farmers through algorithmic price realization, multi-channel FPO pooling, and transparent freight economics.", font=get_font(22, bold=False), fill=(255, 255, 255))

    img.save("video_production/slides/slide_1_problem.png", "PNG")
    print("Saved slide_1_problem.png")

# -------------------------------------------------------------
# SLIDE 2: SIH Evaluation Rubric Alignment (0:40 - 1:15)
# -------------------------------------------------------------
def make_slide_2():
    img = Image.new("RGB", (1920, 1080), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Header Tag
    draw.rounded_rectangle([120, 60, 720, 105], radius=8, fill=FOREST_GREEN)
    draw.text((140, 70), "SIH 2026 JURY EVALUATION RUBRIC ALIGNMENT", font=get_font(20, bold=True), fill=(247, 245, 238))

    # Main Title
    draw.text((120, 125), "Core Innovations & Technical Feasibility", font=get_font(56, bold=True), fill=FOREST_GREEN)
    draw.text((120, 200), "Comprehensive fulfillment of national hackathon excellence benchmarks", font=get_font(26), fill=TEXT_MUTED)

    # 4 Quadrant Grid for Rubric Points
    grid_y = 260
    card_w = 800
    card_h = 320

    cards = [
        {
            "num": "01",
            "title": "Novelty & Algorithmic Uniqueness",
            "points": [
                "• 3D Price Realization Engine computing Net Bank Payout across 5+ mandis",
                "• Dynamic multi-channel freight & handling arbitrage vs static listing boards",
                "• Deterministic road logistics simulation via geospatial routing models",
            ],
            "accent": FOREST_GREEN,
            "x": 120, "y": grid_y
        },
        {
            "num": "02",
            "title": "Technical Architecture & Scalability",
            "points": [
                "• Production-grade NestJS enterprise microservices + Next.js 15 SSR frontend",
                "• PostgreSQL PostGIS geospatial index + Redis low-latency caching",
                "• Rigorous security: Argon2 password hashing, JWT auth, and system audit logs",
            ],
            "accent": DEEP_GREEN,
            "x": 1000, "y": grid_y
        },
        {
            "num": "03",
            "title": "Socio-Economic Farmer Impact",
            "points": [
                "• Unlocks +₹12,400 net profit alpha per truckload for participating producers",
                "• FPO Member Aggregation turns fragmented holdings into bulk commercial lots",
                "• Guaranteed digital assay slips & automated escrow order settlement",
            ],
            "accent": GOLD,
            "x": 120, "y": grid_y + card_h + 30
        },
        {
            "num": "04",
            "title": "Vernacular Inclusivity for Bharat",
            "points": [
                "• 100% full-site localization in Hindi, Marathi, and major regional languages",
                "• Designed specifically for grassroots farmers and local FPO coordinators",
                "• Accessible offline-resilient architecture ensuring reliable demonstration",
            ],
            "accent": ACCENT_GREEN,
            "x": 1000, "y": grid_y + card_h + 30
        }
    ]

    for c in cards:
        draw.rounded_rectangle([c["x"], c["y"], c["x"] + card_w, c["y"] + card_h], radius=14, fill=CARD_BG, outline=BORDER_COLOR, width=2)
        # Left accent stripe
        draw.rounded_rectangle([c["x"], c["y"], c["x"] + 12, c["y"] + card_h], radius=6, fill=c["accent"])
        
        # Number badge
        draw.rounded_rectangle([c["x"] + 30, c["y"] + 25, c["x"] + 85, c["y"] + 65], radius=6, fill=(237, 243, 237))
        draw.text((c["x"] + 42, c["y"] + 30), c["num"], font=get_font(24, bold=True), fill=FOREST_GREEN)
        
        # Title
        draw.text((c["x"] + 105, c["y"] + 30), c["title"], font=get_font(26, bold=True), fill=TEXT_DARK)
        
        # Bullets
        y_text = c["y"] + 90
        for pt in c["points"]:
            draw.text((c["x"] + 35, y_text), pt, font=get_font(20), fill=TEXT_MUTED)
            y_text += 55

    img.save("video_production/slides/slide_2_rubric.png", "PNG")
    print("Saved slide_2_rubric.png")

# -------------------------------------------------------------
# SLIDE 4: Architecture & Vision Conclusion (2:30 - 3:00)
# -------------------------------------------------------------
def make_slide_4():
    import textwrap
    img = Image.new("RGB", (1920, 1080), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Header Tag
    draw.rounded_rectangle([120, 70, 720, 115], radius=8, fill=FOREST_GREEN)
    draw.text((140, 80), "SYSTEM ARCHITECTURE & NATIONAL IMPACT", font=get_font(20, bold=True), fill=(247, 245, 238))

    # Main Title
    draw.text((120, 135), "Transforming Indian Agricultural Commerce", font=get_font(56, bold=True), fill=FOREST_GREEN)
    draw.text((120, 215), "From distress liquidation into transparent, high-yield digital trade", font=get_font(26), fill=TEXT_MUTED)

    # Tech Stack Horizontal Bar
    draw.rounded_rectangle([120, 280, 1800, 480], radius=14, fill=CARD_BG, outline=BORDER_COLOR, width=2)
    draw.text((160, 310), "ENTERPRISE TECHNOLOGY FOUNDATION", font=get_font(22, bold=True), fill=FOREST_GREEN)
    
    stacks = [
        ("Next.js 15 App Router", "SSR, Tailwind CSS v4, TanStack Query"),
        ("NestJS Microservices", "REST APIs, Throttling, Structured Logging"),
        ("PostgreSQL + PostGIS", "Prisma ORM, Geospatial Distance Indexing"),
        ("Redis Distributed Cache", "Rate Limiting & Low-Latency Sessions"),
        ("FastAPI AI Inference", "Price Realization & Landed Cost Engine"),
    ]
    for idx, (head, sub) in enumerate(stacks):
        st_x = 160 + idx * 325
        draw.rounded_rectangle([st_x, 360, st_x + 305, 450], radius=8, fill=(245, 248, 245), outline=(210, 225, 210), width=1)
        draw.text((st_x + 15, 375), head, font=get_font(18, bold=True), fill=TEXT_DARK)
        draw.text((st_x + 15, 410), sub, font=get_font(14), fill=TEXT_MUTED)

    # 3 Impact Pillars
    pillars = [
        ("Zero Middleman Arbitrage", "Connecting 50,000+ verified farmers directly to bulk institutional buyers with bank-grade escrow settlements."),
        ("Transparent Realization", "Empowering farmers with true net bank payout forecasting before harvesting or loading trucks."),
        ("Collective FPO Power", "Enabling smallholders to pool lots, command premium rates, and eliminate distress selling."),
    ]
    p_w = 520
    for idx, (title, body) in enumerate(pillars):
        px = 120 + idx * 560
        draw.rounded_rectangle([px, 510, px + p_w, 790], radius=14, fill=CARD_BG, outline=BORDER_COLOR, width=2)
        draw.rounded_rectangle([px, 510, px + p_w, 570], radius=10, fill=FOREST_GREEN)
        draw.text((px + 25, 528), title, font=get_font(24, bold=True), fill=(255, 255, 255))
        
        # Wrapped text
        wrapped_lines = textwrap.wrap(body, width=34)
        y_pos = 600
        for line in wrapped_lines:
            draw.text((px + 25, y_pos), line, font=get_font(21), fill=TEXT_MUTED)
            y_pos += 34

    # Closing Call To Action Box
    draw.rounded_rectangle([120, 830, 1800, 970], radius=14, fill=FOREST_GREEN)
    draw.text((160, 860), "AROHA • SMART INDIA HACKATHON 2026", font=get_font(24, bold=True), fill=GOLD)
    draw.text((160, 905), "Empowering Every Indian Farmer to Realize Their True Harvest Value.", font=get_font(30, bold=True), fill=(255, 255, 255))

    img.save("video_production/slides/slide_4_conclusion.png", "PNG")
    print("Saved slide_4_conclusion.png")

if __name__ == "__main__":
    make_slide_1()
    make_slide_2()
    make_slide_4()
