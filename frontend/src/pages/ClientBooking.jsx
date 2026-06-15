import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import Calendar from '../components/Calendar'
import { ServiceIcon } from '../components/Illustrations'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const SERVICE_ICON_MAP = {
  'Coiffure Femme': 'scissors', 'Brushing': 'brush', 'Coloration': 'hair',
  'Manucure': 'nail', 'Soin Visage': 'face', 'Maquillage': 'makeup', 'Épilation': 'spa',
  'Coupe Homme': 'comb',
}
const SERVICE_DESCS = {
  'Coiffure Femme': 'Coupe, brushing ou coiffage sur mesure',
  'Brushing': 'Brushing lissant ou bouclé professionnel',
  'Coloration': 'Coloration complète, mèches ou balayage',
  'Manucure': 'Pose de vernis classique ou semi-permanent',
  'Soin Visage': 'Nettoyage, hydratation et masque adapté',
  'Maquillage': 'Maquillage jour, soirée ou mariage',
  'Épilation': 'Épilation visage ou corps à la cire',
  'Coupe Homme': 'Coupe classique ou tendance, finition soignée',
}

export default function ClientBooking() {
  const [step, setStep] = useState(1)
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.getServices().then(setServices).catch(() => {}) }, [])

  const displayDate = useCallback(() => {
    if (!selectedDate) return { full: '', iso: '', short: '' }
    const d = new Date(selectedDate + 'T12:00:00')
    return {
      full: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      iso: selectedDate,
      short: `${DAYS[d.getDay()].substring(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`
    }
  }, [selectedDate])

  const loadSlots = async (date) => {
    const d = date || selectedDate
    if (!d || !selectedService) return
    setLoading(true)
    const data = await api.getSlots(d, selectedService.id)
    setSlots(data)
    setLoading(false)
  }

  const goToStep = async (s) => {
    setError('')
    if (s === 2 && selectedService) { await loadSlots(selectedDate) }
    setStep(s)
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    if (step === 2 && selectedService) loadSlots(date)
  }

  const handleConfirm = async () => {
    if (!clientName.trim() || !clientPhone.trim()) { setError('Veuillez remplir tous les champs'); return }
    setLoading(true)
    setError('')
    try {
      const apt = await api.createAppointment({
        service_id: selectedService.id,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        start_time: `${selectedDate}T${selectedSlot}:00`,
      })
      setAppointment(apt)
      setStep(4)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1); setSelectedService(null); setSelectedSlot(null)
    setClientName(''); setClientPhone(''); setAppointment(null)
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const { full, short, iso } = displayDate()

  const formatPrice = (p) => `${(p/100).toFixed(0).replace('.', ',')} DA`

  return (
    <div>
      {/* Progress */}
      <div className="progress">
        {['Service', 'Créneau', 'Infos', 'Confirmation'].map((label, i) => (
          <div className="flex items-center gap-2" key={i}>
            <div className={`progress-step ${step > i+1 ? 'done' : step === i+1 ? 'active' : ''}`}>{i+1}</div>
            <span className={`progress-label ${step !== i+1 ? 'muted' : ''}`}>{label}</span>
            {i < 3 && <div className="progress-line" />}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {/* Step 1: Service */}
      {step === 1 && (
        <div>
          <h1 className="text-center font-bold mb-6" style={{ fontSize: 22 }}>Choisissez votre prestation</h1>
          <div className="landing-services-grid">
            {services.map(s => (
              <div
                key={s.id}
                className={`landing-service-card ${selectedService?.id === s.id ? 'selected' : ''}`}
                onClick={() => setSelectedService(s)}
              >
                <div className="landing-service-icon">
                  <ServiceIcon name={SERVICE_ICON_MAP[s.name] || 'spa'} size={26} />
                </div>
                <h3 className="landing-service-name">{s.name}</h3>
                <p className="landing-service-desc">{SERVICE_DESCS[s.name] || 'Prestation beauté'}</p>
                <div className="landing-service-footer">
                  <span className="landing-service-meta">⏱ {s.duration_minutes} min</span>
                  <span className="landing-service-price">{formatPrice(s.price)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button className="btn btn-primary" disabled={!selectedService} onClick={() => goToStep(2)}>
              Voir les créneaux →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Slot */}
      {step === 2 && selectedService && (
        <div>
          <h1 className="text-center font-bold mb-2" style={{ fontSize: 22 }}>Choisissez votre créneau</h1>
          <p className="text-center text-muted mb-6">{selectedService.name} · ⏱ {selectedService.duration_minutes} min</p>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Calendar selected={selectedDate} onSelect={handleDateSelect} />
          </div>
          <div className="card max-w-lg mx-auto">
            <h3 className="font-semibold mb-4 text-muted">Créneaux disponibles — {short}</h3>
            {loading ? <p className="text-center text-muted">Chargement...</p> : slots.length === 0 ? (
              <p className="text-center text-muted py-8">Aucun créneau disponible ce jour</p>
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px, 1fr))', gap:8}}>
                {slots.map(s => {
                  const time = s.start.split('T')[1]
                  return (
                    <div
                      key={time}
                      className={`slot-chip ${selectedSlot === time ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(time)}
                    >
                      {time}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3 mt-6">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Retour</button>
            <button className="btn btn-primary" disabled={!selectedSlot} onClick={() => goToStep(3)}>Continuer →</button>
          </div>
        </div>
      )}

      {/* Step 3: Info */}
      {step === 3 && (
        <div>
          <h1 className="text-center font-bold mb-2" style={{ fontSize: 22 }}>Vos informations</h1>
          <p className="text-center text-muted mb-6">Laissez votre nom et numéro pour confirmer</p>
          <div className="card max-w-md mx-auto space-y-4">
            <div>
              <label className="text-sm font-medium text-muted mb-1 block">Nom complet</label>
              <input className="input" placeholder="Ahmed Benali" value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted mb-1 block">Numéro de téléphone</label>
              <input className="input" type="tel" placeholder="0550 12 34 56" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
              <p className="text-xs text-muted mt-1">Ce numéro vous permettra de retrouver votre rendez-vous</p>
            </div>
            <div className="p-4 text-sm space-y-1" style={{ borderRadius: 'var(--radius)', background: 'var(--body-bg)' }}>
              <div className="flex justify-between"><span className="text-muted">Service</span><span className="font-medium">{selectedService.name}</span></div>
              <div className="flex justify-between"><span className="text-muted">Date & Heure</span><span className="font-medium">{full} à {selectedSlot}</span></div>
              <div className="flex justify-between"><span className="text-muted">Durée</span><span className="font-medium">{selectedService.duration_minutes} min</span></div>
              <div className="flex justify-between pt-2" style={{borderTop:'1px solid var(--border)'}}><span className="text-muted">Prix</span><span className="font-bold" style={{color:'var(--rose)'}}>{formatPrice(selectedService.price)}</span></div>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-6">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Retour</button>
            <button className="btn btn-primary" disabled={loading} onClick={handleConfirm}>
              {loading ? 'Réservation...' : 'Confirmer la réservation'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && appointment && (
        <div>
          <div className="text-center mb-6">
            <div style={{
              width: 56, height: 56, margin: '0 auto 12px', borderRadius: '50%',
              background: 'var(--rose-light)', display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="var(--rose)" strokeWidth="2" />
                <path d="M9 14l3 3 7-7" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-bold" style={{ fontSize: 22 }}>Rendez-vous confirmé !</h1>
            <p className="text-muted">Votre réservation a bien été enregistrée.</p>
          </div>
          <div className="card max-w-md mx-auto">
            <div className="text-center mb-6">
              <div style={{ width: 48, height: 48, margin: '0 auto 8px', borderRadius: 'var(--radius)', background: 'var(--rose-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ServiceIcon name={SERVICE_ICON_MAP[appointment.service_name] || 'spa'} size={26} />
              </div>
              <h2 className="font-bold" style={{ fontSize: 20 }}>{appointment.service_name}</h2>
              <p className="text-muted">{full} à {selectedSlot}</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Client</span><span className="font-medium">{appointment.client_name}</span></div>
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Téléphone</span><span className="font-medium">{appointment.client_phone}</span></div>
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Durée</span><span className="font-medium">{appointment.service_duration} minutes</span></div>
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Prix</span><span className="font-bold" style={{color:'var(--rose)'}}>{formatPrice(appointment.service_price)}</span></div>
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Adresse</span><span className="font-medium">Alger Centre</span></div>
            </div>
            <div className="alert alert-warning mt-6 text-center">
              Pensez à sauvegarder — prenez une capture d'écran ou téléchargez le récapitulatif.
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-ghost flex-1" onClick={() => window.print()}>Imprimer</button>
              <a className="btn btn-primary flex-1" href={api.getAppointmentPdfUrl(appointment.id)} target="_blank" rel="noopener">
                Télécharger PDF
              </a>
            </div>
          </div>
          <div className="text-center mt-6">
            <button className="btn btn-ghost" onClick={reset}>Prendre un autre rendez-vous</button>
          </div>
        </div>
      )}
    </div>
  )
}
