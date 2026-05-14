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

BLACK        = colors.HexColor('#0a0a0a')
WHITE        = colors.HexColor('#f5f5f0')
PAPER        = colors.HexColor('#ede9df')
ALLIED_DARK  = colors.HexColor('#0d2240')
ALLIED_MID   = colors.HexColor('#1a3a6b')
ALLIED_ACC   = colors.HexColor('#4a9fd4')
SOVIET_DARK  = colors.HexColor('#1a0505')
SOVIET_MID   = colors.HexColor('#5a0a0a')
SOVIET_ACC   = colors.HexColor('#cc2222')
NEUTRAL_DARK = colors.HexColor('#1a1a12')
NEUTRAL_MID  = colors.HexColor('#3a3820')
NEUTRAL_ACC  = colors.HexColor('#c8a832')
GREY_LIGHT   = colors.HexColor('#d0cdc4')
GREY_MID     = colors.HexColor('#888070')
STAMP_RED    = colors.HexColor('#8b0000')
GRID_LINE    = colors.HexColor('#c8c4b8')
ERA_COLOR    = colors.HexColor('#2a4a2a')
FONT_BODY    = 'Helvetica'
FONT_BOLD    = 'Helvetica-Bold'
FONT_ITALIC  = 'Helvetica-Oblique'

PORTRAIT_DIR = '/app/portraits_compressed'

def styles():
    return {
        'body':       ParagraphStyle('body',       fontName=FONT_BODY, fontSize=8,   textColor=BLACK,      leading=11, spaceAfter=2),
        'body_small': ParagraphStyle('body_small', fontName=FONT_BODY, fontSize=7,   textColor=GREY_MID,   leading=10, spaceAfter=1),
        'stat_label': ParagraphStyle('stat_label', fontName=FONT_BOLD, fontSize=6.5, textColor=GREY_MID,   leading=9),
        'stat_val':   ParagraphStyle('stat_val',   fontName=FONT_BOLD, fontSize=9,   textColor=BLACK,      leading=11),
        'note_text':  ParagraphStyle('note_text',  fontName=FONT_ITALIC, fontSize=7.5, textColor=GREY_MID, leading=10),
        'toc_entry':  ParagraphStyle('toc_entry',  fontName=FONT_BODY, fontSize=8.5, textColor=BLACK,      leading=13, leftIndent=6),
        'toc_faction':ParagraphStyle('toc_faction',fontName=FONT_BOLD, fontSize=10,  textColor=BLACK,      leading=14, spaceBefore=5),
    }

ST = styles()

def draw_page_bg(canv, doc, dark, mid, acc):
    W2, H2 = A4
    canv.setFillColor(PAPER); canv.rect(0,0,W2,H2,fill=1,stroke=0)
    canv.setFillColor(dark);  canv.rect(0,H2-22*mm,W2,22*mm,fill=1,stroke=0)
    canv.setFillColor(acc);   canv.rect(0,H2-23.5*mm,W2,1.5*mm,fill=1,stroke=0)
    canv.setFillColor(dark);  canv.rect(0,0,W2,12*mm,fill=1,stroke=0)
    canv.setFillColor(acc);   canv.rect(0,11.5*mm,W2,1*mm,fill=1,stroke=0)
    canv.setStrokeColor(GRID_LINE); canv.setLineWidth(0.15)
    for x in range(0,int(W2),int(8*mm)): canv.line(x,0,x,H2)
    for y in range(0,int(H2),int(8*mm)): canv.line(0,y,W2,y)
    canv.setStrokeColor(acc); canv.setLineWidth(1.1)
    for bx,by,dx,dy in [(MARGIN*0.5,H2-MARGIN*0.5,1,-1),(W2-MARGIN*0.5,H2-MARGIN*0.5,-1,-1),
                         (MARGIN*0.5,MARGIN*0.5,1,1),(W2-MARGIN*0.5,MARGIN*0.5,-1,1)]:
        canv.line(bx,by,bx+dx*8*mm,by); canv.line(bx,by,bx,by+dy*8*mm)
    canv.setFont(FONT_BOLD,9); canv.setFillColor(acc)
    canv.drawString(MARGIN,H2-10*mm,'DRIFTGATE STUDIOS')
    canv.setFont(FONT_BODY,7); canv.setFillColor(WHITE)
    canv.drawRightString(W2-MARGIN,H2-10*mm,'UNIT FIELD BRIEF — COLD WAR EDITION — CLASSIFIED')
    canv.setFont(FONT_BODY,6.5); canv.setFillColor(GREY_LIGHT)
    canv.drawString(MARGIN,4.5*mm,f'DG-RTS-UNIT-BRIEF-COLDWAR-2026 | PAGE {doc.page}')
    canv.drawRightString(W2-MARGIN,4.5*mm,'INTERNAL USE ONLY — DO NOT DISTRIBUTE')

def draw_cover(canv, doc):
    W2, H2 = A4
    canv.setFillColor(ALLIED_DARK); canv.rect(0,0,W2,H2,fill=1,stroke=0)
    canv.setStrokeColor(colors.HexColor('#1a2d4a')); canv.setLineWidth(0.3)
    for x in range(0,int(W2)+1,int(8*mm)): canv.line(x,0,x,H2)
    for y in range(0,int(H2)+1,int(8*mm)): canv.line(0,y,W2,y)
    # Diagonal band
    p = canv.beginPath()
    p.moveTo(0,H2*0.55); p.lineTo(W2,H2*0.37); p.lineTo(W2,H2*0.31); p.lineTo(0,H2*0.49); p.close()
    canv.setFillColor(colors.HexColor('#0f1f35')); canv.drawPath(p,fill=1,stroke=0)
    # Top/bottom stripes
    canv.setFillColor(SOVIET_MID); canv.rect(0,H2-6*mm,W2,6*mm,fill=1,stroke=0)
    canv.setFillColor(SOVIET_ACC); canv.rect(0,H2-7*mm,W2,1*mm,fill=1,stroke=0)
    canv.setFillColor(ALLIED_MID); canv.rect(0,0,W2,6*mm,fill=1,stroke=0)
    canv.setFillColor(ALLIED_ACC); canv.rect(0,5.5*mm,W2,1*mm,fill=1,stroke=0)
    canv.setFont(FONT_BOLD,10); canv.setFillColor(ALLIED_ACC)
    canv.drawCentredString(W2/2,H2-22*mm,'D R I F T G A T E   S T U D I O S')
    canv.setFont(FONT_BODY,7.5); canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2,H2-27*mm,'INTERNAL DOCUMENT — CONFIDENTIAL')
    canv.setStrokeColor(ALLIED_ACC); canv.setLineWidth(0.8)
    canv.line(MARGIN*2,H2-30*mm,W2-MARGIN*2,H2-30*mm)
    # Main title
    canv.setFont(FONT_BOLD,34); canv.setFillColor(WHITE)
    canv.drawCentredString(W2/2,H2*0.63,'UNIT FIELD BRIEF')
    canv.setFont(FONT_BOLD,16); canv.setFillColor(ALLIED_ACC)
    canv.drawCentredString(W2/2,H2*0.63-36,'C O L D   W A R   E D I T I O N')
    canv.setFillColor(SOVIET_ACC); canv.rect(W2/2-30*mm,H2*0.63-48,60*mm,2,fill=1,stroke=0)
    canv.setFont(FONT_ITALIC,10); canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2,H2*0.63-62,'1950 – 1991  |  Korea · Vietnam · Afghanistan · Proxy Wars')
    # Classification
    canv.setFillColor(STAMP_RED); canv.rect(W2/2-30*mm,H2*0.36+4,60*mm,11,fill=1,stroke=0)
    canv.setFont(FONT_BOLD,9); canv.setFillColor(WHITE)
    canv.drawCentredString(W2/2,H2*0.36+7,'⚠  TOP SECRET — INTERNAL ONLY  ⚠')
    # Meta
    my = H2*0.36-14
    canv.setFont(FONT_BODY,8); canv.setFillColor(GREY_LIGHT)
    canv.drawCentredString(W2/2,my,   'Document Reference: DG-RTS-UNIT-BRIEF-COLDWAR-2026')
    canv.drawCentredString(W2/2,my-12,'Prepared by: Driftgate AI Combat Systems Office')
    canv.drawCentredString(W2/2,my-24,'Date: 14 May 2026  |  Revision: 2.0 — Cold War Field Edition')
    canv.drawCentredString(W2/2,my-36,'Designed for modding — all unit stats exposed in JSON')
    # Corner brackets
    canv.setStrokeColor(ALLIED_ACC); canv.setLineWidth(1.5)
    for bx,by,dx,dy in [(MARGIN,MARGIN,1,1),(W2-MARGIN,MARGIN,-1,1),
                          (MARGIN,H2-MARGIN,1,-1),(W2-MARGIN,H2-MARGIN,-1,-1)]:
        canv.line(bx,by,bx+dx*12*mm,by); canv.line(bx,by,bx,by+dy*12*mm)
    canv.setFont(FONT_BOLD,8)
    canv.setFillColor(ALLIED_ACC); canv.drawString(MARGIN,15*mm,'▶  ALLIED / NATO COMMAND')
    canv.setFillColor(SOVIET_ACC); canv.drawRightString(W2-MARGIN,15*mm,'WARSAW PACT / SOVIET  ◀')
    canv.setFont(FONT_BODY,7); canv.setFillColor(GREY_MID)
    canv.drawCentredString(W2/2,15*mm,'39 UNITS  |  2 FACTIONS  |  FULL MOD SUPPORT')

class FactionDivider(Flowable):
    def __init__(self, title, subtitle, era, dark, mid, acc):
        super().__init__()
        self.title=title; self.subtitle=subtitle; self.era=era
        self.dark=dark; self.mid=mid; self.acc=acc
        self.width=W-2*MARGIN; self.height=36*mm
    def wrap(self,aw,ah): return (self.width,self.height)
    def draw(self):
        c=self.canv; w,h=self.width,self.height
        c.setFillColor(self.dark); c.rect(0,0,w,h,fill=1,stroke=0)
        c.setFillColor(self.mid);  c.rect(0,h*0.52,w,h*0.48,fill=1,stroke=0)
        c.setFillColor(self.acc);  c.rect(0,h*0.52-1.5,w,2,fill=1,stroke=0)
        c.setFont(FONT_BOLD,22); c.setFillColor(WHITE)
        c.drawString(7*mm,h*0.2,self.title)
        c.setFont(FONT_ITALIC,8.5); c.setFillColor(self.acc)
        c.drawString(7*mm,h*0.2-12,self.subtitle)
        # Era badge
        bw=len(self.era)*5.5+10
        c.setFillColor(colors.HexColor('#0a0a0a')); c.setFillAlpha(0.5)
        c.roundRect(w-bw-7*mm,h*0.58,bw,h*0.33,3,fill=1,stroke=0)
        c.setFillAlpha(1)
        c.setFont(FONT_BOLD,7.5); c.setFillColor(self.acc)
        c.drawRightString(w-7*mm-1,h*0.72,self.era)
        c.setStrokeColor(self.acc); c.setLineWidth(2)
        c.line(w-5*mm,4*mm,w-5*mm,h-4*mm)

class UnitHeader(Flowable):
    def __init__(self, unit, dark, acc):
        super().__init__()
        self.unit=unit; self.dark=dark; self.acc=acc
        self.width=W-2*MARGIN; self.height=15*mm
    def wrap(self,aw,ah): return (self.width,self.height)
    def draw(self):
        c=self.canv; w,h=self.width,self.height
        c.setFillColor(self.dark); c.rect(0,0,w,h,fill=1,stroke=0)
        c.setFillColor(self.acc);  c.rect(0,0,3,h,fill=1,stroke=0)
        c.setFont(FONT_BOLD,11.5); c.setFillColor(WHITE)
        c.drawString(6*mm,h*0.5,self.unit.get('displayName','???'))
        # Category
        cat=self.unit.get('category','').upper()
        bc={'INFANTRY':colors.HexColor('#2d5a2d'),'VEHICLE':colors.HexColor('#3a3520'),
            'AIR':colors.HexColor('#1a2d4a'),'NAVAL':colors.HexColor('#0a2a3a')}.get(cat,colors.HexColor('#333'))
        bw=len(cat)*5+10
        c.setFillColor(bc); c.roundRect(w-bw-20*mm,h*0.2,bw,h*0.6,2,fill=1,stroke=0)
        c.setFont(FONT_BOLD,7); c.setFillColor(WHITE)
        c.drawRightString(w-20*mm-2,h*0.52,cat)
        # Era badge
        era=self.unit.get('era','')
        if era:
            era_w=len(era)*4.5+8
            c.setFillColor(ERA_COLOR); c.roundRect(w-era_w-6*mm,h*0.2,era_w,h*0.6,2,fill=1,stroke=0)
            c.setFont(FONT_ITALIC,6.5); c.setFillColor(colors.HexColor('#88cc88'))
            c.drawRightString(w-6*mm-2,h*0.52,era)
        # ID
        c.setFont(FONT_ITALIC,6); c.setFillColor(self.acc)
        c.drawString(6*mm,h*0.16,f'ID: {self.unit.get("id","?")}  |  MOD-READY')

def unit_block(unit, wdb, dark, mid, acc):
    avail = W - 2*MARGIN
    portrait_path = f'{PORTRAIT_DIR}/{unit["id"]}.jpg'
    if not os.path.exists(portrait_path):
        portrait_path = f'{PORTRAIT_DIR}/{unit["id"]}.png'
    has_p = os.path.exists(portrait_path)
    pw = 30*mm if has_p else 0
    sw = avail - pw - (2*mm if has_p else 0)

    elements = [UnitHeader(unit, dark, acc)]

    hp=unit.get('hp',0); speed=unit.get('speed',0)
    armour=unit.get('armour','—').upper(); vision=unit.get('visionRadius',0)
    cost=unit.get('cost',0); bt=unit.get('buildTime',0)
    ac={'LIGHT':colors.HexColor('#5a8a3a'),'MEDIUM':colors.HexColor('#8a7a1a'),
        'HEAVY':colors.HexColor('#6a3a1a')}.get(armour, GREY_MID)

    cw6 = sw/6
    stat_t = Table([
        [Paragraph('<b>HP</b>',ST['stat_label']),Paragraph('<b>ARMOUR</b>',ST['stat_label']),
         Paragraph('<b>SPEED</b>',ST['stat_label']),Paragraph('<b>VISION</b>',ST['stat_label']),
         Paragraph(f'<b>COST</b>',ST['stat_label']),Paragraph('<b>BUILD</b>',ST['stat_label'])],
        [Paragraph(f'<b>{hp}</b>',ST['stat_val']),
         Paragraph(f'<b>{armour}</b>',ParagraphStyle('av',fontName=FONT_BOLD,fontSize=9,textColor=ac)),
         Paragraph(f'<b>{speed}</b>',ST['stat_val']),Paragraph(f'<b>{vision}</b>',ST['stat_val']),
         Paragraph(f'<b>${cost}</b>',ST['stat_val']),Paragraph(f'<b>{bt}s</b>',ST['stat_val'])],
    ], colWidths=[cw6]*6)
    stat_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8e4dc')),
        ('BACKGROUND',(0,1),(-1,1),colors.HexColor('#f5f2ec')),
        ('GRID',(0,0),(-1,-1),0.4,GRID_LINE),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
    ]))

    # Weapons
    wids = unit.get('weapons',[])
    wrows=[[Paragraph('<b>WEAPON</b>',ST['stat_label']),Paragraph('<b>DMG</b>',ST['stat_label']),
            Paragraph('<b>RNG</b>',ST['stat_label']),Paragraph('<b>ROF</b>',ST['stat_label']),
            Paragraph('<b>ACC</b>',ST['stat_label']),Paragraph('<b>AOE</b>',ST['stat_label']),
            Paragraph('<b>TYPE</b>',ST['stat_label'])]]
    if wids:
        for wid in wids:
            ww=wdb.get(wid,{'displayName':wid,'damage':'?','range':'?','rateOfFire':0,'accuracy':0,'category':'?'})
            aoe=f'{ww.get("aoeRadius")}r' if ww.get('aoeRadius') else '—'
            rof=ww.get('rateOfFire',0)
            rofs=f'{rof}s' if rof<1 else f'1/{rof:.0f}s'
            wrows.append([Paragraph(ww.get('displayName',wid),ST['body_small']),
                          Paragraph(f'<b>{ww.get("damage","?")}</b>',ST['body']),
                          Paragraph(str(ww.get('range','?')),ST['body']),
                          Paragraph(rofs,ST['body']),
                          Paragraph(f'{int(ww.get("accuracy",0)*100)}%',ST['body']),
                          Paragraph(aoe,ST['body']),
                          Paragraph(ww.get('category','?').replace('_',' ').title(),ST['body_small'])])
    else:
        wrows.append([Paragraph('UNARMED',ST['body_small'])]+[Paragraph('—',ST['body'])]*6)

    wscale = sw/sum([42,11,10,11,9,9,sw-92*mm])
    wcws=[42*mm*wscale,11*mm*wscale,10*mm*wscale,11*mm*wscale,9*mm*wscale,9*mm*wscale,(sw-92*mm)*wscale]
    wt=Table(wrows,colWidths=wcws)
    wt.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ddd9d0')),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#faf8f4'),colors.HexColor('#f0ede6')]),
        ('GRID',(0,0),(-1,-1),0.3,GRID_LINE),
        ('BOTTOMPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),2),
        ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    # Abilities
    caps=[]
    if unit.get('canEnterTrench'):   caps.append('Trench')
    if unit.get('canGarrison'):      caps.append('Garrison')
    if unit.get('canCapture'):       caps.append('Capture')
    if unit.get('canRepair'):        caps.append('Repair')
    if unit.get('canBuild'):         caps.append('Build')
    if unit.get('canAmbush'):        caps.append('Ambush')
    if unit.get('canTransport'):     caps.append(f'Transport×{unit.get("transportCapacity","?")}')
    if unit.get('crushesInfantry'):  caps.append('CrushInf')
    if unit.get('isHelicopter'):     caps.append(f'Helo(h{unit.get("hoverHeight","?")})')
    if unit.get('isJet'):            caps.append(f'Jet·ammo{unit.get("maxAmmo","?")}')
    if unit.get('isNaval'):          caps.append('Naval')

    vet=unit.get('veterancyThresholds',[])
    vs=f'{vet[0]}/{vet[1]}/{vet[2]} kills' if len(vet)==3 else '—'
    req=unit.get('requiredStructure','—').replace('_',' ').title()
    tags=unit.get('tags',[])

    fr=[
        [Paragraph('<b>ABILITIES</b>',ST['stat_label']),Paragraph('<b>TAGS</b>',ST['stat_label']),
         Paragraph('<b>REQUIRES</b>',ST['stat_label']),Paragraph('<b>VETERANCY</b>',ST['stat_label'])],
        [Paragraph('  '.join(caps) if caps else '—',ST['body_small']),
         Paragraph(' '.join(f'[{t.upper()}]' for t in tags[:5]),ST['body_small']),
         Paragraph(req,ST['body']),Paragraph(vs,ST['body'])],
    ]
    ft=Table(fr,colWidths=[sw*0.35,sw*0.35,sw*0.17,sw*0.13])
    ft.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#ddd9d0')),
        ('BACKGROUND',(0,1),(-1,1),colors.HexColor('#f5f2ec')),
        ('GRID',(0,0),(-1,-1),0.3,GRID_LINE),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),
        ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))

    note=unit.get('note') or unit.get('description','')
    left=[stat_t, wt, ft]
    if note:
        nt=Table([[Paragraph(f'◆ {note}',ST['note_text'])]])
        nt.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#e8e4d8')),
            ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
            ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
            ('BOX',(0,0),(-1,-1),0.5,acc),
        ]))
        left.append(nt)

    if has_p:
        pimg=Image(portrait_path,width=pw,height=pw)
        pimg.hAlign='CENTER'
        pcell=Table([[pimg]],colWidths=[pw])
        pcell.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1),dark),
            ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
            ('LEFTPADDING',(0,0),(-1,-1),2),('RIGHTPADDING',(0,0),(-1,-1),2),
            ('BOX',(0,0),(-1,-1),1,acc),
        ]))
        inner=Table([[t] for t in left],colWidths=[sw])
        inner.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
                                    ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))
        combined=Table([[inner,pcell]],colWidths=[sw,pw+2*mm])
        combined.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),
                                       ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
                                       ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))
        elements.append(combined)
    else:
        for t in left: elements.append(t)

    elements.append(Spacer(1,3*mm))
    return KeepTogether(elements)

# ── WEAPONS DATABASE ──────────────────────────────────────────────────────────
WDB = {
    # Allied
    'rifle_m16':           {'displayName':'M16 Assault Rifle','damage':12,'range':7,'rateOfFire':0.18,'accuracy':0.85,'category':'small_arms'},
    'grenade_m26':         {'displayName':'M26 Frag Grenade','damage':45,'range':4,'rateOfFire':0.8,'accuracy':0.80,'category':'grenade','aoeRadius':2.0},
    'pistol_m1911':        {'displayName':'M1911 Pistol','damage':8,'range':4,'rateOfFire':0.5,'accuracy':0.70,'category':'sidearm'},
    'm72_law':             {'displayName':'M72 LAW','damage':140,'range':8,'rateOfFire':1.5,'accuracy':0.78,'category':'anti_armor'},
    'grenade_launcher_m79':{'displayName':'M79 Grenade Launcher','damage':55,'range':10,'rateOfFire':0.5,'accuracy':0.75,'category':'grenade','aoeRadius':2.5},
    'stinger_fim92':       {'displayName':'FIM-92 Stinger','damage':150,'range':14,'rateOfFire':6.0,'accuracy':0.82,'category':'manpad','aoeRadius':None},
    'm2_browning':         {'displayName':'.50 Cal Browning','damage':30,'range':11,'rateOfFire':0.12,'accuracy':0.82,'category':'heavy_machine_gun'},
    'm60_machinegun':      {'displayName':'M60 Machine Gun','damage':18,'range':9,'rateOfFire':0.10,'accuracy':0.78,'category':'machine_gun'},
    'm60_door_gun':        {'displayName':'M60 Door Gun','damage':16,'range':8,'rateOfFire':0.10,'accuracy':0.72,'category':'machine_gun'},
    'tow_missile':         {'displayName':'TOW ATGM','damage':280,'range':16,'rateOfFire':8.0,'accuracy':0.88,'category':'anti_armor'},
    'cannon_105mm':        {'displayName':'105mm Rifled Cannon','damage':200,'range':10,'rateOfFire':3.0,'accuracy':0.91,'category':'cannon'},
    'cannon_120mm':        {'displayName':'120mm Smoothbore','damage':260,'range':11,'rateOfFire':3.5,'accuracy':0.94,'category':'cannon'},
    'mlrs_rocket_salvo':   {'displayName':'M26 MLRS Rockets','damage':90,'range':24,'rateOfFire':0.3,'accuracy':0.55,'category':'rocket','aoeRadius':6.0},
    'hellfire_missile':    {'displayName':'AGM-114 Hellfire','damage':320,'range':14,'rateOfFire':5.0,'accuracy':0.92,'category':'anti_armor'},
    'm230_chain_gun':      {'displayName':'M230 30mm Chain Gun','damage':22,'range':8,'rateOfFire':0.06,'accuracy':0.80,'category':'cannon'},
    'm3_browning_20mm':    {'displayName':'20mm M3 Browning','damage':25,'range':9,'rateOfFire':0.08,'accuracy':0.78,'category':'cannon'},
    'napalm_bomb':         {'displayName':'Napalm Canister','damage':40,'range':14,'rateOfFire':99,'accuracy':0.65,'category':'bomb','aoeRadius':5.0},
    'gau8_avenger':        {'displayName':'GAU-8 30mm Avenger','damage':45,'range':7,'rateOfFire':0.04,'accuracy':0.88,'category':'cannon'},
    'maverick_agm65':      {'displayName':'AGM-65 Maverick','damage':240,'range':16,'rateOfFire':6.0,'accuracy':0.90,'category':'anti_armor'},
    'aim7_sparrow':        {'displayName':'AIM-7 Sparrow','damage':120,'range':16,'rateOfFire':5.0,'accuracy':0.75,'category':'anti_air'},
    'mk82_bomb_carpet':    {'displayName':'Mk 82 Carpet Bomb','damage':180,'range':16,'rateOfFire':99,'accuracy':0.60,'category':'explosive','aoeRadius':5.5},
    'naval_5inch_gun':     {'displayName':'5"/38 Naval Gun','damage':220,'range':20,'rateOfFire':1.5,'accuracy':0.72,'category':'naval_gun','aoeRadius':3.5},
    'mk44_torpedo':        {'displayName':'Mk 44 Torpedo','damage':400,'range':14,'rateOfFire':8.0,'accuracy':0.80,'category':'torpedo'},
    'rocket_pod_2_75':     {'displayName':'2.75" Rocket Pod','damage':70,'range':12,'rateOfFire':0.4,'accuracy':0.70,'category':'rocket','aoeRadius':3.0},
    # Soviet
    'rifle_ak47':          {'displayName':'AK-47','damage':13,'range':6,'rateOfFire':0.2,'accuracy':0.80,'category':'small_arms'},
    'rifle_ak74':          {'displayName':'AK-74','damage':14,'range':7,'rateOfFire':0.17,'accuracy':0.83,'category':'small_arms'},
    'rifle_ppsh41':        {'displayName':'PPSh-41 SMG','damage':10,'range':5,'rateOfFire':0.08,'accuracy':0.72,'category':'smg'},
    'satchel_charge':      {'displayName':'Satchel Charge','damage':180,'range':2,'rateOfFire':8.0,'accuracy':0.95,'category':'demolition','aoeRadius':3.0},
    'rpg7':                {'displayName':'RPG-7','damage':160,'range':8,'rateOfFire':1.8,'accuracy':0.75,'category':'anti_armor'},
    'strela_2_manpad':     {'displayName':'SA-7 Strela MANPAD','damage':130,'range':12,'rateOfFire':6.0,'accuracy':0.75,'category':'manpad'},
    'cannon_85mm':         {'displayName':'85mm D-5T Cannon','damage':155,'range':8,'rateOfFire':2.5,'accuracy':0.88,'category':'cannon'},
    'cannon_100mm':        {'displayName':'100mm D-10T Cannon','damage':185,'range':9,'rateOfFire':2.8,'accuracy':0.89,'category':'cannon'},
    'cannon_125mm':        {'displayName':'125mm 2A46','damage':245,'range':10,'rateOfFire':3.2,'accuracy':0.91,'category':'cannon'},
    'cannon_73mm':         {'displayName':'73mm 2A28 Grom','damage':90,'range':7,'rateOfFire':1.5,'accuracy':0.78,'category':'cannon'},
    'malyutka_atgm':       {'displayName':'9M14 Malyutka ATGM','damage':200,'range':12,'rateOfFire':7.0,'accuracy':0.72,'category':'anti_armor'},
    'kpvt_14mm':           {'displayName':'KPVT 14.5mm HMG','damage':28,'range':10,'rateOfFire':0.10,'accuracy':0.80,'category':'heavy_machine_gun'},
    'zsu_quad_23mm':       {'displayName':'Quad ZU-23mm','damage':20,'range':9,'rateOfFire':0.05,'accuracy':0.84,'category':'anti_air'},
    'grad_rocket_salvo':   {'displayName':'BM-21 122mm Rockets','damage':85,'range':22,'rateOfFire':0.25,'accuracy':0.50,'category':'rocket','aoeRadius':6.5},
    'n37_cannon':          {'displayName':'N-37 37mm Cannon','damage':40,'range':8,'rateOfFire':0.15,'accuracy':0.72,'category':'cannon'},
    'n23_cannon':          {'displayName':'N-23 23mm Cannon','damage':24,'range':7,'rateOfFire':0.10,'accuracy':0.75,'category':'cannon'},
    'r60_missile':         {'displayName':'R-60 Atoll','damage':100,'range':12,'rateOfFire':5.0,'accuracy':0.70,'category':'anti_air'},
    'r73_missile':         {'displayName':'R-73 Archer','damage':130,'range':14,'rateOfFire':5.0,'accuracy':0.80,'category':'anti_air'},
    'gsh23_cannon':        {'displayName':'GSh-23 Cannon','damage':35,'range':6,'rateOfFire':0.12,'accuracy':0.65,'category':'cannon'},
    'gsh301_cannon':       {'displayName':'GSh-301 30mm','damage':42,'range':7,'rateOfFire':0.05,'accuracy':0.82,'category':'cannon'},
    'gsh302_cannon':       {'displayName':'GSh-2-30 30mm','damage':40,'range':7,'rateOfFire':0.07,'accuracy':0.80,'category':'cannon'},
    'kh25ml_missile':      {'displayName':'Kh-25ML Laser ATGM','damage':220,'range':14,'rateOfFire':6.0,'accuracy':0.88,'category':'anti_armor'},
    's8_rocket_pod':       {'displayName':'S-8 80mm Rocket Pod','damage':75,'range':11,'rateOfFire':0.35,'accuracy':0.68,'category':'rocket','aoeRadius':3.5},
    'yak_b_12mm':          {'displayName':'YakB 12.7mm Minigun','damage':20,'range':9,'rateOfFire':0.05,'accuracy':0.78,'category':'machine_gun'},
    'AT6_spiral_atgm':     {'displayName':'AT-6 Spiral ATGM','damage':300,'range':15,'rateOfFire':7.0,'accuracy':0.85,'category':'anti_armor'},
}

# ── UNIT DATA ─────────────────────────────────────────────────────────────────
ALLIED = [
    {'id':'infantry_rifleman','displayName':'GI Rifleman','category':'infantry','era':'1950–1991','hp':100,'armour':'light','speed':2.2,'visionRadius':6,'cost':150,'buildTime':5,'requiredStructure':'barracks','weapons':['rifle_m16'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture'],'note':'Standard NATO rifle infantry. Transitions from M1 Garand (Korea) to M16 (Vietnam) to M16A2 (Cold War end). Core of any push.'},
    {'id':'infantry_marine','displayName':'Marine Assault','category':'infantry','era':'1950–1991','hp':120,'armour':'light','speed':2.4,'visionRadius':7,'cost':225,'buildTime':6,'requiredStructure':'barracks','weapons':['rifle_m16','grenade_m26'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture','assault'],'note':'Elite assault infantry. Higher HP. Frag grenades as secondary. Amphibious landing capable — natural choice for island and river assaults.'},
    {'id':'infantry_engineer','displayName':'Combat Engineer','category':'infantry','era':'1950–1991','hp':75,'armour':'light','speed':1.8,'visionRadius':5,'cost':300,'buildTime':8,'requiredStructure':'barracks','weapons':['pistol_m1911'],'canEnterTrench':True,'canCapture':True,'canRepair':True,'canBuild':True,'tags':['infantry','light','can_capture','engineer'],'note':'Lays mines, clears minefields, repairs vehicles, builds field fortifications. No combat value alone.'},
    {'id':'infantry_ranger','displayName':'Army Ranger','category':'infantry','era':'1965–1991','hp':110,'armour':'light','speed':2.8,'visionRadius':9,'cost':400,'buildTime':9,'requiredStructure':'barracks','weapons':['rifle_m16','m72_law'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'canAmbush':True,'veterancyThresholds':[2,6,12],'tags':['infantry','light','can_capture','anti_armor','special_forces'],'note':'Special forces. M72 LAW for anti-tank. Ambush capable. Fast and high vision. Expensive but deadly behind enemy lines.'},
    {'id':'infantry_grenadier','displayName':'Grenadier','category':'infantry','era':'1960–1991','hp':90,'armour':'light','speed':2.0,'visionRadius':8,'cost':175,'buildTime':7,'requiredStructure':'barracks','weapons':['grenade_launcher_m79'],'canEnterTrench':True,'canGarrison':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','anti_armor','explosive'],'note':'M79 thumper. Area denial and anti-light-armour. Good for flushing entrenched enemies and garrison clearing.'},
    {'id':'infantry_stinger','displayName':'Stinger Operator','category':'infantry','era':'1981–1991','hp':85,'armour':'light','speed':1.9,'visionRadius':10,'cost':350,'buildTime':8,'requiredStructure':'barracks','weapons':['stinger_fim92'],'canEnterTrench':True,'canGarrison':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','anti_air','manpad'],'note':'FIM-92 Stinger MANPAD. Devastates helicopters and low-altitude jets. Changed warfare — used by Mujahideen vs Soviet Hinds in Afghanistan.'},
    {'id':'vehicle_jeep','displayName':'M151 MUTT Jeep','category':'vehicle','era':'1960–1985','hp':150,'armour':'light','speed':5.0,'visionRadius':8,'cost':300,'buildTime':8,'requiredStructure':'war_factory','weapons':['m60_machinegun'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','light','fast','recon'],'note':'Fast scout. M60 MG. Excellent early-game harass and recon pressure across any terrain.'},
    {'id':'vehicle_hmmwv','displayName':'HMMWV (Humvee)','category':'vehicle','era':'1985–1991','hp':200,'armour':'light','speed':4.8,'visionRadius':9,'cost':400,'buildTime':9,'requiredStructure':'war_factory','weapons':['m2_browning','tow_missile'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','light','fast','recon','anti_armor'],'note':'Multi-role late Cold War. .50 cal + TOW missile. The Jeep\'s heir. Extremely versatile. TOW makes it a tank-killer at range.'},
    {'id':'vehicle_m113','displayName':'M113 APC','category':'vehicle','era':'1960–1991','hp':250,'armour':'medium','speed':3.2,'visionRadius':6,'cost':600,'buildTime':12,'requiredStructure':'war_factory','weapons':['m2_browning'],'canTransport':True,'transportCapacity':5,'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','medium','transport','amphibious'],'note':'Workhorse APC. Korean War to Gulf War. Amphibious capable. Transports 5 infantry. Vulnerable to RPGs.'},
    {'id':'vehicle_m60_tank','displayName':'M60 Patton','category':'vehicle','era':'1960–1991','hp':420,'armour':'heavy','speed':1.8,'visionRadius':6,'cost':850,'buildTime':15,'requiredStructure':'war_factory','weapons':['cannon_105mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked','main_battle_tank'],'note':'NATO standard MBT through most of the Cold War. 105mm rifled cannon. Saw service in Vietnam, Middle East, Korea. Replaced by M1 Abrams late Cold War.'},
    {'id':'vehicle_m1_abrams','displayName':'M1 Abrams','category':'vehicle','era':'1980–1991','hp':600,'armour':'heavy','speed':2.4,'visionRadius':7,'cost':1400,'buildTime':22,'requiredStructure':'war_factory','weapons':['cannon_120mm'],'crushesInfantry':True,'veterancyThresholds':[2,6,12],'tags':['vehicle','heavy','tracked','main_battle_tank','advanced'],'note':'Late Cold War NATO super-tank. Turbine engine — fastest heavy in the game. 120mm smoothbore decisively defeats T-72. The war-winner.'},
    {'id':'vehicle_m270_mlrs','displayName':'M270 MLRS','category':'vehicle','era':'1983–1991','hp':180,'armour':'light','speed':2.0,'visionRadius':5,'cost':1100,'buildTime':18,'requiredStructure':'war_factory','weapons':['mlrs_rocket_salvo'],'crushesInfantry':False,'veterancyThresholds':[3,8,15],'tags':['vehicle','artillery','rocket','area_denial','long_range'],'note':'Multiple Launch Rocket System. Saturation fire across massive range. Slow reload. Pure support — does not engage in direct fire. Enemy will prioritise eliminating this.'},
    {'id':'air_huey','displayName':'UH-1 Huey','category':'air','era':'1959–1991','hp':150,'armour':'light','speed':6.0,'visionRadius':10,'cost':1200,'buildTime':18,'requiredStructure':'helipad','weapons':['m60_door_gun','rocket_pod_2_75'],'isHelicopter':True,'hoverHeight':8,'canTransport':True,'transportCapacity':8,'maxAmmo':20,'rearmTime':10,'veterancyThresholds':[3,8,15],'tags':['air','helicopter','transport','gunship'],'note':'The sound of the Vietnam War. Slicks carry troops. Hogs carry rockets. Both configs loaded here. Cornerstone of air assault doctrine.'},
    {'id':'air_ah64_apache','displayName':'AH-64 Apache','category':'air','era':'1986–1991','hp':250,'armour':'light','speed':5.0,'visionRadius':12,'cost':2200,'buildTime':24,'requiredStructure':'helipad','weapons':['hellfire_missile','m230_chain_gun'],'isHelicopter':True,'hoverHeight':8,'maxAmmo':16,'rearmTime':14,'veterancyThresholds':[2,6,12],'tags':['air','helicopter','anti_armor','gunship','advanced'],'note':'Dedicated tank hunter. Hellfire laser-guided missiles devastate armour. 30mm chain gun for everything else. High priority target — enemy will try to Strela/Stinger this.'},
    {'id':'air_f86_sabre','displayName':'F-86 Sabre','category':'air','era':'1950–1959','hp':160,'armour':'light','speed':8.0,'visionRadius':10,'cost':1400,'buildTime':20,'requiredStructure':'airfield','weapons':['m3_browning_20mm','napalm_bomb'],'isJet':True,'cruiseHeight':10,'maxAmmo':24,'rearmTime':12,'veterancyThresholds':[3,8,15],'tags':['air','jet','korean_war','strike','dogfighter'],'note':'Korean War era. First swept-wing jet dogfighter. Duelled MiG-15 over MiG Alley. Napalm capable. Available in Korean War era maps only.'},
    {'id':'air_f4_phantom','displayName':'F-4 Phantom II','category':'air','era':'1960–1991','hp':200,'armour':'light','speed':10.0,'visionRadius':12,'cost':2000,'buildTime':25,'requiredStructure':'airfield','weapons':['aim7_sparrow','napalm_bomb'],'isJet':True,'cruiseHeight':12,'maxAmmo':30,'rearmTime':15,'veterancyThresholds':[3,8,15],'tags':['air','jet','strike','anti_ground','fast_mover'],'note':'Multi-role workhorse. Vietnam and beyond. AIM-7 air-to-air + napalm ground attack. Most produced US fighter of the era.'},
    {'id':'air_a10_warthog','displayName':'A-10 Warthog','category':'air','era':'1977–1991','hp':280,'armour':'medium','speed':4.5,'visionRadius':11,'cost':2500,'buildTime':28,'requiredStructure':'airfield','weapons':['gau8_avenger','maverick_agm65'],'isJet':True,'cruiseHeight':6,'maxAmmo':40,'rearmTime':16,'veterancyThresholds':[2,6,12],'tags':['air','jet','close_air_support','anti_armor','tank_buster'],'note':'Built around the GAU-8 30mm cannon. Flies lower and slower than any other jet. Titanium tub cockpit — extremely hard to kill. Designed to massacre Soviet tank columns.'},
    {'id':'air_b52','displayName':'B-52 Stratofortress','category':'air','era':'1955–1991','hp':300,'armour':'medium','speed':7.0,'visionRadius':14,'cost':3000,'buildTime':35,'requiredStructure':'airfield','weapons':['mk82_bomb_carpet'],'isJet':True,'cruiseHeight':15,'maxAmmo':50,'rearmTime':20,'veterancyThresholds':[3,8,15],'tags':['air','jet','bomber','carpet_bomb','strategic'],'note':'Arc Light carpet bombing missions. Entire grid squares erased. Win condition unit. Strategic nuclear deterrent used conventionally.'},
    {'id':'naval_patrol_boat','displayName':'PBR Patrol Boat','category':'naval','era':'1966–1991','hp':300,'armour':'light','speed':4.0,'visionRadius':10,'cost':500,'buildTime':12,'requiredStructure':'naval_yard','weapons':['m2_browning','m60_machinegun'],'isNaval':True,'veterancyThresholds':[3,8,15],'tags':['naval','light','fast','river_patrol'],'note':'Patrol Boat River. Twin MGs. Fast, shallow draft. Controls rivers and coastal waterways. Vulnerable to RPGs from shore.'},
    {'id':'naval_destroyer','displayName':'Fletcher-class Destroyer','category':'naval','era':'1943–1970','hp':800,'armour':'medium','speed':3.5,'visionRadius':14,'cost':2000,'buildTime':30,'requiredStructure':'naval_yard','weapons':['naval_5inch_gun','mk44_torpedo'],'isNaval':True,'veterancyThresholds':[2,6,12],'tags':['naval','heavy','shore_bombardment','anti_naval'],'note':'WWII-era destroyer still active through Korea and Vietnam. 5-inch guns provide devastating shore bombardment. Torpedoes for ship-to-ship. Naval supremacy.'},
]

SOVIET = [
    {'id':'infantry_conscript','displayName':'Soviet Conscript','category':'infantry','era':'1950–1991','hp':90,'armour':'light','speed':2.2,'visionRadius':5,'cost':80,'buildTime':4,'requiredStructure':'barracks','weapons':['rifle_ak47'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'veterancyThresholds':[4,10,20],'tags':['infantry','light','can_capture','mass_production'],'note':'Cheap, numerous. Quantity is its own quality. Attrition doctrine — lose three, replace five. Higher vet thresholds reflect mass replacements rather than individual skill.'},
    {'id':'infantry_vietcong','displayName':'Viet Cong','category':'infantry','era':'1959–1975','hp':80,'armour':'light','speed':2.8,'visionRadius':6,'cost':75,'buildTime':4,'requiredStructure':'barracks','weapons':['rifle_ak47'],'canEnterTrench':True,'canGarrison':True,'canAmbush':True,'canCapture':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','can_capture','guerrilla'],'note':'Guerrilla fighter. Ambush bonus from jungle/trench. Built tunnels, fought from the inside out. Cheapest combat unit in game. Swarm effectively.'},
    {'id':'infantry_north_korean','displayName':'NK Assault Infantry','category':'infantry','era':'1950–1953','hp':95,'armour':'light','speed':2.3,'visionRadius':5,'cost':70,'buildTime':3,'requiredStructure':'barracks','weapons':['rifle_ppsh41','satchel_charge'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'veterancyThresholds':[4,10,20],'tags':['infantry','light','can_capture','korean_war'],'note':'PPSh-41 — devastating at close range in mass assaults. Satchel charges for structure demolition. Terrified Allied forces during the Naktong Bulge offensive.'},
    {'id':'infantry_spetsnaz','displayName':'Spetsnaz','category':'infantry','era':'1950–1991','hp':130,'armour':'light','speed':3.0,'visionRadius':10,'cost':500,'buildTime':10,'requiredStructure':'barracks','weapons':['rifle_ak74','rpg7'],'canEnterTrench':True,'canGarrison':True,'canCapture':True,'canAmbush':True,'veterancyThresholds':[2,5,10],'tags':['infantry','light','special_forces','anti_armor','can_capture'],'note':'Soviet special forces. AK-74 + RPG-7. Highest base stats of any infantry. Excellent behind enemy lines. Very expensive — protect them.'},
    {'id':'infantry_rpg_crew','displayName':'RPG Crew','category':'infantry','era':'1960–1991','hp':85,'armour':'light','speed':2.0,'visionRadius':7,'cost':200,'buildTime':6,'requiredStructure':'barracks','weapons':['rpg7'],'canEnterTrench':True,'canGarrison':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','anti_armor','anti_air_light'],'note':'RPG-7 anti-tank team. Effective vs APCs, helicopters, and light vehicles. Can penetrate medium armour at close range. Devastating from trench positions.'},
    {'id':'infantry_strela_aa','displayName':'Strela AA Team','category':'infantry','era':'1968–1991','hp':80,'armour':'light','speed':1.8,'visionRadius':11,'cost':280,'buildTime':7,'requiredStructure':'barracks','weapons':['strela_2_manpad'],'canEnterTrench':True,'veterancyThresholds':[3,8,15],'tags':['infantry','light','anti_air','manpad'],'note':'SA-7 Grail MANPAD. Soviet Stinger equivalent. Effective vs helicopters and low-fast jets. Proliferated through proxy armies — the bane of Allied helicopter crews.'},
    {'id':'vehicle_bt7_tank','displayName':'T-34/85','category':'vehicle','era':'1950–1953','hp':320,'armour':'heavy','speed':2.2,'visionRadius':5,'cost':600,'buildTime':12,'requiredStructure':'war_factory','weapons':['cannon_85mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked','korean_war'],'note':'Korean War Soviet tank supplied to North Korea. Shocked Allied forces in 1950 — outclassed everything they had. Fast, reliable WWII design still lethal in 1950.'},
    {'id':'vehicle_t55','displayName':'T-55','category':'vehicle','era':'1958–1991','hp':380,'armour':'heavy','speed':1.9,'visionRadius':5,'cost':750,'buildTime':13,'requiredStructure':'war_factory','weapons':['cannon_100mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked'],'note':'The most widely exported tank in history. Used across Africa, Middle East, Asia. Vietnam, Yom Kippur, Angola, Ethiopia. 100mm cannon. Workhorse of Soviet proxy strategy.'},
    {'id':'vehicle_t72','displayName':'T-72','category':'vehicle','era':'1973–1991','hp':500,'armour':'heavy','speed':2.0,'visionRadius':6,'cost':1000,'buildTime':17,'requiredStructure':'war_factory','weapons':['cannon_125mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','heavy','tracked','main_battle_tank'],'note':'Soviet MBT of the mid-to-late Cold War. Auto-loader means faster fire rate. 125mm smoothbore. Matched M60 and later challenged by M1 Abrams.'},
    {'id':'vehicle_btr60','displayName':'BTR-60 APC','category':'vehicle','era':'1961–1991','hp':220,'armour':'medium','speed':3.5,'visionRadius':6,'cost':500,'buildTime':10,'requiredStructure':'war_factory','weapons':['kpvt_14mm'],'canTransport':True,'transportCapacity':8,'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','medium','transport','amphibious'],'note':'Eight-wheeled APC. Amphibious. KPVT 14.5mm HMG. Carries 8 infantry. Used across every Soviet proxy conflict. Fast and reliable.'},
    {'id':'vehicle_bmp1','displayName':'BMP-1 IFV','category':'vehicle','era':'1966–1991','hp':280,'armour':'medium','speed':3.0,'visionRadius':7,'cost':700,'buildTime':14,'requiredStructure':'war_factory','weapons':['cannon_73mm','malyutka_atgm'],'canTransport':True,'transportCapacity':8,'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','medium','transport','anti_armor','ifv'],'note':'World\'s first true IFV. 73mm + Malyutka ATGM. Can fight while transporting troops. Yom Kippur, Afghanistan, Angola. Lethal combo of mobility and firepower.'},
    {'id':'vehicle_zsu23_aa','displayName':'ZSU-23-4 Shilka','category':'vehicle','era':'1965–1991','hp':200,'armour':'light','speed':2.0,'visionRadius':10,'cost':800,'buildTime':14,'requiredStructure':'war_factory','weapons':['zsu_quad_23mm'],'crushesInfantry':True,'veterancyThresholds':[3,8,15],'tags':['vehicle','anti_air','tracked','area_denial'],'note':'Quad 23mm radar-guided AA. Feared by all Allied pilots. Also shreds infantry. Proximity to frontline required — radar-guided makes it deadly at medium altitude.'},
    {'id':'vehicle_grad_mlrs','displayName':'BM-21 Grad','category':'vehicle','era':'1963–1991','hp':160,'armour':'light','speed':2.2,'visionRadius':5,'cost':950,'buildTime':16,'requiredStructure':'war_factory','weapons':['grad_rocket_salvo'],'crushesInfantry':False,'veterancyThresholds':[3,8,15],'tags':['vehicle','artillery','rocket','area_denial','long_range'],'note':'40-tube 122mm rocket artillery. Ripple fire saturates entire grid squares. Slow reload. Widely exported — used in every major proxy conflict since 1963.'},
    {'id':'air_mig15','displayName':'MiG-15 Fagot','category':'air','era':'1950–1960','hp':140,'armour':'light','speed':8.5,'visionRadius':8,'cost':1200,'buildTime':18,'requiredStructure':'airfield','weapons':['n37_cannon','n23_cannon'],'isJet':True,'cruiseHeight':10,'maxAmmo':20,'rearmTime':12,'veterancyThresholds':[3,8,15],'tags':['air','jet','korean_war','dogfighter','interceptor'],'note':'Korean War shock. Outperformed Allied piston and early jet aircraft. Twin cannon armament. Fought F-86 Sabre over MiG Alley. The jet that changed everything.'},
    {'id':'air_mig21','displayName':'MiG-21 Fishbed','category':'air','era':'1959–1991','hp':180,'armour':'light','speed':11.0,'visionRadius':10,'cost':1800,'buildTime':22,'requiredStructure':'airfield','weapons':['r60_missile','gsh23_cannon'],'isJet':True,'cruiseHeight':11,'maxAmmo':24,'rearmTime':14,'veterancyThresholds':[3,8,15],'tags':['air','jet','interceptor','anti_air','fast_mover'],'note':'Most-produced supersonic jet in history. Vietnam, Middle East, Africa, Asia. Faster than F-4 but shorter range. Counter with numbers or manoeuvre.'},
    {'id':'air_mig29','displayName':'MiG-29 Fulcrum','category':'air','era':'1983–1991','hp':220,'armour':'light','speed':12.0,'visionRadius':13,'cost':2400,'buildTime':28,'requiredStructure':'airfield','weapons':['r73_missile','r60_missile','gsh301_cannon'],'isJet':True,'cruiseHeight':13,'maxAmmo':28,'rearmTime':16,'veterancyThresholds':[2,6,12],'tags':['air','jet','air_superiority','anti_air','advanced'],'note':'Late Cold War Soviet supremacy fighter. Helmet-mounted sight — off-boresight shots. Extremely agile. Fastest unit in the game. Counters F-15/F-16 era aircraft decisively.'},
    {'id':'air_su25_frogfoot','displayName':'Su-25 Frogfoot','category':'air','era':'1981–1991','hp':260,'armour':'medium','speed':4.8,'visionRadius':10,'cost':2100,'buildTime':24,'requiredStructure':'airfield','weapons':['gsh302_cannon','kh25ml_missile','s8_rocket_pod'],'isJet':True,'cruiseHeight':5,'maxAmmo':36,'rearmTime':14,'veterancyThresholds':[2,6,12],'tags':['air','jet','close_air_support','anti_armor','afghanistan'],'note':'Soviet A-10 equivalent. Built for Afghanistan close air support. Titanium armoured cockpit. Slower and lower than MiGs — perfect for hunting armour and infantry.'},
    {'id':'air_mi24_hind','displayName':'Mi-24 Hind','category':'air','era':'1972–1991','hp':300,'armour':'medium','speed':5.5,'visionRadius':11,'cost':2000,'buildTime':22,'requiredStructure':'helipad','weapons':['yak_b_12mm','AT6_spiral_atgm','s8_rocket_pod'],'isHelicopter':True,'hoverHeight':7,'canTransport':True,'transportCapacity':8,'maxAmmo':24,'rearmTime':14,'veterancyThresholds':[2,6,12],'tags':['air','helicopter','gunship','transport','anti_armor','advanced'],'note':'Flying tank. Only gunship that also transports 8 troops. Dominated Afghanistan. Heavy armour, multiple weapons. Allied pilots call it Devil\'s Chariot. Countered by Stinger.'},
]

SUPPORT = [
    {'id':'harvester_vehicle','displayName':'Ore Collector','category':'vehicle','era':'N/A','hp':150,'armour':'light','speed':2.5,'visionRadius':4,'cost':0,'buildTime':8,'requiredStructure':'refinery','weapons':[],'tags':['harvester'],'description':'Autonomous ore collector. Cannot attack. Auto-assigned on refinery completion. Replaceable at zero cost. Economy engine.'},
]

# ── BUILD PDF ─────────────────────────────────────────────────────────────────
out = '/app/driftgate_unit_brief.pdf'
current = {'dark':ALLIED_DARK,'mid':ALLIED_MID,'acc':ALLIED_ACC}

frame = Frame(MARGIN,14*mm,W-2*MARGIN,H-14*mm-24*mm,id='main')

def on_page(canv,doc):
    if doc.page==1: draw_cover(canv,doc)
    else: draw_page_bg(canv,doc,current['dark'],current['mid'],current['acc'])

doc=BaseDocTemplate(out,pagesize=A4,leftMargin=MARGIN,rightMargin=MARGIN,topMargin=24*mm,bottomMargin=14*mm)
pt=PageTemplate(id='main',frames=[frame],onPage=on_page)
doc.addPageTemplates([pt])

story=[]
# Cover
story.append(Spacer(1,H-48*mm)); story.append(PageBreak())

# TOC
current.update({'dark':NEUTRAL_DARK,'mid':NEUTRAL_MID,'acc':NEUTRAL_ACC})
story.append(Paragraph('TABLE OF CONTENTS',ParagraphStyle('th',fontName=FONT_BOLD,fontSize=16,textColor=NEUTRAL_DARK,spaceAfter=4)))
story.append(HRFlowable(width='100%',thickness=1.5,color=NEUTRAL_ACC,spaceAfter=3*mm))
toc=[
    ('ALLIED / NATO COMMAND',[
        ('GI Rifleman','Core NATO infantry. M16. Can capture. The backbone.'),
        ('Marine Assault','Elite. M16 + frag grenades. Amphibious capable.'),
        ('Combat Engineer','Build, repair, capture. Mines and fortifications.'),
        ('Army Ranger','Special forces. M72 LAW. Ambush. High vision.'),
        ('Grenadier','M79 thumper. Area denial. Anti-light-armour.'),
        ('Stinger Operator','FIM-92 MANPAD. Counters helicopters and low jets.'),
        ('M151 MUTT Jeep','Fast recon. M60 MG. Early game pressure.'),
        ('HMMWV Humvee','Multi-role. .50 cal + TOW missile. Versatile.'),
        ('M113 APC','Medium APC. .50 cal. Transports 5. Amphibious.'),
        ('M60 Patton','NATO standard MBT. 105mm. Cold War backbone.'),
        ('M1 Abrams','Late CW super-tank. 120mm. Turbine. War winner.'),
        ('M270 MLRS','Rocket artillery. Saturation fire. Massive range.'),
        ('UH-1 Huey','Transport gunship. The sound of the Cold War.'),
        ('AH-64 Apache','Dedicated tank killer. Hellfire + 30mm.'),
        ('F-86 Sabre','Korean War jet. MiG Alley. Napalm + 20mm.'),
        ('F-4 Phantom II','Multi-role. Sparrow + napalm. Vietnam era.'),
        ('A-10 Warthog','Tank buster. GAU-8. Titanium cockpit. Slow/low.'),
        ('B-52 Stratofortress','Strategic bomber. Carpet bomb. Win condition.'),
        ('PBR Patrol Boat','River patrol. Twin MGs. Water control.'),
        ('Fletcher Destroyer','Shore bombardment. 5" guns + torpedoes.'),
    ]),
    ('WARSAW PACT / SOVIET FORCES',[
        ('Soviet Conscript','Mass infantry. AK-47. Cheap. Overwhelm by numbers.'),
        ('Viet Cong','Guerrilla. Ambush. Cheapest combat unit. Jungle specialist.'),
        ('NK Assault Infantry','Korean War. PPSh-41. Satchel charges. Mass assault.'),
        ('Spetsnaz','Special forces. AK-74 + RPG. Ambush. Very expensive.'),
        ('RPG Crew','RPG-7. Anti-armour and anti-helo team.'),
        ('Strela AA Team','SA-7 MANPAD. Counters Allied helicopters.'),
        ('T-34/85','Korean War tank. Shocked Allied forces 1950.'),
        ('T-55','Most exported tank ever. Global proxy warfare.'),
        ('T-72','Soviet MBT. 125mm autoloader. Mid-to-late CW.'),
        ('BTR-60 APC','Wheeled APC. Amphibious. 8 troops. Fast.'),
        ('BMP-1 IFV','World\'s first IFV. 73mm + ATGM. Fight and carry.'),
        ('ZSU-23-4 Shilka','Quad 23mm AA. Radar guided. Pilot nightmare.'),
        ('BM-21 Grad','40-tube rocket artillery. Massive area saturation.'),
        ('MiG-15 Fagot','Korean War shock. MiG Alley. Twin cannon.'),
        ('MiG-21 Fishbed','Most-produced supersonic jet. Global proxy.'),
        ('MiG-29 Fulcrum','Late CW air superiority. Off-boresight shots.'),
        ('Su-25 Frogfoot','CAS jet. Afghanistan. Titanium cockpit. Tank hunter.'),
        ('Mi-24 Hind','Flying tank. Gunship + transport. Devil\'s Chariot.'),
    ]),
    ('SUPPORT',[('Ore Collector','Autonomous harvester. Economy engine.')]),
]
for fn,units in toc:
    story.append(Paragraph(fn,ST['toc_faction']))
    for un,ud in units:
        story.append(Paragraph(f'<b>{un}</b> — {ud}',ST['toc_entry']))
    story.append(Spacer(1,2*mm))
story.append(PageBreak())

# Allied
current.update({'dark':ALLIED_DARK,'mid':ALLIED_MID,'acc':ALLIED_ACC})
story.append(FactionDivider('ALLIED / NATO COMMAND','United States & NATO Combined Arms · 1950–1991','Korea · Vietnam · Europe · Afghanistan',ALLIED_DARK,ALLIED_MID,ALLIED_ACC))
story.append(Spacer(1,3*mm))
for u in ALLIED:
    story.append(unit_block(u,WDB,ALLIED_DARK,ALLIED_MID,ALLIED_ACC))
story.append(PageBreak())

# Soviet
current.update({'dark':SOVIET_DARK,'mid':SOVIET_MID,'acc':SOVIET_ACC})
story.append(FactionDivider('WARSAW PACT / SOVIET','Red Army · Proxy Forces · Client States · 1950–1991','Korea · Vietnam · Angola · Afghanistan · Middle East',SOVIET_DARK,SOVIET_MID,SOVIET_ACC))
story.append(Spacer(1,3*mm))
for u in SOVIET:
    story.append(unit_block(u,WDB,SOVIET_DARK,SOVIET_MID,SOVIET_ACC))
story.append(PageBreak())

# Support
current.update({'dark':NEUTRAL_DARK,'mid':NEUTRAL_MID,'acc':NEUTRAL_ACC})
story.append(FactionDivider('SUPPORT & LOGISTICS','Shared Economy Infrastructure','Non-Combat',NEUTRAL_DARK,NEUTRAL_MID,NEUTRAL_ACC))
story.append(Spacer(1,3*mm))
for u in SUPPORT:
    story.append(unit_block(u,WDB,NEUTRAL_DARK,NEUTRAL_MID,NEUTRAL_ACC))

# Weapons appendix
story.append(PageBreak())
current.update({'dark':NEUTRAL_DARK,'mid':NEUTRAL_MID,'acc':NEUTRAL_ACC})
story.append(Paragraph('APPENDIX A — WEAPONS REFERENCE',ParagraphStyle('ah',fontName=FONT_BOLD,fontSize=13,textColor=NEUTRAL_DARK,spaceAfter=4)))
story.append(HRFlowable(width='100%',thickness=1,color=NEUTRAL_ACC,spaceAfter=2*mm))
aw=W-2*MARGIN
wrows=[[Paragraph('<b>WEAPON</b>',ST['stat_label']),Paragraph('<b>DMG</b>',ST['stat_label']),
        Paragraph('<b>RNG</b>',ST['stat_label']),Paragraph('<b>ROF</b>',ST['stat_label']),
        Paragraph('<b>ACC</b>',ST['stat_label']),Paragraph('<b>AOE</b>',ST['stat_label']),
        Paragraph('<b>TYPE</b>',ST['stat_label'])]]
for wid,ww in WDB.items():
    aoe=str(ww.get('aoeRadius','—')) if ww.get('aoeRadius') else '—'
    rof=ww.get('rateOfFire',0)
    wrows.append([Paragraph(ww.get('displayName',wid),ST['body_small']),
                  Paragraph(f'<b>{ww.get("damage","?")}</b>',ST['body']),
                  Paragraph(str(ww.get('range','?')),ST['body']),
                  Paragraph(str(rof),ST['body']),
                  Paragraph(f'{int(ww.get("accuracy",0)*100)}%',ST['body']),
                  Paragraph(aoe,ST['body']),
                  Paragraph(ww.get('category','?').replace('_',' ').title(),ST['body_small'])])
wcws=[40*mm,10*mm,10*mm,11*mm,9*mm,10*mm,aw-90*mm]
wt2=Table(wrows,colWidths=wcws)
wt2.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#d0cdc4')),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#faf8f4'),colors.HexColor('#f0ede6')]),
    ('GRID',(0,0),(-1,-1),0.3,GRID_LINE),
    ('BOTTOMPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),2),
    ('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
]))
story.append(wt2)
story.append(Spacer(1,5*mm))
story.append(Paragraph('END OF DOCUMENT — DRIFTGATE STUDIOS INTERNAL USE ONLY · COLD WAR EDITION · MOD-READY',
    ParagraphStyle('end',fontName=FONT_BOLD,fontSize=7.5,textColor=GREY_MID,alignment=TA_CENTER)))

doc.build(story)
import os; sz=os.path.getsize(out)
print(f'PDF: {out} ({sz//1024}KB)')
