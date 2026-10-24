// Paso 2: envía un lote de fragmentos a la Message Batches API (50 % más barata que la API normal).
//
// Uso:
//   export ANTHROPIC_API_KEY=...          (o `ant auth login`)
//   node pipeline/generate.mjs --from 0 --count 50 --per-chunk 10
//   node pipeline/generate.mjs --book esc_hf --count 30
//   node pipeline/generate.mjs --dry-run   (muestra el costo estimado sin enviar nada)
// Después: node pipeline/collect.mjs  (descarga resultados cuando el lote termine, normalmente <1 h)
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODEL, SCHEMA, SYSTEM, userPrompt } from './prompt.mjs'
import { loadAll } from '../scripts/bank-io.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const WORK = join(here, 'work')
const CONTENT = join(here, '..', 'content', 'questions')

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name)
  return i > -1 ? process.argv[i + 1] : def
}
const from = +arg('from', 0)
const count = +arg('count', 20)
const perChunk = +arg('per-chunk', 10)
const book = arg('book', null)
const dry = process.argv.includes('--dry-run')

const chunksPath = join(WORK, 'chunks.jsonl')
if (!existsSync(chunksPath)) {
  console.error('Primero ejecuta: node pipeline/chunk.mjs "<carpeta de libros>"')
  process.exit(1)
}
const state = existsSync(join(WORK, 'state.json')) ? JSON.parse(readFileSync(join(WORK, 'state.json'), 'utf8')) : { batches: [], used: [] }
let chunks = readFileSync(chunksPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
if (book) chunks = chunks.filter((c) => c.book === book)
chunks = chunks.filter((c) => !state.used.includes(c.id)).slice(from, from + count)
if (!chunks.length) {
  console.log('No quedan fragmentos sin procesar con esos filtros.')
  process.exit(0)
}

const existing = loadAll(CONTENT).map((q) => q.answer)

// Estimación: ~4 caracteres/token de entrada; ~1 300 tokens de salida por pregunta.
const inTok = chunks.reduce((n, c) => n + c.text.length / 4 + 3500, 0)
const outTok = chunks.length * perChunk * 1300
const price = MODEL.includes('sonnet') ? [2, 10] : MODEL.includes('haiku') ? [0.1, 0.5] : [4, 20]
const usd = ((inTok * price[0] + outTok * price[1]) / 1e6) * 0.5
console.log(`${chunks.length} fragmentos × ${perChunk} preguntas ≈ ${chunks.length * perChunk} preguntas con ${MODEL}`)
console.log(`Costo estimado (Batches API, 50 % de descuento): ~US$ ${usd.toFixed(2)}`)
if (dry) process.exit(0)

const client = new Anthropic()
const batch = await client.messages.batches.create({
  requests: chunks.map((c) => ({
    custom_id: c.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
    params: {
      model: MODEL,
      max_tokens: 64000,
      output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt(c, perChunk, existing) }],
    },
  })),
})
mkdirSync(WORK, { recursive: true })
state.batches.push({ id: batch.id, createdAt: new Date().toISOString(), chunks: chunks.map((c) => ({ id: c.id, custom_id: c.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64), title: c.title, pages: c.pages })), collected: false })
state.used.push(...chunks.map((c) => c.id))
writeFileSync(join(WORK, 'state.json'), JSON.stringify(state, null, 2))
console.log(`✓ Lote enviado: ${batch.id} (${batch.processing_status}). Luego ejecuta: node pipeline/collect.mjs`)
