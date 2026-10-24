import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../App'
import { recordAttempt, removeSrs, srsCards, updateSrs } from '../lib/db'
import { loadExplanation } from '../lib/bank'
import { checkAnswer } from '../lib/match'
import { Card, Markdown, Modal, PageHeader, Pill, Spinner } from '../components/ui'
import { sfx } from '../lib/sound'

const relTime = (ts) => {
  const d = ts - Date.now()
  if (d <= 0) return 'ahora'
  const h = d / 3_600_000
  if (h < 1) return `en ${Math.ceil(d / 60_000)} min`
  if (h < 24) return `en ${Math.round(h)} h`
  return `en ${Math.round(h / 24)} d`
}

export default function Review() {
  const { user, bank, settings } = useApp()
  const [cards, setCards] = useState(null)
  const [session, setSession] = useState(null) // { queue: [qid], i }
  const [peek, setPeek] = useState(null)

  const load = () => srsCards(user.username).then(setCards)
  useEffect(() => {
    load()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (!cards || !bank) return []
    return cards
      .map((c) => ({ ...c, q: bank.byId.get(c.qid) }))
      .filter((c) => c.q)
      .sort((a, b) => a.due - b.due)
  }, [cards, bank])

  if (!rows || !bank || !cards) return <Spinner />
  const due = rows.filter((r) => r.due <= Date.now())

  if (session)
    return (
      <ReviewSession
        queue={session}
        bank={bank}
        tolerance={settings?.matchTolerance ?? 0.8}
        onGrade={async (qid, grade, correct) => {
          await updateSrs(user.username, qid, grade)
          await recordAttempt(user.username, bank.byId.get(qid), { correct, mode: 'srs', srs: false })
        }}
        onExit={() => {
          setSession(null)
          load()
        }}
      />
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Conceptos a repasar" subtitle="Repetición espaciada (SM-2) con las pistas que fallaste. Las que domines se espacian cada vez más.">
        <button className="btn-gold text-lg px-6" disabled={!due.length} onClick={() => setSession(due.map((r) => r.qid))}>
          Repasar {due.length} pendiente{due.length === 1 ? '' : 's'}
        </button>
      </PageHeader>
      {rows.length === 0 ? (
        <Card className="text-center py-16 text-white/60">Aún no tienes conceptos para repasar. Las pistas que falles en el tablero aparecerán aquí.</Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <motion.div key={r.qid} layout className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="flex gap-2 mb-1 flex-wrap">
                  <Pill>{r.q.subspecialty}</Pill>
                  <Pill tone="gray">{r.q.category}</Pill>
                  {r.lapses > 1 && <Pill tone="red">Fallada {r.lapses}×</Pill>}
                </div>
                <div className="text-sm text-white/85">{r.q.clue}</div>
              </div>
              <div className="text-right text-sm">
                <div className={r.due <= Date.now() ? 'text-jgold font-semibold' : 'text-white/50'}>{r.due <= Date.now() ? 'Pendiente' : relTime(r.due)}</div>
                <div className="text-xs text-white/40">intervalo {r.interval} d</div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost text-xs py-1.5" onClick={() => setPeek(r.q)}>
                  Ver
                </button>
                <button
                  className="btn-ghost text-xs py-1.5"
                  title="Quitar de la lista"
                  onClick={async () => {
                    await removeSrs(user.username, r.qid)
                    load()
                  }}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>{peek && <ExplanationModal q={peek} onClose={() => setPeek(null)} />}</AnimatePresence>
    </div>
  )
}

export function ExplanationModal({ q, onClose }) {
  const [exp, setExp] = useState(null)
  useEffect(() => {
    loadExplanation(q).then(setExp)
  }, [q])
  return (
    <Modal wide onClose={onClose}>
      <div className="p-6 sm:p-8">
        <div className="flex gap-2 flex-wrap mb-3">
          <Pill>{q.subspecialty}</Pill>
          <Pill tone="gray">{q.category}</Pill>
          <Pill tone="gray">Nivel {q.difficulty}</Pill>
          {q.guideline && <Pill tone="gold">{q.guideline}</Pill>}
        </div>
        <p className="clue-text text-lg sm:text-xl mb-4">{q.clue}</p>
        <div className="text-jgold text-xl font-bold mb-5">{q.answer}</div>
        {exp ? <Markdown>{exp}</Markdown> : <Spinner />}
        {q.source && <div className="text-xs text-white/40 mt-6">Fuente: {q.source}</div>}
        <div className="flex justify-end mt-6">
          <button className="btn-gold" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ReviewSession({ queue: initial, bank, tolerance, onGrade, onExit }) {
  const [queue, setQueue] = useState(initial)
  const [i, setI] = useState(0)
  const [given, setGiven] = useState('')
  const [revealed, setRevealed] = useState(null) // {correct}
  const [exp, setExp] = useState(null)
  const qid = queue[i]
  const q = bank.byId.get(qid)

  useEffect(() => {
    setExp(null)
    if (q) loadExplanation(q).then(setExp)
  }, [q])

  if (!q)
    return (
      <div className="max-w-xl mx-auto text-center py-24 px-4">
        <div className="value-text text-5xl mb-4">¡REPASO COMPLETO!</div>
        <p className="text-white/70 mb-8">Revisaste {queue.length} conceptos. Los que fallaste volverán pronto; los demás se espaciaron.</p>
        <button className="btn-gold" onClick={onExit}>
          Volver
        </button>
      </div>
    )

  const reveal = (e) => {
    e?.preventDefault()
    const r = given.trim() ? checkAnswer(given, q, tolerance) : { correct: null }
    if (r.correct === true) sfx.correct()
    if (r.correct === false) sfx.wrong()
    setRevealed(r)
  }

  const grade = async (g) => {
    await onGrade(qid, g, g >= 3)
    if (g < 3) setQueue((qq) => [...qq, qid]) // vuelve al final de la sesión
    setGiven('')
    setRevealed(null)
    setI((x) => x + 1)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <button className="btn-ghost text-sm" onClick={onExit}>
          ← Terminar
        </button>
        <div className="text-white/60 text-sm">
          {i + 1} / {queue.length}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
          <div className="tile rounded-2xl p-8 sm:p-12 min-h-[260px] flex flex-col items-center justify-center text-center">
            <div className="category-text text-white/70 mb-4">{q.category}</div>
            <p className="clue-text text-xl sm:text-3xl">{q.clue}</p>
          </div>
          {!revealed ? (
            <form onSubmit={reveal} className="mt-5 flex gap-2">
              <input className="input text-lg" placeholder="Escribe tu respuesta (opcional) o revela directamente" value={given} onChange={(e) => setGiven(e.target.value)} autoFocus />
              <button className="btn-gold px-6">{given.trim() ? 'Comprobar' : 'Revelar'}</button>
            </form>
          ) : (
            <div className="mt-5">
              <div className="glass rounded-2xl p-5 mb-4">
                {revealed.correct !== null && (
                  <div className={`font-bold mb-1 ${revealed.correct ? 'text-emerald-300' : 'text-rose-300'}`}>{revealed.correct ? '✓ Coincide' : '✗ No coincide'}</div>
                )}
                <div className="text-2xl font-bold text-jgold">{q.answer}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-6">
                <button className="btn-danger" onClick={() => grade(1)}>
                  Otra vez
                </button>
                <button className="btn bg-orange-600 hover:bg-orange-500" onClick={() => grade(3)}>
                  Difícil
                </button>
                <button className="btn-ok" onClick={() => grade(4)}>
                  Bien
                </button>
                <button className="btn-blue" onClick={() => grade(5)}>
                  Fácil
                </button>
              </div>
              <div className="glass rounded-2xl p-6">{exp ? <Markdown>{exp}</Markdown> : <Spinner />}</div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
