// Paso 1 del pipeline: convierte los libros (PDF o .txt ya extraído) en fragmentos de ~10 000 tokens.
// Los libros y el texto NUNCA se suben al repositorio: todo queda en pipeline/work/ (ignorado por git).
//
// Uso:
//   node pipeline/chunk.mjs "<carpeta con los PDF o .txt>"
// Requiere `pdftotext` (poppler-utils) si se pasan PDF. En Windows: instala poppler o usa WSL.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const WORK = join(here, 'work')
const CHUNK_CHARS = 40_000 // ≈ 10k tokens

// Identificación de cada libro por nombre de archivo.
const BOOKS = [
  { key: 'esc_hf', match: /heart failure|esc_hf/i, title: 'ESC Textbook of Heart Failure (2023)' },
  { key: 'esc_cvm', match: /cardiovascular medicine|esc_cvm/i, title: 'ESC Textbook of Cardiovascular Medicine, 3ª ed. (2018)' },
  { key: 'mksap19', match: /mksap/i, title: 'MKSAP 19 – Cardiovascular Medicine (2021)' },
]

const dir = process.argv[2]
if (!dir || !existsSync(dir)) {
  console.error('Uso: node pipeline/chunk.mjs "<carpeta con los libros>"')
  process.exit(1)
}
mkdirSync(WORK, { recursive: true })

const chunks = []
for (const f of readdirSync(dir)) {
  const book = BOOKS.find((b) => b.match.test(f))
  if (!book || !/\.(pdf|txt)$/i.test(f)) continue
  const path = join(dir, f)
  console.log(`→ ${book.title}`)
  const text = f.toLowerCase().endsWith('.pdf') ? execFileSync('pdftotext', [path, '-'], { maxBuffer: 1 << 30 }).toString('utf8') : readFileSync(path, 'utf8')
  const pages = text.split('\f')
  let buf = ''
  let start = 1
  pages.forEach((p, i) => {
    const clean = p
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (buf.length + clean.length > CHUNK_CHARS && buf.length > 5000) {
      chunks.push({ id: `${book.key}-p${start}`, book: book.key, title: book.title, pages: `${start}-${i}`, text: buf })
      buf = ''
      start = i + 1
    }
    buf += `\n[p. ${i + 1}]\n` + clean
  })
  if (buf.trim()) chunks.push({ id: `${book.key}-p${start}`, book: book.key, title: book.title, pages: `${start}-${pages.length}`, text: buf })
}

// Descarta fragmentos casi vacíos (índices, portadas) y bibliografía pura.
const useful = chunks.filter((c) => {
  const refs = (c.text.match(/\bdoi:|et al\.|;\s?\d{1,4}\(\d+\):/gi) ?? []).length
  return c.text.length > 8000 && refs < c.text.length / 400
})
writeFileSync(join(WORK, 'chunks.jsonl'), useful.map((c) => JSON.stringify(c)).join('\n'))
console.log(`✓ ${useful.length} fragmentos útiles (de ${chunks.length}) → pipeline/work/chunks.jsonl`)
for (const b of BOOKS) console.log(`   ${b.key}: ${useful.filter((c) => c.book === b.key).length}`)
console.log(`\nSiguiente paso: node pipeline/generate.mjs --from 0 --count 50 --per-chunk 10`)
console.log(`(${basename(WORK)}/ está en .gitignore; no se sube a GitHub)`)
