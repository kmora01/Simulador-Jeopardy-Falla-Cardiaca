import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../App'
import { allAttempts, playedSet, resetPlayed, srsCards } from '../lib/db'
import { boardsPossible, ROUND_NAMES, remainingInRound } from '../lib/engine'
import { Card, Money, Pill, Spinner } from '../components/ui'
import { computeStreak } from '../lib/stats'

export default function Home() {
  const { user, bank, bankError, activeGame, refreshActive, startGame, go } = useApp()
  const [played, setPlayed] = useState(null)
  const [due, setDue] = useState(0)
  const [streak, setStreak] = useState({ current: 0, best: 0 })
  const [mode, setMode] = useState('full')
  const [focus, setFocus] = useState([])

  const load = async () => {
    const [p, cards, att] = await Promise.all([playedSet(user.username), srsCards(user.username), allAttempts(user.username)])
    setPlayed(p)
    setDue(cards.filter((c) => c.due <= Date.now()).length)
    setStreak(computeStreak(att))
  }
  useEffect(() => {
    load()
    refreshActive()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const possible = useMemo(() => (bank && played ? boardsPossible(bank, played, focus) : 0), [bank, played, focus])

  if (bankError) return <div className="p-10 text-center text-rose-300">{bankError}</div>
  if (!bank || !played) return <Spinner />

  const total = bank.questions.length
  const playedCount = [...played].filter((id) => bank.byId.has(id)).length
  const pct = total ? Math.round((playedCount / total) * 100) : 0
  const rounds = mode === 'full' ? ['J', 'DJ'] : mode === 'single' ? ['J'] : ['DJ']
  const canStart = possible >= 6 * rounds.length

  const doReset = async () => {
    if (!confirm('¿Reiniciar el banco? Todas las preguntas volverán a estar disponibles (tus estadísticas se conservan).')) return
    await resetPlayed(user.username)
    load()
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="category-text text-4xl sm:text-5xl">
          Hola, <span className="text-jgold">{user.displayName}</span>
        </h1>
        <p className="text-white/60 mt-2">¿Listo para el tablero? Cada pista que abres queda marcada y no se repite hasta agotar el banco.</p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {activeGame && (
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="rounded-2xl p-6 bg-gradient-to-r from-jgold/20 to-jblue/30 border border-jgold/40 flex flex-wrap items-center gap-5 justify-between">
                <div>
                  <div className="text-jgold font-bold uppercase text-sm tracking-wider">Partida en curso</div>
                  <div className="text-2xl font-bold mt-1">
                    {ROUND_NAMES[activeGame.state.round]} · <Money value={activeGame.state.score} />
                  </div>
                  <div className="text-white/60 text-sm">
                    {activeGame.state.round === 'FJ' ? 'Falta Final Jeopardy!' : `${remainingInRound(activeGame.state)} pistas restantes en esta ronda`}
                  </div>
                </div>
                <button className="btn-gold text-lg px-6 py-3" onClick={() => startGame({ resumeId: activeGame.id })}>
                  ▶ Continuar
                </button>
              </div>
            </motion.div>
          )}

          <Card className="p-6">
            <h2 className="category-text text-2xl mb-4">Nueva partida</h2>
            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              {[
                ['full', 'Partida completa', 'Jeopardy! + Double Jeopardy! + Final · 61 pistas'],
                ['single', 'Ronda rápida', 'Jeopardy! + Final · 31 pistas'],
                ['double', 'Solo Double', 'Double Jeopardy! + Final · 31 pistas'],
              ].map(([k, t, d]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={`text-left rounded-xl p-4 border transition ${mode === k ? 'border-jgold bg-jgold/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="font-bold">{t}</div>
                  <div className="text-xs text-white/60 mt-1">{d}</div>
                </button>
              ))}
            </div>
            <div className="mb-5">
              <div className="text-sm font-semibold text-white/80 mb-2">Enfoque por subespecialidad (opcional)</div>
              <div className="flex flex-wrap gap-2">
                {bank.subspecialties.map((s) => {
                  const on = focus.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => setFocus((f) => (on ? f.filter((x) => x !== s) : [...f, s]))}
                      className={`rounded-full px-3 py-1 text-sm border transition ${on ? 'bg-jgold text-jblue-night border-jgold font-semibold' : 'border-white/15 text-white/75 hover:bg-white/10'}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>
            {!canStart && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-400/30 p-4 text-sm text-rose-200 mb-4">
                No quedan suficientes preguntas sin jugar {focus.length ? 'en las subespecialidades elegidas ' : ''}para armar este tablero
                (se necesitan 6 categorías con 5 pistas nuevas cada una). Quita filtros, elige otro modo o reinicia el banco.
              </div>
            )}
            <button className="btn-gold w-full text-xl py-4" disabled={!canStart} onClick={() => startGame({ options: { rounds, subspecialties: focus } })}>
              {activeGame ? 'Iniciar nueva partida (reemplaza la actual)' : '¡A jugar!'}
            </button>
          </Card>

          <Card>
            <h3 className="font-bold text-lg mb-3">Reglas oficiales aplicadas</h3>
            <ul className="text-sm text-white/75 space-y-1.5 list-disc pl-5">
              <li>6 categorías × 5 pistas. Jeopardy!: $200–$1000 (1 Daily Double). Double Jeopardy!: $400–$2000 (2 Daily Doubles).</li>
              <li>Responde <b>en forma de pregunta</b>: “¿Qué es la amiodarona?”. En Daily Double y Final es obligatorio (modo estricto).</li>
              <li>Acierto suma, error resta, pasar no cambia el puntaje.</li>
              <li>Daily Double: apuesta de $5 hasta tu puntaje o el máximo del tablero ($1000/$2000), lo que sea mayor. “True Daily Double” = todo.</li>
              <li>Final Jeopardy!: solo con puntaje positivo; apuestas viendo la categoría y tienes 30 s para responder.</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <div className="text-sm text-white/60">Progreso en el banco</div>
            <div className="flex items-end gap-2 mt-1">
              <div className="value-text text-4xl">{playedCount}</div>
              <div className="text-white/60 mb-1">/ {total} preguntas jugadas</div>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 mt-3 overflow-hidden">
              <motion.div className="h-full bg-jgold" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
            </div>
            <div className="text-xs text-white/50 mt-2">{possible} columnas disponibles · alcanza para ~{Math.floor(possible / 12)} partidas completas</div>
            <button onClick={doReset} className="text-xs text-white/50 hover:text-rose-300 mt-3 underline">
              Reiniciar banco
            </button>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Conceptos a repasar hoy</div>
                <div className="value-text text-4xl mt-1">{due}</div>
              </div>
              <button className="btn-blue" onClick={() => go('review')} disabled={!due}>
                Repasar
              </button>
            </div>
          </Card>
          <Card>
            <div className="text-sm text-white/60">Racha de estudio</div>
            <div className="flex items-end gap-6 mt-1">
              <div>
                <span className="value-text text-4xl">{streak.current}</span> <span className="text-white/60">días</span>
              </div>
              <Pill tone="gold">Mejor: {streak.best}</Pill>
            </div>
            <button className="text-sm text-jgold mt-3 hover:underline" onClick={() => go('stats')}>
              Ver estadísticas completas →
            </button>
          </Card>
        </div>
      </div>
    </div>
  )
}
