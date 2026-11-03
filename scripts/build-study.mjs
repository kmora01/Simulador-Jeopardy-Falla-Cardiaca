// Compila el "Libro de lectura" de la pestaña Estudio.
// Fuentes: content/summaries/*.md (resúmenes propios), content/questions (banco) y content/trials.json.
// Salida: public/study/index.json (unidades y temas con sus cuentas) y public/study/t/<tema>.json
// (resúmenes + apuntes de cada pregunta del banco con su explicación + ids de ensayos).
// El mapa de temas está en scripts/study-topics.mjs. Uso: node scripts/build-study.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAll } from './bank-io.mjs'
import { UNITS, TOPICS, ROUTED, TRIAL_AREAS } from './study-topics.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SUM = join(root, 'content', 'summaries')
const OUT = join(root, 'public', 'study')
const errors = []
const warnings = []

/* ---------- Resúmenes ---------- */
const LIST = ['categories', 'books']
const summaries = new Map()
for (const f of readdirSync(SUM).filter((n) => n.endsWith('.md')).sort()) {
  const raw = readFileSync(join(SUM, f), 'utf8').replace(/\r\n/g, '\n')
  const cut = raw.indexOf('\n---\n')
  if (cut < 0) {
    errors.push(`${f}: falta la línea --- tras la cabecera`)
    continue
  }
  const meta = {}
  for (const line of raw.slice(0, cut).split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m) meta[m[1]] = LIST.includes(m[1]) ? m[2].split(';').map((s) => s.trim()).filter(Boolean) : m[2].trim()
  }
  if (!meta.title) errors.push(`${f}: falta "title"`)
  const id = f.replace(/\.md$/, '')
  summaries.set(id, { id, title: meta.title, books: meta.books ?? [], body: raw.slice(cut + 5).trim() })
}

/* ---------- Enrutado por palabras clave ---------- */
const norm = (s) =>
  ' ' +
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/()+\-]+/g, ' ')
    .trim() +
  ' '

// Palabras cortas (≤4 letras) deben coincidir completas; las largas, como inicio de palabra.
const kwRe = new Map()
for (const t of TOPICS) {
  kwRe.set(
    t.id,
    t.kw.map((k) => {
      const n = norm(k).trim()
      const esc = n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
      return new RegExp(n.length <= 4 ? ` ${esc} ` : ` ${esc}`)
    }),
  )
}

function route(fields, bonus = {}) {
  const texts = fields.map(([s, w]) => [norm(s), w])
  let best = null
  let bestScore = 0
  for (const t of TOPICS) {
    let score = bonus[t.id] ?? 0
    for (const re of kwRe.get(t.id)) for (const [txt, w] of texts) if (re.test(txt)) score += w
    if (score > bestScore) {
      bestScore = score
      best = t.id
    }
  }
  return best
}

/* ---------- Preguntas ---------- */
const byCategory = new Map()
for (const t of TOPICS) for (const c of t.categories) byCategory.set(c, t.id)

const questions = loadAll(join(root, 'content', 'questions'))
const notes = new Map(TOPICS.map((t) => [t.id, []]))
const concept = (a) =>
  String(a)
    .trim()
    .replace(/^¿\s*/, '')
    .replace(/\?\s*$/, '')
    .replace(/^(qu[eé]|qui[eé]n(es)?|cu[aá]l(es)?)\s+(es|son|era|eran|fue|fueron)\s+/i, '')
    .replace(/^(el|la|los|las|lo|un|una|unos|unas)\s+/i, '')
    .replace(/^./, (c) => c.toUpperCase())

let routed = 0
for (const q of questions) {
  let topic = byCategory.get(q.category)
  if (!topic && q.category in ROUTED) {
    topic = route([[(q.tags ?? []).join(' '), 3], [q.answer, 3], [q.clue, 1]]) ?? ROUTED[q.category]
    routed++
  }
  if (!topic) {
    errors.push(`Categoría sin tema en study-topics.mjs: "${q.category}" (${q.id})`)
    continue
  }
  notes.get(topic).push({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    concept: concept(q.answer),
    answer: q.answer,
    clue: q.clue,
    guideline: q.guideline ?? '',
    explanation: q.explanation ?? '',
    ...(q.image ? { image: q.image } : {}),
  })
}

/* ---------- Ensayos ---------- */
const trials = JSON.parse(readFileSync(join(root, 'content', 'trials.json'), 'utf8'))
const trialIds = new Map(TOPICS.map((t) => [t.id, []]))
for (const tr of trials) {
  const fallback = TRIAL_AREAS[tr.area]
  if (!fallback) warnings.push(`Área de ensayo sin tema: "${tr.area}" (${tr.id})`)
  const topic = route([[tr.name, 3], [tr.pop, 2], [tr.int, 2], [tr.comp, 1], [tr.outcome, 1], [tr.pearl, 1]], fallback ? { [fallback]: 3 } : {}) ?? fallback
  if (topic) trialIds.get(topic).push(tr.id)
}

/* ---------- Validación y salida ---------- */
const used = new Set()
for (const t of TOPICS) {
  if (!UNITS.includes(t.unit)) errors.push(`Tema ${t.id}: unidad desconocida`)
  for (const s of t.summaries) {
    if (!summaries.has(s)) warnings.push(`Tema ${t.id}: falta el resumen ${s}.md`)
    used.add(s)
  }
}
for (const id of summaries.keys()) if (!used.has(id)) warnings.push(`Resumen ${id} no está en ningún tema`)

for (const w of warnings) console.warn('⚠ ' + w)
if (errors.length) {
  for (const e of errors) console.error('✗ ' + e)
  process.exit(1)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 't'), { recursive: true })
const order = new Map(questions.map((q, i) => [q.category, i]))
const index = { units: UNITS, topics: [], where: {} }
for (const t of TOPICS) {
  const sums = t.summaries.filter((s) => summaries.has(s)).map((s) => summaries.get(s))
  const ns = notes.get(t.id).sort((a, b) => order.get(a.category) - order.get(b.category) || a.difficulty - b.difficulty)
  const tr = trialIds.get(t.id)
  if (!sums.length && !ns.length && !tr.length) continue
  for (const n of ns) index.where[n.id] = t.id
  writeFileSync(join(OUT, 't', t.id + '.json'), JSON.stringify({ id: t.id, unit: t.unit, title: t.title, summaries: sums, notes: ns, trials: tr }))
  index.topics.push({
    id: t.id,
    unit: t.unit,
    title: t.title,
    summaries: sums.map((s) => s.title),
    books: [...new Set(sums.flatMap((s) => s.books))],
    notes: ns.length,
    trials: tr.length,
    words: sums.reduce((n, s) => n + s.body.split(/\s+/).length, 0) + ns.reduce((n, q) => n + q.explanation.split(/\s+/).length, 0),
  })
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index))
const total = index.topics.reduce((n, t) => n + t.notes, 0)
console.log(`✓ Libro de lectura: ${index.topics.length} temas, ${summaries.size} resúmenes, ${total} apuntes (${routed} enrutados por palabras clave), ${trials.length} ensayos → public/study/`)
