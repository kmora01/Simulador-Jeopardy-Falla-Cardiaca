// Compila el banco de preguntas para la web.
// Fuente: content/questions/*.json (un archivo por lote/categoría, arreglo de preguntas completas).
// Salida: public/bank/clues.json (pistas sin explicación) + public/bank/exp/<categoria>.json (explicaciones).
// Uso: node scripts/build-bank.mjs [--check]
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMd } from './bank-io.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'content', 'questions')
const OUT = join(root, 'public', 'bank')
const checkOnly = process.argv.includes('--check')

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const norm = (s) =>
  slug(String(s))
    .replace(/-/g, ' ')
    .replace(/^(que|quien|cual) (es|son) /, '')
    .trim()

const errors = []
const warnings = []
const questions = []
const ids = new Set()

const files = existsSync(SRC) ? readdirSync(SRC).filter((f) => /\.(json|md)$/.test(f)).sort() : []
for (const f of files) {
  let arr
  try {
    const raw = readFileSync(join(SRC, f), 'utf8')
    arr = f.endsWith('.md') ? parseMd(raw) : JSON.parse(raw)
  } catch (e) {
    errors.push(`${f}: JSON inválido (${e.message})`)
    continue
  }
  for (const [i, q] of arr.entries()) {
    const where = `${f}#${i} (${q.id ?? 'sin id'})`
    for (const k of ['id', 'category', 'subspecialty', 'difficulty', 'clue', 'answer', 'explanation']) {
      if (q[k] === undefined || q[k] === '') errors.push(`${where}: falta "${k}"`)
    }
    if (ids.has(q.id)) errors.push(`${where}: id duplicado`)
    ids.add(q.id)
    if (!(q.difficulty >= 1 && q.difficulty <= 5)) errors.push(`${where}: difficulty debe ser 1–5`)
    if (q.answer && !/^¿.+\?$/.test(q.answer.trim())) warnings.push(`${where}: la respuesta no está en forma de pregunta`)
    if (q.explanation && q.explanation.split(/\s+/).length < 70) warnings.push(`${where}: explicación corta (<70 palabras)`)
    questions.push(q)
  }
}

// Duplicados semánticos simples: misma respuesta normalizada + pista muy parecida.
const byAnswer = new Map()
for (const q of questions) {
  const k = norm(q.answer)
  if (!byAnswer.has(k)) byAnswer.set(k, [])
  byAnswer.get(k).push(q)
}
for (const [k, qs] of byAnswer) {
  if (qs.length > 1) {
    for (let a = 0; a < qs.length; a++)
      for (let b = a + 1; b < qs.length; b++) {
        const A = new Set(norm(qs[a].clue).split(' '))
        const B = norm(qs[b].clue).split(' ')
        const overlap = B.filter((w) => A.has(w)).length / Math.max(A.size, B.length)
        if (overlap > 0.6) warnings.push(`Posible duplicado: ${qs[a].id} ~ ${qs[b].id} ("${k}")`)
      }
  }
}

// Cada categoría necesita al menos 5 preguntas para poder formar una columna.
const perCat = new Map()
for (const q of questions) perCat.set(q.category, (perCat.get(q.category) ?? 0) + 1)
for (const [c, n] of perCat) if (n < 5) warnings.push(`Categoría "${c}" tiene solo ${n} preguntas (mínimo 5 para el tablero)`)

for (const w of warnings) console.warn('⚠ ' + w)
for (const e of errors) console.error('✗ ' + e)
if (errors.length) process.exit(1)

console.log(`✓ ${questions.length} preguntas · ${perCat.size} categorías · ${files.length} archivos`)
if (checkOnly) process.exit(0)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, 'exp'), { recursive: true })
const exp = new Map()
const clues = questions.map(({ explanation, ...q }) => {
  const file = slug(q.category)
  if (!exp.has(file)) exp.set(file, {})
  exp.get(file)[q.id] = explanation
  return { ...q, expFile: file }
})
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
writeFileSync(
  join(OUT, 'clues.json'),
  JSON.stringify({ version: pkg.version, generatedAt: new Date().toISOString(), count: clues.length, questions: clues }),
)
for (const [file, obj] of exp) writeFileSync(join(OUT, 'exp', file + '.json'), JSON.stringify(obj))
console.log(`✓ Escrito public/bank (${exp.size} archivos de explicaciones)`)
