import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../App'
import { Card, Pill } from '../components/ui'
import { DECKS, fold, loadProgress, mastered, saveProgress, searchText } from '../lib/flashcards'
import { shuffle } from '../lib/trials'
import { sfx } from '../lib/sound'

const TABS = [
  ['semio', 'Semiología y signos'],
  ['trials', 'Estudios pivotales'],
  ['list', 'Lista completa'],
]

// Dirección de la tarjeta: «direct» muestra el término o el nombre del estudio al frente; «reverse» el significado.
const MODES = {
  semio: [
    ['direct', 'Término → significado'],
    ['reverse', 'Significado → término'],
    ['mixed', 'Mezclado'],
  ],
  trials: [
    ['direct', 'Estudio → qué evaluó'],
    ['reverse', 'Qué evaluó → estudio'],
    ['mixed', 'Mezclado'],
  ],
}

export default function Flashcards() {
  const { user } = useApp()
  const [tab, setTab] = useState('semio')
  const [progress, setProgress] = useState(() => loadProgress(user.username))

  const record = useCallback(
    (id, ok) => {
      setProgress((prev) => {
        const p = prev[id] ?? { ok: 0, fail: 0 }
        const next = { ...prev, [id]: { ok: p.ok + (ok ? 1 : 0), fail: p.fail + (ok ? 0 : 1), last: Date.now() } }
        saveProgress(user.username, next)
        return next
      })
    },
    [user.username],
  )

  const total = DECKS.semio.cards.length + DECKS.trials.cards.length
  const done = [...DECKS.semio.cards, ...DECKS.trials.cards].filter((c) => mastered(progress[c.id])).length

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-end justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="category-text text-2xl sm:text-4xl text-white">Tarjetas de memoria</h1>
          <p className="hidden sm:block text-white/60 mt-1">
            {DECKS.semio.cards.length} signos, soplos, epónimos y datos de imagen · {DECKS.trials.cards.length} estudios pivotales. Clic en la tarjeta para girarla.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="value-text text-2xl sm:text-3xl">
            {done}/{total}
          </div>
          <div className="text-xs text-white/60">dominadas</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 sm:mb-5 overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
              tab === k ? 'bg-jgold text-jblue-night' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' ? <FullList progress={progress} /> : <Trainer key={tab} deckKey={tab} progress={progress} record={record} />}
    </div>
  )
}

/* ---------- Entrenador con tarjetas que giran ---------- */

function Trainer({ deckKey, progress, record }) {
  const deck = DECKS[deckKey]
  const [mode, setMode] = useState('direct')
  const [cats, setCats] = useState([])
  const [onlyPending, setOnlyPending] = useState(false)
  const [seed, setSeed] = useState(0)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const pool = useMemo(() => (cats.length ? deck.cards.filter((c) => cats.includes(c.cat)) : deck.cards), [deck, cats])

  const order = useMemo(() => {
    const list = onlyPending ? pool.filter((c) => !mastered(progress[c.id])) : pool
    // En modo mezclado cada tarjeta decide al azar qué cara va al frente.
    return shuffle(list).map((c) => ({ card: c, reverse: mode === 'reverse' || (mode === 'mixed' && Math.random() < 0.5) }))
    // Se baraja al cambiar filtros o al pedirlo, no con cada respuesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, onlyPending, mode, seed])

  useEffect(() => {
    setI(0)
    setFlipped(false)
  }, [order])

  const current = order[i]
  const go = useCallback(
    (delta) => {
      setFlipped(false)
      setI((n) => Math.min(Math.max(n + delta, 0), order.length))
    },
    [order.length],
  )
  const grade = useCallback(
    (ok) => {
      if (!current) return
      record(current.card.id, ok)
      sfx.select()
      go(1)
    },
    [current, record, go],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (flipped && e.key === '1') grade(false)
      else if (flipped && e.key === '2') grade(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, grade, flipped])

  const masteredInPool = pool.filter((c) => mastered(progress[c.id])).length

  return (
    <>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {MODES[deckKey].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold border transition ${
              mode === k ? 'bg-jblue border-jgold/60 text-white' : 'border-white/15 text-white/70 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <details className="mb-3 sm:mb-5">
        <summary className="cursor-pointer select-none text-sm text-white/70 hover:text-white">
          Temas {cats.length ? `(${cats.length} seleccionados)` : '(todos)'} · {pool.length} tarjetas, {masteredInPool} dominadas
        </summary>
        <div className="flex flex-wrap gap-2 mt-3">
          {deck.cats.map((c) => {
            const on = cats.includes(c)
            const n = deck.cards.filter((x) => x.cat === c).length
            return (
              <button
                key={c}
                onClick={() => setCats((s) => (on ? s.filter((x) => x !== c) : [...s, c]))}
                className={`rounded-full px-3 py-1 text-xs sm:text-sm border transition ${
                  on ? 'bg-jgold text-jblue-night border-jgold font-semibold' : 'border-white/15 text-white/75 hover:bg-white/10'
                }`}
              >
                {c} <span className="opacity-60">{n}</span>
              </button>
            )
          })}
          {cats.length > 0 && (
            <button onClick={() => setCats([])} className="text-xs text-white/50 hover:text-white underline px-2">
              Quitar filtros
            </button>
          )}
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3 text-xs sm:text-sm text-white/60">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Solo las que aún no domino
        </label>
        <div className="flex items-center gap-3">
          <span>{current ? `${i + 1} de ${order.length}` : `${order.length} tarjetas`}</span>
          <button className="btn-ghost !py-1.5 !px-3" onClick={() => setSeed((s) => s + 1)}>
            Barajar
          </button>
        </div>
      </div>

      {current ? (
        <>
          <FlipCard key={`${current.card.id}-${i}`} item={current} flipped={flipped} onFlip={() => setFlipped((f) => !f)} status={progress[current.card.id]} />
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 sm:gap-3 mt-4">
            <button className="btn-ghost px-3" onClick={() => go(-1)} disabled={i === 0} title="Anterior (←)">
              ←
            </button>
            {flipped ? (
              <>
                <button className="btn-danger py-3" onClick={() => grade(false)} title="Tecla 1">
                  Repasar
                </button>
                <button className="btn-ok py-3" onClick={() => grade(true)} title="Tecla 2">
                  Lo sabía
                </button>
              </>
            ) : (
              <button className="btn-gold py-3 col-span-2" onClick={() => setFlipped(true)} title="Espacio">
                Girar tarjeta
              </button>
            )}
            <button className="btn-ghost px-3" onClick={() => go(1)} title="Siguiente (→)">
              →
            </button>
          </div>
          <p className="hidden md:block text-xs text-white/40 text-center mt-3">
            Teclado: espacio gira · ← → navegan · 1 repasar · 2 lo sabía
          </p>
        </>
      ) : (
        <Card className="p-6 text-center">
          <div className="category-text text-2xl mb-2">{order.length ? '¡Mazo terminado!' : 'No quedan tarjetas pendientes'}</div>
          <p className="text-white/60 text-sm mb-4">Baraja de nuevo, cambia de tema o desmarca el filtro para repasar todas.</p>
          <button className="btn-gold" onClick={() => setSeed((s) => s + 1)}>
            Volver a empezar
          </button>
        </Card>
      )}
    </>
  )
}

function FlipCard({ item, flipped, onFlip, status }) {
  const { card, reverse } = item
  const [front, back] = reverse ? [<Meaning card={card} />, <Name card={card} withPearl />] : [<Name card={card} />, <Meaning card={card} full />]
  const face = 'col-start-1 row-start-1 glass rounded-2xl p-5 sm:p-8 flex flex-col [backface-visibility:hidden] [-webkit-backface-visibility:hidden]'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="[perspective:1400px]">
      <motion.button
        type="button"
        onClick={onFlip}
        aria-label={flipped ? 'Mostrar el frente' : 'Girar la tarjeta'}
        className="grid w-full text-left cursor-pointer [transform-style:preserve-3d] min-h-[17rem] sm:min-h-[21rem]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0.1, 0.2, 1] }}
      >
        <div className={`${face} border-2 border-jgold/25`}>
          <CardTop card={card} side={reverse ? 'Pista' : 'Frente'} status={status} />
          <div className="flex-1 flex flex-col justify-center">{front}</div>
          <div className="text-xs text-white/40 text-center mt-4">Clic para girar</div>
        </div>
        <div className={`${face} border-2 border-emerald-400/30 [transform:rotateY(180deg)]`}>
          <CardTop card={card} side="Respuesta" status={status} />
          <div className="flex-1 flex flex-col justify-center">{back}</div>
        </div>
      </motion.button>
    </motion.div>
  )
}

function CardTop({ card, side, status }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4 text-xs">
      <span className="text-white/50 truncate">{card.cat}</span>
      <span className="flex items-center gap-2 shrink-0">
        {mastered(status) && <Pill tone="green">Dominada</Pill>}
        <span className="uppercase tracking-wider text-jgold/80 font-semibold">{side}</span>
      </span>
    </div>
  )
}

function Name({ card, withPearl = false }) {
  if (card.deck === 'semio') {
    return <div className="category-text text-3xl sm:text-4xl text-jgold text-center leading-tight">{card.term}</div>
  }
  const t = card.trial
  return (
    <div className="text-center">
      <div className="category-text text-4xl sm:text-5xl text-jgold leading-tight">{t.name}</div>
      <div className="text-white/60 mt-2">{t.year}</div>
      {withPearl && t.pearl && <p className="text-white/80 text-sm sm:text-base mt-5 max-w-2xl mx-auto">💡 {t.pearl}</p>}
    </div>
  )
}

function Meaning({ card, full = false }) {
  if (card.deck === 'semio') {
    return <p className="text-lg sm:text-2xl text-center leading-snug text-white/95 font-medium max-w-3xl mx-auto">{card.def}</p>
  }
  const t = card.trial
  const rows = [
    ['Población', t.pop],
    ['Intervención', `${t.int} vs. ${t.comp}`],
    ['Objetivo primario', t.outcome],
    ['Resultado', t.result],
  ]
  if (full && t.pearl) rows.push(['Perla', t.pearl])
  return (
    <dl className="grid gap-2.5 text-sm sm:text-base">
      {rows.map(([k, v]) => (
        <div key={k} className="grid sm:grid-cols-[9rem_1fr] gap-x-3">
          <dt className="text-jgold/80 font-semibold text-xs sm:text-sm uppercase tracking-wide sm:pt-0.5">{k}</dt>
          <dd className="text-white/90">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ---------- Lista completa con búsqueda ---------- */

function FullList({ progress }) {
  const [deckKey, setDeckKey] = useState('semio')
  const [query, setQuery] = useState('')
  const deck = DECKS[deckKey]
  const groups = useMemo(() => {
    const q = fold(query.trim())
    const list = q ? deck.cards.filter((c) => searchText(c).includes(q)) : deck.cards
    const map = new Map()
    for (const c of list) {
      if (!map.has(c.cat)) map.set(c.cat, [])
      map.get(c.cat).push(c)
    }
    return [...map.entries()]
  }, [deck, query])
  const n = groups.reduce((s, [, l]) => s + l.length, 0)

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select className="input sm:max-w-xs" value={deckKey} onChange={(e) => setDeckKey(e.target.value)}>
          {Object.entries(DECKS).map(([k, d]) => (
            <option key={k} value={k}>
              {d.label}
            </option>
          ))}
        </select>
        <input className="input" placeholder="Buscar término, signo, soplo, fármaco, estudio…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="text-sm text-white/50 mb-4">{n} tarjetas</div>
      <div className="space-y-6">
        {groups.map(([cat, list]) => (
          <section key={cat}>
            <h2 className="category-text text-xl text-jgold mb-2">
              {cat} <span className="text-white/40 text-sm">{list.length}</span>
            </h2>
            <Card className="!p-0 divide-y divide-white/10">
              {list.map((c) => (
                <div key={c.id} className="p-3 sm:p-4 grid sm:grid-cols-[14rem_1fr] gap-x-4 gap-y-1">
                  <div className="font-bold text-white flex items-start gap-2">
                    <span>{c.deck === 'semio' ? c.term : `${c.trial.name} (${c.trial.year})`}</span>
                    {mastered(progress[c.id]) && <span className="text-emerald-300 text-xs mt-1">✓</span>}
                  </div>
                  <div className="text-white/75 text-sm">
                    {c.deck === 'semio' ? (
                      c.def
                    ) : (
                      <>
                        <span className="text-white/90">{c.trial.int}</span> vs. {c.trial.comp} · {c.trial.pop}. <span className="text-white/90">{c.trial.result}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </>
  )
}
