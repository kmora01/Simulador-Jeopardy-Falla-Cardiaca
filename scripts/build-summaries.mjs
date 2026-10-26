// Compila los resúmenes propios (content/summaries/*.md) a public/summaries.json.
// Formato: líneas `clave: valor` de cabecera, una línea `---` y luego el cuerpo en Markdown.
// Son textos originales escritos para el simulador; nunca se copia texto de los libros.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'content/summaries'
const LIST = ['categories', 'books']
const out = []
let errors = 0

for (const f of readdirSync(DIR).filter((n) => n.endsWith('.md')).sort()) {
  const raw = readFileSync(join(DIR, f), 'utf8').replace(/\r\n/g, '\n')
  const cut = raw.indexOf('\n---\n')
  if (cut < 0) {
    console.error(`✗ ${f}: falta la línea --- tras la cabecera`)
    errors++
    continue
  }
  const meta = {}
  for (const line of raw.slice(0, cut).split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m) meta[m[1]] = LIST.includes(m[1]) ? m[2].split(';').map((s) => s.trim()).filter(Boolean) : m[2].trim()
  }
  for (const k of ['title', 'unit']) {
    if (!meta[k]) {
      console.error(`✗ ${f}: falta "${k}"`)
      errors++
    }
  }
  out.push({ id: f.replace(/\.md$/, ''), order: out.length, ...meta, categories: meta.categories ?? [], books: meta.books ?? [], body: raw.slice(cut + 5).trim() })
}

if (errors) process.exit(1)
writeFileSync('public/summaries.json', JSON.stringify(out))
console.log(`✓ ${out.length} resúmenes → public/summaries.json`)
