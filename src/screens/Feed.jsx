import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App'
import {
  FEED_AREAS,
  FEED_JOURNALS,
  JOURNALS,
  loadFeedState,
  posts,
  pubmedUrl,
  saveFeedState,
  scholarUrl,
  shuffledIds,
} from '../lib/feed'

const PAGE = 15
const TABS = [
  ['foryou', 'Para ti'],
  ['recent', 'Recientes'],
  ['saved', 'Guardados'],
]
const BY_ID = new Map(posts.map((p) => [p.id, p]))
const tag = (a) => '#' + a.split(/[ ,]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('')
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Feed() {
  const { user } = useApp()
  const [tab, setTab] = useState('foryou')
  const [area, setArea] = useState('')
  const [journal, setJournal] = useState('')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [seed, setSeed] = useState(() => String(Date.now()))
  const [state, setState] = useState(() => loadFeedState(user.username))
  const sentinel = useRef(null)
  const top = useRef(null)

  const update = (fn) =>
    setState((prev) => {
      const next = fn(prev)
      saveFeedState(user.username, next)
      return next
    })
  const toggle = (field, id) => update((s) => ({ ...s, [field]: { ...s[field], [id]: s[field][id] ? undefined : 1 } }))

  const list = useMemo(() => {
    let l = tab === 'recent' ? [...posts].sort((a, b) => b.order - a.order) : shuffledIds(seed).map((id) => BY_ID.get(id))
    if (tab === 'saved') l = [...posts].filter((p) => state.saved[p.id]).sort((a, b) => b.order - a.order)
    if (area) l = l.filter((p) => p.area === area)
    if (journal) l = l.filter((p) => p.journal === journal)
    if (q.trim()) {
      const n = norm(q.trim())
      l = l.filter((p) => norm(`${p.name} ${p.text} ${p.int} ${p.comp} ${p.pop} ${p.pearl ?? ''}`).includes(n))
    }
    return l
  }, [tab, area, journal, q, seed, state.saved])

  useEffect(() => setLimit(PAGE), [tab, area, journal, q, seed])

  // Scroll infinito: al acercarse al final se cargan más publicaciones.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setLimit((n) => Math.min(n + PAGE, list.length))
    }, { rootMargin: '800px' })
    io.observe(el)
    return () => io.disconnect()
  }, [list.length])

  const refresh = () => {
    setSeed(String(Date.now()))
    top.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const shown = list.slice(0, limit)

  return (
    <div className="mx-auto max-w-6xl px-0 sm:px-4 py-0 sm:py-6 flex gap-6 justify-center">
      <div ref={top} className="w-full max-w-[600px] min-h-screen border-x border-white/10 bg-black/40">
        {/* Encabezado fijo con pestañas y filtros */}
        <div className="sticky top-16 z-30 bg-[#01020f]/85 backdrop-blur-xl border-b border-white/10">
          <div className="px-4 pt-3 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold">Estudios pivotales</h1>
              <p className="text-xs text-white/50">{posts.length} ensayos que cambiaron la cardiología</p>
            </div>
            <button onClick={refresh} title="Mezclar el feed" className="rounded-full px-3 py-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20">
              ↻ Nuevos
            </button>
          </div>
          <div className="flex mt-2">
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className="flex-1 py-3 text-sm font-semibold hover:bg-white/5 relative">
                <span className={tab === k ? 'text-white' : 'text-white/50'}>
                  {label}
                  {k === 'saved' && Object.values(state.saved).filter(Boolean).length > 0 && (
                    <span className="ml-1 text-xs text-sky-400">{Object.values(state.saved).filter(Boolean).length}</span>
                  )}
                </span>
                {tab === k && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-14 rounded-full bg-sky-500" />}
              </button>
            ))}
          </div>
          <div className="px-3 pb-2 pt-1 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar estudio, fármaco o tema…"
              className="flex-1 min-w-0 rounded-full bg-white/10 border border-transparent focus:border-sky-500 outline-none px-4 py-2 text-sm placeholder:text-white/40"
            />
            <select
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              className="rounded-full bg-white/10 px-3 text-sm outline-none max-w-[8.5rem]"
              aria-label="Revista"
            >
              <option value="">Revistas</option>
              {FEED_JOURNALS.map((j) => (
                <option key={j} value={j}>
                  {JOURNALS[j]?.name ?? j}
                </option>
              ))}
            </select>
          </div>
          <div className="px-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {['', ...FEED_AREAS].map((a) => (
              <button
                key={a || 'all'}
                onClick={() => setArea(a)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs border transition ${
                  area === a ? 'bg-sky-500 border-sky-500 text-white font-semibold' : 'border-white/15 text-white/70 hover:bg-white/10'
                }`}
              >
                {a || 'Todo'}
              </button>
            ))}
          </div>
        </div>

        {shown.map((p) => (
          <Post
            key={p.id}
            p={p}
            liked={!!state.liked[p.id]}
            saved={!!state.saved[p.id]}
            onLike={() => toggle('liked', p.id)}
            onSave={() => toggle('saved', p.id)}
            onArea={(a) => {
              setArea(a)
              top.current?.scrollIntoView({ behavior: 'smooth' })
            }}
          />
        ))}

        {list.length === 0 && (
          <div className="p-10 text-center text-white/60">
            {tab === 'saved' ? 'Aún no has guardado estudios. Toca 🔖 en una publicación para guardarla.' : 'No hay estudios con ese filtro.'}
          </div>
        )}
        {limit < list.length ? (
          <div ref={sentinel} className="p-6 text-center text-white/40 text-sm">
            Cargando más…
          </div>
        ) : (
          list.length > 0 && (
            <div ref={sentinel} className="p-8 text-center text-white/50 text-sm">
              Llegaste al final · {list.length} estudios.{' '}
              {tab === 'foryou' && (
                <button onClick={refresh} className="text-sky-400 hover:underline">
                  Mezclar de nuevo
                </button>
              )}
            </div>
          )
        )}
        <p className="px-4 pb-24 md:pb-8 text-[11px] text-white/35 text-center">
          Resúmenes propios con fines docentes; no son publicaciones reales de las revistas. Los enlaces abren la búsqueda del artículo en PubMed o
          Google Scholar.
        </p>
      </div>

      {/* Columna lateral (pantallas grandes): tendencias por área */}
      <aside className="hidden lg:block w-80 shrink-0 pt-2">
        <div className="sticky top-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 text-lg font-extrabold">Tendencias</h2>
          {FEED_AREAS.map((a) => (
            <button key={a} onClick={() => setArea(area === a ? '' : a)} className={`w-full text-left px-4 py-2.5 hover:bg-white/5 ${area === a ? 'bg-white/10' : ''}`}>
              <div className="text-[11px] text-white/45">Cardiología · Tendencia</div>
              <div className="font-bold text-sm">{tag(a)}</div>
              <div className="text-[11px] text-white/45">{posts.filter((p) => p.area === a).length} estudios</div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

function Avatar({ j }) {
  return (
    <div
      className="h-11 w-11 shrink-0 rounded-full grid place-items-center font-black text-white text-[11px] tracking-tight ring-1 ring-white/20"
      style={{ background: j.color }}
    >
      {j.short}
    </div>
  )
}

function Post({ p, liked, saved, onLike, onSave, onArea }) {
  const [thread, setThread] = useState(false)
  const [copied, setCopied] = useState(false)
  const link = p.url ?? pubmedUrl(p)
  const linkLabel = p.url ? p.url.replace(/^https?:\/\//, '') : `pubmed: ${p.name}`

  const share = async () => {
    const text = `${p.name} (${p.j.name}, ${p.year}): ${p.text} ${link}`
    try {
      if (navigator.share) await navigator.share({ title: p.name, text, url: link })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }
    } catch {
      /* compartir cancelado */
    }
  }

  return (
    <article className="px-4 pt-3 pb-1 border-b border-white/10 hover:bg-white/[0.02] transition">
      <div className="flex gap-3">
        <Avatar j={p.j} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[15px] leading-5 min-w-0">
            <span className="font-bold truncate">{p.j.name}</span>
            <svg viewBox="0 0 22 22" className="h-[18px] w-[18px] shrink-0 fill-sky-500" aria-label="Revista">
              <path d="M20.4 11c0-1.3-.8-2.4-1.9-2.9.4-1.2.2-2.6-.7-3.4-.9-.9-2.2-1.1-3.4-.7C13.9 2.8 12.8 2 11.5 2s-2.4.8-2.9 1.9c-1.2-.4-2.6-.2-3.4.7-.9.9-1.1 2.2-.7 3.4C3.4 8.6 2.6 9.7 2.6 11s.8 2.4 1.9 2.9c-.4 1.2-.2 2.6.7 3.4.9.9 2.2 1.1 3.4.7.5 1.1 1.6 1.9 2.9 1.9s2.4-.8 2.9-1.9c1.2.4 2.6.2 3.4-.7.9-.9 1.1-2.2.7-3.4 1.1-.5 1.9-1.6 1.9-2.9zm-10.6 4.3-3.6-3.6 1.3-1.3 2.3 2.3 5-5 1.3 1.3-6.3 6.3z" />
            </svg>
            <span className="text-white/45 truncate">
              @{p.j.handle} · {p.year}
            </span>
          </div>

          <div className="mt-1 text-[15px] leading-relaxed text-white/95 whitespace-pre-line">
            <span className="font-bold text-white">{p.name}</span> · {p.text}
          </div>
          <div className="mt-1 text-[15px] leading-relaxed">
            Resultados completos del ensayo {p.name}:{' '}
            <a href={link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline break-all">
              {linkLabel}
            </a>
          </div>
          <div className="mt-1 text-[15px]">
            <button onClick={() => onArea(p.area)} className="text-sky-400 hover:underline">
              {tag(p.area)}
            </button>
          </div>

          {/* Tarjeta del artículo */}
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block rounded-2xl border border-white/15 overflow-hidden hover:bg-white/[0.03]"
          >
            <div className="px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${p.j.color}, ${p.j.color}99)` }}>
              <div className="text-[11px] uppercase tracking-widest opacity-80">{p.journal} · Original article</div>
              <div className="mt-1 font-extrabold text-lg leading-tight">{p.name}</div>
              <div className="text-sm opacity-90">
                {p.int} vs. {p.comp}
              </div>
            </div>
            <div className="px-4 py-2.5 text-[13px] text-white/60 space-y-0.5">
              <div>
                <span className="text-white/40">Población:</span> {p.pop}
              </div>
              <div>
                <span className="text-white/40">Objetivo primario:</span> {p.outcome}
              </div>
            </div>
          </a>

          {/* Acciones */}
          <div className="mt-1 flex items-center justify-between max-w-md text-white/50 text-[13px] -ml-2">
            <Action onClick={() => setThread((v) => !v)} active={thread} tone="sky" label="Perla">
              <path d="M1.75 10c0-4.42 3.58-8 8-8h4.37c4.48 0 8.13 3.64 8.13 8.13 0 2.95-1.6 5.67-4.19 7.1L10 21.7v-3.7h-.07C5.45 18.1 1.75 14.5 1.75 10zm8-6c-3.32 0-6 2.69-6 6 0 3.36 2.73 6.08 6.12 6.06h1.88v2.26l5.42-3c1.95-1.07 3.08-3.1 3.08-5.2C20.25 6.68 17.43 4 14.13 4H9.75z" />
            </Action>
            <Action onClick={share} tone="emerald" label={copied ? 'Copiado' : 'Compartir'}>
              <path d="M4.5 3.88l4.43 4.14-1.37 1.46L5.5 7.55V16c0 1.1.9 2 2 2H13v2H7.5c-2.2 0-4-1.8-4-4V7.55L1.44 9.48.07 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.2 0 4 1.8 4 4v8.45l2.06-1.93 1.37 1.46-4.43 4.14-4.43-4.14 1.37-1.46 2.06 1.93V8c0-1.1-.9-2-2-2z" />
            </Action>
            <Action onClick={onLike} active={liked} tone="rose" label="Me gusta">
              {liked ? (
                <path d="M20.88 12.37C19.18 16.04 14.78 19.6 12 21c-2.78-1.4-7.18-4.96-8.88-8.63C1.86 9.65 2.6 6.4 5.44 5.2 7.83 4.2 10.44 4.86 12 7.06c1.56-2.2 4.17-2.86 6.56-1.86 2.84 1.2 3.58 4.45 2.32 7.17z" />
              ) : (
                <path d="M16.7 5.5c-1.74-.05-3.33.99-4.7 3.19C10.64 6.49 9.04 5.45 7.3 5.5 5.2 5.56 3.5 7.36 3.5 9.68c0 3.8 4.6 7.83 8.5 9.97 3.9-2.14 8.5-6.17 8.5-9.97 0-2.32-1.7-4.12-3.8-4.18zM12 21.88C7.23 19.44 1.5 14.87 1.5 9.68 1.5 6.22 4.1 3.6 7.25 3.5c1.86-.05 3.5.75 4.75 2.31C13.25 4.25 14.89 3.45 16.75 3.5c3.15.1 5.75 2.72 5.75 6.18 0 5.19-5.73 9.76-10.5 12.2z" />
              )}
            </Action>
            <Action onClick={onSave} active={saved} tone="sky" label={saved ? 'Guardado' : 'Guardar'}>
              {saved ? (
                <path d="M4 4.5C4 3.12 5.12 2 6.5 2h11C18.88 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z" />
              ) : (
                <path d="M4 4.5C4 3.12 5.12 2 6.5 2h11C18.88 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.28 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.22-.5-.5-.5h-11z" />
              )}
            </Action>
          </div>

          {/* Respuesta en hilo: perla docente y enlaces */}
          {thread && (
            <div className="mb-3 mt-1 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-[14px] space-y-2">
              {p.pearl && (
                <div>
                  <span className="font-bold text-emerald-300">💡 Perla:</span> {p.pearl}
                </div>
              )}
              <div className="text-white/70">
                <span className="text-white/45">Resultado:</span> {p.result}
              </div>
              <div className="flex flex-wrap gap-3 text-sky-400 text-[13px]">
                <a href={pubmedUrl(p)} target="_blank" rel="noreferrer" className="hover:underline">
                  Buscar en PubMed ↗
                </a>
                <a href={scholarUrl(p)} target="_blank" rel="noreferrer" className="hover:underline">
                  Google Scholar ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

const TONES = {
  sky: ['hover:text-sky-400', 'text-sky-400', 'group-hover:bg-sky-500/15'],
  emerald: ['hover:text-emerald-400', 'text-emerald-400', 'group-hover:bg-emerald-500/15'],
  rose: ['hover:text-rose-400', 'text-rose-500', 'group-hover:bg-rose-500/15'],
}

function Action({ children, onClick, active, tone, label }) {
  const [hover, on, bg] = TONES[tone]
  return (
    <button onClick={onClick} className={`group flex items-center gap-1 ${active ? on : ''} ${hover} transition`} title={label} aria-label={label}>
      <span className={`p-2 rounded-full ${bg} transition`}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
          {children}
        </svg>
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
