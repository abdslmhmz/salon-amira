import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts'

const PERIODS = [
  { key: '7d', label: '7 jours', days: 7 },
  { key: '30d', label: '30 jours', days: 30 },
  { key: 'month', label: 'Ce mois', days: null },
  { key: 'quarter', label: 'Trimestre', days: 90 },
  { key: 'year', label: 'Année', days: 365 },
  { key: 'all', label: 'Tout', days: 9999 },
]

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const ACCENT = '#c44569'
const ACCENT_LIGHT = '#fdf2f5'
const GREEN = '#15be53'
const RED = '#e53935'
const ORANGE = '#f59e0b'
const CHART_COLORS = ['#c44569', '#e5989b', '#f4a261', '#2a9d8f', '#6c757d', '#8ecae6', '#ffb703', '#219ebc']

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const preset = PERIODS.find(p => p.key === period)
      let start, end
      if (period === 'custom' && customStart && customEnd) {
        start = customStart
        end = customEnd
      } else if (period === 'month') {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      } else if (preset) {
        end = new Date().toISOString().split('T')[0]
        const s = new Date()
        s.setDate(s.getDate() - preset.days)
        start = s.toISOString().split('T')[0]
      }
      const result = await api.getAnalytics(start, end)
      setData(result)
    } catch (e) {
      if (import.meta.env.DEV) console.error('Analytics load failed', e)
      setLoadError(e.message || 'Erreur de chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }, [period, customStart, customEnd])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="card text-center text-muted py-8">Chargement des statistiques...</div>
  }

  if (loadError || !data) {
    return (
      <div className="card text-center py-8">
        <p className="text-danger mb-2">⚠️ {loadError || 'Données non disponibles'}</p>
        <button className="btn btn-outline btn-sm" onClick={load}>Réessayer</button>
      </div>
    )
  }

  // Prepare chart data
  const revenueData = data.revenue_chart.map(d => ({
    date: formatDate(d.date),
    rawDate: d.date,
    CA: d.revenue,
    'Période préc.': data.prev_revenue_map[d.date] || 0,
  }))

  const serviceData = data.services_breakdown.slice(0, 12).map(s => ({
    name: s.name.length > 20 ? s.name.substring(0, 18) + '...' : s.name,
    fullName: s.name,
    RDV: s.count,
    CA: s.revenue,
  }))

  const totalRDV = data.appointments_in_range
  const caRange = data.range_revenue
  const caPrev = data.prev_range_revenue
  const change = data.revenue_change_pct

  return (
    <div className="analytics-dashboard">
      {/* Period selector */}
      <div className="analytics-period-bar">
        <div className="analytics-period-presets">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
          <button
            className={`btn btn-sm ${period === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPeriod('custom')}
          >
            Personnalisé
          </button>
        </div>
        {period === 'custom' && (
          <div className="analytics-custom-dates">
            <input type="date" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="text-muted">→</span>
            <input type="date" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={load}>Appliquer</button>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">CA Total</div>
          <div className="analytics-kpi-value">{caRange.toLocaleString()} DA</div>
          {change !== null && (
            <div className="analytics-kpi-change" style={{ color: change >= 0 ? GREEN : RED }}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs période préc.
            </div>
          )}
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">Rendez-vous</div>
          <div className="analytics-kpi-value">{totalRDV}</div>
          <div className="analytics-kpi-sub">{data.completion_rate}% de complétion</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">Clientes</div>
          <div className="analytics-kpi-value">{data.new_clients + data.recurring_clients}</div>
          <div className="analytics-kpi-sub">{data.new_clients} nouvelles · {data.recurring_clients} habituées</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">Taux</div>
          <div className="analytics-kpi-value" style={{ fontSize: 20 }}>
            <span style={{ color: RED }}>{data.cancellation_rate}% annul.</span>
            {' · '}
            <span style={{ color: ORANGE }}>{data.no_show_rate}% no-show</span>
          </div>
          <div className="analytics-kpi-sub">CA moyen/ RDV : {totalRDV > 0 ? Math.round(caRange / totalRDV) : 0} DA</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Évolution du chiffre d'affaires</h3>
        {revenueData.length === 0 ? (
          <div className="text-center text-muted py-4">Aucune donnée sur cette période</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                }}
                formatter={(value) => [`${value.toLocaleString()} DA`, undefined]}
              />
              <Legend />
              <Line type="monotone" dataKey="CA" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Période préc." stroke="#d0d0d0" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Service Breakdown */}
      <div className="analytics-two-col">
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Prestations — Nombre de RDV</h3>
          {serviceData.length === 0 ? (
            <div className="text-center text-muted py-4">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, serviceData.length * 36)}>
              <BarChart data={serviceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                  }}
                  formatter={(value, name, props) => [`${value} RDV`, props.payload.fullName]}
                />
                <Bar dataKey="RDV" radius={[0, 4, 4, 0]}>
                  {serviceData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Prestations — CA généré</h3>
          {serviceData.length === 0 ? (
            <div className="text-center text-muted py-4">Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, serviceData.length * 36)}>
              <BarChart data={serviceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'var(--text)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                  }}
                  formatter={(value, name, props) => [`${value.toLocaleString()} DA`, props.payload.fullName]}
                />
                <Bar dataKey="CA" radius={[0, 4, 4, 0]}>
                  {serviceData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
