import { useMemo } from 'react'
import { motion } from 'framer-motion'

export default function Board({ board, onPick, animateIn }) {
  // Orden aleatorio de aparición de las casillas, como en el programa.
  const order = useMemo(() => {
    const idx = Array.from({ length: 30 }, (_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    const pos = new Map(idx.map((v, i) => [v, i]))
    return pos
  }, [])

  return (
    <>
      {/* Celular: una fila por categoría con sus 5 valores, sin desplazamiento horizontal. */}
      <div className="sm:hidden flex flex-col gap-2">
        {board.categories.map((c, ci) => (
          <motion.div
            key={c.name}
            className="rounded-xl bg-black p-1.5 shadow-xl"
            initial={animateIn ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animateIn ? 0.6 + ci * 0.12 : 0 }}
          >
            <div className="tile rounded-lg px-2 py-2 mb-1.5 text-center">
              <span className="category-text text-sm leading-tight text-white">{c.name}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {c.cells.map((cell, ri) => (
                <button
                  key={ri}
                  disabled={cell.played}
                  onClick={() => onPick(ci, ri)}
                  className="tile rounded-lg h-14 grid place-items-center active:scale-95 transition-transform"
                >
                  {!cell.played ? (
                    <span className="value-text text-lg">${cell.value}</span>
                  ) : (
                    <span
                      className={`text-xs font-bold ${
                        cell.result === 'correct' ? 'text-emerald-300/70' : cell.result === 'wrong' ? 'text-rose-300/70' : 'text-white/25'
                      }`}
                    >
                      {cell.result === 'correct' ? '✓' : cell.result === 'wrong' ? '✗' : '—'}
                      {cell.dd && ' DD'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

    <div className="hidden sm:block w-full overflow-x-auto">
      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 min-w-[640px] bg-black p-1 sm:p-1.5 rounded-xl shadow-2xl">
        {board.categories.map((c, ci) => (
          <motion.div
            key={c.name}
            className="tile aspect-[16/10] flex items-center justify-center p-1.5 sm:p-2 text-center"
            initial={animateIn ? { opacity: 0, y: -20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animateIn ? 1.4 + ci * 0.35 : 0 }}
          >
            <span className="category-text text-[11px] sm:text-sm md:text-base lg:text-lg leading-tight text-white">{c.name}</span>
          </motion.div>
        ))}
        {[0, 1, 2, 3, 4].flatMap((ri) =>
          board.categories.map((c, ci) => {
            const cell = c.cells[ri]
            return (
              <motion.button
                key={`${ci}-${ri}`}
                disabled={cell.played}
                onClick={() => onPick(ci, ri)}
                className={`tile aspect-[16/10] grid place-items-center relative group ${cell.played ? 'cursor-default' : 'cursor-pointer'}`}
                initial={animateIn ? { opacity: 0, scale: 0.6 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: animateIn ? (order.get(ri * 6 + ci) ?? 0) * 0.035 : 0, type: 'spring', stiffness: 300, damping: 20 }}
                whileHover={cell.played ? undefined : { scale: 1.04, zIndex: 10 }}
                whileTap={cell.played ? undefined : { scale: 0.96 }}
              >
                {!cell.played ? (
                  <span className="value-text text-2xl sm:text-4xl lg:text-5xl group-hover:text-white transition-colors">${cell.value}</span>
                ) : (
                  <span
                    className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                      cell.result === 'correct' ? 'text-emerald-300/70' : cell.result === 'wrong' ? 'text-rose-300/70' : 'text-white/25'
                    }`}
                  >
                    {cell.result === 'correct' ? '✓' : cell.result === 'wrong' ? '✗' : '—'}
                    {cell.dd && ' DD'}
                  </span>
                )}
              </motion.button>
            )
          }),
        )}
      </div>
    </div>
    </>
  )
}
