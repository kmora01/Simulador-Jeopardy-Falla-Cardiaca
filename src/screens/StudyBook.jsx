import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App'
import { loadStudyIndex, loadTopic, markTopic, readTopics } from '../lib/library'
import { trials } from '../lib/trials'
import { Card, ClinicalImage, Markdown, Pill, Spinner } from '../components/ui'

// "Libro de lectura": cada tema reúne sus resúmenes propios, los apuntes de todas las preguntas
// del banco que le corresponden (pista + explicación) y los ensayos relacionados.
// Se compila con scripts/build-study.mjs a public/study/.

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const LAST = (user) => `cardio-jeopardy:lectura:${user}`
const readLast = (user) => {
  try {
    return localStorage.getItem(LAST(user))
  } catch {
    return null
  }
}
const saveLast = (user, id) => {
  try {
    localStorage.setItem(LAST(user), id)
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

const minutes = (words) => Math.max(1, Math.round(words / 200))
const trialById = new Map(trials.map((t) => [t.id, t]))

export default function StudyBook() {
  const { user, bank } = useApp()
  const [index, setIndex] = useState(null)
  const [read, setRead] = useState(new Set())
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null) // { id, focus }
  const [last, setLast] = useState(() => readLast(user.username))

  useEffect(() => {
    loadStudyIndex().then(setIndex)
    readTopics(user.username).then(setRead)
  }, [user])

  const units = useMemo(() => {
    const m = new Map()
    for (const t of index?.topics ?? []) {
      if (!m.has(t.unit)) m.set(t.unit, [])
      m.get(t.unit).push(t)
    }
    return [...m]
  }, [index])

  const byId = useMemo(() => new Map((index?.topics ?? []).map((t) => [t.id, t])), [index])

  const results = useMemo(() => {
    const q = norm(query).trim()
    if (q.length < 3 || !bank || !index) return null
    const words = q.split(/\s+/)
    const hits = []
    for (const x of bank.questions) {
      const hay = norm(x.answer + ' ' + x.clue + ' ' + (x.tags ?? []).join(' '))
      if (words.every((w) => hay.includes(w))) hits.push(x)
      if (hits.length >= 40) break
    }
    const topics = (index.topics ?? []).filter((t) => words.every((w) => norm(t.title + ' ' + t.summaries.join(' ')).includes(w)))
    return { hits, topics }
  }, [query, bank, index])

  if (!index) return <Spinner />
  if (index.topics.length === 0) return <p className="text-white/60">El libro de lectura todavía no está compilado.</p>

  const openTopic = (id, focus = null) => {
    setOpen({ id, focus })
    saveLast(user.username, id)
    setLast(id)
  }

  const toggle = async (id) => {
    const next = new Set(read)
    next.has(id) ? next.delete(id) : next.add(id)
    setRead(next)
    await markTopic(user.username, id, next.has(id))
  }

  const totalNotes = index.topics.reduce((n, t) => n + t.notes, 0)
  const order = index.topics.map((t) => t.id)

  return (
    <>
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[14rem] text-sm text-white/75">
            <p className="font-semibold text-white mb-1">📖 Libro de lectura</p>
            {index.topics.length} temas en {units.length} unidades. Cada tema trae un resumen propio y los apuntes de <b>todas</b> las preguntas del banco que le corresponden ({totalNotes} en total), con su explicación, además de los ensayos relacionados.
          </div>
          <div className="text-right">
            <div className="value-text text-3xl">
              {read.size}/{index.topics.length}
            </div>
            <div className="text-xs text-white/60">temas leídos</div>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-jgold transition-all" style={{ width: `${(100 * read.size) / index.topics.length}%` }} />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el libro: un concepto, un signo, un ensayo…"
            className="flex-1 rounded-xl bg-white/5 border border-white/15 px-4 py-2.5 text-sm outline-none focus:border-jgold/60"
          />
          {last && byId.has(last) && !query && (
            <button className="btn-gold px-4 py-2.5 text-sm" onClick={() => openTopic(last)}>
              Continuar: {byId.get(last).title}
            </button>
          )}
        </div>
      </Card>

      {results ? (
        <SearchResults results={results} where={index.where} byId={byId} onOpen={openTopic} />
      ) : (
        <div className="flex flex-col gap-7">
          {units.map(([unit, items]) => {
            const done = items.filter((t) => read.has(t.id)).length
            return (
              <section key={unit}>
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h2 className="category-text text-xl text-jgold">{unit}</h2>
                  <span className="text-xs text-white/50 shrink-0">
                    {done}/{items.length} leídos
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTopic(t.id)}
                      className="glass rounded-xl p-4 text-left hover:border-jgold/40 border border-transparent transition flex items-start gap-3"
                    >
                      <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border grid place-items-center text-xs ${read.has(t.id) ? 'bg-emerald-500 border-emerald-400' : 'border-white/30'}`}>
                        {read.has(t.id) ? '✓' : ''}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug">{t.title}</span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {t.summaries.length > 0 && <Pill tone="gold">Resumen</Pill>}
                          <Pill tone="blue">{t.notes} apuntes</Pill>
                          {t.trials > 0 && <Pill tone="green">{t.trials} {t.trials === 1 ? 'ensayo' : 'ensayos'}</Pill>}
                          <Pill tone="gray">~{minutes(t.words)} min</Pill>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {open && (
        <TopicReader
          key={open.id + (open.focus ?? '')}
          id={open.id}
          focus={open.focus}
          isRead={read.has(open.id)}
          onToggle={() => toggle(open.id)}
          onClose={() => setOpen(null)}
          prev={order[order.indexOf(open.id) - 1]}
          next={order[order.indexOf(open.id) + 1]}
          byId={byId}
          onGo={(id) => openTopic(id)}
        />
      )}
    </>
  )
}

function SearchResults({ results, where, byId, onOpen }) {
  const { hits, topics } = results
  if (!hits.length && !topics.length) return <p className="text-white/60 text-center py-10">Sin resultados. Prueba con otra palabra.</p>
  return (
    <div className="flex flex-col gap-2">
      {topics.map((t) => (
        <button key={t.id} onClick={() => onOpen(t.id)} className="glass rounded-xl p-3 text-left border border-jgold/30 hover:border-jgold/60">
          <span className="text-xs text-jgold/80">Tema · {t.unit}</span>
          <span className="block font-semibold">{t.title}</span>
        </button>
      ))}
      {hits.map((q) => (
        <button key={q.id} onClick={() => onOpen(where[q.id], q.id)} className="glass rounded-xl p-3 text-left border border-transparent hover:border-jgold/40">
          <span className="text-xs text-white/50">{byId.get(where[q.id])?.title}</span>
          <span className="block font-semibold text-jgold">{q.answer}</span>
          <span className="block text-sm text-white/75 mt-1">{q.clue}</span>
        </button>
      ))}
      {hits.length >= 40 && <p className="text-xs text-white/50 text-center">Se muestran los primeros 40 apuntes; afina la búsqueda para ver otros.</p>}
    </div>
  )
}

/* ---------------- Lector de un tema ---------------- */

function TopicReader({ id, focus, isRead, onToggle, onClose, prev, next, byId, onGo }) {
  const [topic, setTopic] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [compact, setCompact] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    loadTopic(id).then(setTopic, (e) => setError(e.message))
  }, [id])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Desde la búsqueda: saltar al apunte buscado.
  useEffect(() => {
    if (!topic || !focus) return
    requestAnimationFrame(() => document.getElementById('n-' + focus)?.scrollIntoView({ block: 'start' }))
  }, [topic, focus])

  const groups = useMemo(() => {
    if (!topic) return []
    const f = norm(filter).trim()
    const m = new Map()
    for (const n of topic.notes) {
      if (f && !norm(n.concept + ' ' + n.clue + ' ' + n.explanation).includes(f)) continue
      if (!m.has(n.category)) m.set(n.category, [])
      m.get(n.category).push(n)
    }
    return [...m]
  }, [topic, filter])

  const jump = (sec) => document.getElementById('sec-' + sec)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  const tr = topic?.trials.map((t) => trialById.get(t)).filter(Boolean) ?? []
  const shown = groups.reduce((n, [, xs]) => n + xs.length, 0)

  return (
    <div className="fixed inset-0 z-50 bg-[#030733] flex flex-col">
      <header className="border-b border-white/10 bg-[#0a1050]/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-4xl flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-jgold/80 truncate">{byId.get(id)?.unit}</div>
            <h2 className="category-text text-xl sm:text-2xl leading-tight">{byId.get(id)?.title}</h2>
          </div>
          <button className="btn-ghost shrink-0" onClick={onClose}>
            Cerrar ✕
          </button>
        </div>
        {topic && (
          <div className="mx-auto max-w-4xl mt-3 flex flex-wrap items-center gap-2 text-sm">
            {topic.summaries.length > 0 && (
              <button className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/10" onClick={() => jump('resumen')}>
                Resumen
              </button>
            )}
            {topic.notes.length > 0 && (
              <button className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/10" onClick={() => jump('apuntes')}>
                Apuntes ({topic.notes.length})
              </button>
            )}
            {tr.length > 0 && (
              <button className="rounded-full border border-white/15 px-3 py-1 hover:bg-white/10" onClick={() => jump('ensayos')}>
                Ensayos ({tr.length})
              </button>
            )}
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar apuntes…"
              className="ml-auto w-full sm:w-52 rounded-full bg-white/5 border border-white/15 px-3 py-1 outline-none focus:border-jgold/60"
            />
            <label className="flex items-center gap-2 text-white/70 cursor-pointer select-none">
              <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="accent-[#d69f4c]" />
              Solo pista y concepto
            </label>
          </div>
        )}
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6">
          {error && <p className="text-rose-300">{error}</p>}
          {!topic && !error && <Spinner />}
          {topic && (
            <>
              {topic.summaries.length > 0 && (
                <section id="sec-resumen" className="scroll-mt-4 mb-10">
                  {topic.summaries.map((s) => (
                    <article key={s.id} className="mb-8">
                      {topic.summaries.length > 1 && <h3 className="category-text text-xl text-jgold mb-2">{s.title}</h3>}
                      {s.books.length > 0 && <p className="text-xs text-white/50 mb-3">Para leer con: {s.books.join(' · ')}</p>}
                      <Markdown>{s.body}</Markdown>
                    </article>
                  ))}
                </section>
              )}

              {topic.notes.length > 0 && (
                <section id="sec-apuntes" className="scroll-mt-4 mb-10">
                  <h3 className="category-text text-2xl text-jgold mb-1">Apuntes del banco</h3>
                  <p className="text-sm text-white/60 mb-5">
                    Lo que necesitas saber para responder cada pregunta de este tema: la pista como afirmación, el concepto y su explicación.
                    {filter && ` Mostrando ${shown} de ${topic.notes.length}.`}
                  </p>
                  {groups.map(([cat, notes]) => (
                    <div key={cat} className="mb-8">
                      <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3 border-b border-white/10 pb-1">{cat}</h4>
                      <div className="flex flex-col gap-3">
                        {notes.map((n) => (
                          <Note key={n.id} n={n} compact={compact} focused={n.id === focus} />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {tr.length > 0 && (
                <section id="sec-ensayos" className="scroll-mt-4 mb-10">
                  <h3 className="category-text text-2xl text-jgold mb-4">Ensayos relacionados</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tr.map((t) => (
                      <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-bold text-jgold">{t.name}</span>
                          <Pill tone="gray">{t.year}</Pill>
                        </div>
                        <p className="text-white/80">
                          <b>{t.int}</b> vs. {t.comp} · {t.pop}
                        </p>
                        <p className="mt-1 text-white/70">
                          <span className="text-white/50">Objetivo:</span> {t.outcome}
                        </p>
                        <p className="mt-1 text-white/90">{t.result}</p>
                        {t.pearl && <p className="mt-2 text-emerald-200/90">💡 {t.pearl}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <footer className="border-t border-white/10 bg-[#0a1050]/95 px-4 py-3">
        <div className="mx-auto max-w-4xl flex gap-2">
          <button className="btn-ghost text-sm disabled:opacity-30" disabled={!prev} onClick={() => onGo(prev)} title={byId.get(prev)?.title}>
            ← <span className="hidden sm:inline">Anterior</span>
          </button>
          <button className={`${isRead ? 'btn-ghost' : 'btn-ok'} flex-1 py-2`} onClick={onToggle}>
            {isRead ? 'Marcar como pendiente' : '✓ Marcar como leído'}
          </button>
          <button className="btn-ghost text-sm disabled:opacity-30" disabled={!next} onClick={() => onGo(next)} title={byId.get(next)?.title}>
            <span className="hidden sm:inline">Siguiente</span> →
          </button>
        </div>
      </footer>
    </div>
  )
}

function Note({ n, compact, focused }) {
  return (
    <article id={'n-' + n.id} className={`scroll-mt-4 rounded-xl border p-4 ${focused ? 'border-jgold/70 bg-jgold/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-start justify-between gap-3">
        <h5 className="font-bold text-jgold leading-snug">{n.concept}</h5>
        <span className="shrink-0 text-[10px] tracking-widest text-white/40" title={`Dificultad ${n.difficulty} de 5`}>
          {'●'.repeat(n.difficulty)}
          {'○'.repeat(5 - n.difficulty)}
        </span>
      </div>
      <p className="mt-1 text-sm text-white/80 italic">{n.clue}</p>
      {n.image && (
        <div className="mt-3">
          <ClinicalImage src={n.image} maxH="max-h-[30vh]" />
        </div>
      )}
      {!compact && (
        <div className="mt-3 text-sm">
          <Markdown>{n.explanation}</Markdown>
          {n.guideline && <p className="mt-2 text-xs text-white/40">Fuente: {n.guideline}</p>}
        </div>
      )}
    </article>
  )
}
