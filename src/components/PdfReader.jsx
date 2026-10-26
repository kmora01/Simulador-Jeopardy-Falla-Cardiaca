import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { bookFile, getProgress, saveProgress } from '../lib/library'
import { Spinner } from './ui'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Aplana el índice del PDF (marcadores) a dos niveles: capítulos y secciones.
function flatten(items, level = 0, out = [], prefix = '') {
  items?.forEach((it, i) => {
    const key = `${prefix}${i}`
    out.push({ key, title: it.title?.trim() || '(sin título)', dest: it.dest, level })
    if (level < 1) flatten(it.items, level + 1, out, key + '.')
  })
  return out
}

async function destToPage(pdf, dest) {
  try {
    const d = typeof dest === 'string' ? await pdf.getDestination(dest) : dest
    if (!d) return null
    return typeof d[0] === 'number' ? d[0] + 1 : (await pdf.getPageIndex(d[0])) + 1
  } catch {
    return null
  }
}

export default function PdfReader({ book, user, onClose }) {
  const [pdf, setPdf] = useState(null)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [error, setError] = useState(null)
  const [toc, setToc] = useState([])
  const [tocPages, setTocPages] = useState({})
  const [done, setDone] = useState([])
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [showToc, setShowToc] = useState(false)
  const [pageInput, setPageInput] = useState('1')
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const taskRef = useRef(null)
  const urlRef = useRef(null)

  const open = useCallback(
    async (ask = false) => {
      setError(null)
      try {
        const file = await bookFile(book, ask)
        if (!file) return setNeedsPermission(true)
        setNeedsPermission(false)
        const url = URL.createObjectURL(file)
        urlRef.current = url
        const doc = await pdfjs.getDocument({ url, disableAutoFetch: true, disableStream: false }).promise
        const prog = await getProgress(user, book.id)
        const items = flatten(await doc.getOutline())
        setToc(items)
        setDone(prog.done ?? [])
        setPage(Math.min(Math.max(1, prog.page ?? 1), doc.numPages))
        setPdf(doc)
        // Resolver las páginas de cada capítulo en segundo plano.
        const pages = {}
        for (const it of items) {
          pages[it.key] = await destToPage(doc, it.dest)
        }
        setTocPages(pages)
      } catch (e) {
        setError(e?.message || 'No se pudo abrir el PDF')
      }
    },
    [book, user],
  )

  useEffect(() => {
    open(false)
  }, [open])

  useEffect(
    () => () => {
      pdf?.destroy()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [pdf],
  )

  // Dibujar la página actual ajustada al ancho disponible.
  useEffect(() => {
    if (!pdf) return
    let cancelled = false
    setPageInput(String(page))
    ;(async () => {
      const p = await pdf.getPage(page)
      if (cancelled) return
      const base = p.getViewport({ scale: 1 })
      const wrap = wrapRef.current
      const pad = wrap ? parseFloat(getComputedStyle(wrap).paddingLeft) * 2 : 0
      const width = Math.min((wrap?.clientWidth || 800) - pad, 1100)
      const scale = (width / base.width) * zoom
      const dpr = window.devicePixelRatio || 1
      const vp = p.getViewport({ scale: scale * dpr })
      const canvas = canvasRef.current
      canvas.width = vp.width
      canvas.height = vp.height
      canvas.style.width = `${vp.width / dpr}px`
      canvas.style.height = `${vp.height / dpr}px`
      taskRef.current?.cancel()
      const task = p.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
      taskRef.current = task
      await task.promise.catch(() => {})
    })()
    saveProgress(user, book.id, { page })
    return () => {
      cancelled = true
    }
  }, [pdf, page, zoom, user, book.id])

  const goPage = (n) => {
    if (!pdf) return
    setPage(Math.min(Math.max(1, n), pdf.numPages))
    wrapRef.current?.scrollTo({ top: 0 })
  }

  const goChapter = async (it) => {
    const n = tocPages[it.key] ?? (await destToPage(pdf, it.dest))
    if (n) goPage(n)
    setShowToc(false)
  }

  const toggleDone = (key) => {
    const next = done.includes(key) ? done.filter((k) => k !== key) : [...done, key]
    setDone(next)
    saveProgress(user, book.id, { done: next })
  }

  // Capítulo actual = último capítulo cuyo inicio es ≤ página actual.
  const current = toc.filter((it) => it.level === 0 && tocPages[it.key] && tocPages[it.key] <= page).pop()
  const chapters = toc.filter((it) => it.level === 0)
  const nextChapter = current ? chapters[chapters.indexOf(current) + 1] : chapters[0]

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') goPage(page + 1)
      if (e.key === 'ArrowLeft') goPage(page - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const tocList = (
    <div className="flex flex-col gap-0.5">
      {toc.length === 0 && <p className="text-sm text-white/60 p-2">Este PDF no trae índice de marcadores. Usa el número de página.</p>}
      {toc.map((it) => (
        <div key={it.key} className={`flex items-start gap-2 rounded-lg ${current?.key === it.key ? 'bg-jgold/15' : 'hover:bg-white/5'}`}>
          {it.level === 0 ? (
            <button
              onClick={() => toggleDone(it.key)}
              title="Marcar como estudiado"
              className={`mt-2 ml-1 h-4 w-4 shrink-0 rounded border text-[10px] leading-none grid place-items-center ${
                done.includes(it.key) ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/30'
              }`}
            >
              {done.includes(it.key) ? '✓' : ''}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <button onClick={() => goChapter(it)} className={`flex-1 text-left py-1.5 pr-2 ${it.level === 0 ? 'text-sm font-semibold text-white/90' : 'text-xs text-white/60'}`}>
            {it.title}
            {tocPages[it.key] && <span className="ml-1 text-white/35 font-normal">· p. {tocPages[it.key]}</span>}
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#030733]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button className="btn-ghost text-sm" onClick={onClose}>
          ← Volver
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{book.name.replace(/\.pdf$/i, '')}</div>
          {current && <div className="truncate text-xs text-jgold/80">{current.title}</div>}
        </div>
        {chapters.length > 0 && (
          <span className="hidden sm:inline text-xs text-white/50">
            {done.length}/{chapters.length} capítulos
          </span>
        )}
        <button className="btn-ghost text-sm lg:hidden" onClick={() => setShowToc((v) => !v)}>
          ☰ Índice
        </button>
      </div>

      {needsPermission && (
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div>
            <p className="mb-4 text-white/75">Tu navegador pide confirmar el acceso de lectura a este archivo.</p>
            <button className="btn-gold px-6 py-3" onClick={() => open(true)}>
              Permitir y abrir
            </button>
          </div>
        </div>
      )}
      {error && <div className="flex-1 grid place-items-center p-6 text-rose-300">{error}</div>}
      {!pdf && !needsPermission && !error && <Spinner label="Abriendo el libro en tu navegador…" />}

      {pdf && (
        <div className="flex min-h-0 flex-1">
          <aside className="hidden lg:block w-80 shrink-0 overflow-y-auto border-r border-white/10 p-2">{tocList}</aside>
          {showToc && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setShowToc(false)}>
              <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-[#030733] p-2 border-r border-white/10" onClick={(e) => e.stopPropagation()}>
                {tocList}
              </div>
            </div>
          )}
          <div ref={wrapRef} className="flex-1 overflow-auto p-2 sm:p-4">
            <canvas ref={canvasRef} className="mx-auto block rounded bg-white shadow-2xl" />
            {current && nextChapter && tocPages[nextChapter.key] === page + 1 && (
              <div className="mx-auto mt-4 max-w-xl text-center">
                <p className="text-sm text-white/70 mb-2">Fin de «{current.title}».</p>
                {!done.includes(current.key) && (
                  <button className="btn-ok px-5 py-2 text-sm" onClick={() => toggleDone(current.key)}>
                    ✓ Marcar capítulo como estudiado
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {pdf && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <button className="btn-ghost px-3" onClick={() => goPage(page - 1)} disabled={page <= 1}>
            ‹
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              goPage(parseInt(pageInput, 10) || page)
            }}
            className="flex items-center gap-1 text-sm"
          >
            <input className="input w-16 py-1 text-center" inputMode="numeric" value={pageInput} onChange={(e) => setPageInput(e.target.value)} />
            <span className="whitespace-nowrap text-white/50">/ {pdf.numPages}</span>
          </form>
          <button className="btn-ghost px-3" onClick={() => goPage(page + 1)} disabled={page >= pdf.numPages}>
            ›
          </button>
          <span className="mx-1 h-6 w-px bg-white/10" />
          <button className="btn-ghost px-3" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}>
            −
          </button>
          <span className="w-10 text-center text-xs text-white/60">{Math.round(zoom * 100)}%</span>
          <button className="btn-ghost px-3" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}>
            +
          </button>
        </div>
      )}
    </div>
  )
}
