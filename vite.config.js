import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages sirve el sitio en /<nombre-del-repo>/
export default defineConfig({
  base: '/Simulador-Jeopardy-Falla-Cardiaca/',
  plugins: [react(), tailwindcss()],
})
