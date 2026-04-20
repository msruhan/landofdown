function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function fallbackAvatarDataUri(seed: string): string {
  const key = seed.trim() || 'Player'
  const initial = key.charAt(0).toUpperCase()
  const hash = hashString(key)
  const hueA = hash % 360
  const hueB = (hueA + 55) % 360

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hueA}, 75%, 46%)" />
      <stop offset="100%" stop-color="hsl(${hueB}, 80%, 34%)" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="64" fill="url(#g)" />
  <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2" />
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Rajdhani, Arial, sans-serif" font-size="56" font-weight="700" fill="white">${initial}</text>
</svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function getAvatarUrl(seed: string, preferredUrl?: string | null): string {
  const cleaned = preferredUrl?.trim()
  if (cleaned) return cleaned
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`
}

export function handleAvatarError(event: Event, seed: string): void {
  const img = event.target as HTMLImageElement | null
  if (!img || img.dataset.fallbackApplied === '1') return
  img.dataset.fallbackApplied = '1'
  img.src = fallbackAvatarDataUri(seed)
}
