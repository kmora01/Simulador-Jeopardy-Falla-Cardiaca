// Lectura compartida del banco fuente (content/questions/*.json|*.md).
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Formato .md (para escribir a mano):
//   @@@ <id>
//   category: IC CRÓNICA
//   subspecialty: Insuficiencia cardíaca
//   difficulty: 3
//   clue: ...
//   answer: ¿Qué es ...?
//   accept: variante 1 | variante 2
//   reject: ... | ...            (opcional)
//   source / guideline / tags / final / finalCategory  (opcionales)
//   <línea en blanco>
//   explicación en Markdown hasta el siguiente @@@
// Las líneas "clave: valor" antes del primer @@@ son valores por defecto para todo el archivo.
export function parseMd(text) {
  const [pre, ...blocks] = text.split(/^@@@ /m)
  const defaults = {}
  for (const line of pre.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/)
    if (m) defaults[m[1]] = m[2].trim()
  }
  return blocks
    .map((block) => {
      const [idLine, ...rest] = block.split('\n')
      const q = { ...defaults, id: idLine.trim() }
      let i = 0
      for (; i < rest.length && rest[i].trim() !== ''; i++) {
        const m = rest[i].match(/^(\w+):\s*(.*)$/)
        if (!m) continue
        const [, k, v] = m
        if (['accept', 'reject', 'tags'].includes(k)) q[k] = v.split('|').map((x) => x.trim()).filter(Boolean)
        else if (k === 'difficulty') q[k] = +v
        else if (k === 'final') q[k] = v.trim() === 'true'
        else q[k] = v.trim()
      }
      q.explanation = rest.slice(i).join('\n').trim()
      return q
    })
}


export function loadAll(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => /\.(json|md)$/.test(f))
    .flatMap((f) => {
      const raw = readFileSync(join(dir, f), 'utf8')
      return f.endsWith('.md') ? parseMd(raw) : JSON.parse(raw)
    })
}
