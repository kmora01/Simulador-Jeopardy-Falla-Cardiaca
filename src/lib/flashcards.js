// Mazos de tarjetas de memoria: semiología (content/semiologia.json), estudios pivotales (content/trials.json)
// y trasplante cardíaco (content/trasplante.json + los estudios del área «Trasplante cardiaco»).
import semiologia from '../../content/semiologia.json'
import trasplante from '../../content/trasplante.json'
import { trials } from './trials'

/* ---------- Mazo de semiología ---------- */

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const SEMIO_CATS = semiologia.map((g) => g.cat)

export const semioCards = semiologia.flatMap((g) =>
  g.cards.map(([term, def]) => ({ id: `s:${slug(g.cat)}:${slug(term)}`, deck: 'semio', cat: g.cat, term, def })),
)

/* ---------- Mazo de estudios pivotales ---------- */
// Agrupados por fármaco o tema; los ensayos que no están en un grupo van a «Artículos clave: <área>».

export const TRIAL_GROUPS = [
  ['IECA', ['consensus', 'solvd-t', 'solvd-p', 'vheft2', 'save', 'aire', 'trace', 'atlas', 'hope', 'europa', 'pep-chf']],
  ['ARA II', ['elite2', 'val-heft', 'charm-alt', 'charm-added', 'charm-pres', 'i-preserve', 'heaal', 'valiant', 'ontarget', 'life']],
  ['ARNI (sacubitril/valsartán)', ['paradigm-hf', 'pioneer-hf', 'transition', 'paragon-hf', 'paraglide', 'paradise-mi']],
  ['Betabloqueadores', ['us-carvedilol', 'cibis2', 'merit-hf', 'copernicus', 'comet', 'best', 'cibis3', 'seniors', 'capricorn', 'reduce-ami', 'reboot', 'betami-danblock', 'abyss']],
  ['Antagonistas del receptor de mineralocorticoides', ['rales', 'ephesus', 'emphasis-hf', 'topcat', 'aldo-dhf', 'athena-hf', 'finearts-hf', 'fidelio', 'figaro']],
  ['iSGLT2', ['dapa-hf', 'emperor-reduced', 'emperor-preserved', 'deliver', 'soloist-whf', 'scored', 'empulse', 'dictate-ahf', 'dapa-act', 'empa-reg', 'canvas', 'declare', 'vertis', 'credence', 'dapa-ckd', 'empa-kidney', 'empact-mi', 'dapa-mi']],
  ['aGLP1 e incretinas', ['step-hfpef', 'step-hfpef-dm', 'summit', 'select', 'fight', 'live', 'leader', 'sustain6', 'rewind', 'elixa', 'harmony', 'soul', 'flow', 'surpass-cvot']],
  ['Ivabradina', ['shift', 'beautiful', 'signify']],
  ['Vericiguat', ['victoria', 'socrates-r', 'vitality']],
  ['Otros fármacos de IC', ['vheft1', 'a-heft', 'dig', 'galactic-hf', 'fair-hf', 'confirm-hf', 'affirm-ahf', 'ironman', 'heart-fid']],
  ['Doble antiagregación', ['cure', 'credo', 'clarity', 'commit', 'triton', 'trilogy', 'accoast', 'plato', 'atlantic', 'champion-phoenix', 'isar-react5', 'dapt', 'prodigy', 'pegasus', 'themis']],
  ['Antiagregación acortada y desescalada', ['leaders-free', 'senior', 'onyx-one', 'smart-date', 'global-leaders', 'stopdapt2', 'smart-choice', 'twilight', 'tico', 'stopdapt2-acs', 'master-dapt', 't-pass', 'ultimate-dapt', 'host-exam', 'topic', 'tropical-acs', 'popular-genetics', 'talos-ami']],
  ['Antitrombóticos en FA + ICP', ['woest', 'pioneer-af-pci', 're-dual', 'augustus', 'entrust', 'afire', 'epic-cad']],
  ['DAI en prevención secundaria', ['avid', 'cash', 'cids', 'meta-sec']],
  ['DAI en prevención primaria', ['madit-1', 'mustt', 'cabg-patch', 'madit-2', 'definite', 'dinamit', 'scd-heft', 'iris', 'madit-rit', 'danish', 'vest', 'praetorian', 'untouched']],
  ['Resincronización (TRC)', ['mustic', 'miracle', 'miracle-icd', 'companion', 'care-hf', 'reverse', 'prospect', 'madit-crt', 'raft', 'echocrt', 'block-hf', 'apaf-crt', 'lbbp-resync']],
  ['Trasplante: inmunosupresión y vasculopatía', ['mmf-aza-htx', 'everolimus-htx', 'sirolimus-denovo', 'sirolimus-cav', 'a2310', 'schedule', 'tictac', 'prava-htx', 'simva-htx', 'diltiazem-htx', 'ivus-htx', 'ctot11']],
  ['Trasplante: rechazo, donante e infecciones', ['image', 'eimage', 'd-oar', 'photopheresis-htx', 'proceed2', 'dcd-heart', 'dhital-dcd', 'donate-hcv', 'abo-infant', 'paya-valgan', 'hiit-htx', 'xeno-2022']],
  ['Otros artículos clave de IC', ['strong-hf', 'guide-it', 'dose', 'advor', 'clorotic', 'transform-hf', 'champion', 'momentum3', 'coapt', 'mitra-fr', 'stich', 'revived', 'castle-af', 'castle-htx']],
]

const byId = new Map(trials.map((t) => [t.id, t]))
const groupOf = new Map()
for (const [g, ids] of TRIAL_GROUPS) {
  for (const id of ids) {
    if (!byId.has(id)) console.warn(`Tarjetas: ensayo desconocido «${id}» en el grupo ${g}`)
    if (!groupOf.has(id)) groupOf.set(id, g)
  }
}

const otherCat = (t) => `Artículos clave: ${t.area}`

const ordered = [
  ...TRIAL_GROUPS.flatMap(([, ids]) => ids.filter((id) => byId.has(id)).map((id) => byId.get(id))),
  ...trials.filter((t) => !groupOf.has(t.id)).sort((a, b) => a.area.localeCompare(b.area) || a.year - b.year),
]

export const trialCards = ordered
  .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
  .map((t) => ({ id: `e:${t.id}`, deck: 'trials', cat: groupOf.get(t.id) ?? otherCat(t), trial: t }))

export const TRIAL_CATS = [...new Set(trialCards.map((c) => c.cat))]

/* ---------- Mazo de trasplante cardíaco ---------- */
// Conceptos propios (content/trasplante.json) seguidos de los estudios del área «Trasplante cardiaco».

const TX_AREA = 'Trasplante cardiaco'
const txConcepts = trasplante.flatMap((g) =>
  g.cards.map(([term, def]) => ({ id: `t:${slug(g.cat)}:${slug(term)}`, deck: 'tx', cat: g.cat, term, def })),
)
const txTrials = trialCards.filter((c) => c.trial.area === TX_AREA).map((c) => ({ ...c, deck: 'tx', cat: `Estudios: ${c.cat.replace(/^Trasplante: /, '')}` }))
export const txCards = [...txConcepts, ...txTrials]
export const TX_CATS = [...new Set(txCards.map((c) => c.cat))]

/** Tarjeta de concepto (término → significado) frente a tarjeta de estudio. */
export const isTerm = (c) => !c.trial

export const DECKS = {
  semio: { label: 'Semiología y signos', cards: semioCards, cats: SEMIO_CATS, front: 'Término', back: 'Significado' },
  trials: { label: 'Estudios pivotales', cards: trialCards, cats: TRIAL_CATS, front: 'Estudio', back: 'Qué evaluó' },
  tx: { label: 'Trasplante cardíaco', cards: txCards, cats: TX_CATS, front: 'Concepto o estudio', back: 'Significado' },
}

// Todas las tarjetas sin repetir (los estudios de trasplante están en dos mazos y comparten progreso).
export const ALL_CARDS = [...new Map(Object.values(DECKS).flatMap((d) => d.cards).map((c) => [c.id, c])).values()]

/* ---------- Progreso (por usuario, en este navegador) ---------- */
// { [id]: { ok, fail, last } }; una tarjeta está dominada con al menos 2 aciertos y más aciertos que fallos.

const key = (user) => `cardio-jeopardy:tarjetas:${user}`

export function loadProgress(user) {
  try {
    return JSON.parse(localStorage.getItem(key(user))) ?? {}
  } catch {
    return {}
  }
}

export function saveProgress(user, progress) {
  try {
    localStorage.setItem(key(user), JSON.stringify(progress))
  } catch {
    /* almacenamiento no disponible: el progreso solo dura la sesión */
  }
}

export const mastered = (p) => !!p && p.ok >= 2 && p.ok > p.fail

export const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export const searchText = (c) =>
  fold(
    isTerm(c)
      ? `${c.term} ${c.def} ${c.cat}`
      : [c.trial.name, c.trial.pop, c.trial.int, c.trial.comp, c.trial.outcome, c.trial.result, c.trial.pearl, c.cat].join(' '),
  )
