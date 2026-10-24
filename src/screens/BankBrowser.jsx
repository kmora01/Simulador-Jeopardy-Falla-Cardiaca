import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Fuse from 'fuse.js'
import { useApp } from '../App'
import { playedSet } from '../lib/db'
import { Card, PageHeader, Pill, Spinner } from '../components/ui'
import { ExplanationModal } from './Review'

const PAGE = 40

export default function BankBrowser() {
  const { user, bank } = useApp()
  const [played, setPlayed] = useState(null)
  const [sub, setSub] = useState('')
  const [cat, setCat] = useState('')
  const [diff, setDiff] = useState('')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [showAnswers, setShowAnswers] = useState(false)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    playedSet(user.username).then(setPlayed)
  }, [user])

  const fuse = useMemo(() => (bank ? new Fuse(bank.questions, { keys: ['clue', 'answer', 'accept', 'category', 'tags'], threshold: 0.35, ignoreLocation: true }) : null), [bank])
  const cats = useMemo(() => (bank ? [...new Set(bank.questions.filter((q) => !sub || q.subspecialty === sub).map((q) => q.category))].sort() : []), [bank, sub])

  const list = useMemo(() => {
    if (!bank || !played) return []
    let qs = query.trim() ? fuse.search(query.trim()).map((r) => r.item) : bank.questions
    if (sub) qs = qs.filter((q) => q.subspecialty === sub)
    if (cat) qs = qs.filter((q) => q.category === cat)
    if (diff) qs = qs.filter((q) => q.difficulty === +diff)
    if (status === 'played') qs = qs.filter((q) => played.has(q.id))
    if (status === 'new') qs = qs.filter((q) => !played.has(q.id))
    return qs
  }, [bank, played, query, sub, cat, diff, status, fuse])

  useEffect(() => setPage(1), [query, sub, cat, diff, status])

  if (!bank || !played) return <Spinner />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="Banco de preguntas" subtitle={`${bank.questions.length} preguntas · ${bank.categories.length} categorías · ${bank.subspecialties.length} subespecialidades`}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} className="accent-[#ffcc00] h-4 w-4" />
          Mostrar respuestas
        </label>
      </PageHeader>
      <Card className="mb-4 !p-4">
        <div className="text-xs text-jgold/80 mb-3">
          ⚠️ Leer pistas aquí no las marca como jugadas, pero sí te “spoilea” el tablero. Úsalo para estudiar categorías ya jugadas o para buscar un tema.
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input className="input !py-2 lg:col-span-2" placeholder="Buscar término, fármaco, ensayo…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={sub} onChange={(v) => { setSub(v); setCat('') }} options={bank.subspecialties} placeholder="Todas las subespecialidades" />
          <Select value={cat} onChange={setCat} options={cats} placeholder="Todas las categorías" />
          <div className="flex gap-2">
            <Select value={diff} onChange={setDiff} options={['1', '2', '3', '4', '5']} placeholder="Nivel" />
            <Select value={status} onChange={setStatus} options={[['new', 'Nuevas'], ['played', 'Jugadas']]} placeholder="Todas" />
          </div>
        </div>
      </Card>
      <div className="text-sm text-white/50 mb-2">{list.length} resultados</div>
      <div className="grid gap-2">
        {list.slice(0, page * PAGE).map((q) => (
          <button key={q.id} onClick={() => setOpen(q)} className="glass rounded-xl p-4 text-left hover:border-jgold/40 transition">
            <div className="flex flex-wrap gap-2 mb-1.5">
              <Pill>{q.subspecialty}</Pill>
              <Pill tone="gray">{q.category}</Pill>
              <Pill tone="gray">Nivel {q.difficulty}</Pill>
              {played.has(q.id) && <Pill tone="green">Jugada</Pill>}
              {q.final && <Pill tone="gold">Final</Pill>}
            </div>
            <div className="text-white/90">{q.clue}</div>
            {showAnswers && <div className="text-jgold font-semibold mt-1">{q.answer}</div>}
          </button>
        ))}
      </div>
      {list.length > page * PAGE && (
        <div className="text-center mt-5">
          <button className="btn-ghost" onClick={() => setPage((p) => p + 1)}>
            Cargar más
          </button>
        </div>
      )}
      <AnimatePresence>{open && <ExplanationModal q={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select className="input !py-2 [&>option]:bg-[#0a1060]" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o]
        return (
          <option key={v} value={v}>
            {l}
          </option>
        )
      })}
    </select>
  )
}
