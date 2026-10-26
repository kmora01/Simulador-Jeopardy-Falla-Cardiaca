import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useApp } from '../App'
import { addBook, canPickWithHandle, fmtSize, getProgress, listBooks, loadSummaries, markSummary, readSummaries, removeBook } from '../lib/library'
import { Card, Markdown, Modal, PageHeader, Pill, Spinner } from '../components/ui'

// pdf.js pesa: solo se descarga cuando alguien abre un libro.
const PdfReader = lazy(() => import('../components/PdfReader'))

export default function Library() {
  const [tab, setTab] = useState('summaries')
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Estudio" subtitle="Resúmenes propios por tema y tus libros en PDF, capítulo por capítulo." />
      <div className="mb-6 inline-flex rounded-xl bg-white/5 p-1">
        {[
          ['summaries', 'Resúmenes'],
          ['books', 'Mis libros'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === k ? 'bg-jgold text-jblue-night' : 'text-white/70'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'books' ? <Books /> : <Summaries />}
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

/* ---------------- Resúmenes propios ---------------- */

function Summaries() {
  const { user, bank } = useApp()
  const [list, setList] = useState(null)
  const [read, setRead] = useState(new Set())
  const [open, setOpen] = useState(null)

  useEffect(() => {
    loadSummaries().then(setList)
    readSummaries(user.username).then(setRead)
  }, [user])

  const units = useMemo(() => {
    const m = new Map()
    for (const s of list ?? []) {
      if (!m.has(s.unit)) m.set(s.unit, [])
      m.get(s.unit).push(s)
    }
    return [...m]
  }, [list])

  if (!list) return <Spinner />
  if (list.length === 0) return <p className="text-white/60">No hay resúmenes publicados todavía.</p>

  const toggle = async (id) => {
    const next = new Set(read)
    next.has(id) ? next.delete(id) : next.add(id)
    setRead(next)
    await markSummary(user.username, id, next.has(id))
  }

  return (
    <>
      <p className="mb-5 text-sm text-white/60">
        {read.size} de {list.length} temas estudiados. Cada resumen es original, está alineado con las guías vigentes y termina con una autoevaluación usando preguntas del banco.
      </p>
      <div className="flex flex-col gap-6">
        {units.map(([unit, items]) => (
          <section key={unit}>
            <h2 className="category-text text-xl text-jgold mb-3">{unit}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((s) => (
                <button key={s.id} onClick={() => setOpen(s)} className="glass rounded-xl p-4 text-left hover:border-jgold/40 border border-transparent transition flex items-start gap-3">
                  <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border grid place-items-center text-xs ${read.has(s.id) ? 'bg-emerald-500 border-emerald-400' : 'border-white/30'}`}>
                    {read.has(s.id) ? '✓' : ''}
                  </span>
                  <span>
                    <span className="block font-semibold">{s.title}</span>
                    {s.books.length > 0 && <span className="block text-xs text-white/50 mt-1">Para leer con: {s.books.join(' · ')}</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <Modal wide onClose={() => setOpen(null)}>
            <SummaryView summary={open} bank={bank} isRead={read.has(open.id)} onToggle={() => toggle(open.id)} onClose={() => setOpen(null)} />
          </Modal>
        )}
      </AnimatePresence>
    </>
  )
}

function SummaryView({ summary, bank, isRead, onToggle, onClose }) {
  const quiz = useMemo(() => {
    if (!bank) return []
    const qs = bank.questions.filter((q) => summary.categories.includes(q.category) && !q.final)
    return qs.sort(() => Math.random() - 0.5).slice(0, 6)
  }, [bank, summary])
  const [shown, setShown] = useState(new Set())

  return (
    <div className="p-5 sm:p-7">
      <div className="text-xs uppercase tracking-wider text-jgold/80 mb-1">{summary.unit}</div>
      <h2 className="category-text text-2xl sm:text-3xl mb-2">{summary.title}</h2>
      {summary.books.length > 0 && <p className="text-xs text-white/50 mb-4">Para leer con: {summary.books.join(' · ')}</p>}
      <Markdown>{summary.body}</Markdown>

      {quiz.length > 0 && (
        <div className="mt-8">
          <h3 className="category-text text-xl text-jgold mb-3">Autoevaluación rápida</h3>
          <div className="flex flex-col gap-2">
            {quiz.map((q) => (
              <button
                key={q.id}
                onClick={() => setShown((s) => new Set(s).add(q.id))}
                className="rounded-xl bg-jblue/30 border border-blue-400/20 p-3 text-left"
              >
                <div className="text-sm">{q.clue}</div>
                <div className={`mt-2 text-sm font-semibold ${shown.has(q.id) ? 'text-jgold' : 'text-white/40'}`}>
                  {shown.has(q.id) ? q.answer : 'Toca para ver la respuesta'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 sm:-mx-7 mt-6 flex gap-2 bg-[#0a1050]/95 px-5 sm:px-7 py-3 backdrop-blur">
        <button className={`${isRead ? 'btn-ghost' : 'btn-ok'} flex-1 py-2`} onClick={onToggle}>
          {isRead ? 'Marcar como pendiente' : '✓ Marcar como estudiado'}
        </button>
        <button className="btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
