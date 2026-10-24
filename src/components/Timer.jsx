import { useEffect, useRef, useState } from 'react'
import { sfx } from '../lib/sound'

// Barra de tiempo estilo luces del podio. seconds = 0 desactiva el temporizador.
export default function Timer({ seconds, running, onExpire }) {
  const [left, setLeft] = useState(seconds)
  const cb = useRef(onExpire)
  cb.current = onExpire

  useEffect(() => {
    setLeft(seconds)
  }, [seconds])

  useEffect(() => {
    if (!running || !seconds) return
    const started = Date.now()
    const initial = left
    const id = setInterval(() => {
      const l = Math.max(0, initial - (Date.now() - started) / 1000)
      setLeft(l)
      if (l <= 5 && l > 0 && Math.abs(l - Math.round(l)) < 0.06) sfx.tick()
      if (l <= 0) {
        clearInterval(id)
        sfx.timeUp()
        cb.current?.()
      }
    }, 100)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds])

  if (!seconds) return null
  const frac = left / seconds
  const lights = 9
  const lit = Math.ceil(frac * ((lights + 1) / 2))
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: lights }, (_, i) => {
          const dist = Math.abs(i - (lights - 1) / 2)
          const on = dist < lit
          return <div key={i} className={`h-2.5 w-7 sm:w-10 rounded-sm transition-colors ${on ? (frac < 0.3 ? 'bg-rose-500' : 'bg-red-500/90') : 'bg-white/10'}`} />
        })}
      </div>
      <div className={`text-sm tabular-nums ${frac < 0.3 ? 'text-rose-300' : 'text-white/60'}`}>{Math.ceil(left)} s</div>
    </div>
  )
}
