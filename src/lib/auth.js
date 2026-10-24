import { USERS, PBKDF2_ITERATIONS } from '../config/users'

const SESSION_KEY = 'cj.session'
const LOCK_KEY = 'cj.lock'
const MAX_FAILS = 5
const LOCK_MS = 60_000

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function pbkdf2(password, saltB64) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return new Uint8Array(bits)
}

function readLock() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY)) || { fails: 0, until: 0 }
  } catch {
    return { fails: 0, until: 0 }
  }
}

export function lockRemainingMs() {
  return Math.max(0, readLock().until - Date.now())
}

export async function login(username, password) {
  const remaining = lockRemainingMs()
  if (remaining > 0) throw new Error(`Demasiados intentos. Espera ${Math.ceil(remaining / 1000)} s.`)
  const user = USERS.find((u) => u.username === username.trim().toLowerCase())
  // Se calcula el hash aunque el usuario no exista para no revelar qué usuarios son válidos.
  const derived = await pbkdf2(password, user?.salt ?? USERS[0].salt)
  const ok = user && timingSafeEqual(derived, b64ToBytes(user.hash))
  if (!ok) {
    const lock = readLock()
    lock.fails += 1
    if (lock.fails >= MAX_FAILS) {
      lock.until = Date.now() + LOCK_MS
      lock.fails = 0
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify(lock))
    throw new Error('Usuario o contraseña incorrectos.')
  }
  localStorage.removeItem(LOCK_KEY)
  const session = { username: user.username, at: Date.now() }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return publicUser(user)
}

function publicUser(u) {
  return { username: u.username, displayName: u.displayName, initials: u.initials }
}

export function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY))
    const u = s && USERS.find((x) => x.username === s.username)
    return u ? publicUser(u) : null
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}
