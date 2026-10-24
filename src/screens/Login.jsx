import { useState } from 'react'
import { motion } from 'framer-motion'
import { login } from '../lib/auth'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await login(username, password))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex relative overflow-hidden items-center justify-center p-12">
        <MiniBoard />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#020524]" />
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="glass rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl"
        >
          <div className="text-center mb-8">
            <img src={import.meta.env.BASE_URL + 'favicon.svg'} alt="" className="h-16 w-16 mx-auto mb-4 drop-shadow-xl" />
            <h1 className="value-text text-5xl">CARDIO JEOPARDY!</h1>
            <p className="text-white/60 mt-2">Simulador de entrenamiento · Cardiología y Medicina Interna</p>
          </div>
          <label className="block text-sm font-semibold text-white/80 mb-1.5">Usuario</label>
          <input
            className="input mb-4"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="nombre.apellido"
            autoFocus
            required
          />
          <label className="block text-sm font-semibold text-white/80 mb-1.5">Contraseña</label>
          <div className="relative mb-2">
            <input
              className="input pr-20"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 hover:text-white">
              {show ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <div className="h-6 text-sm text-rose-400">{error}</div>
          <button className="btn-gold w-full text-lg py-3.5 mt-2" disabled={busy}>
            {busy ? 'Verificando…' : 'Ingresar'}
          </button>
          <p className="text-xs text-white/40 mt-6 text-center">
            🔒 Contraseñas verificadas con PBKDF2-SHA256 · progreso guardado localmente por usuario
          </p>
        </motion.form>
      </div>
    </div>
  )
}

function MiniBoard() {
  const values = [200, 400, 600, 800, 1000]
  const cats = ['IC', 'ARRITMIAS', 'VÁLVULAS', 'ISQUEMIA', 'ECG', 'MED. INTERNA']
  return (
    <div className="grid grid-cols-6 gap-1.5 w-full max-w-2xl rotate-[-4deg] scale-110 opacity-90">
      {cats.map((c, i) => (
        <motion.div key={c} className="tile aspect-[4/3] grid place-items-center category-text text-xs text-center p-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
          {c}
        </motion.div>
      ))}
      {values.flatMap((v, r) =>
        cats.map((c, i) => (
          <motion.div
            key={c + v}
            className="tile aspect-[4/3] grid place-items-center value-text text-2xl"
            initial={{ opacity: 0, rotateX: 90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.3 + (r * 6 + i) * 0.025 }}
          >
            ${v}
          </motion.div>
        )),
      )}
    </div>
  )
}
