// Efectos de sonido sintetizados con Web Audio (sin archivos externos).
let ctx = null
let enabled = true

export const setSoundEnabled = (v) => {
  enabled = v
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, start, dur, { type = 'sine', gain = 0.12 } = {}) {
  const a = ac()
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0, a.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur)
  o.connect(g).connect(a.destination)
  o.start(a.currentTime + start)
  o.stop(a.currentTime + start + dur + 0.05)
}

export const sfx = {
  select() {
    if (!enabled) return
    tone(660, 0, 0.12, { type: 'triangle' })
  },
  correct() {
    if (!enabled) return
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.35, { type: 'triangle' }))
  },
  wrong() {
    if (!enabled) return
    tone(140, 0, 0.6, { type: 'sawtooth', gain: 0.08 })
    tone(147, 0, 0.6, { type: 'square', gain: 0.04 })
  },
  dailyDouble() {
    if (!enabled) return
    ;[392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'sawtooth', gain: 0.06 }))
  },
  timeUp() {
    if (!enabled) return
    ;[0, 0.18, 0.36].forEach((t) => tone(330, t, 0.15, { type: 'square', gain: 0.06 }))
  },
  roundStart() {
    if (!enabled) return
    ;[523, 784, 659, 1047].forEach((f, i) => tone(f, i * 0.12, 0.4, { type: 'triangle', gain: 0.1 }))
  },
  tick() {
    if (!enabled) return
    tone(1200, 0, 0.04, { type: 'square', gain: 0.03 })
  },
}
