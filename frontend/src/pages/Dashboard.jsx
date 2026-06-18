import { useState, useEffect } from 'react'

/* ── Constants ── */

const STATUS_COLORS = {
  confirmed: '#22c55e',
  pending: '#f59e0b',
  completed: '#6b7280',
  no_show: '#ef4444',
  cancelled: '#991b1b',
}

const STATUS_LABELS = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  completed: 'Terminé',
  no_show: 'Absente',
  cancelled: 'Annulé',
}

const DEFAULT_CHECKLIST = [
  { id: 'stocks', label: 'Vérifier les stocks produits pour demain' },
  { id: 'confirm', label: 'Confirmer les RDV en attente (appeler si nécessaire)' },
  { id: 'workstations', label: 'Préparer les postes de travail (serviettes, outils)' },
  { id: 'payment', label: 'Vérifier le terminal de paiement' },
  { id: 'supplies', label: 'Commander les consommables manquants' },
]

/* ── Helpers ── */

function formatTime(iso) {
  if (!iso) return ''
  return iso.split('T')[1]?.substring(0, 5) || ''
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/* ── Sub-components ── */

function KpiCard({ icon, label, value, sublabel, progress, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ color }}>{icon}</div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-sublabel">{sublabel}</div>
        {progress !== undefined && (
          <div className="kpi-progress">
            <div className="kpi-progress-bar" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
          </div>
        )}
      </div>
    </div>
  )
}

function AlertBanner({ type, children }) {
  return (
    <div className={`alert-banner ${type}`}>
      {children}
    </div>
  )
}

function ChecklistWidget() {
  const [checked, setChecked] = useState(() => {
    try {
      const saved = localStorage.getItem('salon_checklist_tomorrow')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })

  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    localStorage.setItem('salon_checklist_tomorrow', JSON.stringify(next))
  }

  const resetIfNewDay = () => {
    const today = new Date().toISOString().split('T')[0]
    const lastReset = localStorage.getItem('salon_checklist_date')
    if (lastReset !== today) {
      setChecked({})
      localStorage.setItem('salon_checklist_tomorrow', '{}')
      localStorage.setItem('salon_checklist_date', today)
    }
  }

  useEffect(() => { resetIfNewDay() }, [])

  return (
    <div className="card checklist-widget">
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>📋 Préparation</h3>
      {DEFAULT_CHECKLIST.map(item => (
        <label key={item.id} className="checklist-item">
          <input
            type="checkbox"
            checked={!!checked[item.id]}
            onChange={() => toggle(item.id)}
          />
          <span className={checked[item.id] ? 'checklist-done' : ''}>
            {item.label}
          </span>
        </label>
      ))}
    </div>
  )
}

/* ── Main Dashboard ── */

export default function Dashboard({ data, onNavigate, onCheckIn }) {
  const [subTab, setSubTab] = useState('today')

  if (!data) {
    return (
      <div className="card text-center text-muted py-8">
        <div className="dashboard-empty-icon">⏳</div>
        <div className="dashboard-empty-title">Chargement du tableau de bord...</div>
      </div>
    )
  }

  const { today, tomorrow, quick_stats } = data
  const todayList = today.appointments || []
  const tomorrowList = tomorrow.appointments || []
  const remaining = today.total_count - (today.status_breakdown?.completed || 0)

  // Next upcoming appointment (first non-completed)
  const nextAppt = todayList.find(a => a.status !== 'completed' && a.status !== 'no_show')

  // Alerts
  const hasNoShows = (today.status_breakdown?.no_show || 0) > 0
  const hasUnconfirmed = (today.status_breakdown?.pending || 0) > 0

  return (
    <div className="dashboard">
      {/* ── Sub-tabs ── */}
      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab ${subTab === 'today' ? 'active' : ''}`}
          onClick={() => setSubTab('today')}
        >
          📋 Aujourd'hui
        </button>
        <button
          className={`dashboard-tab ${subTab === 'tomorrow' ? 'active' : ''}`}
          onClick={() => setSubTab('tomorrow')}
        >
          🔮 Demain
        </button>
      </div>

      {/* ══════════════════════════════════════════
            TODAY VIEW
          ══════════════════════════════════════════ */}
      {subTab === 'today' && (
        <div className="dashboard-content">
          {/* ── KPI Cards ── */}
          <div className="kpi-grid">
            <KpiCard
              icon="📋"
              label="Rendez-vous"
              value={today.total_count === 0 ? 'Aucun' : `${today.status_breakdown?.completed || 0}/${today.total_count}`}
              sublabel={today.total_count > 0 ? `${remaining} restant${remaining > 1 ? 's' : ''}` : "Aucun RDV aujourd'hui"}
              progress={today.completion_rate}
              color="var(--accent)"
            />
            <KpiCard
              icon="💰"
              label="Chiffre d'affaires"
              value={`${today.collected || 0} DA`}
              sublabel={`sur ${today.revenue || 0} DA prévus`}
              progress={today.revenue > 0 ? Math.round((today.collected || 0) / today.revenue * 100) : undefined}
              color="#22c55e"
            />
            <KpiCard
              icon="⏱️"
              label="Taux de complétion"
              value={`${today.completion_rate}%`}
              sublabel={`${today.status_breakdown?.completed || 0} terminés`}
              progress={today.completion_rate}
              color="#3b82f6"
            />
            <KpiCard
              icon="👤"
              label="Prochaine cliente"
              value={nextAppt ? nextAppt.client_name : '—'}
              sublabel={nextAppt ? `${nextAppt.service_name} · ${formatTime(nextAppt.start_time)}` : 'Aucune'}
              color="#8b5cf6"
            />
          </div>

          {/* ── Alerts ── */}
          {hasNoShows && (
            <AlertBanner type="critical">
              🚫 {today.status_breakdown.no_show} absente{today.status_breakdown.no_show > 1 ? 's' : ''} aujourd'hui — pensez à les relancer
            </AlertBanner>
          )}
          {hasUnconfirmed && (
            <AlertBanner type="warning">
              ⏳ {today.status_breakdown.pending} RDV en attente de confirmation
            </AlertBanner>
          )}
          {today.completion_rate === 100 && today.total_count > 0 && (
            <AlertBanner type="info">
              🎉 Tous les rendez-vous sont terminés ! Journée complète.
            </AlertBanner>
          )}

          {/* ── Timeline ── */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              {formatDate(today.date)}
            </h3>

            {todayList.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">📅</div>
                <div className="dashboard-empty-title">Aucun rendez-vous aujourd'hui</div>
                <div className="dashboard-empty-text">
                  Profitez de cette journée pour préparer les prochains jours ou gérer vos services.
                </div>
              </div>
            ) : (
              <div className="timeline">
                {todayList.map(a => (
                  <div
                    key={a.id}
                    className="timeline-item"
                    style={{ '--status-color': STATUS_COLORS[a.status] || '#6b7280' }}
                  >
                    <div className="timeline-time">{formatTime(a.start_time)}</div>
                    <div className="timeline-body">
                      <div className="timeline-service">{a.service_name}</div>
                      <div className="timeline-client">
                        {a.client_name} · {a.client_phone}
                      </div>
                      {a.notes && (
                        <div className="timeline-notes">📝 {a.notes}</div>
                      )}
                      <div className="timeline-badges">
                        <span className="badge" style={{
                          background: STATUS_COLORS[a.status],
                          color: '#fff',
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                        {a.is_first_visit && (
                          <span className="badge badge-new" style={{ fontSize: 11, padding: '2px 8px' }}>
                            🆕 1ère visite
                          </span>
                        )}
                        {!a.is_first_visit && a.previous_visits > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {a.previous_visits} visite{a.previous_visits > 1 ? 's' : ''} préc.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="timeline-actions">
                      {(a.status === 'confirmed' || a.status === 'pending') && (
                        <button
                          className="btn btn-primary btn-sm"
                          data-tooltip="Enregistrer l'arrivée de la cliente"
                          onClick={() => onCheckIn?.(a.id)}
                        >
                          ✓ Arrivée
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        data-tooltip="Modifier ce rendez-vous"
                        onClick={() => onNavigate('agenda')}
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div className="quick-actions">
            <button className="btn btn-primary" onClick={() => onNavigate('agenda')}>
              📋 Agenda complet
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate('services')}>
              💇 Gérer les services
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate('blocked')}>
              🚫 Bloquer un créneau
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
            TOMORROW VIEW
          ══════════════════════════════════════════ */}
      {subTab === 'tomorrow' && (
        <div className="dashboard-content">
          {/* ── Tomorrow Summary ── */}
          <div className="tomorrow-summary">
            <div className="summary-card">
              <div className="summary-card-value">{tomorrow.total_count}</div>
              <div className="summary-card-label">RDV réservés</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-value">{tomorrow.revenue || 0} DA</div>
              <div className="summary-card-label">CA prévisionnel</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-value">
                {tomorrow.free_slots !== null ? tomorrow.free_slots : '—'}
              </div>
              <div className="summary-card-label">Créneaux libres (30 min)</div>
            </div>
            <div className="summary-card">
              <div className="summary-card-value">{quick_stats.unique_clients}</div>
              <div className="summary-card-label">Clientes uniques</div>
            </div>
          </div>

          {/* ── Tomorrow Client Cards ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              {formatDate(tomorrow.date)}
            </h3>

            {tomorrowList.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">✨</div>
                <div className="dashboard-empty-title">Aucun rendez-vous pour demain</div>
                <div className="dashboard-empty-text">
                  La journée de demain est encore libre. Vérifiez vos disponibilités et préparez le planning.
                </div>
              </div>
            ) : (
              <div className="tomorrow-client-grid">
                {tomorrowList.map(a => (
                  <div key={a.id} className="tomorrow-client-card">
                    <div className="tomorrow-card-header">
                      <span className="tomorrow-card-time">{formatTime(a.start_time)}</span>
                      <span className="tomorrow-card-duration">
                        {a.end_time && a.start_time
                          ? `${Math.round((new Date(a.end_time) - new Date(a.start_time)) / 60000)} min`
                          : ''}
                      </span>
                      <span className="badge" style={{
                        background: a.status === 'confirmed' ? '#22c55e' : '#f59e0b',
                        color: '#fff',
                        fontSize: 11,
                        padding: '2px 8px',
                      }}>
                        {a.status === 'confirmed' ? '✓ Confirmé' : '⏳ En attente'}
                      </span>
                    </div>
                    <div className="tomorrow-card-body">
                      <div className="tomorrow-card-service">{a.service_name}</div>
                      <div className="tomorrow-card-client">
                        {a.client_name} · {a.client_phone}
                      </div>
                      {a.notes && (
                        <div className="tomorrow-card-notes">📝 {a.notes}</div>
                      )}
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {a.is_first_visit ? (
                          <span className="badge badge-new" style={{ fontSize: 11, padding: '2px 8px' }}>
                            🆕 1ère visite
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {a.previous_visits} visite{a.previous_visits > 1 ? 's' : ''} précédente{a.previous_visits > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="tomorrow-card-actions">
                      <a href={`tel:${a.client_phone}`} className="btn btn-ghost btn-sm">
                        📞 Appeler
                      </a>
                      <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('agenda')}>
                        📝 Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Checklist ── */}
          <ChecklistWidget />

          {/* ── Quick Actions ── */}
          <div className="quick-actions">
            <button className="btn btn-primary" onClick={() => onNavigate('agenda')}>
              📋 Voir l'agenda de demain
            </button>
            <button className="btn btn-ghost" onClick={() => onNavigate('availabilities')}>
              🕐 Vérifier les disponibilités
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
