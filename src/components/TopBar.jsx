import { useApp } from '../App'

const NAV = [
  ['home', 'Inicio'],
  ['stats', 'Estadísticas'],
  ['review', 'Repaso SRS'],
  ['bank', 'Banco'],
  ['settings', 'Ajustes'],
]

export default function TopBar({ onLogout }) {
  const { user, screen, go } = useApp()
  return (
    <>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030733]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
        <button onClick={() => go('home')} className="flex items-center gap-2 shrink-0">
          <img src={import.meta.env.BASE_URL + 'favicon.svg'} alt="" className="h-8 w-8" />
          <span className="value-text text-xl hidden sm:inline">CARDIO JEOPARDY!</span>
        </button>
        <nav className="flex-1 hidden md:flex gap-1 overflow-x-auto">
          {NAV.map(([k, label]) => (
            <button
              key={k}
              onClick={() => go(k)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
                screen === k ? 'bg-jgold text-jblue-night' : 'text-white/75 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1 md:hidden" />
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-full bg-jblue grid place-items-center font-bold text-sm border border-jgold/50" title={user.displayName}>
            {user.initials}
          </div>
          <button onClick={onLogout} className="text-xs text-white/60 hover:text-white">
            Salir
          </button>
        </div>
      </div>
    </header>
    {/* Celular: navegación inferior fija al alcance del pulgar. */}
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#030733]/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map(([k, label]) => (
        <button
          key={k}
          onClick={() => go(k)}
          className={`h-14 px-1 text-[11px] font-semibold leading-tight transition ${
            screen === k ? 'text-jgold' : 'text-white/65'
          }`}
        >
          <span className={`mx-auto mb-1 block h-1 w-6 rounded-full ${screen === k ? 'bg-jgold' : 'bg-transparent'}`} />
          {label}
        </button>
      ))}
    </nav>
    </>
  )
}
