// Carga del banco de preguntas. Las pistas se cargan una vez (clues.json); las explicaciones
// largas viven en un archivo por categoría (exp/<categoria>.json) y se piden bajo demanda.
const BASE = import.meta.env.BASE_URL + 'bank/'

let bankPromise = null
const expCache = new Map()

export function loadBank() {
  if (!bankPromise) {
    bankPromise = fetch(BASE + 'clues.json', { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el banco de preguntas')
        return r.json()
      })
      .then((data) => {
        const byId = new Map(data.questions.map((q) => [q.id, q]))
        const categories = [...new Set(data.questions.map((q) => q.category))].sort()
        const subspecialties = [...new Set(data.questions.map((q) => q.subspecialty))].sort()
        return { ...data, byId, categories, subspecialties }
      })
      .catch((e) => {
        bankPromise = null
        throw e
      })
  }
  return bankPromise
}

export const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export async function loadExplanation(q) {
  const file = q.expFile ?? slug(q.category)
  if (!expCache.has(file)) {
    expCache.set(
      file,
      fetch(BASE + 'exp/' + file + '.json')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => {
          expCache.delete(file)
          return {}
        }),
    )
  }
  const all = await expCache.get(file)
  return all[q.id] ?? '_Explicación no disponible todavía para esta pregunta._'
}

export function preloadExplanations(questions) {
  for (const q of questions) loadExplanation(q)
}
