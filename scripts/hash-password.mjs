// Uso: node scripts/hash-password.mjs <usuario> '<contraseña>'
// Imprime la sal y el hash para pegar en src/config/users.js
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const [, , username, password] = process.argv
if (!username || !password) {
  console.error("Uso: node scripts/hash-password.mjs <usuario> '<contraseña>'")
  process.exit(1)
}
const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, 310000, 32, 'sha256')
console.log(`  username: '${username}',\n  salt: '${salt.toString('base64')}',\n  hash: '${hash.toString('base64')}',`)
