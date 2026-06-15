import { useState, useEffect } from 'react'
import { api } from '../api'
import Calendar from '../components/Calendar'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const TABS = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'services', label: 'Services' },
  { key: 'availabilities', label: 'Disponibilités' },
  { key: 'blocked', label: 'Créneaux bloqués' },
  { key: 'exceptions', label: 'Exceptions' },
  { key: 'analytics', label: 'Statistiques' },
]

const STATUS_LABELS = { confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'No-show', pending: 'En attente' }
const BADGE_CLASS = {
  'Coiffure Femme': 'badge-rose', 'Brushing': 'badge-mauve', 'Coloration': 'badge-violet',
  'Manucure': 'badge-pink', 'Soin Visage': 'badge-green', 'Maquillage': 'badge-gold', 'Épilation': 'badge-sage',
  'Coupe Homme': 'badge-blue',
}

const ANALYTICS_ICONS = {
  total: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="var(--rose)" strokeWidth="1.5"/><line x1="7" y1="6" x2="7" y2="14" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/><line x1="10" y1="8" x2="10" y2="14" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/><line x1="13" y1="5" x2="13" y2="14" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  month: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="15" rx="2" stroke="var(--rose)" strokeWidth="1.5"/><line x1="2" y1="8" x2="18" y2="8" stroke="var(--rose)" strokeWidth="1.5"/><line x1="6" y1="1" x2="6" y2="5" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/><line x1="14" y1="1" x2="14" y2="5" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ),
  revenue: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--rose)" strokeWidth="1.5"/><line x1="10" y1="6" x2="10" y2="14" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 9l3-3 3 3" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  clients: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3" stroke="var(--rose)" strokeWidth="1.5"/><path d="M2 18c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="15" cy="7" r="2" stroke="var(--rose)" strokeWidth="1.2" opacity="0.5"/></svg>
  ),
  rate: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="var(--rose)" strokeWidth="1.5"/><path d="M6 10l3 3 5-5" stroke="var(--rose)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
}

export default function ProviderDashboard() {
  const [tab, setTab] = useState('agenda')
  const [appointments, setAppointments] = useState([])
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0])
  const [services, setServices] = useState([])
  const [availabilities, setAvailabilities] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState(null)

  const [showServiceForm, setShowServiceForm] = useState(false)
  const [svcForm, setSvcForm] = useState({ name: '', duration_minutes: 30, price: 0, color: '#b8860b' })
  const [showAvailForm, setShowAvailForm] = useState(false)
  const [availForm, setAvailForm] = useState({ day_of_week: 0, start_time: '09:00', end_time: '12:00' })
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockForm, setBlockForm] = useState({ start_time: '', end_time: '', reason: '' })
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideForm, setOverrideForm] = useState({ override_date: '', start_time: '', end_time: '', is_available: true, reason: '' })

  const loadAll = () => {
    api.getAppointments({ date: apptDate }).then(setAppointments)
    api.getAllServices().then(setServices)
    api.getAvailabilities().then(setAvailabilities)
    api.getBlockedSlots().then(setBlockedSlots)
    api.getOverrides().then(setOverrides)
    api.getAnalytics().then(setAnalytics).catch(() => {})
  }

  useEffect(() => { loadAll() }, [apptDate])

  const formatPrice = (p) => `${(p/100).toFixed(0).replace('.', ',')} DA`
  const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatDateTime = (iso) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const handleStatus = async (id, status) => { await api.updateAppointmentStatus(id, status); loadAll() }
  const createService = async () => {
    await api.createService({ ...svcForm, duration_minutes: parseInt(svcForm.duration_minutes), price: parseInt(svcForm.price) * 100 })
    setShowServiceForm(false); loadAll()
  }
  const toggleService = async (s) => { await api.updateService(s.id, { is_active: !s.is_active }); loadAll() }
  const createAvailability = async () => { await api.createAvailability(availForm); setShowAvailForm(false); loadAll() }
  const createBlock = async () => {
    await api.createBlockedSlot({ ...blockForm, start_time: new Date(blockForm.start_time).toISOString(), end_time: new Date(blockForm.end_time).toISOString() })
    setShowBlockForm(false); loadAll()
  }
  const createOverride = async () => {
    const data = { ...overrideForm }
    if (data.is_available && !data.start_time) data.start_time = null
    await api.createOverride(data); setShowOverrideForm(false); loadAll()
  }

  const appointmentCount = appointments.filter(a => a.status === 'confirmed').length

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside>
        <div className="sidebar">
          <div className="sidebar-title">Navigation</div>
          <nav className="sidebar-nav">
            {TABS.map(t => (
              <a key={t.key} className={`sidebar-link ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="sidebar mt-4">
          <div className="sidebar-title">Aujourd'hui</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {new Date(apptDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <div><span className="text-muted">RDV</span><br /><span className="font-bold" style={{ fontSize: 18 }}>{appointmentCount}</span></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section>
        {/* ── Agenda ── */}
        {tab === 'agenda' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold" style={{ fontSize: 20 }}>Agenda — {formatDate(apptDate)}</h2>
              <Calendar selected={apptDate} onSelect={setApptDate} />
            </div>
            <div className="space-y-1">
              {appointments.length === 0 && <p className="text-center text-muted py-8">Aucun rendez-vous ce jour</p>}
              {appointments.map(a => (
                <div key={a.id} className="agenda-slot">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{a.start_time?.split('T')[1]?.substring(0,5)} – {a.end_time?.split('T')[1]?.substring(0,5)}</span>
                      <span className="ml-3">{a.client_name} · {a.client_phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${BADGE_CLASS[a.service_name] || 'badge-rose'}`}>{a.service_name}</span>
                      <select
                        className="badge-select"
                        value={a.status}
                        onChange={e => handleStatus(a.id, e.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowBlockForm(true); setBlockForm({ ...blockForm, start_time: apptDate + 'T00:00', end_time: apptDate + 'T23:59' }) }}>Bloquer un créneau</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowOverrideForm(true); setOverrideForm({ ...overrideForm, override_date: apptDate }) }}>Ajouter exception</button>
            </div>
          </div>
        )}

        {/* ── Services ── */}
        {tab === 'services' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold" style={{ fontSize: 20 }}>Services</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowServiceForm(true); setSvcForm({ name: '', duration_minutes: 30, price: 0, color: '#b8860b' }) }}>+ Ajouter</button>
            </div>
            <div className="space-y-3">
              {services.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: 'var(--body-bg)' }}>
                  <div className="flex items-center gap-4">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-muted">{s.duration_minutes} min · {formatPrice(s.price)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className={`toggle ${s.is_active ? 'on' : ''}`} onClick={() => toggleService(s)} />
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      const n = prompt('Nom', s.name)
                      const d = prompt('Durée (min)', s.duration_minutes)
                      const p = prompt('Prix (DA)', s.price / 100)
                      if (n) await api.updateService(s.id, { name: n, duration_minutes: parseInt(d), price: parseInt(p) * 100 })
                      loadAll()
                    }}>Modifier</button>
                  </div>
                </div>
              ))}
            </div>
            {showServiceForm && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowServiceForm(false)}>
                <div className="modal space-y-3">
                  <h3 className="font-bold">Nouveau service</h3>
                  <input className="input" placeholder="Nom" value={svcForm.name} onChange={e => setSvcForm({ ...svcForm, name: e.target.value })} />
                  <input className="input" type="number" placeholder="Durée (minutes)" value={svcForm.duration_minutes} onChange={e => setSvcForm({ ...svcForm, duration_minutes: e.target.value })} />
                  <input className="input" type="number" placeholder="Prix (DA)" value={svcForm.price} onChange={e => setSvcForm({ ...svcForm, price: e.target.value })} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary flex-1" onClick={createService}>Créer</button>
                    <button className="btn btn-ghost flex-1" onClick={() => setShowServiceForm(false)}>Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Availabilities ── */}
        {tab === 'availabilities' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold" style={{ fontSize: 20 }}>Disponibilités récurrentes</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAvailForm(true)}>+ Ajouter</button>
            </div>
            <div className="space-y-3">
              {availabilities.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: 'var(--body-bg)' }}>
                  <div><span className="font-semibold">{DAYS[a.day_of_week]}</span><span className="ml-4 text-muted">{a.start_time} – {a.end_time}</span></div>
                  <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteAvailability(a.id); loadAll() }}>Supprimer</button>
                </div>
              ))}
              {availabilities.length === 0 && <p className="text-center text-muted py-8">Aucune plage définie</p>}
            </div>
            {showAvailForm && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAvailForm(false)}>
                <div className="modal space-y-3">
                  <h3 className="font-bold">Nouvelle plage</h3>
                  <select className="input" value={availForm.day_of_week} onChange={e => setAvailForm({ ...availForm, day_of_week: parseInt(e.target.value) })}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <input className="input" type="time" value={availForm.start_time} onChange={e => setAvailForm({ ...availForm, start_time: e.target.value })} />
                  <input className="input" type="time" value={availForm.end_time} onChange={e => setAvailForm({ ...availForm, end_time: e.target.value })} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary flex-1" onClick={createAvailability}>Créer</button>
                    <button className="btn btn-ghost flex-1" onClick={() => setShowAvailForm(false)}>Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Blocked slots ── */}
        {tab === 'blocked' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold" style={{ fontSize: 20 }}>Créneaux bloqués</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setShowBlockForm(true)}>+ Bloquer</button>
            </div>
            <div className="space-y-3">
              {blockedSlots.map(b => (
                <div key={b.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: 'var(--red-light)' }}>
                  <div>
                    <div className="font-semibold">{formatDateTime(b.start_time)} – {formatDateTime(b.end_time)}</div>
                    {b.reason && <div className="text-sm text-muted">{b.reason}</div>}
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteBlockedSlot(b.id); loadAll() }}>Supprimer</button>
                </div>
              ))}
              {blockedSlots.length === 0 && <p className="text-center text-muted py-8">Aucun créneau bloqué</p>}
            </div>
            {showBlockForm && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBlockForm(false)}>
                <div className="modal space-y-3">
                  <h3 className="font-bold">Bloquer un créneau</h3>
                  <label className="text-sm text-muted">Début</label>
                  <input className="input" type="datetime-local" value={blockForm.start_time} onChange={e => setBlockForm({ ...blockForm, start_time: e.target.value })} />
                  <label className="text-sm text-muted">Fin</label>
                  <input className="input" type="datetime-local" value={blockForm.end_time} onChange={e => setBlockForm({ ...blockForm, end_time: e.target.value })} />
                  <input className="input" placeholder="Raison (optionnel)" value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary flex-1" onClick={createBlock}>Bloquer</button>
                    <button className="btn btn-ghost flex-1" onClick={() => setShowBlockForm(false)}>Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Exceptions ── */}
        {tab === 'exceptions' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold" style={{ fontSize: 20 }}>Exceptions de dates</h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowOverrideForm(true); setOverrideForm({ override_date: '', start_time: '', end_time: '', is_available: true, reason: '' }) }}>+ Ajouter</button>
            </div>
            <div className="space-y-3">
              {overrides.map(o => (
                <div key={o.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: o.is_available ? 'var(--green-light)' : 'var(--red-light)' }}>
                  <div>
                    <div className="font-semibold">{formatDate(o.override_date)}{o.start_time ? ` — ${o.start_time} à ${o.end_time}` : ' — Journée complète'}</div>
                    <div className="text-sm text-muted">{o.is_available ? 'Disponible' : 'Indisponible'}{o.reason ? ` · ${o.reason}` : ''}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={async () => { await api.deleteOverride(o.id); loadAll() }}>Supprimer</button>
                </div>
              ))}
              {overrides.length === 0 && <p className="text-center text-muted py-8">Aucune exception</p>}
            </div>
            {showOverrideForm && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowOverrideForm(false)}>
                <div className="modal space-y-3">
                  <h3 className="font-bold">Ajouter une exception</h3>
                  <input className="input" type="date" value={overrideForm.override_date} onChange={e => setOverrideForm({ ...overrideForm, override_date: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <button className={`toggle ${overrideForm.is_available ? 'on' : ''}`} onClick={() => setOverrideForm({ ...overrideForm, is_available: !overrideForm.is_available })} />
                    <span className="text-sm">{overrideForm.is_available ? 'Disponible' : 'Indisponible'}</span>
                  </div>
                  {overrideForm.is_available && (
                    <>
                      <input className="input" type="time" value={overrideForm.start_time} onChange={e => setOverrideForm({ ...overrideForm, start_time: e.target.value })} placeholder="Début" />
                      <input className="input" type="time" value={overrideForm.end_time} onChange={e => setOverrideForm({ ...overrideForm, end_time: e.target.value })} placeholder="Fin" />
                    </>
                  )}
                  <input className="input" placeholder="Raison" value={overrideForm.reason} onChange={e => setOverrideForm({ ...overrideForm, reason: e.target.value })} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary flex-1" onClick={createOverride}>Ajouter</button>
                    <button className="btn btn-ghost flex-1" onClick={() => setShowOverrideForm(false)}>Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Analytics ── */}
        {tab === 'analytics' && analytics && (
          <div className="card">
            <h2 className="font-bold mb-6" style={{ fontSize: 20 }}>Statistiques</h2>

            <div className="analytics-cards">
              <div className="analytics-card">
                <div className="analytics-card-icon">{ANALYTICS_ICONS.total}</div>
                <div className="analytics-card-value">{analytics.total_appointments}</div>
                <div className="analytics-card-label">RDV totaux</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-card-icon">{ANALYTICS_ICONS.month}</div>
                <div className="analytics-card-value">{analytics.month_appointments}</div>
                <div className="analytics-card-label">Ce mois</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-card-icon">{ANALYTICS_ICONS.revenue}</div>
                <div className="analytics-card-value">{formatPrice(analytics.total_revenue)}</div>
                <div className="analytics-card-label">CA total</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-card-icon">{ANALYTICS_ICONS.clients}</div>
                <div className="analytics-card-value">{analytics.unique_clients}</div>
                <div className="analytics-card-label">Clients uniques</div>
              </div>
              <div className="analytics-card">
                <div className="analytics-card-icon">{ANALYTICS_ICONS.rate}</div>
                <div className="analytics-card-value" style={{fontSize:22}}>{analytics.completion_rate}%</div>
                <div className="analytics-card-label">Taux complétion</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="mt-6 p-4" style={{borderRadius:'var(--radius)', background:'var(--body-bg)', border:'1px solid var(--border)'}}>
              <h3 className="font-semibold mb-3" style={{fontSize:14}}>RDV par jour (30 derniers jours)</h3>
              <div className="analytics-bars">
                {analytics.appointments_per_day.slice(-14).map(d => {
                  const max = Math.max(...analytics.appointments_per_day.map(x => x.count), 1)
                  const h = Math.max((d.count / max) * 100, 4)
                  return (
                    <div key={d.date} className="analytics-bar-col">
                      <div className="analytics-bar-value">{d.count}</div>
                      <div className="analytics-bar" style={{height: `${h}px`}} />
                      <div className="analytics-bar-label">{d.date.slice(5)}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top services + Status breakdown */}
            <div className="analytics-bottom">
              <div className="flex-1">
                <h3 className="font-semibold mb-3" style={{fontSize:14}}>Top services</h3>
                <div className="space-y-2">
                  {analytics.top_services.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between p-2" style={{borderRadius:'var(--radius-sm)', background:'var(--body-bg)'}}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-muted" style={{fontSize:14}}>#{i+1}</span>
                        <span className="font-medium" style={{fontSize:13}}>{s.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted">{s.count} RDV</span>
                        <span className="font-semibold" style={{color:'var(--rose)'}}>{formatPrice(s.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{width:180}}>
                <h3 className="font-semibold mb-3" style={{fontSize:14}}>Statuts</h3>
                <div className="space-y-2">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => {
                    const count = analytics.status_breakdown[k] || 0
                    if (count === 0) return null
                    return (
                      <div key={k} className="flex justify-between items-center text-sm p-2" style={{borderRadius:'var(--radius-sm)', background:'var(--body-bg)'}}>
                        <span>{v}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {!analytics.top_services.length && (
              <p className="text-center text-muted py-8">Pas encore de données — les statistiques s'afficheront après les premiers rendez-vous.</p>
            )}
          </div>
        )}

        {tab === 'analytics' && !analytics && (
          <div className="card text-center text-muted py-8">Chargement des statistiques...</div>
        )}
      </section>
    </div>
  )
}
