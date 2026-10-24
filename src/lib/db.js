import Dexie from 'dexie'

// Todos los registros llevan `user`: los datos de cada fellow quedan aislados en IndexedDB.
export const db = new Dexie('cardio-jeopardy')

db.version(1).stores({
  games: '++id, user, [user+status], updatedAt',
  played: '[user+qid], user',
  attempts: '++id, user, [user+qid], [user+day], ts',
  srs: '[user+qid], user, [user+due]',
  settings: 'user',
})

export const todayKey = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

/* ---------- Partidas (guardado automático) ---------- */

export async function getActiveGame(user) {
  return db.games.where({ user, status: 'active' }).first()
}

export async function createGame(user, state) {
  await db.games.where({ user, status: 'active' }).modify({ status: 'abandoned' })
  const id = await db.games.add({ user, status: 'active', state, createdAt: Date.now(), updatedAt: Date.now() })
  return id
}

export async function saveGame(id, state, status = 'active') {
  await db.games.update(id, { state, status, updatedAt: Date.now() })
}

export async function finishedGames(user) {
  return db.games.where({ user, status: 'finished' }).toArray()
}

/* ---------- No repetición ---------- */

export async function playedSet(user) {
  const rows = await db.played.where('user').equals(user).primaryKeys()
  return new Set(rows.map(([, qid]) => qid))
}

export async function markPlayed(user, qid) {
  await db.played.put({ user, qid, at: Date.now() })
}

export async function resetPlayed(user, qids = null) {
  if (!qids) return db.played.where('user').equals(user).delete()
  return db.played.bulkDelete(qids.map((q) => [user, q]))
}

/* ---------- Intentos / analítica ---------- */

export async function recordAttempt(user, q, { correct, mode, value = 0, skipped = false, srs = true }) {
  const ts = Date.now()
  await db.attempts.add({
    user,
    qid: q.id,
    category: q.category,
    subspecialty: q.subspecialty,
    difficulty: q.difficulty,
    correct: !!correct,
    skipped,
    mode,
    value,
    ts,
    day: todayKey(new Date(ts)),
  })
  if (!skipped && srs) await updateSrs(user, q.id, correct ? 4 : 1, { fromGame: mode !== 'srs' })
}

export async function allAttempts(user) {
  return db.attempts.where('user').equals(user).toArray()
}

/* ---------- Repetición espaciada (SM-2 simplificado) ---------- */

const DAY = 86_400_000

// grade: 1 = otra vez, 3 = difícil, 4 = bien, 5 = fácil
export async function updateSrs(user, qid, grade, { fromGame = false } = {}) {
  const prev = await db.srs.get([user, qid])
  // Una pregunta acertada en juego que nunca se falló no entra al repaso.
  if (!prev && grade >= 3 && fromGame) return
  const card = prev ?? { user, qid, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0 }
  if (grade < 3) {
    card.reps = 0
    card.lapses += 1
    card.interval = 0
    card.due = Date.now() + 10 * 60_000 // vuelve a aparecer en 10 min
  } else {
    card.reps += 1
    if (card.reps === 1) card.interval = grade === 5 ? 3 : 1
    else if (card.reps === 2) card.interval = grade === 5 ? 8 : 4
    else card.interval = Math.round(card.interval * card.ease * (grade === 3 ? 0.8 : grade === 5 ? 1.3 : 1))
    card.due = Date.now() + card.interval * DAY
  }
  card.ease = Math.max(1.3, card.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)))
  card.lastGrade = grade
  card.updatedAt = Date.now()
  await db.srs.put(card)
}

export async function srsCards(user) {
  return db.srs.where('user').equals(user).toArray()
}

export async function removeSrs(user, qid) {
  await db.srs.delete([user, qid])
}

/* ---------- Ajustes ---------- */

export const DEFAULT_SETTINGS = {
  timerSeconds: 20,
  finalSeconds: 30,
  strictQuestionForm: true,
  sound: true,
  matchTolerance: 0.8,
}

export async function getSettings(user) {
  const s = await db.settings.get(user)
  return { ...DEFAULT_SETTINGS, ...(s?.values ?? {}) }
}

export async function saveSettings(user, values) {
  await db.settings.put({ user, values })
}

/* ---------- Respaldo ---------- */

export async function exportUserData(user) {
  const [games, played, attempts, srs, settings] = await Promise.all([
    db.games.where('user').equals(user).toArray(),
    db.played.where('user').equals(user).toArray(),
    db.attempts.where('user').equals(user).toArray(),
    db.srs.where('user').equals(user).toArray(),
    db.settings.get(user),
  ])
  return { app: 'cardio-jeopardy', version: 1, user, exportedAt: new Date().toISOString(), games, played, attempts, srs, settings }
}

export async function importUserData(user, data) {
  if (data?.app !== 'cardio-jeopardy' || data.user !== user) throw new Error('El archivo no corresponde a este usuario.')
  await db.transaction('rw', db.games, db.played, db.attempts, db.srs, db.settings, async () => {
    for (const t of ['games', 'played', 'attempts', 'srs']) await db[t].where('user').equals(user).delete()
    await db.games.bulkAdd(data.games.map(({ id, ...g }) => g))
    await db.played.bulkPut(data.played)
    await db.attempts.bulkAdd(data.attempts.map(({ id, ...a }) => a))
    await db.srs.bulkPut(data.srs)
    if (data.settings) await db.settings.put(data.settings)
  })
}
