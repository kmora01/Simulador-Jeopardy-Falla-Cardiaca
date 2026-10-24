// Usuarios predeterminados. Solo se guardan sal + hash PBKDF2-SHA256 (310 000 iteraciones):
// las contraseñas en texto plano NUNCA se suben al repositorio.
// Para cambiar una contraseña: `node scripts/hash-password.mjs <usuario> '<nueva contraseña>'`
// y pegar aquí el resultado.
export const PBKDF2_ITERATIONS = 310000

export const USERS = [
  {
    username: 'kevin.mora',
    displayName: 'Dr. Kevin Mora',
    initials: 'KM',
    salt: 'x1fw8cbKKw9DDb8fs0/LGg==',
    hash: 'Rlf9ujLiDe92MuuRgAniE/6idJKRnY834Jq1xB5o8p4=',
  },
  {
    username: 'gabriel.lopez',
    displayName: 'Dr. Gabriel López',
    initials: 'GL',
    salt: 'EEit4tzvHw+b9bTH9It1Hw==',
    hash: 'xAJTLXSOBIe8hVaSNU4x5usm2dYIeWunCYgkf7WZ48E=',
  },
]
