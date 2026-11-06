import Dexie from 'dexie'

// Biblioteca personal: los PDF viven SOLO en el navegador de cada fellow (IndexedDB o un
// permiso de lectura del sistema de archivos). Nada de esto se sube al sitio publicado.
export const libDb = new Dexie('cardio-libros')

libDb.version(1).stores({
  books: '++id, user, addedAt',
  progress: '[user+bookId], user',
  summaries: '[user+id], user',
})

export const canPickWithHandle = typeof window !== 'undefined' && 'showOpenFilePicker' in window

export async function listBooks(user) {
  const rows = await libDb.books.where('user').equals(user).toArray()
  return rows.sort((a, b) => a.addedAt - b.addedAt)
}

/** Pide un PDF al usuario. Con File System Access guarda solo el permiso (no copia el archivo). */
export async function addBook(user, fileFromInput = null) {
  if (fileFromInput) {
    return libDb.books.add({ user, name: fileFromInput.name, size: fileFromInput.size, file: fileFromInput, addedAt: Date.now() })
  }
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Libro en PDF', accept: { 'application/pdf': ['.pdf'] } }],
    excludeAcceptAllOption: true,
  })
  const f = await handle.getFile()
  return libDb.books.add({ user, name: f.name, size: f.size, handle, addedAt: Date.now() })
}

export async function removeBook(user, id) {
  await libDb.transaction('rw', libDb.books, libDb.progress, async () => {
    await libDb.books.delete(id)
    await libDb.progress.delete([user, id])
  })
}

/** Devuelve el File del libro. `ask` = true solo dentro de un clic (el navegador lo exige). */
export async function bookFile(book, ask = false) {
  if (book.file) return book.file
  const opts = { mode: 'read' }
  let perm = await book.handle.queryPermission(opts)
  if (perm !== 'granted' && ask) perm = await book.handle.requestPermission(opts)
  if (perm !== 'granted') return null
  return book.handle.getFile()
}

export async function getProgress(user, bookId) {
  return (await libDb.progress.get([user, bookId])) ?? { user, bookId, page: 1, done: [] }
}

export async function saveProgress(user, bookId, patch) {
  const cur = await getProgress(user, bookId)
  await libDb.progress.put({ ...cur, ...patch, user, bookId, updatedAt: Date.now() })
}

export const fmtSize = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`)

/* ---------- Libro de lectura (public/study/) ---------- */

let studyPromise = null
export function loadStudyIndex() {
  if (!studyPromise) {
    studyPromise = fetch(import.meta.env.BASE_URL + 'study/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { units: [], topics: [], where: {} }))
      .catch(() => {
        studyPromise = null
        return { units: [], topics: [], where: {} }
      })
  }
  return studyPromise
}

const topicCache = new Map()
export function loadTopic(id) {
  if (!topicCache.has(id)) {
    topicCache.set(
      id,
      fetch(import.meta.env.BASE_URL + 'study/t/' + id + '.json').then((r) => {
        if (!r.ok) throw new Error('No se pudo cargar el tema')
        return r.json()
      }),
    )
    topicCache.get(id).catch(() => topicCache.delete(id))
  }
  return topicCache.get(id)
}

// Los temas estudiados se guardan en la misma tabla que los resúmenes, con prefijo "t:".
export async function readTopics(user) {
  const rows = await libDb.summaries.where('user').equals(user).toArray()
  return new Set(rows.filter((r) => r.id.startsWith('t:')).map((r) => r.id.slice(2)))
}

export const markTopic = (user, id, read) => markSummary(user, 't:' + id, read)

export async function markSummary(user, id, read) {
  if (read) await libDb.summaries.put({ user, id, at: Date.now() })
  else await libDb.summaries.delete([user, id])
}
