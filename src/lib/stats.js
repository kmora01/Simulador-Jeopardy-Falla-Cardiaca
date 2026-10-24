import { todayKey } from './db'

export const STRONG_THRESHOLD = 0.75
export const WEAK_THRESHOLD = 0.6
export const MIN_ATTEMPTS = 5

export function computeStreak(attempts) {
  const days = new Set(attempts.map((a) => a.day))
  if (!days.size) return { current: 0, best: 0 }
  const d = new Date()
  // La racha sigue viva si hoy aún no se estudió pero ayer sí.
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1)
  let current = 0
  while (days.has(todayKey(d))) {
    current++
    d.setDate(d.getDate() - 1)
  }
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const k of sorted) {
    const t = new Date(k + 'T12:00:00')
    run = prev && (t - prev) / 86_400_000 < 1.5 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return { current, best: Math.max(best, current) }
}

/** Agrupa intentos por una clave y calcula % de acierto. Usa solo el último intento de cada pregunta en juego + SRS. */
export function groupAccuracy(attempts, key) {
  const map = new Map()
  for (const a of attempts) {
    if (a.skipped) continue
    const k = a[key] ?? '—'
    const g = map.get(k) ?? { name: k, n: 0, correct: 0, money: 0 }
    g.n++
    if (a.correct) g.correct++
    g.money += a.mode === 'game' ? (a.correct ? a.value : -a.value) : 0
    map.set(k, g)
  }
  return [...map.values()]
    .map((g) => ({ ...g, pct: g.n ? g.correct / g.n : 0 }))
    .sort((a, b) => b.pct - a.pct)
}

export function classify(groups) {
  const strong = groups.filter((g) => g.n >= MIN_ATTEMPTS && g.pct >= STRONG_THRESHOLD)
  const weak = groups.filter((g) => g.n >= MIN_ATTEMPTS && g.pct < WEAK_THRESHOLD).sort((a, b) => a.pct - b.pct)
  const middle = groups.filter((g) => g.n >= MIN_ATTEMPTS && g.pct >= WEAK_THRESHOLD && g.pct < STRONG_THRESHOLD)
  const insufficient = groups.filter((g) => g.n < MIN_ATTEMPTS)
  return { strong, weak, middle, insufficient }
}

export function dailyCounts(attempts) {
  const m = new Map()
  for (const a of attempts) {
    const g = m.get(a.day) ?? { n: 0, correct: 0 }
    g.n++
    if (a.correct) g.correct++
    m.set(a.day, g)
  }
  return m
}

export function byDifficulty(attempts) {
  const rows = [1, 2, 3, 4, 5].map((d) => ({ name: `Nivel ${d}`, d, n: 0, correct: 0 }))
  for (const a of attempts) {
    if (a.skipped || !a.difficulty) continue
    const r = rows[a.difficulty - 1]
    r.n++
    if (a.correct) r.correct++
  }
  return rows.map((r) => ({ ...r, pct: r.n ? Math.round((r.correct / r.n) * 100) : 0 }))
}
