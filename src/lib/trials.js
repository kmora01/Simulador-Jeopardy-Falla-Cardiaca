// Banco de ensayos clínicos (content/trials.json) y progreso del usuario en la pestaña Ensayos.
import trials from '../../content/trials.json'

export { trials }

export const AREAS = [...new Set(trials.map((t) => t.area))]

export const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const design = (t) => `${t.int} vs. ${t.comp} · ${t.pop}`

/* ---------- Progreso (por usuario, en este navegador) ---------- */
// { [id]: { ok, fail, last } }; un ensayo cuenta como dominado con más aciertos que fallos y al menos 2 aciertos.

const key = (user) => `cardio-jeopardy:ensayos:${user}`

export function loadProgress(user) {
  try {
    return JSON.parse(localStorage.getItem(key(user))) ?? {}
  } catch {
    return {}
  }
}

export function saveProgress(user, progress) {
  try {
    localStorage.setItem(key(user), JSON.stringify(progress))
  } catch {
    /* almacenamiento no disponible: el progreso solo dura la sesión */
  }
}

export const mastered = (p) => !!p && p.ok >= 2 && p.ok > p.fail

/* ---------- Preguntas de opción múltiple ---------- */

export const QUIZ_TYPES = {
  design: { label: '¿Qué evaluó?', ask: (t) => `¿Qué evaluó ${t.name} (${t.year})?`, value: design },
  result: { label: '¿Qué encontró?', ask: (t) => `¿Qué encontró ${t.name} (${t.year})?`, value: (t) => t.result },
  name: { label: '¿Qué ensayo es?', ask: () => '¿Qué ensayo es?', value: (t) => t.name },
}

// Elige el siguiente ensayo dando más peso a los no vistos, fallados o no dominados.
export function pickTrial(pool, progress, recent = []) {
  const candidates = pool.filter((t) => !recent.includes(t.id))
  const list = candidates.length ? candidates : pool
  const weight = (t) => {
    const p = progress[t.id]
    if (!p) return 3
    if (mastered(p)) return 0.4
    return 1 + Math.min(p.fail, 3)
  }
  const total = list.reduce((s, t) => s + weight(t), 0)
  let r = Math.random() * total
  for (const t of list) {
    r -= weight(t)
    if (r <= 0) return t
  }
  return list[list.length - 1]
}

export function buildQuestion(trial, type) {
  const value = QUIZ_TYPES[type].value
  const answer = value(trial)
  const seen = new Set([answer])
  const distractors = []
  // Primero distractores de la misma área (más difíciles), luego del resto del banco.
  for (const group of [trials.filter((t) => t.area === trial.area), trials]) {
    for (const t of shuffle(group)) {
      if (distractors.length === 3) break
      const v = value(t)
      if (t.id === trial.id || seen.has(v)) continue
      seen.add(v)
      distractors.push(v)
    }
  }
  return { trial, type, prompt: QUIZ_TYPES[type].ask(trial), answer, options: shuffle([answer, ...distractors]) }
}
