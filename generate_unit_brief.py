from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame
import copy

W, H = A4
MARGIN = 18 * mm

# ── Colour palette ──────────────────────────────────────────────────────────
BLACK       = colors.HexColor('#0a0a0a')
WHITE       = colors.HexColor('#f5f5f0')
PAPER       = colors.HexColor('#f0ede4')
ALLIED_DARK = colors.HexColor('#0d2240')
ALLIED_MID  = colors.HexColor('#1a3a6b')
ALLIED_ACC  = colors.HexColor('#4a9fd4')
SOVIET_DARK = colors.HexColor('#1a0505')
SOVIET_MID  = colors.HexColor('#5a0a0a')
SOVIET_ACC  = colors.HexColor('#cc2222')
NEUTRAL_DARK= colors.HexColor('#1a1a12')
NEUTRAL_MID = colors.HexColor('#3a3820')
NEUTRAL_ACC = colors.HexColor('#c8a832')
GREY_LIGHT  = colors.HexColor('#d0cdc4')
GREY_MID    = colors.HexColor('#888070')
STAMP_RED   = colors.HexColor('#8b0000')
GRID_LINE   = colors.HexColor('#c8c4b8')

# ── Fonts ────────────────────────────────────────────────────────────────────
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Use built-in Helvetica family
FONT_BODY    = 'Helvetica'
FONT_BOLD    = 'Helvetica-Bold'
FONT_ITALIC  = 'Helvetica-Oblique'

# ── Styles ────────────────────────────────────────────────────────────────────
def make_styles():
    s = {}
    s['cover_title'] = ParagraphStyle('cover_title',
        fontName=FONT_BOLD, fontSize=28, textColor=WHITE,
        leading=34, alignment=TA_CENTER, spaceAfter=4)
    s['cover_sub'] = ParagraphStyle('cover_sub',
        fontName=FONT_ITALIC, fontSize=11, textColor=ALLIED_ACC,
        alignment=TA_CENTER, spaceAfter=2)
    s['cover_stamp'] = ParagraphStyle('cover_stamp',
        fontName=FONT_BOLD, fontSize=9, textColor=STAMP_RED,
        alignment=TA_CENTER)
    s['section_header'] = ParagraphStyle('section_header',
        fontName=FONT_BOLD, fontSize=14, textColor=WHITE,
        leading=18, spaceAfter=0, spaceBefore=0)
    s['unit_name'] = ParagraphStyle('unit_name',
        fontName=FONT_BOLD, fontSize=11, textColor=WHITE,
        leading=14, spaceAfter=1)
    s['unit_id'] = ParagraphStyle('unit_id',
        fontName=FONT_ITALIC, fontSize=7.5, textColor=GREY_LIGHT,
        spaceAfter=2)
    s['body'] = ParagraphStyle('body',
        fontName=FONT_BODY, fontSize=8, textColor=BLACK,
        leading=11, spaceAfter=3)
    s['body_small'] = ParagraphStyle('body_small',
        fontName=FONT_BODY, fontSize=7, textColor=GREY_MID,
        leading=10, spaceAfter=2)
    s['stat_label'] = ParagraphStyle('stat_label',
        fontName=FONT_BOLD, fontSize=7, textColor=GREY_MID,
        leading=9)
    s['stat_val'] = ParagraphStyle('stat_val',
        fontName=FONT_BOLD, fontSize=9, textColor=BLACK,
        leading=11)
    s['tag'] = ParagraphStyle('tag',
        fontName=FONT_BOLD, fontSize=6.5, textColor=WHITE,
        leading=9)
    s['toc_entry'] = ParagraphStyle('toc_entry',
        fontName=FONT_BODY, fontSize=9, textColor=BLACK,
        leading=13, leftIndent=6)
    s['toc_faction'] = ParagraphStyle('toc_faction',
        fontName=FONT_BOLD, fontSize=10, textColor=BLACK,
        leading=14, spaceBefore=6)
    s['note_text'] = ParagraphStyle('note_text',
        fontName=FONT_ITALIC, fontSize=7.5, textColor=GREY_MID,
        leading=10)
    return s

# ── HP bar ────────────────────────────────────────────────────────────────────
def hp_bar(hp, max_hp=400, width=40*mm, height=4*mm, fill_color=None):
    from reportlab.platypus import Flowable
    class HPBar(Flowable):
        def __init__(self, hp, max_hp, w, h, color):
            super().__init__()
            self.hp = hp; self.max_hp = max_hp
            self.w = w; self.h = h
            self.color = color or ALLIED_ACC
            self.width = w; self.height = h
        def wrap(self, aw, ah): return (self.w, self.h)
        def draw(self):
            c = self.canv
            frac = min(1.0, self.hp / self.max_hp)
            # Background
            c.setFillColor(GREY_LIGHT)
            c.rect(0, 0, self.w, self.h, fill=1, stroke=0)
            # Fill
            if frac > 0.6:   fc = colors.HexColor('#4caf50')
            elif frac > 0.3: fc = colors.HexColor('#ff9800')
            else:             fc = colors.HexColor('#f44336')
            c.setFillColor(fc)
            c.rect(0, 0, self.w * frac, self.h, fill=1, stroke=0)
            # Label
            c.setFont(FONT_BOLD, 6)
            c.setFillColor(BLACK)
            c.drawCentredString(self.w / 2, 1, f'{self.hp} HP')
    return HPBar(hp, max_hp, width, height, fill_color)

# ── Speed bar ─────────────────────────────────────────────────────────────────
def speed_bar(speed, max_speed=12.0, width=40*mm, height=3*mm, color=None):
    from reportlab.platypus import Flowable
    class SpeedBar(Flowable):
        def __init__(self, speed, max_speed, w, h, color):
            super().__init__()
            self.speed = speed; self.max_speed = max_speed
            self.w = w; self.h = h; self.color = color
            self.width = w; self.height = h
        def wrap(self, aw, ah): return (self.w, self.h)
        def draw(self):
            c = self.canv
            frac = min(1.0, self.speed / self.max_speed)
            c.setFillColor(GREY_LIGHT)
            c.rect(0, 0, self.w, self.h, fill=1, stroke=0)
            c.setFillColor(self.color or ALLIED_ACC)
            c.rect(0, 0, self.w * frac, self.h, fill=1, stroke=0)
            c.setFont(FONT_BOLD, 5.5)
            c.setFillColor(BLACK)
            c.drawCentredString(self.w / 2, 0.5, f'{self.speed} t/s')
    return SpeedBar(speed, max_speed, width, height, color)

# ── Page background/header/footer ─────────────────────────────────────────────
class DriftgateDoc(BaseDocTemplate):
    def __init__(self, filename, faction_color_top, **kwargs):
        self.faction_color_top = faction_color_top
        super().__init__(filename, **kwargs)

    def handle_pageBegin(self):
        super().handle_pageBegin()

    def afterPage(self):
        pass

def draw_page_bg(canv, doc, faction_dark, faction_mid, faction_acc, page_type='unit'):
    W2, H2 = A4
    # Full page background
    canv.setFillColor(PAPER)
    canv.rect(0, 0, W2, H2, fill=1, stroke=0)

    # Top band
    canv.setFillColor(faction_dark)
    canv.rect(0, H2 - 22*mm, W2, 22*mm, fill=1, stroke=0)

    # Accent line under top band
    canv.setFillColor(faction_acc)
    canv.rect(0, H2 - 23.5*mm, W2, 1.5*mm, fill=1, stroke=0)

    # Bottom band
    canv.setFillColor(faction_dark)
    canv.rect(0, 0, W2, 12*mm, fill=1, stroke=0)
    canv.setFillColor(faction_acc)
    canv.rect(0, 11.5*mm, W2, 1*mm, fill=1, stroke=0)

    # Grid overlay (very subtle)
    canv.setStrokeColor(GRID_LINE)
    canv.setLineWidth(0.15)
    for x in range(0, int(W2), int(8*mm)):
        canv.line(x, 0, x, H2)
    for y in range(0, int(H2), int(8*mm)):
        canv.line(0, y, W2, y)

    # Corner brackets TL
    canv.setStrokeColor(faction_acc)
    canv.setLineWidth(1.2)
    bx, by = MARGIN * 0.5, H2 - MARGIN * 0.5
    canv.line(bx, by - 8*mm, bx, by)
    canv.line(bx, by, bx + 8*mm, by)
    bx2, by2 = W2 - MARGIN * 0.5, H2 - MARGIN * 0.5
    canv.line(bx2 - 8*mm, by2, bx2, by2)
    canv.line(bx2, by2, bx2, by2 - 8*mm)
    # BR
    bx3, by3 = MARGIN * 0.5, MARGIN * 0.5
    canv.line(bx3, by3 + 8*mm, bx3, by3)
    canv.line(bx3, by3, bx3 + 8*mm, by3)
    bx4, by4 = W2 - MARGIN * 0.5, MARGIN * 0.5
    canv.line(bx4 - 8*mm, by4, bx4, by4)
    canv.line(bx4, by4, bx4, by4 + 8*mm)

    # Header text
    canv.setFont(FONT_BOLD, 9)
    canv.setFillColor(faction_acc)
    canv.drawString(MARGIN, H2 - 10*mm, 'DRIFTGATE STUDIOS')
    canv.setFont(FONT_BODY, 7)
    canv.setFillColor(WHITE)
    canv.drawRightString(W2 - MARGIN, H2 - 10*mm, 'UNIT FIELD BRIEF — CLASSIFIED')

    # Footer
    canv.setFont(FONT_BODY, 6.5)
    canv.setFillColor(GREY_LIGHT)
    canv.drawString(MARGIN, 4.5*mm, f'DOCUMENT REF: DG-RTS-UNIT-BRIEF-2026 | PAGE {doc.page}')
    canv.drawRightString(W2 - MARGIN, 4.5*mm, 'INTERNAL USE ONLY — DO NOT DISTRIBUTE')

# ── Cover page ────────────────────────────────────────────────────────────────
def draw_cover(canv, doc):
    W2, H2 = A4
    # Deep dark bg
    canv.setFillColor(ALLIED_DARK)
    canv.rect(0, 0, W2, H2, fill=1, stroke=0)

    # Grid
    canv.setStrokeColor(colors.HexColor('#1a2d4a'))
    canv.setLineWidth(0.3)
    for x in range(0, int(W2)+1, int(8*mm)):
        canv.line(x, 0, x, H2)
    for y in range(0, int(H2)+1, int(8*mm)):
        canv.line(0, y, W2, y)

    # Diagonal accent band
    canv.setFillColor(colors.HexColor('#0f1f35'))
    from reportlab.lib.utils import simpleSplit
    p = canv.beginPath()
    p.moveTo(0, H2 * 0.55)
    p.lineTo(W2, H2 * 0.38)
    p.lineTo(W2, H2 * 0.32)
    p.lineTo(0, H2 * 0.49)
    p.close()
    canv.drawPath(p, fill=1, stroke=0)

    # Top red Soviet stripe (for dual-faction feel)
    canv.setFillColor(SOVIET_MID)
    canv.rect(0, H2 - 6*mm, W2, 6*mm, fill=1, stroke=0)
    canv.setFillColor(SOVIET_ACC)
    canv.rect(0, H2 - 7*mm, W2, 1*mm, fill=1, stroke=0)

    # Bottom Allied stripe
    canv.setFillColor(ALLIED_MID)
    canv.rect(0, 0, W2, 6*mm, fill=1, stroke=0)
    canv.setFillColor(ALLIED_ACC)
    canv.rect(0, 5.5*mm, W2, 1*mm, fill=1, stroke=0)

    # Studio name
    canv.setFont(FONT_BOLD, 10)
    canv.setFillColor(ALLIED_ACC)
    canv.drawCentredString(W2/2, H2 - 22*mm, 'D R I F T G A T E   S T U D I O S')
    canv.setFont(FONT_BODY, 7.5)
    canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2, H2 - 27*mm, 'INTERNAL DOCUMENT — CONFIDENTIAL')

    # Divider line
    canv.setStrokeColor(ALLIED_ACC)
    canv.setLineWidth(0.8)
    canv.line(MARGIN * 2, H2 - 30*mm, W2 - MARGIN * 2, H2 - 30*mm)

    # Main title
    canv.setFont(FONT_BOLD, 36)
    canv.setFillColor(WHITE)
    canv.drawCentredString(W2/2, H2 * 0.62, 'UNIT FIELD')
    canv.drawCentredString(W2/2, H2 * 0.62 - 40, 'BRIEF')

    # Accent line under title
    canv.setFillColor(ALLIED_ACC)
    canv.rect(W2/2 - 30*mm, H2 * 0.62 - 48, 60*mm, 2, fill=1, stroke=0)

    # Subtitle
    canv.setFont(FONT_ITALIC, 11)
    canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2, H2 * 0.62 - 62, 'Comprehensive Unit Statistics & Tactical Overview')

    # Classification box
    canv.setFillColor(STAMP_RED)
    canv.rect(W2/2 - 28*mm, H2 * 0.35 + 4, 56*mm, 11, fill=1, stroke=0)
    canv.setFont(FONT_BOLD, 9)
    canv.setFillColor(WHITE)
    canv.drawCentredString(W2/2, H2 * 0.35 + 7, '⚠  TOP SECRET — INTERNAL ONLY  ⚠')

    # Meta block
    meta_y = H2 * 0.35 - 14
    canv.setFont(FONT_BODY, 8)
    canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2, meta_y,      'Document Reference: DG-RTS-UNIT-BRIEF-2026')
    canv.drawCentredString(W2/2, meta_y - 12, 'Prepared by: Driftgate AI Combat Systems Office')
    canv.drawCentredString(W2/2, meta_y - 24, 'Date: 14 May 2026')
    canv.drawCentredString(W2/2, meta_y - 36, 'Revision: 1.0 — Pre-Alpha Field Edition')

    # Bottom corner brackets
    canv.setStrokeColor(ALLIED_ACC)
    canv.setLineWidth(1.5)
    for bx, by, dx, dy in [
        (MARGIN, MARGIN, 1, 1),
        (W2-MARGIN, MARGIN, -1, 1),
        (MARGIN, H2-MARGIN, 1, -1),
        (W2-MARGIN, H2-MARGIN, -1, -1),
    ]:
        canv.line(bx, by, bx + dx*12*mm, by)
        canv.line(bx, by, bx, by + dy*12*mm)

    # Faction indicators bottom
    canv.setFont(FONT_BOLD, 8)
    canv.setFillColor(ALLIED_ACC)
    canv.drawString(MARGIN, 15*mm, '▶  ALLIED COMMAND')
    canv.setFillColor(SOVIET_ACC)
    canv.drawRightString(W2 - MARGIN, 15*mm, 'SOVIET FORCES  ◀')

    # Unit count
    canv.setFont(FONT_BODY, 7)
    canv.setFillColor(GREY_MID)
    canv.drawCentredString(W2/2, 15*mm, '15 COMBAT UNITS  |  2 FACTIONS  |  3 UNIT CLASSES')

# ── TOC page ──────────────────────────────────────────────────────────────────
def draw_toc_bg(canv, doc):
    draw_page_bg(canv, doc, NEUTRAL_DARK, NEUTRAL_MID, NEUTRAL_ACC, 'toc')

# ── Faction section divider ────────────────────────────────────────────────────
class SectionDivider(object):
    pass  # placeholder

def faction_divider(title, subtitle, dark, mid, acc, styles):
    from reportlab.platypus import Flowable
    class FactionDivider(Flowable):
        def wrap(self, availWidth, availHeight): return (self.width, self.height)
        def __init__(self, title, subtitle, dark, mid, acc):
            super().__init__()
            self.title    = title
            self.subtitle = subtitle
            self.dark = dark; self.mid = mid; self.acc = acc
            self.width  = W - 2 * MARGIN
            self.height = 42*mm
        def wrap(self, aw, ah): return (self.width, self.height)
        def draw(self):
            c = self.canv
            w, h = self.width, self.height
            c.setFillColor(self.dark)
            c.rect(0, 0, w, h, fill=1, stroke=0)
            c.setFillColor(self.mid)
            c.rect(0, h * 0.6, w, h * 0.4, fill=1, stroke=0)
            # Grid
            c.setStrokeColor(colors.HexColor('#ffffff'))
            c.setLineWidth(0.1)
            for x in range(0, int(w)+1, int(8*mm)):
                c.setStrokeAlpha(0.06)
                c.line(x, 0, x, h)
            # Accent stripe
            c.setFillColor(self.acc)
            c.setStrokeAlpha(1)
            c.rect(0, h * 0.6 - 1.5, w, 2, fill=1, stroke=0)
            # Title
            c.setFont(FONT_BOLD, 26)
            c.setFillColor(WHITE)
            c.drawString(8*mm, h * 0.25, self.title)
            # Subtitle
            c.setFont(FONT_ITALIC, 10)
            c.setFillColor(self.acc)
            c.drawString(8*mm, h * 0.25 - 14, self.subtitle)
            # Divider line right side decorative
            c.setStrokeColor(self.acc)
            c.setLineWidth(2)
            c.line(w - 6*mm, 6*mm, w - 6*mm, h - 6*mm)
    return FactionDivider(title, subtitle, dark, mid, acc)

# ── Stat table for a single unit ──────────────────────────────────────────────
def unit_block(unit, weapons_db, faction_dark, faction_mid, faction_acc, styles):
    from reportlab.platypus import Flowable

    class UnitHeader(Flowable):
        def __init__(self, unit, dark, mid, acc):
            super().__init__()
            self.unit = unit
            self.dark = dark; self.mid = mid; self.acc = acc
            self.width  = W - 2 * MARGIN
            self.height = 18*mm
        def wrap(self, aw, ah): return (self.width, self.height)
        def draw(self):
            c = self.canv
            w, h = self.width, self.height
            c.setFillColor(self.dark)
            c.rect(0, 0, w, h, fill=1, stroke=0)
            c.setFillColor(self.acc)
            c.rect(0, 0, 3, h, fill=1, stroke=0)
            c.setFont(FONT_BOLD, 13)
            c.setFillColor(WHITE)
            c.drawString(7*mm, h * 0.52, self.unit.get('displayName','???'))
            # Category badge
            cat = self.unit.get('category','').upper()
            badge_colors = {
                'INFANTRY': colors.HexColor('#2d5a2d'),
                'VEHICLE':  colors.HexColor('#3a3520'),
                'AIR':      colors.HexColor('#1a2d4a'),
                'NAVAL':    colors.HexColor('#0a2a3a'),
            }
            bc = badge_colors.get(cat, colors.HexColor('#333'))
            bw = len(cat) * 5 + 10
            c.setFillColor(bc)
            c.roundRect(w - bw - 8*mm, h*0.25, bw, h*0.5, 2, fill=1, stroke=0)
            c.setFont(FONT_BOLD, 7)
            c.setFillColor(WHITE)
            c.drawRightString(w - 8*mm - 2, h * 0.52, cat)
            # ID
            c.setFont(FONT_ITALIC, 7)
            c.setFillColor(self.acc)
            c.drawString(7*mm, h * 0.2, f'ID: {self.unit.get("id","?")}')

    elements = []
    elements.append(UnitHeader(unit, faction_dark, faction_mid, faction_acc))

    # ── Stat columns ──
    hp        = unit.get('hp', 0)
    speed     = unit.get('speed', 0)
    armour    = unit.get('armour', '—').upper()
    vision    = unit.get('visionRadius', 0)
    cost      = unit.get('cost', 0)
    buildtime = unit.get('buildTime', 0)
    req       = unit.get('requiredStructure', '—')

    armour_colors = {
        'LIGHT':  colors.HexColor('#5a8a3a'),
        'MEDIUM': colors.HexColor('#8a7a1a'),
        'HEAVY':  colors.HexColor('#6a3a1a'),
    }
    ac = armour_colors.get(armour, GREY_MID)

    stat_data = [
        [Paragraph('<b>HP</b>', styles['stat_label']),
         Paragraph('<b>ARMOUR</b>', styles['stat_label']),
         Paragraph('<b>SPEED</b>', styles['stat_label']),
         Paragraph('<b>VISION</b>', styles['stat_label']),
         Paragraph('<b>COST</b>', styles['stat_label']),
         Paragraph('<b>BUILD TIME</b>', styles['stat_label'])],
        [Paragraph(f'<b>{hp}</b>', styles['stat_val']),
         Paragraph(f'<b>{armour}</b>', ParagraphStyle('av', fontName=FONT_BOLD, fontSize=9, textColor=ac)),
         Paragraph(f'<b>{speed}</b>', styles['stat_val']),
         Paragraph(f'<b>{vision}</b>', styles['stat_val']),
         Paragraph(f'<b>§{cost}</b>', styles['stat_val']),
         Paragraph(f'<b>{buildtime}s</b>', styles['stat_val'])],
    ]
    col_w = (W - 2 * MARGIN) / 6
    stat_table = Table(stat_data, colWidths=[col_w]*6)
    stat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e8e4dc')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#f5f2ec')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING',    (0,0), (-1,-1), 3),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ('RIGHTPADDING',  (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.4, GRID_LINE),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(stat_table)

    # ── Weapons ──
    weapon_ids = unit.get('weapons', [])
    if weapon_ids:
        w_rows = [[
            Paragraph('<b>WEAPON</b>', styles['stat_label']),
            Paragraph('<b>DMG</b>', styles['stat_label']),
            Paragraph('<b>RANGE</b>', styles['stat_label']),
            Paragraph('<b>ROF</b>', styles['stat_label']),
            Paragraph('<b>ACC</b>', styles['stat_label']),
            Paragraph('<b>TYPE</b>', styles['stat_label']),
            Paragraph('<b>AOE</b>', styles['stat_label']),
        ]]
        for wid in weapon_ids:
            w = weapons_db.get(wid, {})
            aoe = f'{w.get("aoeRadius","—")}r' if w.get('aoeRadius') else '—'
            rof_raw = w.get('rateOfFire', 0)
            rof_str = f'{rof_raw}s' if rof_raw < 1 else f'1/{rof_raw:.0f}s'
            w_rows.append([
                Paragraph(w.get('displayName', wid), styles['body_small']),
                Paragraph(f'<b>{w.get("damage","?")}</b>', styles['body']),
                Paragraph(str(w.get('range','?')), styles['body']),
                Paragraph(rof_str, styles['body']),
                Paragraph(f'{int(w.get("accuracy",0)*100)}%', styles['body']),
                Paragraph(w.get('category','?').replace('_',' ').title(), styles['body_small']),
                Paragraph(aoe, styles['body']),
            ])
        cws = [50*mm, 14*mm, 14*mm, 14*mm, 14*mm, 30*mm, 14*mm]
        # Trim to fit
        total = sum(cws)
        avail = W - 2*MARGIN
        if total > avail:
            scale = avail / total
            cws = [c * scale for c in cws]
        wt = Table(w_rows, colWidths=cws)
        wt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ddd9d0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#faf8f4'), colors.HexColor('#f0ede6')]),
            ('GRID', (0,0), (-1,-1), 0.3, GRID_LINE),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING',    (0,0), (-1,-1), 2),
            ('LEFTPADDING',   (0,0), (-1,-1), 4),
            ('RIGHTPADDING',  (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(wt)

    # ── Special abilities / tags / notes ──
    tags   = unit.get('tags', [])
    notes  = []
    if unit.get('canEnterTrench'):  notes.append('Can enter trenches')
    if unit.get('canGarrison'):     notes.append('Can garrison buildings')
    if unit.get('canCapture'):      notes.append('Can capture structures')
    if unit.get('canRepair'):       notes.append('Can repair vehicles/buildings')
    if unit.get('canBuild'):        notes.append('Can place field structures')
    if unit.get('canAmbush'):       notes.append('Guerrilla ambush ability')
    if unit.get('canTransport'):    notes.append(f'Transport capacity: {unit.get("transportCapacity","?")} units')
    if unit.get('crushesInfantry'): notes.append('Crushes infantry on move')
    if unit.get('isHelicopter'):    notes.append(f'Helicopter — hover height: {unit.get("hoverHeight","?")}')
    if unit.get('isJet'):           notes.append(f'Jet — cruise height: {unit.get("cruiseHeight","?")} | ammo: {unit.get("maxAmmo","?")} | rearm: {unit.get("rearmTime","?")}s')
    if unit.get('isNaval'):         notes.append('Naval unit — water only')
    if unit.get('maxAmmo') and not unit.get('isJet') and not unit.get('isHelicopter'):
        notes.append(f'Limited ammo: {unit.get("maxAmmo")} rounds')

    req_str = unit.get('requiredStructure', '—').replace('_', ' ').title()
    vet = unit.get('veterancyThresholds', [])
    vet_str = f'Kills: {vet[0]}/{vet[1]}/{vet[2]}' if len(vet) == 3 else '—'

    note_txt = unit.get('note') or unit.get('description', '')

    feat_data = [
        [Paragraph('<b>ABILITIES</b>', styles['stat_label']),
         Paragraph('<b>TAGS</b>', styles['stat_label']),
         Paragraph('<b>REQUIRES</b>', styles['stat_label']),
         Paragraph('<b>VETERANCY</b>', styles['stat_label'])],
        [Paragraph('<br/>'.join(notes) if notes else '—', styles['body_small']),
         Paragraph('  '.join(f'[{t.upper()}]' for t in tags), styles['body_small']),
         Paragraph(req_str, styles['body']),
         Paragraph(vet_str, styles['body'])],
    ]
    feat_cws = [65*mm, 55*mm, 30*mm, 25*mm]
    total_f = sum(feat_cws)
    avail_f = W - 2*MARGIN
    if total_f > avail_f:
        scale_f = avail_f / total_f
        feat_cws = [c * scale_f for c in feat_cws]
    ft = Table(feat_data, colWidths=feat_cws)
    ft.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ddd9d0')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#f5f2ec')),
        ('GRID', (0,0), (-1,-1), 0.3, GRID_LINE),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING',    (0,0), (-1,-1), 3),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ('RIGHTPADDING',  (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(ft)

    if note_txt:
        nt = Table([[Paragraph(f'◆ FIELD NOTE: {note_txt}', styles['note_text'])]])
        nt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e8e4d8')),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('BOX', (0,0), (-1,-1), 0.5, faction_acc),
        ]))
        elements.append(nt)

    elements.append(Spacer(1, 4*mm))
    return KeepTogether(elements)

# ── Main ──────────────────────────────────────────────────────────────────────

WEAPONS_DB = {
    'aim7_sparrow':       {'displayName':'AIM-7 Sparrow','damage':120,'range':16,'rateOfFire':5.0,'accuracy':0.75,'category':'anti_air','aoeRadius':None},
    'cannon_90mm':        {'displayName':'90mm Main Gun','damage':180,'range':9,'rateOfFire':2.8,'accuracy':0.92,'category':'cannon','aoeRadius':None},
    'grenade_launcher_m79':{'displayName':'M79 Grenade Launcher','damage':55,'range':10,'rateOfFire':0.5,'accuracy':0.75,'category':'grenade','aoeRadius':2.5},
    'm2_browning':        {'displayName':'.50 Cal Browning','damage':30,'range':11,'rateOfFire':0.12,'accuracy':0.82,'category':'heavy_machine_gun','aoeRadius':None},
    'm60_door_gun':       {'displayName':'M60 Door Gun','damage':16,'range':8,'rateOfFire':0.1,'accuracy':0.72,'category':'machine_gun','aoeRadius':None},
    'm60_machinegun':     {'displayName':'M60 Machine Gun','damage':18,'range':9,'rateOfFire':0.1,'accuracy':0.78,'category':'machine_gun','aoeRadius':None},
    'mk82_bomb_carpet':   {'displayName':'Mk 82 Carpet Bomb','damage':180,'range':16,'rateOfFire':99,'accuracy':0.60,'category':'explosive','aoeRadius':5.5,'note':'Drops 4 bombs in a line. Triggers crater on impact.'},
    'napalm_bomb':        {'displayName':'Napalm Canister','damage':40,'range':14,'rateOfFire':99,'accuracy':0.65,'category':'bomb','aoeRadius':5.0,'note':'6s burn zone, 8 dmg/s DOT'},
    'rifle_ak47':         {'displayName':'AK-47','damage':13,'range':6,'rateOfFire':0.2,'accuracy':0.80,'category':'small_arms','aoeRadius':None},
    'rifle_m16':          {'displayName':'M16 Assault Rifle','damage':12,'range':7,'rateOfFire':0.18,'accuracy':0.85,'category':'small_arms','aoeRadius':None},
    'rocket_pod_2_75':    {'displayName':'2.75" Rocket Pod','damage':70,'range':12,'rateOfFire':0.4,'accuracy':0.70,'category':'rocket','aoeRadius':3.0},
    'r60_missile':        {'displayName':'R-60 Atoll','damage':100,'range':12,'rateOfFire':5.0,'accuracy':0.70,'category':'anti_air','aoeRadius':None,'note':'Short-range IR missile, faster lock than AIM-7'},
    'gsh23_cannon':       {'displayName':'GSh-23 Cannon','damage':35,'range':6,'rateOfFire':0.12,'accuracy':0.65,'category':'anti_air','aoeRadius':None,'note':'Close-range strafing cannon for dogfights'},
    'pistol_m1911':       {'displayName':'M1911 Pistol','damage':8,'range':4,'rateOfFire':0.5,'accuracy':0.70,'category':'sidearm','aoeRadius':None},
    'minigun_20mm':       {'displayName':'20mm Minigun','damage':22,'range':9,'rateOfFire':0.08,'accuracy':0.75,'category':'machine_gun','aoeRadius':None},
    'rocket_pod':         {'displayName':'Rocket Pod','damage':65,'range':11,'rateOfFire':0.4,'accuracy':0.68,'category':'rocket','aoeRadius':2.5},
}

ALLIED_UNITS = [
    # Infantry
    {'id':'infantry_rifleman','displayName':'Rifleman','category':'infantry','hp':100,'armour':'light','speed':2.2,'visionRadius':6,'cost':200,'buildTime':5,'requiredStructure':'barracks','weapons':['rifle_m16'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture']},
    {'id':'infantry_grenadier','displayName':'Grenadier','category':'infantry','hp':90,'armour':'light','speed':2.0,'visionRadius':8,'cost':150,'buildTime':7,'requiredStructure':'barracks','weapons':['grenade_launcher_m79'],'canEnterTrench':True,'canGarrison':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','anti_armor','explosive']},
    {'id':'infantry_engineer','displayName':'Engineer','category':'infantry','hp':75,'armour':'light','speed':1.8,'visionRadius':5,'cost':300,'buildTime':8,'requiredStructure':'barracks','weapons':['pistol_m1911'],'canEnterTrench':True,'canCapture':True,'canRepair':True,'canBuild':True,'tags':['infantry','light','can_capture','engineer']},
    # Vehicles
    {'id':'vehicle_jeep','displayName':'M151 Jeep','category':'vehicle','hp':150,'armour':'light','speed':5.0,'visionRadius':8,'cost':300,'buildTime':8,'requiredStructure':'war_factory','weapons':['m60_machinegun'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','light','fast','recon']},
    {'id':'vehicle_m113','displayName':'M113 APC','category':'vehicle','hp':250,'armour':'medium','speed':3.2,'visionRadius':6,'cost':600,'buildTime':12,'requiredStructure':'war_factory','weapons':['m2_browning'],'canTransport':True,'transportCapacity':5,'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','medium','transport','amphibious']},
    {'id':'vehicle_m48_tank','displayName':'M48 Patton','category':'vehicle','hp':400,'armour':'heavy','speed':1.9,'visionRadius':5,'cost':800,'buildTime':15,'requiredStructure':'war_factory','weapons':['cannon_90mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked','main_battle_tank']},
    # Air
    {'id':'air_huey','displayName':'UH-1 Huey','category':'air','hp':150,'armour':'light','speed':6.0,'visionRadius':10,'cost':1200,'buildTime':18,'requiredStructure':'helipad','weapons':['m60_door_gun','rocket_pod_2_75'],'isHelicopter':True,'hoverHeight':8,'canTransport':True,'transportCapacity':8,'maxAmmo':20,'rearmTime':10,'veterancyThresholds':[3,8,15],'tags':['air','helicopter','transport','gunship']},
    {'id':'air_f4_phantom','displayName':'F-4 Phantom II','category':'air','hp':200,'armour':'light','speed':10.0,'visionRadius':12,'cost':2000,'buildTime':25,'requiredStructure':'airfield','weapons':['aim7_sparrow','napalm_bomb'],'isJet':True,'cruiseHeight':12,'maxAmmo':30,'rearmTime':15,'veterancyThresholds':[3,8,15],'tags':['air','jet','strike','anti_ground','fast_mover']},
    {'id':'air_b52','displayName':'B-52 Stratofortress','category':'air','hp':300,'armour':'medium','speed':7.0,'visionRadius':14,'cost':3000,'buildTime':35,'requiredStructure':'airfield','weapons':['mk82_bomb_carpet'],'isJet':True,'cruiseHeight':15,'maxAmmo':50,'rearmTime':20,'aoeRadius':4,'veterancyThresholds':[3,8,15],'tags':['air','jet','bomber','carpet_bomb','strategic']},
    # Naval
    {'id':'naval_patrol_boat','displayName':'PBR Patrol Boat','category':'naval','hp':300,'armour':'light','speed':4.0,'visionRadius':10,'cost':500,'buildTime':12,'requiredStructure':'naval_yard','weapons':['m2_browning','m60_machinegun'],'isNaval':True,'veterancyThresholds':[3,8,15],'tags':['naval','light','fast','river_patrol']},
]

SOVIET_UNITS = [
    # Infantry
    {'id':'infantry_vietcong','displayName':'Viet Cong','category':'infantry','hp':80,'armour':'light','speed':2.8,'visionRadius':6,'cost':75,'buildTime':4,'requiredStructure':'barracks','weapons':['rifle_ak47'],'canEnterTrench':True,'canGarrison':True,'canAmbush':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture','guerrilla'],'note':'Guerrilla fighter — ambush bonus from jungle/trench. Cheapest combat unit in the game.'},
    # Vehicles (shared base with faction twist)
    {'id':'tank_medium','displayName':'T-54 Medium Tank','category':'vehicle','hp':400,'armour':'heavy','speed':1.8,'visionRadius':5,'cost':800,'buildTime':14,'requiredStructure':'war_factory','weapons':['cannon_90mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked'],'note':'Soviet main battle tank. Heavier armour scheme than US equivalent. Slower but more durable hull.'},
    # Air
    {'id':'air_mig21','displayName':'MiG-21 Fishbed','category':'air','hp':180,'armour':'light','speed':11.0,'visionRadius':10,'cost':1800,'buildTime':22,'requiredStructure':'airfield','weapons':['r60_missile','gsh23_cannon'],'isJet':True,'cruiseHeight':11,'maxAmmo':24,'rearmTime':14,'veterancyThresholds':[3,8,15],'tags':['air','jet','interceptor','anti_air','fast_mover'],'note':'Soviet air superiority fighter. Faster than F-4. Counters Allied air. Shorter missile range than AIM-7 but faster lock-on.'},
    # Shared units (same chassis, Soviet faction)
    {'id':'helicopter_attack','displayName':'Mi-8 Hip Gunship','category':'air','hp':220,'armour':'light','speed':4.0,'visionRadius':8,'cost':1200,'buildTime':18,'requiredStructure':'airfield','weapons':['minigun_20mm','rocket_pod'],'isHelicopter':True,'hoverHeight':6,'tags':['air','light','anti_ground'],'note':'Soviet assault helicopter. Slower than Huey but heavier armament.'},
]

SHARED_UNITS = [
    {'id':'harvester_vehicle','displayName':'Ore Collector','category':'vehicle','hp':150,'armour':'light','speed':2.5,'visionRadius':4,'cost':0,'buildTime':8,'requiredStructure':'refinery','weapons':[],'tags':['harvester'],'description':'Autonomous ore collector. Assigned to Refinery. Scrapes alluvial ore and returns for processing.','note':'Cannot attack. Auto-assigned on refinery completion. Replaceable at no cost.'},
]

from reportlab.platypus import SimpleDocTemplate

out_path = '/app/driftgate_unit_brief.pdf'

story = []
styles = make_styles()

# ── Build PDF with custom page backgrounds ────────────────────────────────────
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame

frame = Frame(MARGIN, 14*mm, W - 2*MARGIN, H - 14*mm - 24*mm, id='main')

current_faction = {'dark': ALLIED_DARK, 'mid': ALLIED_MID, 'acc': ALLIED_ACC}

def on_page(canv, doc):
    pn = doc.page
    if pn == 1:
        draw_cover(canv, doc)
    elif pn == 2:
        draw_page_bg(canv, doc, NEUTRAL_DARK, NEUTRAL_MID, NEUTRAL_ACC)
    else:
        dark = current_faction['dark']
        mid  = current_faction['mid']
        acc  = current_faction['acc']
        draw_page_bg(canv, doc, dark, mid, acc)

doc = BaseDocTemplate(out_path, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=24*mm, bottomMargin=14*mm)
pt = PageTemplate(id='main', frames=[frame], onPage=on_page)
doc.addPageTemplates([pt])

# Page 1: Cover (blank story — drawn by on_page)
story.append(Spacer(1, H - 48*mm))
story.append(PageBreak())

# Page 2: Table of Contents
story.append(Paragraph('TABLE OF CONTENTS', ParagraphStyle('toc_h',
    fontName=FONT_BOLD, fontSize=18, textColor=ALLIED_DARK, spaceAfter=6, alignment=TA_LEFT)))
story.append(HRFlowable(width='100%', thickness=1.5, color=NEUTRAL_ACC, spaceAfter=4*mm))

toc_sections = [
    ('ALLIED COMMAND', [
        ('Rifleman', 'M16-armed core infantry. Backbone of the Allied advance.'),
        ('Grenadier', 'Anti-armour/area denial specialist. M79 grenade launcher.'),
        ('Engineer', 'Construction, capture and repair specialist.'),
        ('M151 Jeep', 'Fast recon vehicle. Excellent early-game mobility.'),
        ('M113 APC', 'Armoured personnel carrier. Transports 5 infantry.'),
        ('M48 Patton', 'Heavy main battle tank. 90mm cannon.'),
        ('UH-1 Huey', 'Utility helicopter. Transport + door gun + rockets.'),
        ('F-4 Phantom II', 'Air superiority / strike jet. Sparrow + napalm.'),
        ('B-52 Stratofortress', 'Strategic bomber. Carpet bomb. Late-game devastation.'),
        ('PBR Patrol Boat', 'River patrol craft. Twin MGs. Naval control.'),
    ]),
    ('SOVIET FORCES', [
        ('Viet Cong', 'Guerrilla infantry. Cheapest unit. Ambush specialist.'),
        ('T-54 Medium Tank', 'Soviet main battle tank. Heavy armour.'),
        ('MiG-21 Fishbed', 'Air superiority interceptor. F-4 counter.'),
        ('Mi-8 Hip Gunship', 'Soviet assault helicopter. Minigun + rockets.'),
    ]),
    ('SUPPORT / LOGISTICS', [
        ('Ore Collector', 'Autonomous harvester. Economy engine.'),
    ]),
]

for faction_name, units in toc_sections:
    story.append(Paragraph(faction_name, styles['toc_faction']))
    for uname, udesc in units:
        story.append(Paragraph(f'<b>{uname}</b> — {udesc}', styles['toc_entry']))
    story.append(Spacer(1, 3*mm))

story.append(PageBreak())

# ── ALLIED FACTION SECTION ────────────────────────────────────────────────────
current_faction.update({'dark': ALLIED_DARK, 'mid': ALLIED_MID, 'acc': ALLIED_ACC})
story.append(faction_divider(
    'ALLIED COMMAND',
    'United States Combined Arms — Vietnam Theatre',
    ALLIED_DARK, ALLIED_MID, ALLIED_ACC, styles))
story.append(Spacer(1, 4*mm))

for unit in ALLIED_UNITS:
    story.append(unit_block(unit, WEAPONS_DB, ALLIED_DARK, ALLIED_MID, ALLIED_ACC, styles))

story.append(PageBreak())

# ── SOVIET FACTION SECTION ────────────────────────────────────────────────────
current_faction.update({'dark': SOVIET_DARK, 'mid': SOVIET_MID, 'acc': SOVIET_ACC})
story.append(faction_divider(
    'SOVIET FORCES',
    'People\'s Army of Vietnam — Soviet-Equipped Theatre',
    SOVIET_DARK, SOVIET_MID, SOVIET_ACC, styles))
story.append(Spacer(1, 4*mm))

for unit in SOVIET_UNITS:
    story.append(unit_block(unit, WEAPONS_DB, SOVIET_DARK, SOVIET_MID, SOVIET_ACC, styles))

story.append(PageBreak())

# ── SHARED / SUPPORT SECTION ─────────────────────────────────────────────────
current_faction.update({'dark': NEUTRAL_DARK, 'mid': NEUTRAL_MID, 'acc': NEUTRAL_ACC})
story.append(faction_divider(
    'SUPPORT & LOGISTICS',
    'Shared Economy & Infrastructure Units',
    NEUTRAL_DARK, NEUTRAL_MID, NEUTRAL_ACC, styles))
story.append(Spacer(1, 4*mm))

for unit in SHARED_UNITS:
    story.append(unit_block(unit, WEAPONS_DB, NEUTRAL_DARK, NEUTRAL_MID, NEUTRAL_ACC, styles))

# ── APPENDIX: Weapons Reference ───────────────────────────────────────────────
story.append(PageBreak())
current_faction.update({'dark': NEUTRAL_DARK, 'mid': NEUTRAL_MID, 'acc': NEUTRAL_ACC})
story.append(Paragraph('APPENDIX A — WEAPONS REFERENCE', ParagraphStyle('app_h',
    fontName=FONT_BOLD, fontSize=14, textColor=NEUTRAL_DARK, spaceAfter=4)))
story.append(HRFlowable(width='100%', thickness=1, color=NEUTRAL_ACC, spaceAfter=3*mm))

weap_rows = [[
    Paragraph('<b>WEAPON</b>', styles['stat_label']),
    Paragraph('<b>DMG</b>', styles['stat_label']),
    Paragraph('<b>RANGE</b>', styles['stat_label']),
    Paragraph('<b>ROF (s)</b>', styles['stat_label']),
    Paragraph('<b>ACC</b>', styles['stat_label']),
    Paragraph('<b>AOE r</b>', styles['stat_label']),
    Paragraph('<b>TYPE</b>', styles['stat_label']),
    Paragraph('<b>NOTES</b>', styles['stat_label']),
]]

for wid, w in WEAPONS_DB.items():
    aoe = str(w.get('aoeRadius','—')) if w.get('aoeRadius') else '—'
    rof = w.get('rateOfFire', 0)
    rof_str = f'{rof}' if rof < 1 else f'{rof:.0f}'
    weap_rows.append([
        Paragraph(w.get('displayName', wid), styles['body_small']),
        Paragraph(f'<b>{w.get("damage","?")}</b>', styles['body']),
        Paragraph(str(w.get('range','?')), styles['body']),
        Paragraph(rof_str, styles['body']),
        Paragraph(f'{int(w.get("accuracy",0)*100)}%', styles['body']),
        Paragraph(aoe, styles['body']),
        Paragraph(w.get('category','?').replace('_',' ').title(), styles['body_small']),
        Paragraph(w.get('note','—'), styles['note_text']),
    ])

avail_w = W - 2*MARGIN
wcws = [38*mm, 12*mm, 12*mm, 12*mm, 10*mm, 10*mm, 22*mm, 44*mm]
total_ww = sum(wcws)
if total_ww > avail_w:
    scale_w = avail_w / total_ww
    wcws = [c * scale_w for c in wcws]

wt2 = Table(weap_rows, colWidths=wcws)
wt2.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#d0cdc4')),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#faf8f4'), colors.HexColor('#f0ede6')]),
    ('GRID', (0,0), (-1,-1), 0.3, GRID_LINE),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ('TOPPADDING',    (0,0), (-1,-1), 2),
    ('LEFTPADDING',   (0,0), (-1,-1), 3),
    ('RIGHTPADDING',  (0,0), (-1,-1), 3),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('FONTSIZE', (0,0), (-1,-1), 7),
]))
story.append(wt2)

story.append(Spacer(1, 6*mm))
story.append(Paragraph('END OF DOCUMENT — DRIFTGATE STUDIOS INTERNAL USE ONLY', ParagraphStyle('end',
    fontName=FONT_BOLD, fontSize=8, textColor=GREY_MID, alignment=TA_CENTER)))

# Build
doc.build(story)
print(f"PDF generated: {out_path}")
import os
print(f"Size: {os.path.getsize(out_path) // 1024} KB")
