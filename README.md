# Cardio Jeopardy! — Simulador de entrenamiento

Simulador tipo *Jeopardy!* de Cardiología (3500 pistas) para preparar competencias de fellows.
Uso personal de entrenamiento.

**Sitio:** https://kmora01.github.io/Simulador-Jeopardy-Falla-Cardiaca/

## Qué incluye

- **Tablero real de Jeopardy!**: 6 categorías × 5 pistas ($200–$1000), **Double Jeopardy!** ($400–$2000), **Daily Doubles** (1 en la primera ronda, 2 en la segunda, ubicados con la distribución real del programa) y **Final Jeopardy!** con apuesta.
- **Reglas del programa**: las respuestas incorrectas restan, "Pasar" no resta; en Daily Double y Final hay que responder en forma de pregunta ("¿Qué es…?" / "¿Quién es…?"). Resumen con puntaje y puntaje Coryat.
- **Validación tolerante**: acentos, errores de tipeo (Levenshtein), siglas y sinónimos en inglés. Botón "Mi respuesta era correcta" para corregir el veredicto. Modo **Anki** (revelar y autoevaluar).
- **Explicación de estudio** tras cada pista, con guías ESC/AHA/ACC vigentes (2023–2026), perlas y trampas.
- **Sin repeticiones**: cada pista jugada queda marcada por usuario hasta agotar el banco (o reiniciarlo).
- **Guardado automático** después de cada acción (IndexedDB, separado por usuario). Al entrar: "Continuar progreso" o "Iniciar nueva partida".
- **Estadísticas**: fortalezas y debilidades por categoría, radar, barras, mapa de calor de estudio diario, acierto por dificultad, historial de partidas.
- **Repaso SRS** (SM-2) de los conceptos fallados y **explorador del banco** con búsqueda y filtros.
- Exportar e importar el progreso (Ajustes) para pasarlo a otro navegador o equipo.
- **Versión para celular e instalable (PWA)**: tablero por categorías con los 5 valores en fila, navegación inferior, y opción "Agregar a pantalla de inicio" en iPhone/Android.
- **Pestaña Estudio**:
  - **Libro de lectura**: 13 unidades y 64 temas. Cada tema trae un **resumen propio** (`content/summaries/`), los **apuntes de todas las preguntas del banco** que le corresponden (pista, concepto y explicación, con sus imágenes) y los **ensayos relacionados**. Búsqueda en todo el libro, filtro dentro del tema, modo "solo pista y concepto", navegación anterior/siguiente y marca de "leído" por usuario. Los resúmenes son textos originales; no copian los libros.
  - **Mis libros**: lector de PDF **local** (pdf.js). El PDF se elige desde el dispositivo y se abre solo en ese navegador (se guarda en IndexedDB o como permiso de archivo); **nunca se sube al sitio**. Usa los marcadores del PDF como lista de capítulos, recuerda la página y permite marcar capítulos estudiados.
- **Tarjetas de memoria** (pestaña Tarjetas): tarjetas que giran al clic, en modo directo (término o estudio al frente), inverso (significado o qué evaluó al frente) o mezclado, con progreso por usuario, filtro por tema y lista completa con búsqueda.
  - **Semiología y signos** (`content/semiologia.json`, ~400 tarjetas): inspección, pulsos arterial y venoso, precordio, ruidos, soplos y sus epónimos, maniobras dinámicas, signos de insuficiencia aórtica, pericardio, escalas clínicas, radiografía, eco y resonancia, signos del ECG, hemodinámica, síndromes epónimos, clasificaciones e historia de la cardiología.
  - **Estudios pivotales** (de `content/trials.json`): agrupados por fármaco o tema (IECA, ARA II, ARNI, betabloqueadores, ARM, iSGLT2, aGLP1, ivabradina, vericiguat, doble antiagregación, antiagregación acortada y desescalada, FA + ICP, DAI en prevención secundaria y primaria, resincronización) y el resto de artículos clave por área. Los grupos se definen en `src/lib/flashcards.js`.

## Seguridad del inicio de sesión (importante)

Este es un sitio **estático** en GitHub Pages: no hay servidor. El repositorio guarda solo un **hash PBKDF2-SHA256 (310 000 iteraciones) con sal** de cada contraseña, nunca la contraseña en texto plano, y hay bloqueo temporal tras 5 intentos fallidos.
Aun así, el login es una **barrera de privacidad, no seguridad real**: cualquiera con conocimientos técnicos puede leer el código y el banco de preguntas publicados. No pongas en el sitio nada que deba ser confidencial.

Para cambiar una contraseña:

```bash
node scripts/hash-password.mjs kevin.mora 'NuevaContraseña'
# pega la sal y el hash en src/config/users.js, haz commit y push
```

El progreso de cada usuario vive en el navegador donde juega (IndexedDB). Si cambias de equipo, usa Exportar/Importar en Ajustes.

## Resúmenes

Cada archivo de `content/summaries/` tiene una cabecera (`unit`, `title`, `books`, `categories` separadas por `;`), una línea `---` y el cuerpo en Markdown.

El índice del libro está en `scripts/study-topics.mjs`: cada tema lista sus resúmenes y las categorías del banco que reúne. Las categorías transversales (siglas, números, epónimos, ensayos generales) se reparten pregunta por pregunta al tema clínico cuyas palabras clave (`kw`) coinciden; si ninguna coincide quedan en el tema de respaldo de `ROUTED`. Los ensayos de `content/trials.json` se asignan igual, con su área como respaldo. **Toda categoría nueva del banco debe añadirse a un tema** (o a `ROUTED`): si no, `npm run study` falla. `npm run build` compila el libro a `public/study/`.

## Banco de preguntas

Las preguntas están en `content/questions/` en un formato Markdown sencillo:

```
category: VÁLVULAS
subspecialty: Valvulopatías

@@@ val-001
difficulty: 1
clue: Texto de la pista (se lee como afirmación).
answer: ¿Qué es la estenosis aórtica?
accept: estenosis aortica | aortic stenosis
reject: insuficiencia aortica
guideline: ESC/EACTS 2025 Valvulopatías
tags: válvulas

### Por qué
Explicación en Markdown…
```

Campos opcionales: `final: true` + `finalCategory:` (candidata a Final Jeopardy), `image:` (ECG/eco), `source:`.
También se aceptan archivos `.json` (los que genera el pipeline). `npm run bank:check` valida ids únicos, campos y duplicados.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173/Simulador-Jeopardy-Falla-Cardiaca/
npm run build      # compila en dist/
```

Cada push a `main` publica el sitio con GitHub Actions (`.github/workflows/deploy.yml`).
La primera vez: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Ampliar el banco con los libros (pipeline con la API de Claude)

Los PDF y su texto **nunca se suben** al repositorio (`books/`, `pipeline/work/` y `*.pdf` están en `.gitignore`).

```bash
# 1) Fragmentar los libros (PDF o .txt) en trozos de ~10 000 tokens
node pipeline/chunk.mjs "C:/Users/Kevin Mora/Documents/Libros Cardiologia"

# 2) Enviar un lote a la Message Batches API (50 % más barata)
export ANTHROPIC_API_KEY=sk-ant-...
node pipeline/generate.mjs --dry-run                 # estima el costo sin enviar
node pipeline/generate.mjs --from 0 --count 50 --per-chunk 8

# 3) Descargar, validar y deduplicar (escribe content/questions/gen-*.json)
node pipeline/collect.mjs --wait
npm run bank:check
git add content && git commit -m "Banco: nuevo lote" && git push
```

El modelo por defecto es `claude-opus-5-5` (cámbialo con `CJ_MODEL`). Estimación: ~US$ 60 para ~4 000 preguntas con Opus en modo batch; aproximadamente la mitad con Sonnet. El prompt (`pipeline/prompt.mjs`) incluye las novedades de guías 2024–2026 para que las explicaciones no queden desactualizadas respecto a los libros.

## Fuentes

ESC Textbook of Cardiovascular Medicine (3.ª ed.), ESC Textbook of Heart Failure, MKSAP 19 (Cardiovascular), y guías ESC, ACC/AHA y documentos de consenso vigentes a octubre de 2026.
