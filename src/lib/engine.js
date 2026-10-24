// Motor de Jeopardy!: construcción de tableros, Daily Doubles, apuestas y puntaje.
//
// Reglas aplicadas (formato actual del programa, valores desde 2001):
// - Jeopardy!: 6 categorías x 5 pistas, $200–$1000, 1 Daily Double.
// - Double Jeopardy!: 6 categorías nuevas, $400–$2000, 2 Daily Doubles (en columnas distintas).
// - Daily Double: apuesta mínima $5; máxima = puntaje actual o el valor más alto del tablero
//   de esa ronda ($1000 / $2000), lo que sea mayor.
// - Final Jeopardy!: solo juega quien tiene puntaje > $0; apuesta de $0 hasta el puntaje total;
//   30 segundos para escribir la respuesta.
// - Acierto suma el valor; error lo resta; no contestar (pasar) no cambia el puntaje.
// - La respuesta debe darse en forma de pregunta ("¿Qué es...?"). En Daily Double y Final
//   no hacerlo se califica como incorrecto (modo estricto).

export const ROUND_VALUES = {
  J: [200, 400, 600, 800, 1000],
  DJ: [400, 800, 1200, 1600, 2000],
}
export const ROUND_NAMES = { J: 'Jeopardy!', DJ: 'Double Jeopardy!', FJ: 'Final Jeopardy!' }
const DD_COUNT = { J: 1, DJ: 2 }
// Distribución histórica aproximada de Daily Doubles por fila (fila 1 casi nunca, fila 4 la más frecuente).
const DD_ROW_WEIGHTS = [0.01, 0.09, 0.26, 0.39, 0.25]

const rand = (n) => Math.floor(Math.random() * n)
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const weightedRow = () => {
  let r = Math.random()
  for (let i = 0; i < DD_ROW_WEIGHTS.length; i++) {
    r -= DD_ROW_WEIGHTS[i]
    if (r <= 0) return i
  }
  return 3
}

function pickColumn(pool) {
  // pool: preguntas no jugadas de una categoría. Una por dificultad 1..5, o la más cercana.
  const used = new Set()
  const cells = []
  for (let d = 1; d <= 5; d++) {
    const candidates = shuffle(pool.filter((q) => !used.has(q.id))).sort(
      (a, b) => Math.abs(a.difficulty - d) - Math.abs(b.difficulty - d),
    )
    const q = candidates[0]
    used.add(q.id)
    cells.push(q)
  }
  return cells
}

/** Analiza cuántas categorías tienen suficientes preguntas sin jugar. */
export function availability(bank, played, subspecialties = null) {
  const byCat = new Map()
  for (const q of bank.questions) {
    if (played.has(q.id)) continue
    if (subspecialties?.length && !subspecialties.includes(q.subspecialty)) continue
    if (!byCat.has(q.category)) byCat.set(q.category, [])
    byCat.get(q.category).push(q)
  }
  const eligible = [...byCat.entries()].filter(([, qs]) => qs.length >= 5)
  const unplayed = bank.questions.length - [...played].filter((id) => bank.byId.has(id)).length
  return { byCat, eligible, unplayed }
}

export function boardsPossible(bank, played, subspecialties) {
  const { eligible } = availability(bank, played, subspecialties)
  // Cada categoría puede dar varias columnas si tiene muchas preguntas.
  return eligible.reduce((n, [, qs]) => n + Math.floor(qs.length / 5), 0)
}

/**
 * Construye una partida completa nueva excluyendo preguntas ya jugadas.
 * @param {{rounds: ('J'|'DJ')[], subspecialties?: string[], final?: boolean}} opts
 */
export function buildGame(bank, played, opts = {}) {
  const rounds = opts.rounds ?? ['J', 'DJ']
  const { byCat } = availability(bank, played, opts.subspecialties)
  const taken = new Set()
  const boards = {}

  // Reparte columnas: prioriza categorías con más preguntas y evita repetir subespecialidad en un tablero.
  const pools = new Map([...byCat.entries()].map(([k, v]) => [k, [...v]]))
  for (const round of rounds) {
    const candidates = shuffle([...pools.entries()].filter(([, qs]) => qs.filter((q) => !taken.has(q.id)).length >= 5))
    if (candidates.length < 6) {
      return { error: 'exhausted', needed: 6, available: candidates.length }
    }
    const chosen = []
    const subsUsed = new Map()
    for (const pass of [1, 2, 99]) {
      for (const [cat, qs] of candidates) {
        if (chosen.length === 6) break
        if (chosen.some((c) => c.name === cat)) continue
        if (round === 'DJ' && boards.J?.categories.some((c) => c.name === cat) && pass < 99) continue
        const sub = qs[0].subspecialty
        if ((subsUsed.get(sub) ?? 0) >= pass) continue
        const pool = qs.filter((q) => !taken.has(q.id))
        if (pool.length < 5) continue
        const col = pickColumn(pool)
        col.forEach((q) => taken.add(q.id))
        subsUsed.set(sub, (subsUsed.get(sub) ?? 0) + 1)
        chosen.push({ name: cat, subspecialty: sub, cells: col })
      }
    }
    if (chosen.length < 6) return { error: 'exhausted', needed: 6, available: chosen.length }

    const ddCols = shuffle([0, 1, 2, 3, 4, 5]).slice(0, DD_COUNT[round])
    const ddSet = new Set(ddCols.map((c) => `${c}-${weightedRow()}`))
    boards[round] = {
      categories: chosen.map((c, ci) => ({
        name: c.name,
        subspecialty: c.subspecialty,
        cells: c.cells.map((q, ri) => ({
          qid: q.id,
          value: ROUND_VALUES[round][ri],
          dd: ddSet.has(`${ci}-${ri}`),
          played: false,
          result: null,
        })),
      })),
    }
  }

  let final = null
  if (opts.final !== false) {
    const boardCats = new Set(Object.values(boards).flatMap((b) => b.categories.map((c) => c.name)))
    const pool = bank.questions.filter(
      (q) =>
        !played.has(q.id) &&
        !taken.has(q.id) &&
        (!opts.subspecialties?.length || opts.subspecialties.includes(q.subspecialty)),
    )
    const finals = pool.filter((q) => q.final)
    const hard = pool.filter((q) => q.difficulty >= 4 && !boardCats.has(q.category))
    const q = shuffle(finals.length ? finals : hard.length ? hard : pool)[0]
    if (q) final = { qid: q.id, category: q.finalCategory ?? q.category, wager: null, answer: null, result: null }
  }

  return {
    version: 1,
    rounds,
    roundIndex: 0,
    round: rounds[0],
    score: 0,
    boards,
    final,
    current: null,
    history: [],
    startedAt: Date.now(),
    filters: opts.subspecialties ?? [],
  }
}

export const maxDailyDoubleWager = (score, round) => Math.max(score, ROUND_VALUES[round].at(-1))
export const maxFinalWager = (score) => Math.max(0, score)

export function remainingInRound(state) {
  const b = state.boards[state.round]
  if (!b) return 0
  return b.categories.reduce((n, c) => n + c.cells.filter((x) => !x.played).length, 0)
}

/** Avanza a la siguiente ronda cuando el tablero actual se vació. Devuelve el nuevo estado. */
export function advanceRound(state) {
  const next = { ...state }
  if (state.round === 'FJ') return { ...next, round: 'done', finishedAt: Date.now() }
  const idx = state.roundIndex + 1
  if (idx < state.rounds.length) {
    next.roundIndex = idx
    next.round = state.rounds[idx]
  } else if (state.final && state.score > 0) {
    next.round = 'FJ'
  } else {
    next.round = 'done'
    next.finishedAt = Date.now()
    next.finalSkipped = !!state.final
  }
  return next
}

export function applyResult(state, { round, col, row, correct, skipped, wager, given }) {
  const s = structuredClone(state)
  const cell = s.boards[round].categories[col].cells[row]
  const stake = cell.dd ? wager : cell.value
  const delta = skipped ? 0 : correct ? stake : -stake
  cell.played = true
  cell.result = skipped ? 'skip' : correct ? 'correct' : 'wrong'
  cell.delta = delta
  s.score += delta
  s.current = null
  s.history.push({ qid: cell.qid, round, value: cell.value, dd: cell.dd, wager: cell.dd ? wager : null, correct, skipped, delta, given, ts: Date.now() })
  return s
}

export function applyFinal(state, { correct, given }) {
  const s = structuredClone(state)
  const delta = correct ? s.final.wager : -s.final.wager
  s.final.result = correct ? 'correct' : 'wrong'
  s.final.answer = given
  s.score += delta
  s.history.push({ qid: s.final.qid, round: 'FJ', value: 0, wager: s.final.wager, correct, delta, given, ts: Date.now() })
  s.round = 'done'
  s.finishedAt = Date.now()
  return s
}

export function gameSummary(state) {
  const h = state.history
  const answered = h.filter((x) => !x.skipped)
  return {
    score: state.score,
    correct: h.filter((x) => x.correct).length,
    wrong: answered.filter((x) => !x.correct).length,
    skipped: h.filter((x) => x.skipped).length,
    coryat: h.filter((x) => x.round !== 'FJ').reduce((n, x) => n + (x.skipped ? 0 : x.correct ? x.value : x.dd ? 0 : -x.value), 0),
    dd: h.filter((x) => x.dd),
  }
}
