import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Timer from './Timer'
import { Money } from './ui'
import { checkAnswer } from '../lib/match'

/**
 * Pantalla de pista a pantalla completa.
 * onResolve({ given, correct, skipped, questionForm, anki, score })
 */
export default function ClueScreen({ question, header, stake, strict, seconds, tolerance, requireForm, onResolve }) {
  const [given, setGiven] = useState('')
  const [anki, setAnki] = useState(false)
  const [running, setRunning] = useState(true)
  const inputRef = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 450)
    return () => clearTimeout(t)
  }, [])

  const resolve = (r) => {
    if (done.current) return
    done.current = true
    setRunning(false)
    onResolve(r)
  }

  const submit = (e) => {
    e?.preventDefault()
    if (!given.trim()) return
    const m = checkAnswer(given, question, tolerance)
    const formFail = requireForm && strict && !m.questionForm
    resolve({ given, correct: m.correct && !formFail, matchCorrect: m.correct, formFail, questionForm: m.questionForm, score: m.score, skipped: false })
  }

  const onExpire = () => {
    if (given.trim()) return submit()
    // Sin respuesta: en una pista normal equivale a no tocar el timbre; en DD/Final es incorrecta.
    resolve({ given: '', correct: false, skipped: !requireForm, timedOut: true, questionForm: false })
  }

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col bg-jblue"
      style={{ background: 'radial-gradient(ellipse at center, #0b14ff 0%, #060ce9 40%, #0308a8 100%)' }}
      initial={{ scale: 0.15, opacity: 0, borderRadius: 40 }}
      animate={{ scale: 1, opacity: 1, borderRadius: 0 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6 text-sm sm:text-base">
        <div className="category-text text-white/90">{header}</div>
        {stake != null && (
          <div className="value-text text-2xl sm:text-3xl">
            <Money value={stake} />
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-5 sm:px-16 overflow-y-auto">
        <motion.p
          className="clue-text text-white text-xl sm:text-3xl lg:text-[2.6rem] text-center max-w-5xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {question.clue}
        </motion.p>
      </div>

      {question.image && (
        <div className="flex justify-center px-6 pb-3">
          <img src={import.meta.env.BASE_URL + question.image} alt="" className="max-h-[30vh] rounded-lg border-4 border-black/40 bg-white" />
        </div>
      )}

      <div className="px-4 sm:px-8 pb-6 sm:pb-10">
        <div className="mx-auto max-w-3xl flex flex-col gap-4">
          <Timer seconds={anki ? 0 : seconds} running={running && !anki} onExpire={onExpire} />
          {!anki ? (
            <>
              <form onSubmit={submit} className="flex gap-2">
                <input
                  ref={inputRef}
                  className="input bg-black/30 text-lg sm:text-xl py-4"
                  placeholder="¿Qué es…? / ¿Quién es…?"
                  value={given}
                  onChange={(e) => setGiven(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button className="btn-gold px-6 text-lg" disabled={!given.trim()}>
                  Responder
                </button>
              </form>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  className="btn-ghost text-sm"
                  onClick={() => {
                    setAnki(true)
                    setRunning(false)
                  }}
                >
                  👁 Revelar respuesta (modo Anki)
                </button>
                {!requireForm && (
                  <button className="btn-ghost text-sm" onClick={() => resolve({ given: '', correct: false, skipped: true, questionForm: false })}>
                    Pasar (no tocar el timbre)
                  </button>
                )}
              </div>
              {requireForm && strict && <p className="text-center text-xs text-jgold/80">Modo estricto: la respuesta debe estar en forma de pregunta.</p>}
            </>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="text-white/60 text-sm uppercase tracking-wider mb-1">Respuesta correcta</div>
              <div className="clue-text text-jgold text-2xl sm:text-3xl mb-5">{question.answer}</div>
              <div className="text-white/70 mb-3">¿La sabías? Califícate con honestidad:</div>
              <div className="flex justify-center gap-3">
                <button className="btn-ok px-8 py-3 text-lg" onClick={() => resolve({ given: '(modo Anki)', correct: true, anki: true, skipped: false })}>
                  ✓ La sabía
                </button>
                <button className="btn-danger px-8 py-3 text-lg" onClick={() => resolve({ given: '(modo Anki)', correct: false, anki: true, skipped: false })}>
                  ✗ No la sabía
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
