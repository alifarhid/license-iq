# LicenseIQ marketing site

A static website that introduces LicenseIQ, the SAP license optimization
platform, to customers and internal teams. Plain HTML, CSS and JavaScript:
no build step, no framework, nothing to install.

## Run it

Serve the folder with any static file server, then open the printed URL:

```bash
cd website
python3 -m http.server 8080
# → http://localhost:8080
```

Opening `index.html` straight from Finder also works, but browsers block ES
module scripts over `file://`, so the three 3D sculptures show their CSS
stand-in (a gold orb) instead of the WebGL scene. Everything else works.

## Deploy it

Copy the folder to any static host (GitHub Pages, Netlify, Vercel, an S3
bucket, an internal web server). All paths are relative, so it works from a
sub-path such as `https://intranet.example.com/licenseiq/`. The only
external requests are Google Fonts; Three.js is vendored in
`assets/vendor/three/`, so the 3D scenes work on a network that blocks CDNs.

## What is where

```
website/
├── index.html                  Landing page
├── blog/
│   ├── index.html              Article listing
│   ├── fue-explained.html
│   ├── idle-license-audit.html
│   └── scenario-modeling-before-renewal.html
├── assets/
│   ├── css/site.css            Design tokens, layout, components, sections
│   ├── js/site.js              Navigation, reveal animations, counters,
│   │                           savings estimator, demo-request form
│   ├── js/network.js           The "knot" graph (Canvas 2D)
│   ├── js/sculptures.js        The three gold sculptures (Three.js)
│   ├── img/                    Logo, favicon, blog illustrations (SVG)
│   └── vendor/three/           Three.js r170 (MIT) and RoomEnvironment
└── README.md
```

## Things you will want to change

**Demo-request email.** Every "Request a demo" action opens the visitor's
email app with a prefilled message. The address appears in two places:

- `assets/js/site.js`, the `DEMO_EMAIL` constant (used by the form), and
- the `mailto:` links in `index.html` and `blog/*.html`.

A find-and-replace of `alireza-farhidzadeh@hcltech.com` covers both.

**Reference figures.** The numbers in the hero, the "Three places" cards,
the estimator defaults and the blog posts come from the anonymized
reference assessment in the LicenseIQ repository (7,149 active users,
$540 per FUE, run on 1 October 2026). If the sample data changes, update
them by hand; they are plain text.

**Testimonials.** The four quotes are illustrative and labelled as such on
the page and in the footer. Replace them with real, approved quotes before
the site is shown outside your team, and remove the two "illustrative"
notes when you do.

**Adding a blog post.** Copy one of the files in `blog/`, change the
`<title>`, description, hero and body, then add a card for it in
`blog/index.html` and, if you want it featured, in the "Resources"
section of `index.html`. The article styles live under `.prose` in
`site.css`.

## Design notes

- Palette and type follow the product: deep navy with blue and emerald,
  Manrope for display, Inter for text. Gold is the site's own accent and
  carries the sculpture theme. Instrument Serif italic marks one word per
  headline.
- The three sculptures are built procedurally in `sculptures.js`:
  an armillary sphere (the estate as an instrument, with users, roles and
  licenses as nodes on its rings), a ledger (a stack of license fees with
  the recoverable ones lifted off as glass) and a key (a license). Each has
  its own small renderer that only draws while on screen.
- The knot graph in `network.js` is seeded, so it looks the same on every
  visit, and the untangle animation plays once when the section scrolls
  into view. Hovering a node highlights its relationships.
- Motion respects `prefers-reduced-motion`: reveals, counters, the knot and
  the sculptures all fall back to a still frame.
- No cookies, no analytics, no third-party scripts.
