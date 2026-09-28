# -*- coding: utf-8 -*-
"""Builds one page per service from services.py, plus the /services/ hub."""

import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from services import SERVICES

ROOT = pathlib.Path('/home/claude/zapt-site')
BASE = 'https://www.zaptmovers.com'
LOGO = '/assets/icon-zapt.svg'
LOGO_LIGHT = '/assets/icon-zapt-light.svg'
IMG = 'https://framerusercontent.com/images/%s.webp?width=900&height=700'

BY = {s['slug']: s for s in SERVICES}
CSS = open(pathlib.Path(__file__).parent / 'city.css').read()

EXTRA_CSS = '''
.inclist{display:grid;grid-template-columns:repeat(2,1fr);gap:0 26px;list-style:none;padding:0;margin:0}
.inclist li{position:relative;padding:11px 0 11px 30px;border-bottom:1px dashed var(--corrugate);font-size:15.5px}
.inclist li::before{content:"";position:absolute;left:0;top:17px;width:16px;height:16px;border-radius:50%;background:var(--zap)}
@media(max-width:700px){.inclist{grid-template-columns:1fr}}
'''


def strip(s):
    return (s.replace('&mdash;', '-').replace('&ndash;', '-')
             .replace('&amp;', '&').replace('&middot;', '-'))


def schema(s):
    url = '%s/services/%s/' % (BASE, s['slug'])
    graph = [
        {
            "@type": "Service",
            "@id": url + "#service",
            "name": strip(s['name']),
            "serviceType": strip(s['name']),
            "url": url,
            "provider": {
                "@type": "MovingCompany",
                "name": "Zapt Movers",
                "url": BASE + "/",
                "telephone": "+1-415-843-2532"
            },
            "areaServed": [
                {"@type": "State", "name": "California"},
                {"@type": "State", "name": "Texas"}
            ]
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Services", "item": BASE + "/services/"},
                {"@type": "ListItem", "position": 3, "name": strip(s['name'])}
            ]
        },
        {
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": strip(q),
                 "acceptedAnswer": {"@type": "Answer", "text": strip(a)}}
                for q, a in s['faqs']
            ]
        }
    ]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=2, ensure_ascii=False)


def header(active_href):
    return '''
<header>
  <div class="wrap bar">
    <a href="/" class="logo">
      <img src="%s" alt="Zapt Movers" onerror="this.style.display='none'">
      <span class="mark">ZAPT<em>MOVERS</em></span>
    </a>
    <button class="menu-toggle" id="menuBtn" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav id="nav">
      <a class="nl" href="/services/"%s>Services</a>
      <a class="nl" href="/#process">How it works</a>
      <a class="nl" href="/movers/">Locations</a>
      <a class="nl" href="/blog/">Blog</a>
      <a class="nl" href="/book/">Book now</a>
      <a class="btn btn-zap" href="#quote">Free quote</a>
    </nav>
  </div>
</header>
''' % (LOGO, ' aria-current="page"' if active_href else '')


def footer(links_html):
    return '''
<footer>
  <div class="wrap">
    <div class="foot">
      <div>
        <a href="/" class="logo">
          <img src="%s" alt="Zapt Movers" onerror="this.style.display='none'">
          <span class="mark">ZAPT<em>MOVERS</em></span>
        </a>
        <p style="max-width:34ch;margin-top:16px">Licensed, bonded and insured moving across the Bay Area, Los Angeles and Dallas&ndash;Fort Worth. Open every day, 8am&ndash;6pm.</p>
      </div>
      <div>
        <h4>Services</h4>
%s
        <a href="/services/">All services</a>
      </div>
      <div>
        <h4>Contact</h4>
        <a href="tel:+14158432532">(415) 843-2532</a>
        <a href="tel:+14698688785">(469) 868-8785 &middot; DFW</a>
        <a href="/movers/">Locations</a>
        <a href="/blog/">Moving guides</a>
        <a href="/terms/">Terms of Service</a>
        <a href="/privacy/">Privacy Policy</a>
      </div>
    </div>
    <div class="legal">
      <span>&copy; <span id="yr">2026</span> CPL LLC dba Zapt Movers &middot; USDOT 3438977 &middot; CAL-T0192235</span>
      <span>Bay Area &middot; Los Angeles &middot; Dallas&ndash;Fort Worth</span>
    </div>
  </div>
</footer>
''' % (LOGO_LIGHT, links_html)


FOOT_LINKS = '\n'.join('        <a href="/services/%s/">%s</a>' % (s['slug'], s['short']) for s in SERVICES)

TAIL = '''
<script src="/assets/quote-form.js"></script>
<script>
ZaptQuoteForm.mount('#zapt-quote', {
  city: '%s',
  phoneDisplay: '(415) 843-2532',
  phoneHref: '+14158432532'
});
var menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
menuBtn.addEventListener('click', function () {
  var open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
document.getElementById('yr').textContent = new Date().getFullYear();
</script>
</body>
</html>
'''


def page(s):
    url = '%s/services/%s/' % (BASE, s['slug'])
    cards = '\n'.join('      <div class="lcard"><h3>%s</h3><p>%s</p></div>' % (t, b) for t, b in s['cards'])
    inc = '\n'.join('      <li>%s</li>' % i for i in s['included'])
    faqs = '\n'.join(
        '    <details%s>\n      <summary>%s</summary>\n      <p>%s</p>\n    </details>'
        % (' open' if i == 0 else '', q, a) for i, (q, a) in enumerate(s['faqs']))
    related = '\n'.join(
        '      <a class="ncard" href="/services/%s/"><h3>%s</h3><p>%s</p></a>'
        % (r, BY[r]['name'], BY[r]['meta'].split('.')[0].strip()) for r in s['related'])
    chips = '\n'.join('        <span class="chip">%s</span>' % c for c in s['chips'])

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{s['title']}</title>
<meta name="description" content="{s['meta']}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{strip(s['name'])} | Zapt Movers">
<meta property="og:description" content="{s['meta']}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800;900&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/quote-form.css">
<style>
{CSS}
{EXTRA_CSS}
</style>
</head>
<body>
{header(True)}
<main>

<div class="hero">
  <div class="wrap">
    <div>
      <nav class="crumb mono" aria-label="Breadcrumb">
        <a href="/">Home</a> &nbsp;/&nbsp; <a href="/services/">Services</a> &nbsp;/&nbsp; {strip(s['name'])}
      </nav>
      <h1><span class="tape">{strip(s['name'])}</span></h1>
      <p class="lede">{s['lede']}</p>
      <div class="hero-cta">
        <a class="btn" href="#quote">Get a free quote</a>
        <a class="btn btn-ghost" href="tel:+14158432532">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>
          (415) 843-2532
        </a>
      </div>
      <div class="chips">
{chips}
      </div>
    </div>
    <div class="hero-img">
      <img src="{IMG % s['photo']}" alt="Zapt Movers crew performing {strip(s['name']).lower()}" loading="eager">
    </div>
  </div>
</div>

<div class="strip">
  <div class="wrap">
    <div class="item"><span class="num">15,000+</span><span class="lbl">Moves completed</span></div>
    <div class="item"><span class="num">4.8&#9733;</span><span class="lbl">From 1,000+ reviews</span></div>
    <div class="item"><span class="num">98%</span><span class="lbl">Customer satisfaction</span></div>
    <div class="item"><span class="num">$1M</span><span class="lbl">Cargo coverage</span></div>
  </div>
</div>

<section>
  <div class="wrap">
    <div class="sec-head">
      <h2>How we do it</h2>
      <p>The parts of this service that actually decide whether it goes well.</p>
    </div>
    <div class="local">
{cards}
    </div>
  </div>
</section>

<section class="priceband" style="padding-top:clamp(46px,6vw,72px)">
  <div class="wrap">
    <div class="sec-head">
      <h2>What's included</h2>
      <p>No line items invented on move day. Anything beyond this list is quoted before we start.</p>
    </div>
    <ul class="inclist">
{inc}
    </ul>
  </div>
</section>

<section class="quotesec" id="quote">
  <div class="wrap">
    <div>
      <div class="sec-head" style="margin-bottom:22px">
        <h2>Get a quote</h2>
        <p>Free, no obligation, same-day answer. Not sure about the price, or want to hear about current discounts? Call <a href="tel:+14158432532" style="font-weight:600">(415) 843-2532</a> first.</p>
      </div>
      <ul class="ticks">
        <li>Written price before you commit</li>
        <li>Licensed, bonded and insured with $1M cargo coverage</li>
        <li>Move now, pay later with 0% APR options</li>
        <li>Open every day, 8am to 6pm</li>
      </ul>
    </div>
    <div class="form-card zq" id="zapt-quote"></div>
  </div>
</section>

<section>
  <div class="wrap" style="max-width:840px">
    <div class="sec-head"><h2>Questions we get every week</h2></div>
{faqs}
  </div>
</section>

<section style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><h2>Often booked together</h2></div>
    <div class="nextgrid">
{related}
    </div>
  </div>
</section>

<section class="cta-band">
  <div class="wrap">
    <div>
      <h2>Let's price your move.</h2>
      <p>Free quote, no obligation, same-day answer. Bay Area, Los Angeles and Dallas&ndash;Fort Worth.</p>
    </div>
    <div class="cta-actions">
      <a class="btn" href="#quote">Get my free quote</a>
      <a class="btn btn-ghost" href="/book/">Build my move online</a>
    </div>
  </div>
</section>

</main>
{footer(FOOT_LINKS)}
<script type="application/ld+json">
{schema(s)}
</script>
{TAIL % (strip(s['name']))}'''


def hub():
    cards = '\n'.join(
        '      <a class="ncard" href="/services/%s/"><h3>%s</h3><p>%s</p></a>'
        % (s['slug'], s['name'], s['meta'].split('.')[0].strip()) for s in SERVICES)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Moving Services | Residential, Commercial, Packing, Storage | Zapt Movers</title>
<meta name="description" content="Everything Zapt Movers does: residential and commercial moving, packing, long distance, storage and specialty items. Licensed, insured, three markets.">
<link rel="canonical" href="{BASE}/services/">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800;900&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
{CSS}
{EXTRA_CSS}
</style>
</head>
<body>
{header(True)}
<main>
<div class="hero">
  <div class="wrap" style="display:block">
    <nav class="crumb mono" aria-label="Breadcrumb"><a href="/">Home</a> &nbsp;/&nbsp; Services</nav>
    <h1><span class="tape">What we do</span></h1>
    <p class="lede" style="max-width:58ch">Six services, one crew standard, the same insurance behind all of them. Each page covers what is included and what actually decides whether the job goes well.</p>
  </div>
</div>
<section style="padding-top:0">
  <div class="wrap">
    <div class="nextgrid">
{cards}
    </div>
  </div>
</section>
<section class="cta-band">
  <div class="wrap">
    <div><h2>Not sure which you need?</h2><p>Call and describe the move. We will tell you what it actually takes.</p></div>
    <div class="cta-actions">
      <a class="btn" href="/#quote">Get a free quote</a>
      <a class="btn btn-ghost" href="tel:+14158432532">(415) 843-2532</a>
    </div>
  </div>
</section>
</main>
{footer(FOOT_LINKS)}
<script>
var menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
menuBtn.addEventListener('click', function () {{
  var open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
}});
document.getElementById('yr').textContent = new Date().getFullYear();
</script>
</body>
</html>
'''


if __name__ == '__main__':
    for s in SERVICES:
        d = ROOT / 'services' / s['slug']
        d.mkdir(parents=True, exist_ok=True)
        (d / 'index.html').write_text(page(s), encoding='utf-8')
        print('built', s['slug'])
    (ROOT / 'services').mkdir(exist_ok=True)
    (ROOT / 'services' / 'index.html').write_text(hub(), encoding='utf-8')
    print('built /services/ hub')
