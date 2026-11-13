/** Renders an affirmation to a square PNG and shares (or downloads) it. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

export async function renderAffirmationImage(text: string): Promise<Blob> {
  const S = 1080
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, S, S)
  g.addColorStop(0, '#F8CC93')
  g.addColorStop(1, '#E8892B')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = '#1F1F1F'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 84
  let lines: string[]
  do {
    ctx.font = `bold ${size}px Inter, system-ui, sans-serif`
    lines = wrap(ctx, text, S - 200)
    size -= 4
  } while (lines.length * size * 1.3 > S - 360 && size > 40)
  const lh = size * 1.3
  const top = S / 2 - ((lines.length - 1) * lh) / 2
  lines.forEach((l, i) => ctx.fillText(l, S / 2, top + i * lh))
  ctx.font = '600 40px Inter, system-ui, sans-serif'
  ctx.fillText('Unity 🧡', S / 2, S - 110)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('render failed'))), 'image/png'))
}

export async function shareAffirmation(text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderAffirmationImage(text)
  const file = new File([blob], 'unity-affirmation.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'unity-affirmation.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}
