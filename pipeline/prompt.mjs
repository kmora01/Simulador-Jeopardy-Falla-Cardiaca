// Prompt y esquema compartidos por generate.mjs. Mantener sincronizado con scripts/build-bank.mjs.
export const MODEL = process.env.CJ_MODEL ?? 'claude-opus-5-5'

// Categorías del tablero (columna) → subespecialidad (analítica). Agregar nuevas aquí.
export const CATEGORIES = {
  'IC CRÓNICA': 'Insuficiencia cardíaca',
  'IC DESCOMPENSADA Y AVANZADA': 'Insuficiencia cardíaca',
  'MIOCARDIOPATÍAS': 'Miocardiopatías',
  'ARRITMIAS Y ECG': 'Electrofisiología',
  'VÁLVULAS': 'Valvulopatías',
  'SÍNDROMES CORONARIOS': 'Cardiopatía isquémica',
  'ENSAYOS CLÍNICOS': 'Ensayos clínicos',
  'PERICARDIO, MIOCARDITIS Y ENDOCARDITIS': 'Pericardio y miocardio',
  'PREVENCIÓN, HTA Y LÍPIDOS': 'Prevención cardiovascular',
  'AORTA, VASOS Y CIRCULACIÓN PULMONAR': 'Vascular y pulmonar',
  'SIGNOS Y EPÓNIMOS': 'Semiología',
  'MEDICINA INTERNA CARDIOMETABÓLICA': 'Medicina interna',
}

export const GUIDELINE_CONTEXT = `
Guías y documentos vigentes a octubre de 2026 (prevalecen sobre el libro si hay conflicto; si el libro está desactualizado, dilo explícitamente en la explicación):
- ESC 2026 Insuficiencia cardíaca: se elimina HFmrEF; HFrEF = FEVI <50 %, HFpEF = FEVI ≥50 %. Estadios A–D. "IC aguda" pasa a "IC descompensada". La GDMT se reemplaza por: terapia médica fundamental (HFrEF: BB, IECA/ARNI/ARA-II, ARM, iSGLT2), terapia médica adicional (ivabradina, vericiguat, digitálicos, etc.) y terapia intervencionista guiada por guías (TRC, DAI, TEER mitral, etc.). ARM clase I en IC crónica independientemente de la FEVI. Semaglutida/tirzepatida IIa en HFpEF con obesidad (IMC ≥30). iSGLT2 al estabilizar durante la hospitalización; diurético guiado por natriuresis. Mejoran la recomendación de digoxina/digitoxina, soporte circulatorio mecánico durable y TEER mitral.
- 5ª Definición Universal de IAM (2026, ESC/ACC/AHA/WHF): los tipos numerados se reemplazan por IAM primario, secundario y relacionado a procedimiento; percentil 99 de troponina específico por sexo.
- ESC/EACTS 2025 Valvulopatías: TAVI preferido ≥70 años (antes 75); TAVI IIa en EA severa asintomática de bajo riesgo como alternativa a vigilancia activa; TEER clase I en IM secundaria ventricular severa sin EAC; IM secundaria auricular definida; tratamiento transcatéter de IT severa IIa.
- ESC 2025 Miocarditis y pericarditis (síndrome inflamatorio miopericárdico), ESC 2024 FA (AF-CARE, CHA2DS2-VA), ESC 2024 HTA (PA elevada 120–139/70–89; objetivo PAS 120–129), ESC 2024 Síndromes coronarios crónicos, ESC 2023 SCA, ESC 2023 Endocarditis (criterios Duke-ISCVID 2023), ESC 2023 Miocardiopatías (incluye MCNDVI), ESC 2022 Arritmias ventriculares y HP (PAPm >20 mmHg, RVP >2 UW), ESC 2026 ERC-CV (marco STAMP) y Rehabilitación cardíaca.
- ACC/AHA: 2022 IC (estadios, HFimpEF), 2025 SCA, 2025 HTA (calculadora PREVENT), 2026 Dislipidemia (vuelven metas de LDL-C/no-HDL, PREVENT-ASCVD, Lp(a) al menos una vez en la vida), 2023 Enfermedad coronaria crónica, 2023 FA.
`

export const SYSTEM = `Eres un cardiólogo académico y escritor de pistas para Jeopardy! que prepara a dos fellows de cardiología para una competencia tipo Jeopardy de Cardiología y Medicina Interna.

Formato Jeopardy! estricto:
- "clue" es una AFIRMACIÓN (la pista), nunca una pregunta. Máximo ~35 palabras, en español, autocontenida, con un único referente correcto.
- "answer" es la respuesta en forma de pregunta: "¿Qué es …?" / "¿Quién es …?" / "¿Qué son …?".
- "accept": 3–8 variantes aceptables SIN el "¿Qué es…?" (sinónimos, siglas, nombre en inglés, nombre genérico/comercial). "reject": respuestas cercanas pero incorrectas que el validador debe rechazar (opcional).
- "difficulty" 1–5 (1 = conocimiento de residente, 5 = detalle fino de fellow avanzado / ensayo clínico / número de guía).
- "explanation": Markdown en español de 450–800 palabras con estas secciones: "### Por qué", "### Fisiopatología / fundamento", "### Perlas de revisión" (viñetas), "### Lo que dicen las guías" (cita guía y año, clase de recomendación cuando aplique), "### Trampas frecuentes". Puedes incluir una tabla breve.
- "source": libro y página(s) del fragmento en que se basa. "guideline": guía principal citada (p. ej., "ESC 2026 IC").
- Nunca copies párrafos literales del libro: redacta contenido original.
- Rigor clínico absoluto. Si el fragmento contradice una guía vigente, la pista debe reflejar la guía vigente y la explicación debe señalar el cambio.
${GUIDELINE_CONTEXT}`

export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'difficulty', 'clue', 'answer', 'accept', 'reject', 'explanation', 'source', 'guideline', 'tags'],
        properties: {
          category: { type: 'string', enum: Object.keys(CATEGORIES) },
          difficulty: { type: 'integer', enum: [1, 2, 3, 4, 5] },
          clue: { type: 'string' },
          answer: { type: 'string' },
          accept: { type: 'array', items: { type: 'string' } },
          reject: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          source: { type: 'string' },
          guideline: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

export function userPrompt(chunk, perChunk, avoidAnswers) {
  return `Fragmento de "${chunk.title}", páginas ${chunk.pages}:

<fragmento>
${chunk.text}
</fragmento>

Escribe ${perChunk} pistas de Jeopardy! basadas en los conceptos MÁS importantes y preguntables de este fragmento (no detalles triviales ni bibliografía). Reparte dificultades del 1 al 5. Asigna a cada una la categoría del tablero que mejor encaje.
Respuestas que YA existen en el banco y que no debes repetir (puedes usar el mismo tema con otro ángulo solo si la respuesta es distinta):
${avoidAnswers.slice(-400).join(' | ') || '(ninguna)'}`
}
