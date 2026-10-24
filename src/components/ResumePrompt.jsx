import { Modal, Money } from './ui'
import { ROUND_NAMES, remainingInRound } from '../lib/engine'

export default function ResumePrompt({ game, onContinue, onNew, onLater }) {
  const s = game.state
  const when = new Date(game.updatedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <Modal onClose={onLater}>
      <div className="p-7 text-center">
        <div className="value-text text-4xl mb-2">¡PARTIDA EN CURSO!</div>
        <p className="text-white/70 mb-6">Dejaste una partida sin terminar el {when}.</p>
        <div className="grid grid-cols-3 gap-3 mb-7">
          <Stat label="Ronda" value={ROUND_NAMES[s.round] ?? '—'} />
          <Stat label="Puntaje" value={<Money value={s.score} />} />
          <Stat label="Pistas restantes" value={s.round === 'FJ' ? 'Final' : remainingInRound(s)} />
        </div>
        <div className="flex flex-col gap-3">
          <button className="btn-gold text-lg py-3.5" onClick={onContinue} autoFocus>
            ▶ Continuar progreso donde se dejó
          </button>
          <button className="btn-ghost" onClick={onNew}>
            Iniciar nueva partida
          </button>
          <button className="text-sm text-white/50 hover:text-white mt-1" onClick={onLater}>
            Decidir después
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="font-bold text-lg mt-1">{value}</div>
    </div>
  )
}
