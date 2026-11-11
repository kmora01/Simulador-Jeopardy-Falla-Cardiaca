// Feed estilo X/Twitter de estudios pivotales: cada ensayo de content/trials.json se muestra como una publicación
// de la revista que lo publicó. Los textos son resúmenes propios del simulador, no publicaciones reales de las revistas.
import { trials } from './trials'

export const JOURNALS = {
  NEJM: { name: 'The New England Journal of Medicine', handle: 'NEJM', short: 'NEJM', color: '#b31b1b', ta: 'N Engl J Med' },
  'NEJM Evid': { name: 'NEJM Evidence', handle: 'NEJMEvidence', short: 'NEJM', color: '#8c1515', ta: 'NEJM Evid' },
  Lancet: { name: 'The Lancet', handle: 'TheLancet', short: 'L', color: '#0a5c99', ta: 'Lancet' },
  'Lancet Respir Med': { name: 'The Lancet Respiratory Medicine', handle: 'LancetRespirMed', short: 'L', color: '#0a7aa6', ta: 'Lancet Respir Med' },
  JAMA: { name: 'JAMA', handle: 'JAMA_current', short: 'JAMA', color: '#9e1b32', ta: 'JAMA' },
  'JAMA Cardiol': { name: 'JAMA Cardiology', handle: 'JAMACardio', short: 'JAMA', color: '#7a1f3d', ta: 'JAMA Cardiol' },
  JACC: { name: 'JACC Journals', handle: 'JACCJournals', short: 'JACC', color: '#0b6e4f', ta: 'J Am Coll Cardiol' },
  'JACC EP': { name: 'JACC: Clinical Electrophysiology', handle: 'JACCJournals', short: 'JACC', color: '#127a68', ta: 'JACC Clin Electrophysiol' },
  Circulation: { name: 'Circulation', handle: 'CircAHA', short: 'Circ', color: '#c8102e', ta: 'Circulation' },
  EHJ: { name: 'European Heart Journal', handle: 'ESC_Journals', short: 'EHJ', color: '#003b71', ta: 'Eur Heart J' },
  'Eur J Heart Fail': { name: 'European Journal of Heart Failure', handle: 'ESC_Journals', short: 'EJHF', color: '#1d4f91', ta: 'Eur J Heart Fail' },
  'Heart Rhythm': { name: 'Heart Rhythm', handle: 'HRSonline', short: 'HR', color: '#6b2c91', ta: 'Heart Rhythm' },
  'Nat Med': { name: 'Nature Medicine', handle: 'NatureMedicine', short: 'NM', color: '#2f2f2f', ta: 'Nat Med' },
  'Ann Intern Med': { name: 'Annals of Internal Medicine', handle: 'AnnalsofIM', short: 'AIM', color: '#5a3e1b', ta: 'Ann Intern Med' },
  'Am J Transplant': { name: 'American Journal of Transplantation', handle: 'AJTransplant', short: 'AJT', color: '#00657f', ta: 'Am J Transplant' },
  Transplantation: { name: 'Transplantation', handle: 'TransplantJrnl', short: 'Tx', color: '#2d6a4f', ta: 'Transplantation' },
  'J Heart Lung Transplant': { name: 'The Journal of Heart and Lung Transplantation', handle: 'JHLTOnline', short: 'JHLT', color: '#8a2be2', ta: 'J Heart Lung Transplant' },
  'Circ Heart Fail': { name: 'Circulation: Heart Failure', handle: 'CircHF', short: 'Circ', color: '#a50f2d', ta: 'Circ Heart Fail' },
}

const FALLBACK = { name: 'Revista médica', handle: 'cardio', short: '?', color: '#444', ta: '' }
export const journalOf = (t) => JOURNALS[t.journal] ?? FALLBACK

// Términos de búsqueda para siglas ambiguas o nombres que no aparecen tal cual en el resumen de PubMed.
const QUERY = {
  'us-carvedilol': 'carvedilol chronic heart failure mortality Packer',
  'meta-sec': 'AVID CASH CIDS meta-analysis implantable defibrillator secondary prevention',
  aries: 'ARIES ambrisentan pulmonary arterial hypertension',
  'race-cteph': 'balloon pulmonary angioplasty riociguat RACE',
  'triton-pah': 'TRITON initial triple oral therapy pulmonary arterial hypertension',
  time: 'TIME evening morning dosing antihypertensive',
  smart: 'SMART small aortic annulus self-expanding balloon-expandable',
  total: 'TOTAL thrombectomy STEMI',
  best: 'bucindolol advanced chronic heart failure',
  hope: 'HOPE ramipril cardiovascular events high-risk',
  'step-china': 'STEP intensive blood-pressure elderly hypertensive',
  life: 'LIFE losartan atenolol',
  dose: 'diuretic strategies acute decompensated heart failure DOSE',
  fight: 'FIGHT liraglutide heart failure',
  live: 'LIVE liraglutide ejection fraction',
  select: 'SELECT semaglutide cardiovascular obesity without diabetes',
  senior: 'SENIOR drug-eluting stents elderly',
  flow: 'FLOW semaglutide kidney outcomes',
  soul: 'SOUL oral semaglutide cardiovascular',
  ease: 'early surgery infective endocarditis EASE',
  close: 'CLOSE patent foramen ovale closure stroke',
  poet: 'POET partial oral treatment endocarditis',
  fire: 'FIRE physiology-guided complete revascularization older myocardial infarction',
  box: 'BOX blood-pressure targets comatose cardiac arrest',
  loop: 'LOOP implantable loop recorder atrial fibrillation screening stroke',
  option: 'OPTION left atrial appendage closure after ablation',
  increase: 'inhaled treprostinil interstitial lung disease pulmonary hypertension',
  victor: 'VICTOR vericiguat heart failure',
  diamond: 'DIAMOND patiromer heart failure',
  cope: 'COPE colchicine acute pericarditis',
  topic: 'TOPIC de-escalation dual antiplatelet',
  recovery: 'early surgery asymptomatic severe aortic stenosis RECOVERY',
  atlas: 'ATLAS lisinopril low high dose heart failure',
  athena: 'ATHENA dronedarone atrial fibrillation',
  comet: 'COMET carvedilol metoprolol',
  trace: 'TRACE trandolapril',
  save: 'SAVE captopril myocardial infarction',
  aire: 'AIRE ramipril',
  dig: 'digoxin mortality heart failure Digitalis Investigation Group',
  proved: 'PROVED digoxin withdrawal heart failure',
  radiance: 'RADIANCE digoxin withdrawal angiotensin-converting enzyme',
  'dig-ancillary': 'digoxin preserved ejection fraction DIG ancillary trial',
  'dig-concentration': 'serum digoxin concentration mortality men heart failure Rathore',
  'digit-hf': 'DIGIT-HF digitoxin heart failure',
  'rate-af': 'RATE-AF digoxin bisoprolol permanent atrial fibrillation',
  cast: 'CAST encainide flecainide',
  shock: 'SHOCK emergency revascularization cardiogenic shock',
  commit: 'COMMIT clopidogrel metoprolol acute myocardial infarction',
  galileo: 'GALILEO rivaroxaban TAVR',
  transition: 'TRANSITION sacubitril valsartan initiation',
  europa: 'EUROPA perindopril',
  corp: 'colchicine recurrent pericarditis CORP',
  matrix: 'MATRIX radial femoral access',
  excel: 'EXCEL left main PCI CABG',
  noble: 'NOBLE left main PCI CABG',
  freedom: 'FREEDOM diabetes multivessel revascularization',
  stich: 'STICH coronary-artery bypass ventricular dysfunction',
  courage: 'COURAGE optimal medical therapy PCI stable',
  complete: 'COMPLETE complete revascularization STEMI',
  champion: 'CHAMPION wireless pulmonary artery pressure monitoring',
  'champion-phoenix': 'CHAMPION PHOENIX cangrelor',
  'iabp-shock2': 'IABP-SHOCK II intraaortic balloon',
  ttm: 'targeted temperature management 33 36 cardiac arrest',
  ascend: 'ASCEND aspirin diabetes primary prevention',
  strength: 'STRENGTH omega-3 carboxylic acids',
  credo: 'CREDO clopidogrel percutaneous coronary intervention',
  clarity: 'CLARITY clopidogrel fibrinolytic ST-elevation',
  cure: 'CURE clopidogrel acute coronary syndromes without ST-segment elevation',
  iris: 'IRIS defibrillator early after myocardial infarction',
  vest: 'wearable cardioverter-defibrillator myocardial infarction VEST',
  reverse: 'REVERSE cardiac resynchronization mildly symptomatic',
  prospect: 'PROSPECT echocardiographic predictors response cardiac resynchronization',
  miracle: 'MIRACLE cardiac resynchronization chronic heart failure',
  companion: 'COMPANION cardiac resynchronization defibrillator',
  raft: 'RAFT cardiac resynchronization mild-to-moderate heart failure',
  pallas: 'PALLAS dronedarone permanent atrial fibrillation',
  bridge: 'BRIDGE perioperative bridging anticoagulation atrial fibrillation',
  'protect-af': 'PROTECT AF left atrial appendage closure',
  're-cover': 'RE-COVER dabigatran venous thromboembolism',
  hps: 'Heart Protection Study simvastatin',
  '4s': 'Scandinavian Simvastatin Survival Study',
  allhat: 'ALLHAT antihypertensive lipid-lowering',
  accomplish: 'ACCOMPLISH benazepril amlodipine hydrochlorothiazide',
  'smart-date': 'SMART-DATE dual antiplatelet',
  image: 'gene-expression profiling heart transplant rejection surveillance Pham',
  eimage: 'early gene expression profiling heart transplant EIMAGE',
  'd-oar': 'donor-derived cell-free DNA heart transplant rejection Khush',
  proceed2: 'PROCEED II ex-vivo perfusion donor hearts',
  'dcd-heart': 'transplantation outcomes donor hearts after circulatory death Schroder',
  'prava-htx': 'pravastatin cardiac transplantation Kobashigawa',
  'simva-htx': 'simvastatin graft vessel disease mortality heart transplantation Wenke',
  'diltiazem-htx': 'diltiazem coronary artery disease after heart transplantation Schroeder',
  'mmf-aza-htx': 'mycophenolate mofetil azathioprine cardiac transplantation Kobashigawa',
  'everolimus-htx': 'everolimus prevention allograft rejection vasculopathy cardiac transplant Eisen',
  a2310: 'everolimus reduced cyclosporine de novo heart transplant mycophenolate Eisen',
  schedule: 'SCHEDULE everolimus cyclosporine withdrawal heart transplant renal function',
  tictac: 'tacrolimus monotherapy cardiac transplant TICTAC',
  'sirolimus-cav': 'sirolimus established cardiac allograft vasculopathy Mancini',
  'sirolimus-denovo': 'sirolimus de novo cardiac transplant azathioprine Keogh',
  'donate-hcv': 'heart lung transplants HCV-infected donors uninfected recipients',
  'photopheresis-htx': 'photopheresis prevention rejection cardiac transplantation Barr',
  'paya-valgan': 'valganciclovir oral ganciclovir CMV prevention solid organ transplant',
  'hiit-htx': 'high-intensity interval training heart transplant recipients Nytroen',
  ctot11: 'rituximab induction cardiac transplantation coronary vasculopathy CTOT',
  'abo-infant': 'ABO-incompatible heart transplantation infants West',
  'ivus-htx': 'intravascular ultrasound first year cardiac transplant vasculopathy Kobashigawa',
  'dhital-dcd': 'heart transplantation distant procurement ex-vivo preservation circulatory death',
  'xeno-2022': 'genetically modified porcine-to-human cardiac xenotransplantation',
}

const clean = (s) => s.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()

/** Búsqueda en PubMed del artículo principal (nunca una URL inventada: es una consulta). */
export function pubmedUrl(t) {
  const term = `(${QUERY[t.id] ?? clean(t.name)}) AND (${t.year - 1}:${t.year + 1}[dp])`
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`
}

export function scholarUrl(t) {
  const j = journalOf(t)
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(`${clean(t.name)} trial ${j.ta}`)}&as_ylo=${t.year - 1}&as_yhi=${t.year + 1}`
}

const lower1 = (s) => (s && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s)

/** Texto principal de la publicación: la conclusión del ensayo en una o dos frases. */
export function tweetText(t) {
  if (t.tweet) return t.tweet
  return `${t.pop}: ${lower1(t.int)} frente a ${lower1(t.comp)}. ${t.result}`
}

// Orden estable dentro de cada año (solo el año es real).
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export const posts = trials.map((t) => {
  const h = hash(t.id)
  return {
    ...t,
    j: journalOf(t),
    text: tweetText(t),
    order: t.year * 100 + ((h >> 11) % 100),
  }
})

export const FEED_AREAS = [...new Set(posts.map((p) => p.area))].sort((a, b) => a.localeCompare(b, 'es'))
export const FEED_JOURNALS = [...new Set(posts.map((p) => p.journal))].sort(
  (a, b) => posts.filter((p) => p.journal === b).length - posts.filter((p) => p.journal === a).length,
)

/* ---------- Me gusta y guardados (por usuario, en este navegador) ---------- */

const key = (user) => `cardio-jeopardy:feed:${user}`

export function loadFeedState(user) {
  try {
    const s = JSON.parse(localStorage.getItem(key(user)))
    return { liked: s?.liked ?? {}, saved: s?.saved ?? {}, seen: s?.seen ?? {} }
  } catch {
    return { liked: {}, saved: {}, seen: {} }
  }
}

export function saveFeedState(user, state) {
  try {
    localStorage.setItem(key(user), JSON.stringify(state))
  } catch {
    /* sin almacenamiento: solo dura la sesión */
  }
}

export function shuffledIds(seed) {
  return [...posts]
    .map((p) => ({ id: p.id, k: hash(p.id + seed) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.id)
}
