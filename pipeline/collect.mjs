// Paso 3: descarga los lotes terminados, valida y deduplica, y escribe content/questions/gen-*.json.
// Uso: node pipeline/collect.mjs [--wait]
// Luego: npm run bank:check  →  revisar  →  git commit + push (GitHub Pages se actualiza solo).
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES } from './prompt.mjs'
import { loadAll } from '../scripts/bank-io.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const WORK = join(here, 'work')
const CONTENT = join(here, '..', 'content', 'questions')
const wait = process.argv.includes('--wait')

const statePath = join(WORK, 'state.json')
if (!existsSync(statePath)) {
  console.error('No hay lotes enviados. Usa primero pipeline/generate.mjs')
  process.exit(1)
}
const state = JSON.parse(readFileSync(statePath, 'utf8'))
const client = new Anthropic()

const norm = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^¿?\s*(que|quien|cual)\s+(es|son|fue)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const existing = loadAll(CONTENT)
const seenAnswers = new Set(existing.map((q) => norm(q.answer)))
let nextNum = existing.filter((q) => q.id.startsWith('g')).length + 1

for (const b of state.batches.filter((x) => !x.collected)) {
  let info = await client.messages.batches.retrieve(b.id)
  while (wait && info.processing_status !== 'ended') {
    console.log(`${b.id}: ${info.processing_status} (${info.request_counts.processing} en proceso)…`)
    await new Promise((r) => setTimeout(r, 60_000))
    info = await client.messages.batches.retrieve(b.id)
  }
  if (info.processing_status !== 'ended') {
    console.log(`${b.id}: aún ${info.processing_status}. Vuelve a intentar más tarde o usa --wait.`)
    continue
  }
  const out = []
  let dupes = 0
  const failed = []
  for await (const r of await client.messages.batches.results(b.id)) {
    const meta = b.chunks.find((c) => c.custom_id === r.custom_id)
    if (r.result.type !== 'succeeded' || r.result.message.stop_reason === 'refusal') {
      failed.push(r.custom_id)
      continue
    }
    const text = r.result.message.content.find((x) => x.type === 'text')?.text
    let data
    try {
      data = JSON.parse(text)
    } catch {
      failed.push(r.custom_id)
      continue
    }
    for (const q of data.questions) {
      const k = norm(q.answer)
      if (seenAnswers.has(k)) {
        dupes++
        continue
      }
      seenAnswers.add(k)
      out.push({
        id: `g${String(nextNum++).padStart(5, '0')}`,
        category: q.category,
        subspecialty: CATEGORIES[q.category],
        difficulty: q.difficulty,
        clue: q.clue,
        answer: q.answer,
        accept: q.accept,
        reject: q.reject,
        explanation: q.explanation,
        source: q.source || `${meta?.title}, pp. ${meta?.pages}`,
        guideline: q.guideline,
        tags: q.tags,
        generated: { batch: b.id, chunk: meta?.id },
      })
    }
  }
  const file = join(CONTENT, `gen-${b.id.slice(-10)}.json`)
  writeFileSync(file, JSON.stringify(out, null, 1))
  b.collected = true
  b.failed = failed
  console.log(`✓ ${b.id}: ${out.length} preguntas nuevas, ${dupes} duplicadas descartadas, ${failed.length} fragmentos fallidos → ${file}`)
}
writeFileSync(statePath, JSON.stringify(state, null, 2))
console.log('\nSiguiente: npm run bank:check && git add content && git commit -m "Banco: nuevo lote" && git push')
