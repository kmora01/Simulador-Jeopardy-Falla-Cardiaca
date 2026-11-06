import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useApp } from '../App'
import { addBook, canPickWithHandle, fmtSize, getProgress, listBooks, removeBook } from '../lib/library'
import { Card, PageHeader, Pill, Spinner } from '../components/ui'
import StudyBook from './StudyBook'

// pdf.js pesa: solo se descarga cuando alguien abre un libro.
const PdfReader = lazy(() => import('../components/PdfReader'))

export default function Library() {
  const [tab, setTab] = useState('book')
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Estudio" subtitle="Libro de lectura por temas con todo lo que pregunta el banco, y tus libros en PDF capítulo por capítulo." />
      <div className="mb-6 inline-flex rounded-xl bg-white/5 p-1">
        {[
          ['book', 'Libro de lectura'],
          ['books', 'Mis libros'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === k ? 'bg-jgold text-jblue-night' : 'text-white/70'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'books' ? <Books /> : <StudyBook />}
    </div>
  )
}

/* ---------------- Libros locales ---------------- */

function Books() {
  const { user } = useApp()
  const [books, setBooks] = useState(null)
  const [progress, setProgress] = useState({})
  const [reading, setReading] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const refresh = async () => {
    const list = await listBooks(user.username)
    const prog = {}
    for (const b of list) prog[b.id] = await getProgress(user.username, b.id)
    setProgress(prog)
    setBooks(list)
  }

  useEffect(() => {
    refresh()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (file = null) => {
    setError(null)
    try {
      await addBook(user.username, file)
      await refresh()
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e?.message || 'No se pudo agregar el libro')
    }
  }

  if (!books) return <Spinner />

  return (
    <>
      <Card className="mb-6 border border-jgold/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 text-sm text-white/75">
            <p className="font-semibold text-white mb-1">🔒 Tus libros se quedan en tu dispositivo</p>
            Elige el PDF desde tu computadora o celular. Se abre solo en este navegador: no se sube al sitio ni lo ve nadie más. El índice del PDF se usa como lista de capítulos para estudiarlos en orden y marcar los que terminaste.
          </div>
          <button className="btn-gold px-5 py-3 shrink-0" onClick={() => (canPickWithHandle ? add() : inputRef.current?.click())}>
            + Agregar libro (PDF)
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) add(f)
            }}
          />
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </Card>

      {books.length === 0 ? (
        <p className="text-white/60 text-center py-10">Todavía no agregaste libros en este dispositivo.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <Card key={b.id} className="flex flex-col gap-3">
              <div className="text-4xl">📕</div>
              <div className="font-semibold leading-snug break-words">{b.name.replace(/\.pdf$/i, '')}</div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="gray">{fmtSize(b.size)}</Pill>
                <Pill tone="blue">Página {progress[b.id]?.page ?? 1}</Pill>
                {progress[b.id]?.done?.length > 0 && <Pill tone="green">{progress[b.id].done.length} capítulos estudiados</Pill>}
              </div>
              <div className="mt-auto flex gap-2">
                <button className="btn-gold flex-1 py-2" onClick={() => setReading(b)}>
                  {progress[b.id]?.page > 1 ? 'Continuar' : 'Abrir'}
                </button>
                <button
                  className="btn-ghost text-sm"
                  onClick={async () => {
                    if (confirm(`¿Quitar «${b.name}» de este navegador? El archivo original no se borra.`)) {
                      await removeBook(user.username, b.id)
                      refresh()
                    }
                  }}
                >
                  Quitar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {reading && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#030733]"><Spinner label="Cargando el lector…" /></div>}>
          <PdfReader
            book={reading}
            user={user.username}
            onClose={() => {
              setReading(null)
              refresh()
            }}
          />
        </Suspense>
      )}
    </>
  )
}
