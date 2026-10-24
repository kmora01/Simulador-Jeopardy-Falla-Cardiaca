import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClinicalImage, Markdown, Modal, Money, Pill, Spinner } from './ui'
import { loadExplanation } from '../lib/bank'

/**
 * Modal post-pregunta: veredicto, respuesta correcta y explicación detallada en Markdown.
 * Permite corregir el veredicto (como los jueces del programa) si el validador se equivocó.
 */
export default function Feedback({ question, result, delta, onOverride, onContinue, continueLabel = 'Continuar' }) {
  const [exp, setExp] = useState(null)
  useEffect(() => {
    loadExplanation(question).then(setExp)
  }, [question])

  const verdict = result.skipped ? 'skip' : result.correct ? 'ok' : 'bad'
  const color = { ok: 'from-emerald-500/30', bad: 'from-rose-500/30', skip: 'from-white/10' }[verdict]

  return (
    <Modal wide onClose={() => {}}>
      <div className={`bg-gradient-to-b ${color} to-transparent px-6 sm:px-8 pt-7 pb-5 rounded-t-2xl`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className={`value-text text-4xl sm:text-5xl ${verdict === 'ok' ? '!text-emerald-300' : verdict === 'bad' ? '!text-rose-300' : '!text-white/70'}`}
          >
            {verdict === 'ok' ? '¡CORRECTO!' : verdict === 'bad' ? 'INCORRECTO' : result.timedOut ? 'SE ACABÓ EL TIEMPO' : 'SIN RESPUESTA'}
          </motion.div>
          {delta != null && (
            <div className="value-text text-3xl">
              {delta >= 0 ? '+' : ''}
              <Money value={delta} />
            </div>
          )}
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/25 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">Respuesta correcta</div>
            <div className="text-xl font-bold text-jgold mt-1">{question.answer}</div>
          </div>
          <div className="rounded-xl bg-black/25 p-4">
            <div className="text-xs uppercase tracking-wider text-white/50">Tu respuesta</div>
            <div className="text-lg mt-1 break-words">{result.given || <span className="text-white/40">—</span>}</div>
            {result.formFail && <div className="text-xs text-rose-300 mt-1">Contenido {result.matchCorrect ? 'correcto' : 'incorrecto'}, pero no la formulaste como pregunta (obligatorio en Daily Double / Final).</div>}
            {!result.formFail && !result.questionForm && !result.anki && result.given && (
              <div className="text-xs text-jgold/80 mt-1">Recuerda: en el programa debes responder en forma de pregunta.</div>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Pill>{question.subspecialty}</Pill>
          <Pill tone="gray">Nivel {question.difficulty}</Pill>
          {question.guideline && <Pill tone="gold">{question.guideline}</Pill>}
          {question.source && <Pill tone="gray">{question.source}</Pill>}
          {onOverride && !result.skipped && !result.anki && (
            <button onClick={onOverride} className="ml-auto text-white/60 hover:text-white underline">
              {result.correct ? 'En realidad la tuve mal' : 'Mi respuesta era correcta (corregir)'}
            </button>
          )}
        </div>
      </div>
      <div className="px-6 sm:px-8 py-6 border-t border-white/10">
        {question.image && (
          <div className="mb-5 text-center">
            <ClinicalImage src={question.image} maxH="max-h-[34vh]" />
          </div>
        )}
        <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Explicación de estudio</div>
        {exp ? <Markdown>{exp}</Markdown> : <Spinner label="Cargando explicación…" />}
      </div>
      <div className="sticky bottom-0 px-6 sm:px-8 py-4 bg-[#070c4a]/95 backdrop-blur border-t border-white/10 flex justify-end">
        <button className="btn-gold px-8 py-3 text-lg" onClick={onContinue} autoFocus>
          {continueLabel} →
        </button>
      </div>
    </Modal>
  )
}
