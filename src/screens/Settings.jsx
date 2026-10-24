import { useState } from 'react'
import { useApp } from '../App'
import { exportUserData, importUserData, resetPlayed } from '../lib/db'
import { Card, PageHeader } from '../components/ui'

export default function Settings() {
  const { user, settings, updateSettings, bank, refreshActive } = useApp()
  const [msg, setMsg] = useState('')
  if (!settings) return null

  const doExport = async () => {
    const data = await exportUserData(user.username)
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cardio-jeopardy-${user.username}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (file) => {
    try {
      const data = JSON.parse(await file.text())
      if (!confirm('Esto reemplaza tu progreso actual en este navegador por el del archivo. ¿Continuar?')) return
      await importUserData(user.username, data)
      await refreshActive()
      setMsg('✓ Progreso importado.')
    } catch (e) {
      setMsg('✗ ' + e.message)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Ajustes" subtitle="Preferencias de juego de este usuario" />
      <div className="grid gap-4">
        <Card>
          <h3 className="font-bold mb-4">Tiempo</h3>
          <Range label="Segundos por pista" value={settings.timerSeconds} min={0} max={60} step={5} onChange={(v) => updateSettings({ timerSeconds: v })} fmt={(v) => (v ? `${v} s` : 'Sin límite')} />
          <Range label="Segundos en Final Jeopardy!" value={settings.finalSeconds} min={30} max={120} step={10} onChange={(v) => updateSettings({ finalSeconds: v })} fmt={(v) => `${v} s`} />
          <p className="text-xs text-white/50 mt-2">En el programa tienes ~5 s para responder tras tocar el timbre y 30 s en Final. Para estudiar, usa más tiempo; para simular la competencia, bájalo.</p>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Validación de respuestas</h3>
          <Toggle label="Modo estricto: exigir forma de pregunta en Daily Double y Final" value={settings.strictQuestionForm} onChange={(v) => updateSettings({ strictQuestionForm: v })} />
          <Range
            label="Tolerancia a errores ortográficos"
            value={Math.round((1 - settings.matchTolerance) * 100)}
            min={5}
            max={35}
            step={5}
            onChange={(v) => updateSettings({ matchTolerance: 1 - v / 100 })}
            fmt={(v) => (v <= 10 ? `Baja (${v}%)` : v <= 20 ? `Media (${v}%)` : `Alta (${v}%)`)}
          />
          <p className="text-xs text-white/50">Siempre puedes corregir el veredicto en la pantalla de resultado si el validador se equivoca.</p>
        </Card>
        <Card>
          <h3 className="font-bold mb-4">Sonido</h3>
          <Toggle label="Efectos de sonido" value={settings.sound} onChange={(v) => updateSettings({ sound: v })} />
        </Card>
        <Card>
          <h3 className="font-bold mb-2">Respaldo del progreso</h3>
          <p className="text-sm text-white/60 mb-4">
            Tu progreso vive en este navegador (IndexedDB). Para pasarlo a otro equipo o navegador, expórtalo y luego impórtalo allá con el mismo usuario.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-blue" onClick={doExport}>
              ⬇ Exportar progreso
            </button>
            <label className="btn-ghost cursor-pointer">
              ⬆ Importar progreso
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files[0] && doImport(e.target.files[0])} />
            </label>
            <button
              className="btn-ghost text-rose-300"
              onClick={async () => {
                if (confirm('¿Reiniciar el banco? Las preguntas jugadas volverán a estar disponibles.')) {
                  await resetPlayed(user.username)
                  setMsg('✓ Banco reiniciado.')
                }
              }}
            >
              Reiniciar banco
            </button>
          </div>
          {msg && <div className="text-sm mt-3">{msg}</div>}
        </Card>
        {bank && (
          <Card>
            <h3 className="font-bold mb-2">Acerca del banco</h3>
            <p className="text-sm text-white/60">
              Versión {bank.version} · actualizado {bank.generatedAt?.slice(0, 10)} · {bank.questions.length} preguntas. Fuentes: ESC Textbook of Heart Failure, ESC Textbook
              of Cardiovascular Medicine (3ª ed.), MKSAP 19 Cardiovascular Medicine, actualizado con guías ESC 2023–2026 y ACC/AHA 2022–2026.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

function Range({ label, value, min, max, step, onChange, fmt }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-jgold font-semibold">{fmt(value)}</span>
      </div>
      <input type="range" className="w-full accent-[#ffcc00]" value={value} min={min} max={max} step={step} onChange={(e) => onChange(+e.target.value)} />
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 mb-3 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={`h-7 w-12 rounded-full relative transition ${value ? 'bg-jgold' : 'bg-white/15'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  )
}
