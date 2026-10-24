import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../App'
import Board from '../components/Board'
import ClueScreen from '../components/ClueScreen'
import Feedback from '../components/Feedback'
import { Modal, Money, Spinner } from '../components/ui'
import { createGame, db, markPlayed, playedSet, recordAttempt, saveGame } from '../lib/db'
import { preloadExplanations } from '../lib/bank'
import {
  applyFinal,
  applyResult,
  advanceRound,
  buildGame,
  gameSummary,
  maxDailyDoubleWager,
  maxFinalWager,
  remainingInRound,
  ROUND_NAMES,
} from '../lib/engine'
import { sfx } from '../lib/sound'

export default function Game({ request }) {
  const { user, bank, settings, go, refreshActive } = useApp()
  const [gameId, setGameId] = useState(null)
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const [intro, setIntro] = useState(false)
  const [animateBoard, setAnimateBoard] = useState(false)
  const [feedback, setFeedback] = useState(null) // {qid, result, delta, kind:'clue'|'final'}
  const saving = useRef(Promise.resolve())

  const persist = useCallback(
    (next, status = 'active') => {
      setState(next)
      if (gameId == null) return
      saving.current = saving.current.then(() => saveGame(gameId, next, status))
    },
    [gameId],
  )

  // Carga o crea la partida.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (request?.resumeId) {
        const g = await db.games.get(request.resumeId)
        if (cancelled) return
        if (g?.status === 'active') {
          setGameId(g.id)
          setState(g.state)
          setAnimateBoard(true)
          return
        }
      }
      const played = await playedSet(user.username)
      const s = buildGame(bank, played, request?.options ?? {})
      if (s.error) {
        setError(s)
        return
      }
      const id = await createGame(user.username, s)
      if (cancelled) return
      setGameId(id)
      setState(s)
      setIntro(true)
      sfx.roundStart()
      refreshActive()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.key])

  // Precarga explicaciones del tablero actual.
  useEffect(() => {
    if (!state?.boards?.[state.round]) return
    preloadExplanations(state.boards[state.round].categories.flatMap((c) => c.cells.map((x) => bank.byId.get(x.qid)).filter(Boolean)))
  }, [state?.round, bank]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!intro) return
    const t = setTimeout(() => {
      setIntro(false)
      setAnimateBoard(true)
    }, 2300)
    return () => clearTimeout(t)
  }, [intro])

  if (error)
    return (
      <div className="max-w-xl mx-auto p-10 text-center">
        <div className="value-text text-4xl mb-4">BANCO AGOTADO</div>
        <p className="text-white/70 mb-6">
          Ya no quedan suficientes preguntas sin jugar para armar un tablero ({error.available} de 6 categorías disponibles). Puedes reiniciar el banco desde
          Inicio o esperar a que se agreguen más preguntas.
        </p>
        <button className="btn-gold" onClick={() => go('home')}>
          Volver al inicio
        </button>
      </div>
    )
  if (!state) return <Spinner label="Preparando el tablero…" />

  const round = state.round
  const board = state.boards[round]
  const cur = state.current
  const curCell = cur && state.boards[cur.round].categories[cur.col].cells[cur.row]
  const curQ = curCell && bank.byId.get(curCell.qid)

  const pick = async (col, row) => {
    const cell = board.categories[col].cells[row]
    if (cell.played || cur) return
    await markPlayed(user.username, cell.qid)
    if (cell.dd) sfx.dailyDouble()
    else sfx.select()
    persist({ ...state, current: { round, col, row, wager: cell.dd ? null : undefined } })
  }

  const setWager = (w) => persist({ ...state, current: { ...cur, wager: w } })

  const resolveClue = (r) => {
    const next = applyResult(state, { ...cur, correct: r.correct, skipped: r.skipped, wager: cur.wager, given: r.given })
    const delta = next.history.at(-1).delta
    if (r.skipped) sfx.select()
    else if (r.correct) sfx.correct()
    else sfx.wrong()
    persist(next)
    setFeedback({ kind: 'clue', qid: curCell.qid, result: r, delta, mode: r.anki ? 'anki' : 'game', value: curCell.dd ? cur.wager : curCell.value })
  }

  const override = () => {
    const s = structuredClone(state)
    const h = s.history.at(-1)
    const correct = !h.correct
    const stake = h.wager ?? h.value
    const delta = correct ? stake : -stake
    s.score += delta - h.delta
    h.correct = correct
    h.delta = delta
    h.overridden = true
    if (h.round === 'FJ') s.final.result = correct ? 'correct' : 'wrong'
    else {
      for (const c of s.boards[h.round].categories) for (const x of c.cells) if (x.qid === h.qid) Object.assign(x, { result: correct ? 'correct' : 'wrong', delta })
    }
    persist(s, s.round === 'done' ? 'finished' : 'active')
    setFeedback((f) => ({ ...f, result: { ...f.result, correct, formFail: false }, delta }))
  }

  const continueAfterFeedback = async () => {
    const fb = feedback
    setFeedback(null)
    const q = bank.byId.get(fb.qid)
    await recordAttempt(user.username, q, { correct: fb.result.correct, skipped: fb.result.skipped, mode: fb.mode, value: fb.value })
    if (fb.kind === 'final' || state.round === 'done') {
      persist(state, 'finished')
      refreshActive()
      return
    }
    if (remainingInRound(state) === 0) {
      const next = advanceRound(state)
      persist(next, next.round === 'done' ? 'finished' : 'active')
      if (next.round !== 'done') {
        setIntro(true)
        setAnimateBoard(false)
        sfx.roundStart()
      } else refreshActive()
    }
  }

  const resolveFinal = (r) => {
    const next = applyFinal(state, { correct: r.correct, given: r.given })
    r.correct ? sfx.correct() : sfx.wrong()
    persist(next)
    setFeedback({ kind: 'final', qid: state.final.qid, result: r, delta: next.history.at(-1).delta, mode: r.anki ? 'anki' : 'game', value: state.final.wager })
  }

  const exit = async () => {
    await saving.current
    refreshActive()
    go('home')
  }

  const finalQ = state.final && bank.byId.get(state.final.qid)

  return (
    <div className="min-h-screen flex flex-col">
      <GameHeader state={state} onExit={exit} />
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6">
        <AnimatePresence mode="wait">
          {intro && round !== 'done' ? (
            <RoundIntro key={'intro-' + round} round={round} />
          ) : round === 'J' || round === 'DJ' ? (
            <motion.div key={'board-' + round} className="w-full max-w-7xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Board board={board} onPick={pick} animateIn={animateBoard} />
              <div className="text-center text-white/40 text-xs mt-3">Elige una casilla · tu progreso se guarda automáticamente</div>
            </motion.div>
          ) : round === 'FJ' ? (
            <FinalJeopardy key="fj" state={state} q={finalQ} settings={settings} persist={persist} onResolve={resolveFinal} hidden={!!feedback} />
          ) : (
            <Summary key="sum" state={state} bank={bank} onHome={exit} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {cur && curCell?.dd && cur.wager == null && !feedback && (
          <DailyDoubleWager key="dd" state={state} category={state.boards[cur.round].categories[cur.col].name} onWager={setWager} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cur && curQ && (!curCell.dd || cur.wager != null) && !feedback && (
          <ClueScreen
            key={curCell.qid}
            question={curQ}
            header={`${state.boards[cur.round].categories[cur.col].name}${curCell.dd ? ' · DAILY DOUBLE' : ''}`}
            stake={curCell.dd ? cur.wager : curCell.value}
            strict={settings.strictQuestionForm}
            requireForm={curCell.dd}
            seconds={curCell.dd ? Math.max(settings.timerSeconds, 20) : settings.timerSeconds}
            tolerance={settings.matchTolerance}
            onResolve={resolveClue}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {feedback && (
          <Feedback
            key={'fb-' + feedback.qid}
            question={bank.byId.get(feedback.qid)}
            result={feedback.result}
            delta={feedback.delta}
            onOverride={override}
            onContinue={continueAfterFeedback}
            continueLabel={feedback.kind === 'final' ? 'Ver resultados' : remainingInRound(state) === 0 ? 'Siguiente ronda' : 'Volver al tablero'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GameHeader({ state, onExit }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 sm:px-6 py-3 border-b border-white/10 bg-black/30 backdrop-blur">
      <button onClick={onExit} className="btn-ghost text-sm py-2">
        ← Guardar y salir
      </button>
      <div className="category-text text-lg sm:text-2xl text-white/90">{ROUND_NAMES[state.round] ?? 'Resultados'}</div>
      <div className="rounded-xl bg-jblue border-2 border-black px-4 sm:px-6 py-1.5 shadow-lg">
        <motion.div key={state.score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="value-text text-2xl sm:text-3xl">
          <Money value={state.score} className={state.score < 0 ? '!text-rose-300' : ''} />
        </motion.div>
      </div>
    </div>
  )
}

function RoundIntro({ round }) {
  return (
    <motion.div
      className="text-center"
      initial={{ scale: 0.3, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 1.6, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 12 }}
    >
      <div className="value-text text-6xl sm:text-8xl lg:text-9xl">{ROUND_NAMES[round].toUpperCase()}</div>
      {round === 'DJ' && <div className="text-white/70 mt-4 text-lg">¡Los valores se duplican y hay 2 Daily Doubles escondidos!</div>}
    </motion.div>
  )
}

function DailyDoubleWager({ state, category, onWager }) {
  const round = state.current.round
  const max = maxDailyDoubleWager(state.score, round)
  const [w, setW] = useState(Math.min(max, Math.max(5, Math.round(max / 2 / 100) * 100)))
  const [splash, setSplash] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1800)
    return () => clearTimeout(t)
  }, [])
  const valid = Number.isInteger(w) && w >= 5 && w <= max
  return (
    <motion.div className="fixed inset-0 z-40 grid place-items-center bg-jblue-deep p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <AnimatePresence mode="wait">
        {splash ? (
          <motion.div
            key="splash"
            initial={{ scale: 0.1, rotate: -720, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="value-text text-7xl sm:text-9xl text-center leading-none"
          >
            DAILY
            <br />
            DOUBLE!
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass rounded-3xl p-8 w-full max-w-md text-center"
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) onWager(w)
            }}
          >
            <div className="value-text text-4xl mb-1">DAILY DOUBLE</div>
            <div className="category-text text-white/80 mb-5">{category}</div>
            <div className="text-white/70 text-sm mb-4">
              Tu puntaje: <Money value={state.score} /> · Apuesta entre $5 y <b>${max.toLocaleString('en-US')}</b>
            </div>
            <input
              type="number"
              className="input text-center text-3xl value-text"
              min={5}
              max={max}
              value={Number.isNaN(w) ? '' : w}
              onChange={(e) => setW(parseInt(e.target.value, 10))}
              autoFocus
            />
            <input type="range" min={5} max={max} step={5} value={valid ? w : 5} onChange={(e) => setW(parseInt(e.target.value, 10))} className="w-full mt-4 accent-[#ffcc00]" />
            <div className="flex gap-2 mt-4">
              <button type="button" className="btn-ghost flex-1" onClick={() => setW(max)}>
                {state.score >= ROUND_VALUESMAX(round) ? '¡True Daily Double!' : 'Máximo'}
              </button>
              <button className="btn-gold flex-1" disabled={!valid}>
                Apostar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
const ROUND_VALUESMAX = (round) => (round === 'J' ? 1000 : 2000)

function FinalJeopardy({ state, q, settings, persist, onResolve, hidden }) {
  const stage = state.final.stage ?? 'category'
  const max = maxFinalWager(state.score)
  const [w, setW] = useState(0)
  const setStage = (st, extra = {}) => persist({ ...state, final: { ...state.final, ...extra, stage: st } })

  if (state.final.result) return null
  if (stage === 'clue' && !hidden)
    return (
      <ClueScreen
        question={q}
        header={`FINAL JEOPARDY! · ${state.final.category}`}
        stake={state.final.wager}
        strict={settings.strictQuestionForm}
        requireForm
        seconds={settings.finalSeconds}
        tolerance={settings.matchTolerance}
        onResolve={onResolve}
      />
    )
  return (
    <motion.div className="w-full max-w-2xl text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="value-text text-5xl sm:text-7xl mb-6">FINAL JEOPARDY!</div>
      <div className="tile rounded-2xl p-10 mb-6">
        <div className="text-white/60 text-sm uppercase tracking-widest mb-2">La categoría es</div>
        <div className="category-text text-3xl sm:text-5xl">{state.final.category}</div>
      </div>
      {stage === 'category' ? (
        <button className="btn-gold text-lg px-8 py-3" onClick={() => setStage('wager')}>
          Hacer mi apuesta
        </button>
      ) : (
        <form
          className="glass rounded-2xl p-6 max-w-md mx-auto"
          onSubmit={(e) => {
            e.preventDefault()
            if (Number.isInteger(w) && w >= 0 && w <= max) setStage('clue', { wager: w })
          }}
        >
          <div className="text-white/70 text-sm mb-3">
            Tienes <Money value={state.score} />. Apuesta entre $0 y ${max.toLocaleString('en-US')}.
          </div>
          <input type="number" className="input text-center text-3xl value-text" min={0} max={max} value={Number.isNaN(w) ? '' : w} onChange={(e) => setW(parseInt(e.target.value, 10))} autoFocus />
          <input type="range" min={0} max={max} step={100} value={w || 0} onChange={(e) => setW(parseInt(e.target.value, 10))} className="w-full mt-4 accent-[#ffcc00]" />
          <button className="btn-gold w-full mt-4" disabled={!(Number.isInteger(w) && w >= 0 && w <= max)}>
            Confirmar apuesta y ver la pista
          </button>
        </form>
      )}
    </motion.div>
  )
}

function Summary({ state, bank, onHome }) {
  const s = gameSummary(state)
  const [open, setOpen] = useState(null)
  const missed = state.history.filter((h) => !h.correct && !h.skipped)
  return (
    <motion.div className="w-full max-w-4xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-center mb-8">
        <div className="text-white/60 uppercase tracking-widest text-sm">Puntaje final</div>
        <div className="value-text text-7xl sm:text-8xl">
          <Money value={s.score} />
        </div>
        {state.finalSkipped && <div className="text-white/60 mt-2">No jugaste Final Jeopardy! porque tu puntaje no era positivo.</div>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          ['Correctas', s.correct, 'text-emerald-300'],
          ['Incorrectas', s.wrong, 'text-rose-300'],
          ['Sin responder', s.skipped, 'text-white/70'],
          ['Coryat', `$${s.coryat.toLocaleString('en-US')}`, 'text-jgold'],
        ].map(([l, v, c]) => (
          <div key={l} className="glass rounded-xl p-4 text-center">
            <div className={`text-3xl font-bold ${c}`}>{v}</div>
            <div className="text-xs text-white/50 uppercase mt-1">{l}</div>
          </div>
        ))}
      </div>
      {missed.length > 0 && (
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="font-bold mb-3">Pistas falladas (ya agregadas a tu repaso SRS)</h3>
          <div className="divide-y divide-white/10">
            {missed.map((h) => {
              const q = bank.byId.get(h.qid)
              if (!q) return null
              return (
                <button key={h.qid} className="w-full text-left py-3 hover:bg-white/5 px-2 rounded" onClick={() => setOpen(q)}>
                  <div className="text-xs text-white/50">{q.category}</div>
                  <div className="text-sm">{q.clue}</div>
                  <div className="text-sm text-jgold mt-1">{q.answer}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="text-center">
        <button className="btn-gold text-lg px-10 py-3" onClick={onHome}>
          Volver al inicio
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <Feedback question={open} result={{ correct: false, given: state.history.find((h) => h.qid === open.id)?.given }} onContinue={() => setOpen(null)} continueLabel="Cerrar" />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
