// Validación de respuestas tolerante a errores ortográficos.
// Combina: normalización (acentos, artículos, "¿Qué es...?"), distancia de Levenshtein
// por respuesta completa y por tokens, y coincidencia de siglas.

const QUESTION_PREFIX =
  /^\s*¿?\s*(que|quien|quienes|cual|cuales|cuando|donde|como|cuanto|cuanta|what|who|where|when|which)\s+(es|son|fue|fueron|era|eran|is|are|was|were)\b\s*/i

const STOPWORDS = new Set(
  'el la los las un una unos unas de del al y o en con por para a the an of and or in on with to su sus se lo que es son'.split(' '),
)

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function isQuestionForm(raw) {
  const s = stripAccents(raw.trim().toLowerCase())
  return QUESTION_PREFIX.test(s.replace(/^¿/, '')) || /^¿.*\?$/.test(raw.trim())
}

export function normalize(raw) {
  let s = stripAccents(String(raw).toLowerCase())
  s = s.replace(/[¿?¡!.,;:()"'`´]/g, ' ')
  s = s.replace(QUESTION_PREFIX, '')
  s = s.replace(/-/g, ' ')
  const tokens = s.split(/\s+/).filter((t) => t && !STOPWORDS.has(t))
  return tokens.join(' ')
}

export function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

export function similarity(a, b) {
  if (!a && !b) return 1
  const d = levenshtein(a, b)
  return 1 - d / Math.max(a.length, b.length)
}

// Fracción de tokens de `target` presentes (con tolerancia) en `given`.
function tokenCoverage(given, target) {
  const g = given.split(' ').filter(Boolean)
  const t = target.split(' ').filter(Boolean)
  if (!t.length) return 0
  let hit = 0
  for (const tok of t) {
    const tol = tok.length <= 4 ? 1 : 0.8
    if (g.some((x) => (tol === 1 ? x === tok : similarity(x, tok) >= tol))) hit++
  }
  return hit / t.length
}

/**
 * @returns {{correct: boolean, score: number, best: string, questionForm: boolean}}
 */
export function checkAnswer(raw, question, tolerance = 0.8) {
  const given = normalize(raw)
  const questionForm = isQuestionForm(raw)
  if (!given) return { correct: false, score: 0, best: question.answer, questionForm }
  const targets = [question.answer, ...(question.accept ?? [])].map(normalize).filter(Boolean)
  let bestScore = 0
  let best = targets[0]
  const givenNums = (given.match(/\d+/g) ?? []).join(' ')
  const numericTargets = targets.some((t) => /\d/.test(t))
  for (const t of targets) {
    // Si la respuesta es numérica (umbrales, dosis), los números deben coincidir exactamente.
    const tNums = (t.match(/\d+/g) ?? []).join(' ')
    if (givenNums && numericTargets && tNums !== givenNums) continue
    const whole = similarity(given, t)
    // Para respuestas cortas (siglas, 1 palabra) exigimos más exactitud.
    const cov = t.length <= 4 ? (given.split(' ').includes(t) ? 1 : 0) : tokenCoverage(given, t)
    // Penaliza respuestas que agregan mucho texto ajeno (evita "acertar" escribiendo todo).
    const extra = Math.max(0, given.split(' ').length - t.split(' ').length - 2)
    const score = Math.max(whole, cov - extra * 0.1)
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  // Términos prohibidos: respuestas cercanas pero incorrectas que el autor marcó explícitamente.
  const rejected = (question.reject ?? []).map(normalize).some((r) => r && similarity(given, r) >= 0.9)
  return { correct: !rejected && bestScore >= tolerance, score: bestScore, best, questionForm }
}
