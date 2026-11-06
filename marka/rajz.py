import math
INK='#13312A'; RED='#B3261E'; PAP='#E9EEE5'
W=16
MUTATO=False
def glyphs(ink=INK, red=RED):
    p=[]
    # a
    cx=48; p.append(f'<circle cx="{cx}" cy="152" r="40"/><path d="M{cx+40} 112V192"/>')
    # u
    x=126; p.append(f'<path d="M{x} 112V152A40 40 0 0 0 {x+80} 152M{x+80} 112V192"/>')
    # t
    x=264; p.append(f'<path d="M{x} 76V160A32 32 0 0 0 {x+32} 192M{x-24} 112H{x+32}"/>')
    # ó
    cx=368; p.append(f'<circle cx="{cx}" cy="152" r="40"/>')
    a=math.radians(64); x1=cx+60*math.cos(a); y1=152-60*math.sin(a); x2=cx+88*math.cos(a); y2=152-88*math.sin(a)
    acc=f'<path d="M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}" stroke="{red}"/>'
    if MUTATO:
        ex=cx+20*math.cos(a); ey=152-20*math.sin(a)
        acc+=f'<path d="M{cx} 152L{ex:.1f} {ey:.1f}" stroke="{red}" stroke-width="9"/><circle cx="{cx}" cy="152" r="8" fill="{red}" stroke="none"/>'
    # z
    x=444; p.append(f'<path d="M{x} 112H{x+72}L{x} 192H{x+72}"/>')
    # o
    cx=590; p.append(f'<circle cx="{cx}" cy="152" r="40"/>')
    # m
    x=668; p.append(f'<path d="M{x} 192V112M{x} 144A32 32 0 0 1 {x+64} 144V192M{x+64} 144A32 32 0 0 1 {x+128} 144V192"/>')
    return f'<g fill="none" stroke="{ink}" stroke-width="{W}" stroke-linecap="round" stroke-linejoin="round">{"".join(p)}{acc}</g>'

def szokep(ink=INK, red=RED, bg=None):
    b=f'<rect x="-40" y="16" width="884" height="232" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 16 884 232">{b}{glyphs(ink,red)}</svg>'

def szimbolum(ink=INK, red=RED, bg=None, rx=0, keret=200):
    # számlap (az ó köre) és a mutató a középpontból, az ékezet irányában
    cx, cy = 92, 118; a=math.radians(60)
    x2=cx+92*math.cos(a); y2=cy-92*math.sin(a)
    b=f'<rect width="{keret}" height="{keret}" rx="{rx}" fill="{bg}"/>' if bg else ''
    s=(keret-200)/2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {keret} {keret}">{b}<g transform="translate({s} {s})" fill="none" stroke-width="{W*1.5}" stroke-linecap="round">'
            f'<circle cx="{cx}" cy="{cy}" r="60" stroke="{ink}"/>'
            f'<path d="M{cx} {cy}L{x2+ (x2-cx)*0.38:.1f} {y2+(y2-cy)*0.38:.1f}" stroke="{red}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{W*0.9}" fill="{red}" stroke="none"/></g></svg>')

open('szokep.svg','w').write(szokep())
open('szokep-sotet.svg','w').write(szokep(PAP, '#E0574C', '#0F2621'))
open('szimbolum.svg','w').write(szimbolum())
open('ikon.svg','w').write(szimbolum(PAP, '#E0574C', INK, rx=44, keret=240))

def szimbolum_b(ink=INK, red=RED, bg=None, rx=0, keret=200):
    # Az „ó” betű önmagában: számlap-kör, a mutató csak a körön belül, az ékezet kívül, ugyanazon az egyenesen
    cx, cy = 100, 116; a=math.radians(64); w=W*1.5; r=58
    pt=lambda d:(cx+d*math.cos(a), cy-d*math.sin(a))
    b=f'<rect width="{keret}" height="{keret}" rx="{rx}" fill="{bg}"/>' if bg else ''
    s=(keret-200)/2
    i1,i2=pt(0),pt(r-w*0.5-10); k1,k2=pt(r+w*0.5+12),pt(r+w*0.5+12+30)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {keret} {keret}">{b}<g transform="translate({s} {s})" fill="none" stroke-width="{w}" stroke-linecap="round">'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" stroke="{ink}"/>'
            f'<path d="M{i1[0]:.1f} {i1[1]:.1f}L{i2[0]:.1f} {i2[1]:.1f}" stroke="{red}" stroke-width="{w*0.6:.1f}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{w*0.55:.1f}" fill="{red}" stroke="none"/>'
            f'<path d="M{k1[0]:.1f} {k1[1]:.1f}L{k2[0]:.1f} {k2[1]:.1f}" stroke="{red}"/></g></svg>')
def szimbolum_c(ink=INK, red=RED, bg=None, rx=0, keret=200):
    # Csak a betű: kör és piros ékezet
    cx, cy = 100, 116; a=math.radians(64); w=W*1.6; r=56
    pt=lambda d:(cx+d*math.cos(a), cy-d*math.sin(a))
    b=f'<rect width="{keret}" height="{keret}" rx="{rx}" fill="{bg}"/>' if bg else ''
    s=(keret-200)/2
    k1,k2=pt(r+w*0.5+12),pt(r+w*0.5+12+30)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {keret} {keret}">{b}<g transform="translate({s} {s})" fill="none" stroke-width="{w}" stroke-linecap="round">'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" stroke="{ink}"/>'
            f'<path d="M{k1[0]:.1f} {k1[1]:.1f}L{k2[0]:.1f} {k2[1]:.1f}" stroke="{red}"/></g></svg>')
open('szokep.svg','w').write(szokep())
open('b.svg','w').write(szimbolum_b()); open('b-ikon.svg','w').write(szimbolum_b(PAP,'#E0574C',INK,44,240))
open('c.svg','w').write(szimbolum_c()); open('c-ikon.svg','w').write(szimbolum_c(PAP,'#E0574C',INK,44,240))

MUTATO=True
open('szokep-mutato.svg','w').write(szokep())
MUTATO=False
