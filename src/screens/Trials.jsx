import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../App'
import { Card, PageHeader, Pill } from '../components/ui'
import { AREAS, QUIZ_TYPES, buildQuestion, loadProgress, mastered, pickTrial, saveProgress, shuffle, trials } from '../lib/trials'
import { sfx } from '../lib/sound'

const TABS = [
  ['quiz', 'Opción múltiple'],
  ['cards', 'Fichas'],
  ['list', 'Catálogo'],
]

const ROUND = 10

export default function Trials() {
  const { user } = useApp()
  const [tab, setTab] = useState('quiz')
  const [areas, setAreas] = useState([])
  const [progress, setProgress] = useState(() => loadProgress(user.username))

  const pool = useMemo(() => (areas.length ? trials.filter((t) => areas.includes(t.area)) : trials), [areas])
  const done = pool.filter((t) => mastered(progress[t.id])).length

  const record = (id, ok) => {
    setProgress((prev) => {
      const p = prev[id] ?? { ok: 0, fail: 0 }
      const next = { ...prev, [id]: { ok: p.ok + (ok ? 1 : 0), fail: p.fail + (ok ? 0 : 1), last: Date.now() } }
      saveProgress(user.username, next)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Ensayos clínicos" subtitle={`${trials.length} ensayos de cardiología: población, intervención, comparador y resultado principal.`}>
        <div className="text-right">
          <div className="value-text text-3xl">
            {done}/{pool.length}
          </div>
          <div className="text-xs text-white/60">dominados {areas.length ? 'en el filtro' : ''}</div>
        </div>
      </PageHeader>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              tab === k ? 'bg-jgold text-jblue-night' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {AREAS.map((a) => {
          const on = areas.includes(a)
          return (
            <button
              key={a}
              onClick={() => setAreas((s) => (on ? s.filter((x) => x !== a) : [...s, a]))}
              className={`rounded-full px-3 py-1 text-xs sm:text-sm border transition ${
                on ? 'bg-jgold text-jblue-night border-jgold font-semibold' : 'border-white/15 text-white/75 hover:bg-white/10'
              }`}
            >
              {a}
            </button>
          )
        })}
        {areas.length > 0 && (
          <button onClick={() => setAreas([])} className="text-xs text-white/50 hover:text-white underline px-2">
            Quitar filtros
          </button>
        )}
      </div>

      {tab === 'quiz' && <Quiz key={areas.join('|')} pool={pool} progress={progress} record={record} />}
      {tab === 'cards' && <Flashcards key={areas.join('|')} pool={pool} progress={progress} record={record} />}
      {tab === 'list' && <Catalog pool={pool} progress={progress} />}
    </div>
  )
}

/* ---------- Ficha completa de un ensayo ---------- */

function TrialSheet({ t, highlight }) {
  const rows = [
    ['pop', 'Población'],
    ['int', 'Intervención'],
    ['comp', 'Comparador'],
    ['outcome', 'Resultado principal (objetivo primario)'],
    ['result', 'Hallazgo'],
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="category-text text-2xl text-jgold">{t.name}</span>
        <Pill tone="gray">{t.year}</Pill>
        <Pill>{t.area}</Pill>
      </div>
      <dl className="grid sm:grid-cols-2 gap-3">
        {rows.map(([k, label]) => (
          <div
            key={k}
            className={`rounded-xl p-3 border ${k === 'result' ? 'sm:col-span-2' : ''} ${
              highlight?.includes(k) ? 'border-jgold/60 bg-jgold/10' : 'border-white/10 bg-white/5'
            }`}
          >
            <dt className="text-xs uppercase tracking-wider text-white/50 font-semibold">{label}</dt>
            <dd className="mt-1 text-white/90">{t[k]}</dd>
          </div>
        ))}
      </dl>
      {t.pearl && (
        <div className="rounded-xl p-3 border border-emerald-400/30 bg-emerald-500/10 text-sm text-emerald-100">
          <b>Perla:</b> {t.pearl}
        </div>
      )}
    </div>
  )
}

/* ---------- Opción múltiple ---------- */

function Quiz({ pool, progress, record }) {
  const [types, setTypes] = useState(['design', 'result', 'name'])
  const [recent, setRecent] = useState([])
  const [q, setQ] = useState(null)
  const [chosen, setChosen] = useState(null)
  const [round, setRound] = useState({ n: 0, ok: 0, misses: [] })

  const next = (r = recent) => {
    const t = pickTrial(pool, progress, r)
    const type = types[Math.floor(Math.random() * types.length)]
    setQ(buildQuestion(t, type))
    setChosen(null)
    setRecent([t.id, ...r].slice(0, Math.min(15, pool.length - 1)))
  }

  if (!pool.length) return <Card>No hay ensayos en el filtro elegido.</Card>

  if (!q) {
    return (
      <Card className="p-6">
        <h2 className="category-text text-2xl mb-2">Ronda de {ROUND} preguntas</h2>
        <p className="text-white/70 text-sm mb-4">
          Te muestro el nombre de un ensayo y eliges qué evaluó o qué encontró, o te doy el diseño y eliges el ensayo. Los distractores
          son de la misma área. Los ensayos que fallas vuelven a salir con más frecuencia.
        </p>
        <div className="text-sm font-semibold text-white/80 mb-2">Tipos de pregunta</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(QUIZ_TYPES).map(([k, { label }]) => {
            const on = types.includes(k)
            return (
              <button
                key={k}
                onClick={() => setTypes((s) => (on ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]))}
                className={`rounded-xl px-4 py-2 text-sm border transition ${on ? 'border-jgold bg-jgold/10 font-semibold' : 'border-white/10 bg-white/5'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <button className="btn-gold w-full text-lg py-3" onClick={() => next()}>
          ¡Empezar!
        </button>
      </Card>
    )
  }

  if (round.n >= ROUND && chosen === null) {
    return (
      <Card className="p-6 text-center">
        <div className="category-text text-3xl">Fin de la ronda</div>
        <div className="value-text text-6xl my-4">
          {round.ok}/{ROUND}
        </div>
        {round.misses.length > 0 && (
          <div className="text-left mb-5">
            <div className="text-sm font-semibold text-white/80 mb-2">Para repasar</div>
            <div className="flex flex-wrap gap-2">
              {round.misses.map((m) => (
                <Pill key={m} tone="red">
                  {m}
                </Pill>
              ))}
            </div>
          </div>
        )}
        <button
          className="btn-gold w-full text-lg py-3"
          onClick={() => {
            setRound({ n: 0, ok: 0, misses: [] })
            next()
          }}
        >
          Otra ronda
        </button>
      </Card>
    )
  }

  const answer = (opt) => {
    if (chosen !== null) return
    const ok = opt === q.answer
    setChosen(opt)
    ok ? sfx.correct() : sfx.wrong()
    record(q.trial.id, ok)
    setRound((r) => ({ n: r.n + 1, ok: r.ok + (ok ? 1 : 0), misses: ok ? r.misses : [...r.misses, q.trial.name] }))
  }

  const highlight = q.type === 'design' ? ['pop', 'int', 'comp'] : q.type === 'result' ? ['result'] : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>
          Pregunta {Math.min(round.n + (chosen === null ? 1 : 0), ROUND)} de {ROUND} · {QUIZ_TYPES[q.type].label}
        </span>
        <span>
          Aciertos: <b className="text-jgold">{round.ok}</b>
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.trial.id + q.type} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card className="p-6">
            <div className="clue-text text-lg sm:text-xl mb-3">{q.prompt}</div>
            {q.type === 'name' && (
              <dl className="grid sm:grid-cols-2 gap-2 mb-2 text-sm">
                {[
                  ['Población', q.trial.pop],
                  ['Intervención', q.trial.int],
                  ['Comparador', q.trial.comp],
                  ['Resultado principal', q.trial.outcome],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                    <dt className="text-xs uppercase text-white/50 font-semibold">{l}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                <div className="rounded-lg bg-white/5 border border-white/10 p-2.5 sm:col-span-2">
                  <dt className="text-xs uppercase text-white/50 font-semibold">Año</dt>
                  <dd>{q.trial.year}</dd>
                </div>
              </dl>
            )}
          </Card>
          <div className="grid gap-3 mt-4">
            {q.options.map((opt, i) => {
              const isAns = opt === q.answer
              const state = chosen === null ? 'idle' : isAns ? 'right' : opt === chosen ? 'wrong' : 'dim'
              return (
                <button
                  key={opt}
                  onClick={() => answer(opt)}
                  disabled={chosen !== null}
                  className={`text-left rounded-xl p-4 border transition flex gap-3 ${
                    state === 'idle'
                      ? 'border-white/15 bg-white/5 hover:bg-white/10 hover:border-jgold/50'
                      : state === 'right'
                        ? 'border-emerald-400 bg-emerald-500/20'
                        : state === 'wrong'
                          ? 'border-rose-400 bg-rose-500/20'
                          : 'border-white/5 bg-white/[0.02] opacity-50'
                  }`}
                >
                  <span className="font-bold text-jgold shrink-0">{'ABCD'[i]}</span>
                  <span className={q.type === 'name' ? 'font-semibold' : 'text-sm sm:text-base'}>{opt}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      {chosen !== null && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <div className={`font-bold mb-3 ${chosen === q.answer ? 'text-emerald-300' : 'text-rose-300'}`}>
              {chosen === q.answer ? '¡Correcto!' : 'Incorrecto'}
            </div>
            <TrialSheet t={q.trial} highlight={highlight} />
          </Card>
          <button className="btn-gold w-full text-lg py-3 mt-4" onClick={() => (round.n >= ROUND ? setChosen(null) : next())}>
            {round.n >= ROUND ? 'Ver resultado de la ronda' : 'Siguiente →'}
          </button>
        </motion.div>
      )}
    </div>
  )
}

/* ---------- Fichas (autoevaluación) ---------- */

function Flashcards({ pool, progress, record }) {
  const [onlyPending, setOnlyPending] = useState(true)
  const deck = useMemo(() => {
    const list = onlyPending ? pool.filter((t) => !mastered(progress[t.id])) : pool
    return shuffle(list)
    // El mazo se baraja al cambiar el filtro, no con cada respuesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, onlyPending])
  const [i, setI] = useState(0)
  const [shown, setShown] = useState(false)

  const toggle = (
    <label className="flex items-center gap-2 text-sm text-white/70 mb-4">
      <input
        type="checkbox"
        checked={onlyPending}
        onChange={(e) => {
          setOnlyPending(e.target.checked)
          setI(0)
          setShown(false)
        }}
      />
      Solo ensayos que aún no domino
    </label>
  )

  if (i >= deck.length) {
    return (
      <>
        {toggle}
        <Card className="p-6 text-center">
          <div className="category-text text-2xl mb-2">{deck.length ? '¡Mazo terminado!' : 'No quedan fichas pendientes'}</div>
          <p className="text-white/60 text-sm mb-4">Puedes barajar de nuevo o desmarcar el filtro para repasar todos.</p>
          <button
            className="btn-gold"
            onClick={() => {
              setI(0)
              setShown(false)
            }}
          >
            Volver a empezar
          </button>
        </Card>
      </>
    )
  }

  const t = deck[i]
  const grade = (ok) => {
    record(t.id, ok)
    setShown(false)
    setI((n) => n + 1)
  }

  return (
    <>
      {toggle}
      <div className="text-sm text-white/60 mb-2">
        Ficha {i + 1} de {deck.length}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={t.id} initial={{ opacity: 0, rotateY: -8 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0 }}>
          <Card className="p-6">
            {!shown ? (
              <div className="text-center py-8">
                <div className="category-text text-4xl sm:text-5xl text-jgold">{t.name}</div>
                <div className="text-white/60 mt-2">
                  {t.year} · {t.area}
                </div>
                <p className="text-white/70 text-sm mt-6">Recuerda la población, la intervención, el comparador, el resultado principal y qué encontró.</p>
                <button className="btn-gold mt-6 px-8" onClick={() => setShown(true)}>
                  Mostrar ficha
                </button>
              </div>
            ) : (
              <TrialSheet t={t} />
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
      {shown && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button className="btn-danger py-3" onClick={() => grade(false)}>
            No lo sabía
          </button>
          <button className="btn-ok py-3" onClick={() => grade(true)}>
            Lo sabía
          </button>
        </div>
      )}
    </>
  )
}

/* ---------- Catálogo ---------- */

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Catalog({ pool, progress }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null)
  const list = useMemo(() => {
    const q = fold(query.trim())
    const l = q ? pool.filter((t) => fold([t.name, t.pop, t.int, t.comp, t.outcome, t.result].join(' ')).includes(q)) : pool
    return [...l].sort((a, b) => a.name.localeCompare(b.name))
  }, [pool, query])

  return (
    <>
      <input className="input mb-4" placeholder="Buscar por nombre, fármaco, población…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="text-sm text-white/50 mb-3">{list.length} ensayos</div>
      <div className="space-y-2">
        {list.map((t) => (
          <Card key={t.id} className="!p-0 overflow-hidden">
            <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setOpen(open === t.id ? null : t.id)}>
              <span className="font-bold text-jgold">{t.name}</span>
              <span className="text-white/50 text-sm">{t.year}</span>
              <span className="text-white/60 text-sm truncate hidden sm:inline flex-1">{t.int}</span>
              <span className="ml-auto shrink-0">{mastered(progress[t.id]) && <Pill tone="green">Dominado</Pill>}</span>
            </button>
            {open === t.id && (
              <div className="px-4 pb-4">
                <TrialSheet t={t} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
