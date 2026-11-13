// Generates the PLACEHOLDER Unity app icon (orange rounded square with a white "U")
// and the fern hero illustration. Pure Node (zlib) — no image tools needed.
// Replace public/pwa-*.png etc. when the real Unity icon is supplied.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
mkdirSync(pub, { recursive: true })

const WHITE = [255, 255, 255]

// --- PNG encoder ---------------------------------------------------------
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const encodePng = (size, rgba) => {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Logo: a "U" of two arms cradling a sun, on a sunrise gradient --------------------
// Geometry in a 100x100 box (same as public/logo.svg and src/components/Logo.tsx).
const G_TOP = [0xff, 0xc2, 0x7a]
const G_BOT = [0xe8, 0x6f, 0x2b]
const SUN = [0xff, 0xf4, 0xe0]
const inRoundedRect = (x, y, r) => {
  const cx = Math.min(Math.max(x, r), 100 - r)
  const cy = Math.min(Math.max(y, r), 100 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
const inArms = (x, y) => {
  const t = 6.5
  for (const ax of [27, 73]) {
    if (Math.abs(x - ax) <= t && y >= 38 && y <= 52) return true
    if ((x - ax) ** 2 + (y - 38) ** 2 <= t * t) return true
  }
  if (y > 52) {
    const d = Math.hypot(x - 50, y - 52)
    if (Math.abs(d - 23) <= t) return true
  }
  return false
}
const inSun = (x, y) => (x - 50) ** 2 + (y - 41) ** 2 <= 10.5 ** 2

const render = (size, { maskable = false, rounded = true } = {}) => {
  const ss = 4
  const buf = Buffer.alloc(size * size * 4)
  const k = maskable ? 0.78 : 1 // keep the mark inside the maskable safe zone
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let a = 0
      const acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const X = ((px + (sx + 0.5) / ss) / size) * 100
          const Y = ((py + (sy + 0.5) / ss) / size) * 100
          if (rounded && !maskable && !inRoundedRect(X, Y, 23)) continue
          a++
          const t = Math.min(1, Math.max(0, (X + Y) / 200))
          let c = G_TOP.map((v, i) => v * (1 - t) + G_BOT[i] * t)
          const x = 50 + (X - 50) / k
          const y = 50 + (Y - 50) / k
          if (inSun(x, y)) c = SUN
          else if (inArms(x, y)) c = WHITE
          for (let i = 0; i < 3; i++) acc[i] += c[i]
        }
      }
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c++) buf[i + c] = a ? Math.round(acc[c] / a) : 0
      buf[i + 3] = Math.round((a / (ss * ss)) * 255)
    }
  }
  return encodePng(size, buf)
}

writeFileSync(join(pub, 'pwa-192.png'), render(192))
writeFileSync(join(pub, 'pwa-512.png'), render(512))
writeFileSync(join(pub, 'pwa-maskable-512.png'), render(512, { maskable: true }))
writeFileSync(join(pub, 'apple-touch-icon.png'), render(180, { rounded: false }))
writeFileSync(join(pub, 'icon-1024.png'), render(1024, { rounded: false }))

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC27A"/><stop offset="1" stop-color="#E86F2B"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g)"/><path d="M27 38v14a23 23 0 0 0 46 0V38" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/><circle cx="50" cy="41" r="10.5" fill="#FFF4E0"/></svg>\n`
writeFileSync(join(pub, 'favicon.svg'), LOGO_SVG)
writeFileSync(join(pub, 'logo.svg'), LOGO_SVG)

// --- Fern hero (procedural, calm dark greens) -----------------------------
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const frond = (x0, y0, angle, length, width, color, opacity) => {
  const parts = []
  const steps = 26
  const curve = (rnd() - 0.5) * 0.6
  let px = x0
  let py = y0
  let a = angle
  const spine = []
  for (let i = 0; i <= steps; i++) {
    spine.push([px, py, a])
    a += curve / steps
    px += Math.cos(a) * (length / steps)
    py += Math.sin(a) * (length / steps)
  }
  parts.push(
    `<path d="M${spine.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}" stroke="${color}" stroke-width="2.2" fill="none" opacity="${opacity}"/>`,
  )
  for (let i = 1; i < steps; i++) {
    const [x, y, ang] = spine[i]
    const taper = Math.sin((Math.PI * i) / steps) * width
    for (const side of [-1, 1]) {
      const la = ang + side * 1.05
      const ex = x + Math.cos(la) * taper
      const ey = y + Math.sin(la) * taper
      const mx = x + Math.cos(la + side * 0.25) * taper * 0.55
      const my = y + Math.sin(la + side * 0.25) * taper * 0.55
      const nx = x + Math.cos(la - side * 0.35) * taper * 0.5
      const ny = y + Math.sin(la - side * 0.35) * taper * 0.5
      parts.push(
        `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)} Q${nx.toFixed(1)} ${ny.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Z" fill="${color}" opacity="${opacity}"/>`,
      )
    }
  }
  return parts.join('')
}
const greens = ['#1d3b1f', '#24502a', '#2f6b33', '#3d8240', '#4f9a4c']
const fronds = []
for (let layer = 0; layer < 5; layer++) {
  for (let k = 0; k < 6; k++) {
    const x = rnd() * 900 - 100
    const y = 420 + rnd() * 120
    fronds.push(frond(x, y, -Math.PI / 2 + (rnd() - 0.5) * 1.6, 380 + rnd() * 260, 60 + rnd() * 30, greens[layer], 0.55 + layer * 0.1))
  }
}
writeFileSync(
  join(pub, 'fern.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice"><rect width="800" height="450" fill="#0f2411"/>${fronds.join('')}</svg>\n`,
)
console.warn('icons + fern written to public/')
