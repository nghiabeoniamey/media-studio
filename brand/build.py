"""Generate brand SVGs (avatar 1024x1024 + horizontal lockup 1800x600) for each niche/series.
Run: python3 brand/build.py && bash brand/render.sh   (PNG export uses headless Chromium)."""
import os

SERIF = "'DejaVu Serif','Liberation Serif',Georgia,serif"
SANS = "Inter,'DejaVu Sans',Arial,sans-serif"

def ring(bg, ring_color):
    return f'<circle cx="512" cy="512" r="500" fill="{bg}"/><circle cx="512" cy="512" r="468" fill="none" stroke="{ring_color}" stroke-width="14"/>'

BRANDS = {
  "shepherds-lamp": {
    "name": "Shepherd's Lamp", "tagline": "Bible stories, brought to light",
    "bg": "#13213B", "fg": "#F4E9D0", "accent": "#E3B04B", "font": SERIF,
    "defs": '''<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE7A3" stop-opacity=".85"/><stop offset="1" stop-color="#FFE7A3" stop-opacity="0"/></radialGradient>
      <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".55" stop-color="#F5B83D"/><stop offset="1" stop-color="#D9772B"/></linearGradient>
      <linearGradient id="clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B866"/><stop offset="1" stop-color="#B9792F"/></linearGradient>''',
    "emblem": '''<circle cx="512" cy="400" r="210" fill="url(#glow)"/>
      <g stroke="#E3B04B" stroke-width="10" stroke-linecap="round" opacity=".8">
        <line x1="512" y1="168" x2="512" y2="210"/><line x1="352" y1="236" x2="382" y2="266"/><line x1="672" y1="236" x2="642" y2="266"/>
        <line x1="296" y1="392" x2="338" y2="392"/><line x1="728" y1="392" x2="686" y2="392"/></g>
      <path d="M512 250 C566 330 594 384 562 446 C547 474 526 486 512 486 C498 486 477 474 462 446 C430 384 458 330 512 250 Z" fill="url(#flame)"/>
      <path d="M512 352 C534 392 542 420 528 448 C522 460 516 464 512 464 C508 464 502 460 496 448 C482 420 490 392 512 352 Z" fill="#FFF8E1"/>
      <path d="M268 612 Q268 540 380 528 L700 528 Q790 536 812 572 Q790 600 742 610 Q720 690 620 712 L404 712 Q268 700 268 612 Z" fill="url(#clay)"/>
      <ellipse cx="512" cy="560" rx="70" ry="16" fill="#7A4A1C" opacity=".55"/>
      <path d="M268 600 Q210 600 214 650 Q220 700 300 690" fill="none" stroke="#C88A3C" stroke-width="22" stroke-linecap="round"/>
      <rect x="404" y="712" width="216" height="26" rx="12" fill="#A4682A"/>
      <path d="M512 488 L512 528" stroke="#7A4A1C" stroke-width="10"/>''',
  },
  "saints-and-faith": {
    "name": "Saints & Faith", "tagline": "Catholic stories of holiness",
    "bg": "#1C2E57", "fg": "#F3ECDD", "accent": "#D9B45A", "font": SERIF,
    "defs": '<radialGradient id="petal" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#E3584B"/><stop offset="1" stop-color="#9E2330"/></radialGradient>',
    "emblem": '''<g fill="#D9B45A"><rect x="496" y="170" width="32" height="150" rx="6"/><rect x="448" y="214" width="128" height="30" rx="6"/></g>
      <path d="M512 840 C506 760 520 700 512 640" stroke="#3E7D4F" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M512 760 C450 740 420 700 412 660 C470 668 500 700 512 740 Z" fill="#4E9A62"/>
      <path d="M512 720 C574 700 604 660 612 620 C554 628 524 660 512 700 Z" fill="#4E9A62"/>
      <g transform="translate(512 520)">
        <g fill="url(#petal)">
          <ellipse cx="0" cy="-92" rx="92" ry="78"/><ellipse cx="88" cy="-28" rx="92" ry="78"/><ellipse cx="54" cy="76" rx="92" ry="78"/>
          <ellipse cx="-54" cy="76" rx="92" ry="78"/><ellipse cx="-88" cy="-28" rx="92" ry="78"/></g>
        <circle r="72" fill="#B52A35"/><path d="M-40 0 C-30 -46 30 -46 40 0 C30 40 -30 40 -40 0 Z" fill="#7E1724"/>
        <circle r="18" fill="#D9B45A"/></g>''',
  },
  "whisker-tales": {
    "name": "Whisker Tales", "tagline": "Cozy 3D kitten adventures",
    "bg": "#FFF3DF", "fg": "#5A3415", "accent": "#F29A2E", "font": SANS,
    "defs": '<radialGradient id="fur" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#FFC170"/><stop offset="1" stop-color="#EE8A1F"/></radialGradient>',
    "emblem": '''<path d="M300 430 L330 200 L470 340 Z" fill="#EE8A1F"/><path d="M724 430 L694 200 L554 340 Z" fill="#EE8A1F"/>
      <path d="M332 390 L346 262 L430 346 Z" fill="#FFB6A8"/><path d="M692 390 L678 262 L594 346 Z" fill="#FFB6A8"/>
      <ellipse cx="512" cy="560" rx="270" ry="236" fill="url(#fur)"/>
      <path d="M512 330 C496 380 528 380 512 430" stroke="#D9731A" stroke-width="16" fill="none" stroke-linecap="round"/>
      <ellipse cx="412" cy="540" rx="58" ry="70" fill="#2B1A10"/><ellipse cx="612" cy="540" rx="58" ry="70" fill="#2B1A10"/>
      <circle cx="432" cy="512" r="20" fill="#fff"/><circle cx="632" cy="512" r="20" fill="#fff"/>
      <circle cx="396" cy="566" r="9" fill="#fff"/><circle cx="596" cy="566" r="9" fill="#fff"/>
      <path d="M492 622 L532 622 L512 646 Z" fill="#E86A7A"/>
      <path d="M512 646 C504 676 476 680 462 664 M512 646 C520 676 548 680 562 664" stroke="#5A3415" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g stroke="#5A3415" stroke-width="7" stroke-linecap="round" opacity=".75">
        <line x1="330" y1="620" x2="210" y2="600"/><line x1="330" y1="645" x2="214" y2="660"/>
        <line x1="694" y1="620" x2="814" y2="600"/><line x1="694" y1="645" x2="810" y2="660"/></g>
      <ellipse cx="350" cy="640" rx="34" ry="20" fill="#FF8FA0" opacity=".45"/><ellipse cx="674" cy="640" rx="34" ry="20" fill="#FF8FA0" opacity=".45"/>''',
  },
  "lives-in-ink": {
    "name": "Lives in Ink", "tagline": "Illustrated stories of remarkable people",
    "bg": "#1E2227", "fg": "#EFE6D6", "accent": "#C9A27C", "font": SERIF,
    "defs": '<linearGradient id="quill" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#D9C7A8"/><stop offset="1" stop-color="#FBF6EC"/></linearGradient>',
    "emblem": '''<g transform="translate(36 -78)"><path d="M380 770 C430 600 560 400 780 230 C760 330 700 420 640 470 C690 470 720 450 744 432 C700 540 600 640 470 700 C500 690 540 690 566 676 C520 720 450 750 380 770 Z" fill="url(#quill)"/>
      <path d="M380 770 C480 600 610 420 760 260" stroke="#8C6A48" stroke-width="7" fill="none"/>
      <path d="M380 770 L346 840 L392 790 Z" fill="#C9A27C"/>
      <path d="M334 860 C334 860 300 900 300 924 C300 944 316 958 334 958 C352 958 368 944 368 924 C368 900 334 860 334 860 Z" fill="#C9A27C"/>
      <path d="M250 300 C300 270 350 300 400 270" stroke="#C9A27C" stroke-width="6" fill="none" opacity=".6"/>
      <path d="M230 360 C290 330 340 360 400 330" stroke="#C9A27C" stroke-width="6" fill="none" opacity=".4"/></g>''',
  },
}

def avatar(b):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs>{b["defs"]}</defs>{ring(b["bg"], b["accent"])}{b["emblem"]}</svg>'''

def lockup(b):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="600" viewBox="0 0 1800 600">
<defs>{b["defs"]}</defs><rect width="1800" height="600" rx="48" fill="{b["bg"]}"/>
<g transform="translate(60 60) scale(.469)">{ring(b["bg"], b["accent"])}{b["emblem"]}</g>
<text x="620" y="300" font-family="{b["font"]}" font-weight="700" font-size="{min(126, int(1120 / (len(b["name"]) * 0.66)))}" fill="{b["fg"]}">{b["name"].replace("&", "&amp;")}</text>
<rect x="624" y="342" width="160" height="8" rx="4" fill="{b["accent"]}"/>
<text x="624" y="430" font-family="{SANS}" font-size="52" fill="{b["accent"]}">{b["tagline"]}</text></svg>'''

here = os.path.dirname(os.path.abspath(__file__))
for slug, b in BRANDS.items():
    d = os.path.join(here, slug); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "avatar.svg"), "w").write(avatar(b))
    open(os.path.join(d, "lockup.svg"), "w").write(lockup(b))
print("ok", ", ".join(BRANDS))
