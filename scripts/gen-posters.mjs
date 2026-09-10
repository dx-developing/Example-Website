import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = new URL('../public/work/', import.meta.url)
mkdirSync(OUT, { recursive: true })

const projects = [
  { slug: 'solvra',  idx: '01', name: 'Solvra',      tag: 'SAAS',        a: '#6b4a0c', b: '#e09400', c: '#ffe08a', ink: '#241802' },
  { slug: 'chile20', idx: '02', name: 'Chile 20',    tag: 'TIENDA',      a: '#0f4257', b: '#2ba0cf', c: '#a6effb', ink: '#04202c' },
  { slug: 'norte',   idx: '03', name: 'Norte',       tag: 'EDITORIAL',   a: '#34205e', b: '#8446d4', c: '#dcc0ff', ink: '#150a2e' },
  { slug: 'aurora',  idx: '04', name: 'Aurora Labs', tag: 'LANZAMIENTO', a: '#6b260e', b: '#e0602c', c: '#ffc0a2', ink: '#2c0f05' },
  { slug: 'meridia', idx: '05', name: 'Meridia',     tag: 'FINTECH',     a: '#0c4636', b: '#1f9d6b', c: '#9ff0cf', ink: '#04201a' },
  { slug: 'kudo',    idx: '06', name: 'Kudo',        tag: 'APP',         a: '#4a123a', b: '#c02a86', c: '#ff9fd6', ink: '#1e0518' },
]

const poster = (p) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1125" width="900" height="1125">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${p.a}"/><stop offset="0.5" stop-color="${p.b}"/><stop offset="1" stop-color="${p.c}"/>
    </linearGradient>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.c}"/><stop offset="1" stop-color="${p.b}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.2" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.035"/></feComponentTransfer><feComposite operator="over" in2="SourceGraphic"/></filter>
  </defs>

  <rect width="900" height="1125" fill="url(#bg)"/>
  <g filter="url(#soft)" opacity="0.85">
    <circle cx="740" cy="180" r="180" fill="${p.ink}" opacity="0.45"/>
    <circle cx="140" cy="980" r="200" fill="${p.c}" opacity="0.4"/>
  </g>

  <g transform="translate(110 150)">
    <rect x="0" y="0" width="680" height="850" rx="26" fill="${p.ink}" fill-opacity="0.32"/>
    <rect x="0" y="0" width="680" height="56" rx="26" fill="${p.ink}" fill-opacity="0.5"/>
    <rect x="0" y="30" width="680" height="26" fill="${p.ink}" fill-opacity="0.5"/>
    <circle cx="30" cy="28" r="7" fill="#ff6058"/><circle cx="54" cy="28" r="7" fill="#ffbd2e"/><circle cx="78" cy="28" r="7" fill="#28c941"/>
    <rect x="230" y="17" width="360" height="22" rx="11" fill="#ffffff" fill-opacity="0.12"/>

    <rect x="44" y="104" width="150" height="18" rx="9" fill="#ffffff" fill-opacity="0.28"/>
    <rect x="44" y="150" width="430" height="40" rx="8" fill="#ffffff" fill-opacity="0.9"/>
    <rect x="44" y="204" width="330" height="40" rx="8" fill="#ffffff" fill-opacity="0.55"/>
    <rect x="44" y="272" width="150" height="46" rx="23" fill="url(#hero)"/>

    <rect x="44" y="360" width="592" height="250" rx="16" fill="url(#hero)" opacity="0.9"/>
    <circle cx="340" cy="485" r="66" fill="#ffffff" fill-opacity="0.25"/>

    <rect x="44"  y="650" width="180" height="150" rx="14" fill="#ffffff" fill-opacity="0.14"/>
    <rect x="250" y="650" width="180" height="150" rx="14" fill="#ffffff" fill-opacity="0.14"/>
    <rect x="456" y="650" width="180" height="150" rx="14" fill="#ffffff" fill-opacity="0.14"/>
  </g>

  <rect width="900" height="1125" fill="url(#glow)"/>
  <text x="70" y="1080" font-family="'Space Grotesk',Arial,sans-serif" font-weight="700" font-size="52" fill="${p.ink}" fill-opacity="0.85">${p.name}</text>
  <text x="70" y="112" font-family="'Space Grotesk',Arial,sans-serif" font-weight="600" font-size="26" letter-spacing="8" fill="${p.ink}" fill-opacity="0.7">${p.idx} — ${p.tag}</text>
  <rect width="900" height="1125" filter="url(#grain)" opacity="0.45"/>
</svg>
`

for (const p of projects) {
  writeFileSync(new URL(`${p.slug}.svg`, OUT), poster(p))
  console.log('wrote', p.slug + '.svg')
}
