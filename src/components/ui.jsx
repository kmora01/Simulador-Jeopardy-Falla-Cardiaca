import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Modal({ children, onClose, wide = false, className = '' }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`glass rounded-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto shadow-2xl ${className}`}
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function Markdown({ children }) {
  return (
    <div className="explanation">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

export function Money({ value, className = '' }) {
  const neg = value < 0
  return (
    <span className={`${neg ? 'text-rose-400' : ''} ${className}`}>
      {neg ? '−' : ''}${Math.abs(value).toLocaleString('en-US')}
    </span>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>
}

export function Pill({ children, tone = 'blue' }) {
  const tones = {
    blue: 'bg-jblue/40 text-blue-100 border-blue-400/30',
    gold: 'bg-jgold/15 text-jgold border-jgold/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    gray: 'bg-white/5 text-white/70 border-white/10',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="category-text text-3xl sm:text-4xl text-white">{title}</h1>
        {subtitle && <p className="text-white/60 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-white/70">
      <div className="h-10 w-10 rounded-full border-4 border-jgold/30 border-t-jgold animate-spin" />
      {label}
    </div>
  )
}

/**
 * Imagen clínica (ECG, eco, radiografía…) con visor a pantalla completa.
 * Clic para ampliar; en el visor, clic en la imagen alterna tamaño real y ajustado; Esc cierra.
 */
export function ClinicalImage({ src, className = '', maxH = 'max-h-[40vh]' }) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(false)
  const url = import.meta.env.BASE_URL + src
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoom(false)
          setOpen(true)
        }}
        className={`group relative inline-block rounded-lg overflow-hidden border-2 border-white/15 bg-black shadow-xl hover:border-jgold/70 transition ${className}`}
        title="Ampliar imagen"
      >
        <img src={url} alt="Imagen clínica de la pista" className={`${maxH} w-auto max-w-full object-contain block`} />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white/90 opacity-80 group-hover:opacity-100">
          🔍 Ampliar
        </span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[80] bg-black/95 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <div className="flex items-center justify-between px-4 py-3 text-sm text-white/70">
                <span>{zoom ? 'Tamaño real: desplázate para recorrer la imagen' : 'Clic en la imagen para verla a tamaño real'}</span>
                <button className="btn-ghost !py-1.5" onClick={() => setOpen(false)}>
                  Cerrar ✕
                </button>
              </div>
              <div className={`flex-1 min-h-0 ${zoom ? 'overflow-auto' : 'flex items-center justify-center p-2 sm:p-6'}`}>
                <img
                  src={url}
                  alt="Imagen clínica ampliada"
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoom((z) => !z)
                  }}
                  className={zoom ? 'max-w-none w-[200%] sm:w-[160%] cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
