from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak, Image
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame
from reportlab.platypus import Flowable
import os

W, H = A4
MARGIN = 18 * mm

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
FONT_BODY   = 'Helvetica'
FONT_BOLD   = 'Helvetica-Bold'
FONT_ITALIC = 'Helvetica-Oblique'

def make_styles():
    s = {}
    s['section_header'] = ParagraphStyle('section_header', fontName=FONT_BOLD, fontSize=14, textColor=WHITE, leading=18)
    s['unit_name']  = ParagraphStyle('unit_name',  fontName=FONT_BOLD, fontSize=11, textColor=WHITE, leading=14)
    s['body']       = ParagraphStyle('body',       fontName=FONT_BODY, fontSize=8,  textColor=BLACK, leading=11, spaceAfter=3)
    s['body_small'] = ParagraphStyle('body_small', fontName=FONT_BODY, fontSize=7,  textColor=GREY_MID, leading=10, spaceAfter=2)
    s['stat_label'] = ParagraphStyle('stat_label', fontName=FONT_BOLD, fontSize=7,  textColor=GREY_MID, leading=9)
    s['stat_val']   = ParagraphStyle('stat_val',   fontName=FONT_BOLD, fontSize=9,  textColor=BLACK, leading=11)
    s['note_text']  = ParagraphStyle('note_text',  fontName=FONT_ITALIC, fontSize=7.5, textColor=GREY_MID, leading=10)
    s['toc_entry']  = ParagraphStyle('toc_entry',  fontName=FONT_BODY, fontSize=9, textColor=BLACK, leading=13, leftIndent=6)
    s['toc_faction']= ParagraphStyle('toc_faction',fontName=FONT_BOLD, fontSize=10, textColor=BLACK, leading=14, spaceBefore=6)
    return s

def draw_page_bg(canv, doc, faction_dark, faction_mid, faction_acc):
    W2, H2 = A4
    canv.setFillColor(PAPER)
    canv.rect(0, 0, W2, H2, fill=1, stroke=0)
    canv.setFillColor(faction_dark)
    canv.rect(0, H2 - 22*mm, W2, 22*mm, fill=1, stroke=0)
    canv.setFillColor(faction_acc)
    canv.rect(0, H2 - 23.5*mm, W2, 1.5*mm, fill=1, stroke=0)
    canv.setFillColor(faction_dark)
    canv.rect(0, 0, W2, 12*mm, fill=1, stroke=0)
    canv.setFillColor(faction_acc)
    canv.rect(0, 11.5*mm, W2, 1*mm, fill=1, stroke=0)
    # Subtle grid
    canv.setStrokeColor(GRID_LINE)
    canv.setLineWidth(0.15)
    for x in range(0, int(W2), int(8*mm)):
        canv.line(x, 0, x, H2)
    for y in range(0, int(H2), int(8*mm)):
        canv.line(0, y, W2, y)
    # Corner brackets
    canv.setStrokeColor(faction_acc)
    canv.setLineWidth(1.2)
    for bx, by, dx, dy in [
        (MARGIN*0.5, H2-MARGIN*0.5, 1, -1),
        (W2-MARGIN*0.5, H2-MARGIN*0.5, -1, -1),
        (MARGIN*0.5, MARGIN*0.5, 1, 1),
        (W2-MARGIN*0.5, MARGIN*0.5, -1, 1),
    ]:
        canv.line(bx, by, bx+dx*8*mm, by)
        canv.line(bx, by, bx, by+dy*8*mm)
    # Header
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

def draw_cover(canv, doc):
    W2, H2 = A4
    canv.setFillColor(ALLIED_DARK)
    canv.rect(0, 0, W2, H2, fill=1, stroke=0)
    canv.setStrokeColor(colors.HexColor('#1a2d4a'))
    canv.setLineWidth(0.3)
    for x in range(0, int(W2)+1, int(8*mm)):
        canv.line(x, 0, x, H2)
    for y in range(0, int(H2)+1, int(8*mm)):
        canv.line(0, y, W2, y)
    p = canv.beginPath()
    p.moveTo(0, H2*0.55); p.lineTo(W2, H2*0.38)
    p.lineTo(W2, H2*0.32); p.lineTo(0, H2*0.49); p.close()
    canv.setFillColor(colors.HexColor('#0f1f35'))
    canv.drawPath(p, fill=1, stroke=0)
    canv.setFillColor(SOVIET_MID)
    canv.rect(0, H2-6*mm, W2, 6*mm, fill=1, stroke=0)
    canv.setFillColor(SOVIET_ACC)
    canv.rect(0, H2-7*mm, W2, 1*mm, fill=1, stroke=0)
    canv.setFillColor(ALLIED_MID)
    canv.rect(0, 0, W2, 6*mm, fill=1, stroke=0)
    canv.setFillColor(ALLIED_ACC)
    canv.rect(0, 5.5*mm, W2, 1*mm, fill=1, stroke=0)
    canv.setFont(FONT_BOLD, 10)
    canv.setFillColor(ALLIED_ACC)
    canv.drawCentredString(W2/2, H2-22*mm, 'D R I F T G A T E   S T U D I O S')
    canv.setFont(FONT_BODY, 7.5)
    canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2, H2-27*mm, 'INTERNAL DOCUMENT — CONFIDENTIAL')
    canv.setStrokeColor(ALLIED_ACC)
    canv.setLineWidth(0.8)
    canv.line(MARGIN*2, H2-30*mm, W2-MARGIN*2, H2-30*mm)
    canv.setFont(FONT_BOLD, 36)
    canv.setFillColor(WHITE)
    canv.drawCentredString(W2/2, H2*0.62, 'UNIT FIELD')
    canv.drawCentredString(W2/2, H2*0.62-40, 'BRIEF')
    canv.setFillColor(ALLIED_ACC)
    canv.rect(W2/2-30*mm, H2*0.62-48, 60*mm, 2, fill=1, stroke=0)
    canv.setFont(FONT_ITALIC, 11)
    canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2, H2*0.62-62, 'Comprehensive Unit Statistics & Tactical Overview')
    canv.setFillColor(STAMP_RED)
    canv.rect(W2/2-28*mm, H2*0.35+4, 56*mm, 11, fill=1, stroke=0)
    canv.setFont(FONT_BOLD, 9)
    canv.setFillColor(WHITE)
    canv.drawCentredString(W2/2, H2*0.35+7, '⚠  TOP SECRET — INTERNAL ONLY  ⚠')
    meta_y = H2*0.35-14
    canv.setFont(FONT_BODY, 8)
    canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2, meta_y,    'Document Reference: DG-RTS-UNIT-BRIEF-2026')
    canv.drawCentredString(W2/2, meta_y-12, 'Prepared by: Driftgate AI Combat Systems Office')
    canv.drawCentredString(W2/2, meta_y-24, 'Date: 14 May 2026')
    canv.drawCentredString(W2/2, meta_y-36, 'Revision: 1.0 — Pre-Alpha Field Edition')
    canv.setStrokeColor(ALLIED_ACC)
    canv.setLineWidth(1.5)
    for bx, by, dx, dy in [
        (MARGIN, MARGIN, 1, 1),(W2-MARGIN, MARGIN, -1, 1),
        (MARGIN, H2-MARGIN, 1, -1),(W2-MARGIN, H2-MARGIN, -1, -1),
    ]:
        canv.line(bx, by, bx+dx*12*mm, by)
        canv.line(bx, by, bx, by+dy*12*mm)
    canv.setFont(FONT_BOLD, 8)
    canv.setFillColor(ALLIED_ACC)
    canv.drawString(MARGIN, 15*mm, '▶  ALLIED COMMAND')
    canv.setFillColor(SOVIET_ACC)
    canv.drawRightString(W2-MARGIN, 15*mm, 'SOVIET FORCES  ◀')
    canv.setFont(FONT_BODY, 7)
    canv.setFillColor(GREY_MID)
    canv.drawCentredString(W2/2, 15*mm, '15 COMBAT UNITS  |  2 FACTIONS  |  3 UNIT CLASSES')

# ── Faction divider ───────────────────────────────────────────────────────────
class FactionDivider(Flowable):
    def __init__(self, title, subtitle, dark, mid, acc):
        super().__init__()
        self.title=title; self.subtitle=subtitle
        self.dark=dark; self.mid=mid; self.acc=acc
        self.width=W-2*MARGIN; self.height=38*mm
    def wrap(self, aw, ah): return (self.width, self.height)
    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        c.setFillColor(self.dark); c.rect(0,0,w,h,fill=1,stroke=0)
        c.setFillColor(self.mid);  c.rect(0,h*0.55,w,h*0.45,fill=1,stroke=0)
        c.setFillColor(self.acc);  c.rect(0,h*0.55-1.5,w,2,fill=1,stroke=0)
        c.setFont(FONT_BOLD, 24); c.setFillColor(WHITE)
        c.drawString(8*mm, h*0.22, self.title)
        c.setFont(FONT_ITALIC, 9); c.setFillColor(self.acc)
        c.drawString(8*mm, h*0.22-13, self.subtitle)
        c.setStrokeColor(self.acc); c.setLineWidth(2)
        c.line(w-6*mm, 5*mm, w-6*mm, h-5*mm)

# ── Unit header ───────────────────────────────────────────────────────────────
class UnitHeader(Flowable):
    def __init__(self, unit, dark, mid, acc):
        super().__init__()
        self.unit=unit; self.dark=dark; self.mid=mid; self.acc=acc
        self.width=W-2*MARGIN; self.height=16*mm
    def wrap(self, aw, ah): return (self.width, self.height)
    def draw(self):
        c = self.canv
        w, h = self.width, self.height
        c.setFillColor(self.dark); c.rect(0,0,w,h,fill=1,stroke=0)
        c.setFillColor(self.acc);  c.rect(0,0,3,h,fill=1,stroke=0)
        c.setFont(FONT_BOLD, 12); c.setFillColor(WHITE)
        c.drawString(7*mm, h*0.5, self.unit.get('displayName','???'))
        cat = self.unit.get('category','').upper()
        bc = {'INFANTRY':colors.HexColor('#2d5a2d'),'VEHICLE':colors.HexColor('#3a3520'),
              'AIR':colors.HexColor('#1a2d4a'),'NAVAL':colors.HexColor('#0a2a3a')}.get(cat,colors.HexColor('#333'))
        bw = len(cat)*5+10
        c.setFillColor(bc); c.roundRect(w-bw-8*mm, h*0.22, bw, h*0.55, 2, fill=1, stroke=0)
        c.setFont(FONT_BOLD, 7); c.setFillColor(WHITE)
        c.drawRightString(w-8*mm-2, h*0.5, cat)
        c.setFont(FONT_ITALIC, 6.5); c.setFillColor(self.acc)
        c.drawString(7*mm, h*0.18, f'ID: {self.unit.get("id","?")}')

# ── Main unit block with portrait ─────────────────────────────────────────────
def unit_block(unit, weapons_db, faction_dark, faction_mid, faction_acc, styles):
    PORTRAIT_DIR = '/app/portraits_compressed'
    elements = []
    elements.append(UnitHeader(unit, faction_dark, faction_mid, faction_acc))

    portrait_path = f'{PORTRAIT_DIR}/{unit["id"]}.png'
    if not os.path.exists(portrait_path):
        portrait_path = f'{PORTRAIT_DIR}/{unit["id"]}.jpg'
    has_portrait = os.path.exists(portrait_path)

    # ── Stats row ──
    hp        = unit.get('hp', 0)
    speed     = unit.get('speed', 0)
    armour    = unit.get('armour', '—').upper()
    vision    = unit.get('visionRadius', 0)
    cost      = unit.get('cost', 0)
    buildtime = unit.get('buildTime', 0)
    armour_color = {'LIGHT':colors.HexColor('#5a8a3a'),'MEDIUM':colors.HexColor('#8a7a1a'),'HEAVY':colors.HexColor('#6a3a1a')}.get(armour, GREY_MID)

    stat_data = [
        [Paragraph('<b>HP</b>',styles['stat_label']),
         Paragraph('<b>ARMOUR</b>',styles['stat_label']),
         Paragraph('<b>SPEED</b>',styles['stat_label']),
         Paragraph('<b>VISION</b>',styles['stat_label']),
         Paragraph('<b>COST</b>',styles['stat_label']),
         Paragraph('<b>BUILD TIME</b>',styles['stat_label'])],
        [Paragraph(f'<b>{hp}</b>',styles['stat_val']),
         Paragraph(f'<b>{armour}</b>',ParagraphStyle('av',fontName=FONT_BOLD,fontSize=9,textColor=armour_color)),
         Paragraph(f'<b>{speed}</b>',styles['stat_val']),
         Paragraph(f'<b>{vision}</b>',styles['stat_val']),
         Paragraph(f'<b>${cost}</b>',styles['stat_val']),
         Paragraph(f'<b>{buildtime}s</b>',styles['stat_val'])],
    ]

    avail_w = W - 2*MARGIN
    if has_portrait:
        portrait_w = 32*mm
        stat_w     = avail_w - portrait_w - 2*mm
    else:
        portrait_w = 0
        stat_w     = avail_w

    col_w = stat_w / 6
    stat_table = Table(stat_data, colWidths=[col_w]*6)
    stat_table.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8e4dc')),
        ('BACKGROUND',(0,1),(-1,1),colors.HexColor('#f5f2ec')),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('GRID',(0,0),(-1,-1),0.4,GRID_LINE),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    # Weapons table
    weapon_ids = unit.get('weapons', [])
    w_rows = [[Paragraph('<b>WEAPON</b>',styles['stat_label']),
               Paragraph('<b>DMG</b>',styles['stat_label']),
               Paragraph('<b>RNG</b>',styles['stat_label']),
               Paragraph('<b>ROF</b>',styles['stat_label']),
               Paragraph('<b>ACC</b>',styles['stat_label']),
               Paragraph('<b>AOE</b>',styles['stat_label']),
               Paragraph('<b>TYPE</b>',styles['stat_label'])]]
    if weapon_ids:
        for wid in weapon_ids:
            ww = weapons_db.get(wid, {})
            aoe = f'{ww.get("aoeRadius")}r' if ww.get('aoeRadius') else '—'
            rof = ww.get('rateOfFire',0)
            rof_s = f'{rof}s' if rof < 1 else f'1/{rof:.0f}s'
            w_rows.append([
                Paragraph(ww.get('displayName',wid),styles['body_small']),
                Paragraph(f'<b>{ww.get("damage","?")}</b>',styles['body']),
                Paragraph(str(ww.get('range','?')),styles['body']),
                Paragraph(rof_s,styles['body']),
                Paragraph(f'{int(ww.get("accuracy",0)*100)}%',styles['body']),
                Paragraph(aoe,styles['body']),
                Paragraph(ww.get('category','?').replace('_',' ').title(),styles['body_small']),
            ])
    else:
        w_rows.append([Paragraph('—',styles['body_small'])]+[Paragraph('—',styles['body'])]*6)

    wcws_raw = [46*mm,12*mm,10*mm,12*mm,10*mm,10*mm,stat_w-100*mm]
    wcws_scale = stat_w / sum(wcws_raw)
    wcws = [c*wcws_scale for c in wcws_raw]
    wt = Table(w_rows, colWidths=wcws)
    wt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ddd9d0')),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#faf8f4'),colors.HexColor('#f0ede6')]),
        ('GRID',(0,0),(-1,-1),0.3,GRID_LINE),
        ('BOTTOMPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),2),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    # Abilities
    notes = []
    if unit.get('canEnterTrench'):   notes.append('Trench capable')
    if unit.get('canGarrison'):      notes.append('Can garrison')
    if unit.get('canCapture'):       notes.append('Can capture')
    if unit.get('canRepair'):        notes.append('Repair/Rebuild')
    if unit.get('canBuild'):         notes.append('Field construction')
    if unit.get('canAmbush'):        notes.append('Guerrilla ambush')
    if unit.get('canTransport'):     notes.append(f'Transport ×{unit.get("transportCapacity","?")}')
    if unit.get('crushesInfantry'):  notes.append('Crushes infantry')
    if unit.get('isHelicopter'):     notes.append(f'Helicopter (h:{unit.get("hoverHeight","?")})')
    if unit.get('isJet'):            notes.append(f'Jet — ammo:{unit.get("maxAmmo","?")} rearm:{unit.get("rearmTime","?")}s')
    if unit.get('isNaval'):          notes.append('Naval — water only')

    vet = unit.get('veterancyThresholds', [])
    vet_str = f'{vet[0]} / {vet[1]} / {vet[2]} kills' if len(vet)==3 else '—'
    req_str = unit.get('requiredStructure','—').replace('_',' ').title()
    tags    = unit.get('tags', [])

    feat_data = [
        [Paragraph('<b>ABILITIES</b>',styles['stat_label']),
         Paragraph('<b>TAGS</b>',styles['stat_label']),
         Paragraph('<b>REQUIRES</b>',styles['stat_label']),
         Paragraph('<b>VETERANCY</b>',styles['stat_label'])],
        [Paragraph('<br/>'.join(notes) if notes else '—',styles['body_small']),
         Paragraph('  '.join(f'[{t.upper()}]' for t in tags),styles['body_small']),
         Paragraph(req_str,styles['body']),
         Paragraph(vet_str,styles['body'])],
    ]
    feat_cws_raw = [stat_w*0.36, stat_w*0.36, stat_w*0.16, stat_w*0.12]
    ft = Table(feat_data, colWidths=feat_cws_raw)
    ft.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ddd9d0')),
        ('BACKGROUND',(0,1),(-1,1),colors.HexColor('#f5f2ec')),
        ('GRID',(0,0),(-1,-1),0.3,GRID_LINE),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))

    note_txt = unit.get('note') or unit.get('description','')

    # ── Compose left column (stats + weapons + abilities + note) ──
    left_elements = [stat_table, wt, ft]
    if note_txt:
        nt = Table([[Paragraph(f'◆ {note_txt}', styles['note_text'])]])
        nt.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#e8e4d8')),
            ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('BOX',(0,0),(-1,-1),0.5,faction_acc),
        ]))
        left_elements.append(nt)

    if has_portrait:
        portrait_img = Image(portrait_path, width=portrait_w, height=portrait_w)
        portrait_img.hAlign = 'CENTER'
        # Portrait cell with dark background
        portrait_cell = Table([[portrait_img]], colWidths=[portrait_w])
        portrait_cell.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),faction_dark),
            ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
            ('LEFTPADDING',(0,0),(-1,-1),2),('RIGHTPADDING',(0,0),(-1,-1),2),
            ('BOX',(0,0),(-1,-1),1,faction_acc),
        ]))

        # Left col as nested table
        inner = Table([[t] for t in left_elements], colWidths=[stat_w])
        inner.setStyle(TableStyle([
            ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ]))

        combined = Table([[inner, portrait_cell]],
                         colWidths=[stat_w, portrait_w+2*mm])
        combined.setStyle(TableStyle([
            ('VALIGN',(0,0),(-1,-1),'TOP'),
            ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ]))
        elements.append(combined)
    else:
        for t in left_elements:
            elements.append(t)

    elements.append(Spacer(1, 4*mm))
    return KeepTogether(elements)

# ── Data ──────────────────────────────────────────────────────────────────────
WEAPONS_DB = {
    'aim7_sparrow':        {'displayName':'AIM-7 Sparrow','damage':120,'range':16,'rateOfFire':5.0,'accuracy':0.75,'category':'anti_air','aoeRadius':None},
    'cannon_90mm':         {'displayName':'90mm Main Gun','damage':180,'range':9,'rateOfFire':2.8,'accuracy':0.92,'category':'cannon','aoeRadius':None},
    'grenade_launcher_m79':{'displayName':'M79 Grenade Launcher','damage':55,'range':10,'rateOfFire':0.5,'accuracy':0.75,'category':'grenade','aoeRadius':2.5},
    'm2_browning':         {'displayName':'.50 Cal Browning','damage':30,'range':11,'rateOfFire':0.12,'accuracy':0.82,'category':'heavy_machine_gun','aoeRadius':None},
    'm60_door_gun':        {'displayName':'M60 Door Gun','damage':16,'range':8,'rateOfFire':0.1,'accuracy':0.72,'category':'machine_gun','aoeRadius':None},
    'm60_machinegun':      {'displayName':'M60 Machine Gun','damage':18,'range':9,'rateOfFire':0.1,'accuracy':0.78,'category':'machine_gun','aoeRadius':None},
    'mk82_bomb_carpet':    {'displayName':'Mk 82 Carpet Bomb','damage':180,'range':16,'rateOfFire':99,'accuracy':0.60,'category':'explosive','aoeRadius':5.5,'note':'4-bomb carpet. Craters on impact.'},
    'napalm_bomb':         {'displayName':'Napalm Canister','damage':40,'range':14,'rateOfFire':99,'accuracy':0.65,'category':'bomb','aoeRadius':5.0,'note':'6s burn DOT: 8 dmg/s'},
    'rifle_ak47':          {'displayName':'AK-47','damage':13,'range':6,'rateOfFire':0.2,'accuracy':0.80,'category':'small_arms','aoeRadius':None},
    'rifle_m16':           {'displayName':'M16 Assault Rifle','damage':12,'range':7,'rateOfFire':0.18,'accuracy':0.85,'category':'small_arms','aoeRadius':None},
    'rocket_pod_2_75':     {'displayName':'2.75" Rocket Pod','damage':70,'range':12,'rateOfFire':0.4,'accuracy':0.70,'category':'rocket','aoeRadius':3.0},
    'r60_missile':         {'displayName':'R-60 Atoll','damage':100,'range':12,'rateOfFire':5.0,'accuracy':0.70,'category':'anti_air','aoeRadius':None,'note':'IR missile, fast lock'},
    'gsh23_cannon':        {'displayName':'GSh-23 Cannon','damage':35,'range':6,'rateOfFire':0.12,'accuracy':0.65,'category':'anti_air','aoeRadius':None},
    'pistol_m1911':        {'displayName':'M1911 Pistol','damage':8,'range':4,'rateOfFire':0.5,'accuracy':0.70,'category':'sidearm','aoeRadius':None},
    'minigun_20mm':        {'displayName':'20mm Minigun','damage':22,'range':9,'rateOfFire':0.08,'accuracy':0.75,'category':'machine_gun','aoeRadius':None},
    'rocket_pod':          {'displayName':'Rocket Pod','damage':65,'range':11,'rateOfFire':0.4,'accuracy':0.68,'category':'rocket','aoeRadius':2.5},
}

ALLIED = [
    {'id':'infantry_rifleman','displayName':'Rifleman','category':'infantry','hp':100,'armour':'light','speed':2.2,'visionRadius':6,'cost':200,'buildTime':5,'requiredStructure':'barracks','weapons':['rifle_m16'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture']},
    {'id':'infantry_grenadier','displayName':'Grenadier','category':'infantry','hp':90,'armour':'light','speed':2.0,'visionRadius':8,'cost':150,'buildTime':7,'requiredStructure':'barracks','weapons':['grenade_launcher_m79'],'canEnterTrench':True,'canGarrison':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','anti_armor','explosive']},
    {'id':'infantry_engineer','displayName':'Engineer','category':'infantry','hp':75,'armour':'light','speed':1.8,'visionRadius':5,'cost':300,'buildTime':8,'requiredStructure':'barracks','weapons':['pistol_m1911'],'canEnterTrench':True,'canCapture':True,'canRepair':True,'canBuild':True,'tags':['infantry','light','can_capture','engineer']},
    {'id':'vehicle_jeep','displayName':'M151 Jeep','category':'vehicle','hp':150,'armour':'light','speed':5.0,'visionRadius':8,'cost':300,'buildTime':8,'requiredStructure':'war_factory','weapons':['m60_machinegun'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','light','fast','recon']},
    {'id':'vehicle_m113','displayName':'M113 APC','category':'vehicle','hp':250,'armour':'medium','speed':3.2,'visionRadius':6,'cost':600,'buildTime':12,'requiredStructure':'war_factory','weapons':['m2_browning'],'canTransport':True,'transportCapacity':5,'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','medium','transport','amphibious']},
    {'id':'vehicle_m48_tank','displayName':'M48 Patton','category':'vehicle','hp':400,'armour':'heavy','speed':1.9,'visionRadius':5,'cost':800,'buildTime':15,'requiredStructure':'war_factory','weapons':['cannon_90mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked','main_battle_tank']},
    {'id':'air_huey','displayName':'UH-1 Huey','category':'air','hp':150,'armour':'light','speed':6.0,'visionRadius':10,'cost':1200,'buildTime':18,'requiredStructure':'helipad','weapons':['m60_door_gun','rocket_pod_2_75'],'isHelicopter':True,'hoverHeight':8,'canTransport':True,'transportCapacity':8,'maxAmmo':20,'rearmTime':10,'veterancyThresholds':[3,8,15],'tags':['air','helicopter','transport','gunship']},
    {'id':'air_f4_phantom','displayName':'F-4 Phantom II','category':'air','hp':200,'armour':'light','speed':10.0,'visionRadius':12,'cost':2000,'buildTime':25,'requiredStructure':'airfield','weapons':['aim7_sparrow','napalm_bomb'],'isJet':True,'cruiseHeight':12,'maxAmmo':30,'rearmTime':15,'veterancyThresholds':[3,8,15],'tags':['air','jet','strike','anti_ground','fast_mover']},
    {'id':'air_b52','displayName':'B-52 Stratofortress','category':'air','hp':300,'armour':'medium','speed':7.0,'visionRadius':14,'cost':3000,'buildTime':35,'requiredStructure':'airfield','weapons':['mk82_bomb_carpet'],'isJet':True,'cruiseHeight':15,'maxAmmo':50,'rearmTime':20,'veterancyThresholds':[3,8,15],'tags':['air','jet','bomber','carpet_bomb','strategic']},
    {'id':'naval_patrol_boat','displayName':'PBR Patrol Boat','category':'naval','hp':300,'armour':'light','speed':4.0,'visionRadius':10,'cost':500,'buildTime':12,'requiredStructure':'naval_yard','weapons':['m2_browning','m60_machinegun'],'isNaval':True,'veterancyThresholds':[3,8,15],'tags':['naval','light','fast','river_patrol']},
]

SOVIET = [
    {'id':'infantry_vietcong','displayName':'Viet Cong','category':'infantry','hp':80,'armour':'light','speed':2.8,'visionRadius':6,'cost':75,'buildTime':4,'requiredStructure':'barracks','weapons':['rifle_ak47'],'canEnterTrench':True,'canGarrison':True,'canAmbush':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture','guerrilla'],'note':'Guerrilla fighter — ambush bonus from jungle/trench. Cheapest combat unit.'},
    {'id':'tank_medium','displayName':'T-54 Medium Tank','category':'vehicle','hp':400,'armour':'heavy','speed':1.8,'visionRadius':5,'cost':800,'buildTime':14,'requiredStructure':'war_factory','weapons':['cannon_90mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked'],'note':'Soviet MBT. Heavier armour scheme. Slower but more durable hull than the Patton.'},
    {'id':'air_mig21','displayName':'MiG-21 Fishbed','category':'air','hp':180,'armour':'light','speed':11.0,'visionRadius':10,'cost':1800,'buildTime':22,'requiredStructure':'airfield','weapons':['r60_missile','gsh23_cannon'],'isJet':True,'cruiseHeight':11,'maxAmmo':24,'rearmTime':14,'veterancyThresholds':[3,8,15],'tags':['air','jet','interceptor','anti_air','fast_mover'],'note':'Faster than F-4. Shorter missile range but quicker lock. Direct F-4 counter.'},
    {'id':'helicopter_attack','displayName':'Mi-8 Hip Gunship','category':'air','hp':220,'armour':'light','speed':4.0,'visionRadius':8,'cost':1200,'buildTime':18,'requiredStructure':'airfield','weapons':['minigun_20mm','rocket_pod'],'isHelicopter':True,'hoverHeight':6,'tags':['air','light','anti_ground'],'note':'Soviet assault helicopter. Heavier armament than Huey, lower top speed.'},
]

SUPPORT = [
    {'id':'harvester_vehicle','displayName':'Ore Collector','category':'vehicle','hp':150,'armour':'light','speed':2.5,'visionRadius':4,'cost':0,'buildTime':8,'requiredStructure':'refinery','weapons':[],'tags':['harvester'],'description':'Autonomous ore collector. Cannot attack. Auto-assigned on refinery completion.'},
]

# ── Build doc ──────────────────────────────────────────────────────────────────
out_path = '/app/driftgate_unit_brief.pdf'
current_faction = {'dark': ALLIED_DARK, 'mid': ALLIED_MID, 'acc': ALLIED_ACC}

frame = Frame(MARGIN, 14*mm, W-2*MARGIN, H-14*mm-24*mm, id='main')

def on_page(canv, doc):
    if doc.page == 1:
        draw_cover(canv, doc)
    else:
        draw_page_bg(canv, doc, current_faction['dark'], current_faction['mid'], current_faction['acc'])

doc = BaseDocTemplate(out_path, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=24*mm, bottomMargin=14*mm)
pt = PageTemplate(id='main', frames=[frame], onPage=on_page)
doc.addPageTemplates([pt])

styles = make_styles()
story = []

# Cover
story.append(Spacer(1, H-48*mm))
story.append(PageBreak())

# TOC
current_faction.update({'dark':NEUTRAL_DARK,'mid':NEUTRAL_MID,'acc':NEUTRAL_ACC})
story.append(Paragraph('TABLE OF CONTENTS', ParagraphStyle('toc_h',
    fontName=FONT_BOLD, fontSize=18, textColor=NEUTRAL_DARK, spaceAfter=6)))
story.append(HRFlowable(width='100%', thickness=1.5, color=NEUTRAL_ACC, spaceAfter=4*mm))
toc = [
    ('ALLIED COMMAND',[
        ('Rifleman','M16-armed core infantry. Can capture. Backbone of Allied advance.'),
        ('Grenadier','Anti-armour/area denial. M79 grenade launcher. Garrison capable.'),
        ('Engineer','Build, repair, capture specialist. Trench + subterrain capable.'),
        ('M151 Jeep','Fast recon vehicle. M60 MG. Excellent early-game pressure.'),
        ('M113 APC','Medium APC. .50 cal. Transports 5 infantry. Amphibious.'),
        ('M48 Patton','Heavy MBT. 90mm cannon. Crushes infantry. 400 HP.'),
        ('UH-1 Huey','Utility gunship. Door gun + rockets. Transports 8. Hover.'),
        ('F-4 Phantom II','Strike jet. AIM-7 Sparrow + Napalm. Speed 10. Air superiority.'),
        ('B-52 Stratofortress','Strategic bomber. Carpet bomb. Massive AOE. Late-game finisher.'),
        ('PBR Patrol Boat','River patrol. Twin MGs. Fastest naval unit. Water control.'),
    ]),
    ('SOVIET FORCES',[
        ('Viet Cong','Cheapest unit. AK-47. Guerrilla ambush. Jungle specialist.'),
        ('T-54 Medium Tank','Soviet MBT. 90mm. Heavier armour. Slower but more durable.'),
        ('MiG-21 Fishbed','Air superiority interceptor. Fastest unit. F-4 counter.'),
        ('Mi-8 Hip Gunship','Soviet assault helicopter. Minigun + rockets. Heavier than Huey.'),
    ]),
    ('SUPPORT',[
        ('Ore Collector','Autonomous harvester. Economy engine. Cannot attack.'),
    ]),
]
for faction_name, units in toc:
    story.append(Paragraph(faction_name, styles['toc_faction']))
    for uname, udesc in units:
        story.append(Paragraph(f'<b>{uname}</b> — {udesc}', styles['toc_entry']))
    story.append(Spacer(1, 2*mm))
story.append(PageBreak())

# Allied section
current_faction.update({'dark':ALLIED_DARK,'mid':ALLIED_MID,'acc':ALLIED_ACC})
story.append(FactionDivider('ALLIED COMMAND','United States Combined Arms — Vietnam Theatre',ALLIED_DARK,ALLIED_MID,ALLIED_ACC))
story.append(Spacer(1,4*mm))
for unit in ALLIED:
    story.append(unit_block(unit, WEAPONS_DB, ALLIED_DARK, ALLIED_MID, ALLIED_ACC, styles))
story.append(PageBreak())

# Soviet section
current_faction.update({'dark':SOVIET_DARK,'mid':SOVIET_MID,'acc':SOVIET_ACC})
story.append(FactionDivider('SOVIET FORCES',"People's Army of Vietnam — Soviet-Equipped Theatre",SOVIET_DARK,SOVIET_MID,SOVIET_ACC))
story.append(Spacer(1,4*mm))
for unit in SOVIET:
    story.append(unit_block(unit, WEAPONS_DB, SOVIET_DARK, SOVIET_MID, SOVIET_ACC, styles))
story.append(PageBreak())

# Support section
current_faction.update({'dark':NEUTRAL_DARK,'mid':NEUTRAL_MID,'acc':NEUTRAL_ACC})
story.append(FactionDivider('SUPPORT & LOGISTICS','Shared Economy & Infrastructure Units',NEUTRAL_DARK,NEUTRAL_MID,NEUTRAL_ACC))
story.append(Spacer(1,4*mm))
for unit in SUPPORT:
    story.append(unit_block(unit, WEAPONS_DB, NEUTRAL_DARK, NEUTRAL_MID, NEUTRAL_ACC, styles))

# Weapons appendix
story.append(PageBreak())
current_faction.update({'dark':NEUTRAL_DARK,'mid':NEUTRAL_MID,'acc':NEUTRAL_ACC})
story.append(Paragraph('APPENDIX A — WEAPONS REFERENCE', ParagraphStyle('app_h',
    fontName=FONT_BOLD, fontSize=14, textColor=NEUTRAL_DARK, spaceAfter=4)))
story.append(HRFlowable(width='100%', thickness=1, color=NEUTRAL_ACC, spaceAfter=3*mm))

weap_rows = [[
    Paragraph('<b>WEAPON</b>',styles['stat_label']),
    Paragraph('<b>DMG</b>',styles['stat_label']),
    Paragraph('<b>RNG</b>',styles['stat_label']),
    Paragraph('<b>ROF</b>',styles['stat_label']),
    Paragraph('<b>ACC</b>',styles['stat_label']),
    Paragraph('<b>AOE</b>',styles['stat_label']),
    Paragraph('<b>TYPE</b>',styles['stat_label']),
    Paragraph('<b>NOTES</b>',styles['stat_label']),
]]
for wid, ww in WEAPONS_DB.items():
    aoe = str(ww.get('aoeRadius','—')) if ww.get('aoeRadius') else '—'
    rof = ww.get('rateOfFire',0)
    weap_rows.append([
        Paragraph(ww.get('displayName',wid),styles['body_small']),
        Paragraph(f'<b>{ww.get("damage","?")}</b>',styles['body']),
        Paragraph(str(ww.get('range','?')),styles['body']),
        Paragraph(str(rof),styles['body']),
        Paragraph(f'{int(ww.get("accuracy",0)*100)}%',styles['body']),
        Paragraph(aoe,styles['body']),
        Paragraph(ww.get('category','?').replace('_',' ').title(),styles['body_small']),
        Paragraph(ww.get('note','—'),styles['note_text']),
    ])

avail_w = W-2*MARGIN
wcws = [38*mm,11*mm,10*mm,10*mm,9*mm,9*mm,22*mm,avail_w-109*mm]
wt2 = Table(weap_rows, colWidths=wcws)
wt2.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#d0cdc4')),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#faf8f4'),colors.HexColor('#f0ede6')]),
    ('GRID',(0,0),(-1,-1),0.3,GRID_LINE),
    ('BOTTOMPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),2),
    ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
]))
story.append(wt2)
story.append(Spacer(1,6*mm))
story.append(Paragraph('END OF DOCUMENT — DRIFTGATE STUDIOS INTERNAL USE ONLY',
    ParagraphStyle('end',fontName=FONT_BOLD,fontSize=8,textColor=GREY_MID,alignment=TA_CENTER)))

doc.build(story)
import os
size = os.path.getsize(out_path)
print(f"PDF: {out_path} ({size//1024}KB)")
