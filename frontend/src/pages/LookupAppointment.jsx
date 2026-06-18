import { useState } from 'react'
import { api } from '../api'
import { ServiceIcon } from '../components/Illustrations'
import { formatPrice } from '../utils'

const STATUS_LABELS = { confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'No-show' }
const SERVICE_ICON_MAP = {
  'Coiffure Femme': 'scissors', 'Brushing': 'brush', 'Coloration': 'hair',
  'Manucure': 'nail', 'Soin Visage': 'face', 'Maquillage': 'makeup', 'Épilation': 'spa'
}

export default function LookupAppointment() {
  const [phone, setPhone] = useState('')
  const [appointments, setAppointments] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    const phoneClean = phone.trim()
    if (!phoneClean) { setError('Entrez un numéro de téléphone'); return }
    if (!/^\+?[0-9\s\-]{8,15}$/.test(phoneClean)) {
      setError('Format de téléphone invalide (ex: 0550 12 34 56)'); return
    }
    setLoading(true); setError('')
    try {
      const data = await api.getAppointments({ phone: phoneClean })
      setAppointments(data)
      if (data.length === 0) setError('Aucun rendez-vous trouvé pour ce numéro')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formatTime = (iso) => iso?.split('T')[1]?.substring(0, 5)

  const isPast = (iso) => new Date(iso) < new Date()
  const isUpcoming = (iso) => new Date(iso) > new Date()

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-bold mb-2" style={{ fontSize: 22 }}>Retrouver votre rendez-vous</h1>
        <p className="text-muted">Entrez votre numéro de téléphone pour consulter vos réservations</p>
      </div>

      <div className="card">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="tel"
            placeholder="0550 12 34 56"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button className="btn btn-primary" onClick={search} disabled={loading}>
            {loading ? '...' : 'Rechercher'}
          </button>
        </div>

        {error && <div className="alert alert-warning mt-4">{error}</div>}

        {appointments && appointments.length > 0 && (
          <div className="mt-6 space-y-4">
            {appointments.map(a => {
              const past = isPast(a.start_time)
              return (
                <div
                  key={a.id}
                  className="p-4 lookup-appt-card"
                  style={{ borderRadius: 'var(--radius)', background: past ? 'var(--body-bg)' : 'var(--rose-light)', opacity: past ? 0.7 : 1 }}
                >
                  <div className="flex items-start gap-3">
                    <div style={{ width: 36, height: 36, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <ServiceIcon name={SERVICE_ICON_MAP[a.service_name] || 'spa'} size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{a.service_name}</div>
                      <div className="text-sm text-muted">{formatDate(a.start_time)} à {formatTime(a.start_time)} – {formatTime(a.end_time)}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="badge" style={{ background: past ? 'var(--border)' : 'var(--rose-light)', color: past ? 'var(--text-muted)' : 'var(--rose-dark)' }}>
                          {past ? 'Passé' : 'À venir'}
                        </span>
                        <span className={`badge badge-${a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'sage' : a.status === 'cancelled' ? 'red' : 'gold'}`}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                      </div>
                    </div>
                    {isUpcoming(a.start_time) && (
                      <div className="text-right">
                        <div className="font-bold" style={{ color: 'var(--rose)', fontFamily: 'var(--font-display)' }}>{formatPrice(a.service_price)}</div>
                        <a
                          className="text-xs"
                          style={{ color: 'var(--rose)', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          href={api.getAppointmentPdfUrl(a.id)}
                          target="_blank"
                          rel="noopener"
                        >
                          Télécharger PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {appointments === null && !error && (
        <div className="text-center text-muted mt-8 py-8">
          <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: 'var(--radius)', background: 'var(--rose-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="6" y="4" width="16" height="20" rx="3" stroke="var(--rose)" strokeWidth="1.5" opacity="0.5" />
              <line x1="11" y1="8" x2="17" y2="8" stroke="var(--rose)" strokeWidth="1.5" opacity="0.4" />
              <circle cx="14" cy="16" r="3" stroke="var(--rose)" strokeWidth="1.5" opacity="0.4" />
            </svg>
          </div>
          <p>Entrez votre numéro pour retrouver vos rendez-vous</p>
        </div>
      )}
    </div>
  )
}
