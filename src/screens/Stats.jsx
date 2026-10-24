import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp } from '../App'
import { allAttempts, finishedGames, todayKey } from '../lib/db'
import { byDifficulty, classify, computeStreak, dailyCounts, groupAccuracy, MIN_ATTEMPTS, STRONG_THRESHOLD, WEAK_THRESHOLD } from '../lib/stats'
import { Card, Money, PageHeader, Pill, Spinner } from '../components/ui'

const pctFmt = (p) => `${Math.round(p * 100)}%`
const colorFor = (p) => (p >= STRONG_THRESHOLD ? '#34d399' : p < WEAK_THRESHOLD ? '#fb7185' : '#ffcc00')

export default function Stats() {
  const { user } = useApp()
  const [att, setAtt] = useState(null)
  const [games, setGames] = useState([])
  const [groupBy, setGroupBy] = useState('subspecialty')

  useEffect(() => {
    allAttempts(user.username).then(setAtt)
    finishedGames(user.username).then(setGames)
  }, [user])

  const groups = useMemo(() => (att ? groupAccuracy(att, groupBy) : []), [att, groupBy])
  const cls = useMemo(() => classify(groups), [groups])
  const subGroups = useMemo(() => (att ? groupAccuracy(att, 'subspecialty') : []), [att])

  if (!att) return <Spinner />

  const answered = att.filter((a) => !a.skipped)
  const correct = answered.filter((a) => a.correct).length
  const streak = computeStreak(att)
  const scores = games.map((g) => g.state.score)
  const best = scores.length ? Math.max(...scores) : 0
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const dd = att.filter((a) => a.mode === 'game')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="Estadísticas" subtitle="Análisis de tu rendimiento histórico" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Preguntas respondidas" value={answered.length} />
        <Kpi label="Acierto global" value={answered.length ? pctFmt(correct / answered.length) : '—'} />
        <Kpi label="Partidas terminadas" value={games.length} />
        <Kpi label="Mejor puntaje" value={<Money value={best} />} sub={`Promedio $${avg.toLocaleString('en-US')}`} />
        <Kpi label="Racha actual" value={`${streak.current} d`} sub={`Mejor: ${streak.best} d`} />
      </div>

      {answered.length === 0 ? (
        <Card className="text-center py-16 text-white/60">Todavía no hay datos. Juega una partida para ver tu análisis.</Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-emerald-300">💪 Puntos fuertes</h3>
                <Pill tone="green">≥ {pctFmt(STRONG_THRESHOLD)}</Pill>
              </div>
              <GroupList items={cls.strong} empty="Aún no hay áreas con acierto ≥ 75% (mínimo 5 respuestas)." />
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg text-rose-300">🎯 Se debe mejorar</h3>
                <Pill tone="red">&lt; {pctFmt(WEAK_THRESHOLD)}</Pill>
              </div>
              <GroupList items={cls.weak} empty="¡Ninguna área por debajo del 60%!" />
            </Card>
          </div>
          <div className="flex gap-2 mb-3">
            {[
              ['subspecialty', 'Por subespecialidad'],
              ['category', 'Por categoría'],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setGroupBy(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${groupBy === k ? 'bg-jgold text-jblue-night' : 'bg-white/5 text-white/70'}`}>
                {l}
              </button>
            ))}
            {cls.insufficient.length > 0 && <span className="text-xs text-white/40 self-center ml-2">{cls.insufficient.length} áreas con menos de {MIN_ATTEMPTS} respuestas aún sin clasificar</span>}
          </div>

          <div className="grid lg:grid-cols-5 gap-5 mb-5">
            <Card className="lg:col-span-2">
              <h3 className="font-bold mb-2">Radar por subespecialidad</h3>
              <div className="h-80">
                <ResponsiveContainer>
                  <RadarChart data={subGroups.map((g) => ({ name: g.name, pct: Math.round(g.pct * 100) }))} outerRadius="72%">
                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="pct" stroke="#ffcc00" fill="#ffcc00" fillOpacity={0.35} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Acierto']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="lg:col-span-3">
              <h3 className="font-bold mb-2">% de acierto {groupBy === 'subspecialty' ? 'por subespecialidad' : 'por categoría'}</h3>
              <div style={{ height: Math.max(260, groups.length * 30) }}>
                <ResponsiveContainer>
                  <BarChart data={groups.map((g) => ({ name: g.name, pct: Math.round(g.pct * 100), n: g.n }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" width={170} tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, _n, p) => [`${v}% (${p.payload.n} resp.)`, 'Acierto']} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                      {groups.map((g) => (
                        <Cell key={g.name} fill={colorFor(g.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mb-5">
            <Card className="lg:col-span-2">
              <h3 className="font-bold mb-3">Mapa de calor de estudio diario</h3>
              <Heatmap attempts={att} />
            </Card>
            <Card>
              <h3 className="font-bold mb-2">Acierto por nivel de dificultad</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={byDifficulty(att)}>
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, _n, p) => [`${v}% (${p.payload.n})`, 'Acierto']} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="pct" fill="#4f5bff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-white/50 mt-2">{dd.length} respuestas en partidas · el resto en repaso/Anki.</div>
            </Card>
          </div>

          {games.length > 0 && (
            <Card>
              <h3 className="font-bold mb-2">Puntaje por partida</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={games.slice(-30).map((g, i) => ({ name: `#${i + 1}`, score: g.state.score, date: new Date(g.updatedAt).toLocaleDateString('es') }))}>
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, _n, p) => [`$${v.toLocaleString('en-US')}`, p.payload.date]} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {games.slice(-30).map((g) => (
                        <Cell key={g.id} fill={g.state.score >= 0 ? '#ffcc00' : '#fb7185'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

const tooltipStyle = { background: '#0a1060', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff' }

function Kpi({ label, value, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
      <div className="text-xs text-white/55 uppercase tracking-wide">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold mt-1 text-jgold">{value}</div>
      {sub && <div className="text-xs text-white/45 mt-0.5">{sub}</div>}
    </motion.div>
  )
}

function GroupList({ items, empty }) {
  if (!items.length) return <div className="text-sm text-white/50">{empty}</div>
  return (
    <div className="space-y-2.5">
      {items.map((g) => (
        <div key={g.name}>
          <div className="flex justify-between text-sm mb-1">
            <span>{g.name}</span>
            <span className="text-white/60">
              {pctFmt(g.pct)} · {g.correct}/{g.n}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full" style={{ background: colorFor(g.pct) }} initial={{ width: 0 }} animate={{ width: pctFmt(g.pct) }} transition={{ duration: 0.8 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Heatmap({ attempts }) {
  const counts = dailyCounts(attempts)
  const weeks = 26
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay())
  const cells = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) cells.push(todayKey(d))
  const max = Math.max(1, ...[...counts.values()].map((c) => c.n))
  const level = (n) => (n === 0 ? 0 : Math.ceil((n / max) * 4))
  const shades = ['rgba(255,255,255,0.06)', '#3b3f8f', '#5a5fd6', '#c9a400', '#ffcc00']
  const cols = []
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7))
  const months = cols.map((c, i) => {
    const m = new Date(c[0] + 'T12:00:00').toLocaleDateString('es', { month: 'short' })
    const prev = i ? new Date(cols[i - 1][0] + 'T12:00:00').toLocaleDateString('es', { month: 'short' }) : null
    return m !== prev ? m : ''
  })
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] text-[10px] text-white/45 ml-6">
          {months.map((m, i) => (
            <div key={i} className="w-[13px]">
              {m}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] text-[10px] text-white/45 mr-1 w-5">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="h-[13px] leading-[13px]">
                {i % 2 ? d : ''}
              </div>
            ))}
          </div>
          {cols.map((c, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {c.map((k) => {
                const v = counts.get(k)
                return <div key={k} title={`${k}: ${v?.n ?? 0} preguntas${v ? `, ${Math.round((v.correct / v.n) * 100)}% acierto` : ''}`} className="h-[13px] w-[13px] rounded-[3px]" style={{ background: shades[level(v?.n ?? 0)] }} />
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-white/45 mt-2 ml-6">
          Menos
          {shades.map((s) => (
            <div key={s} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: s }} />
          ))}
          Más
        </div>
      </div>
    </div>
  )
}
