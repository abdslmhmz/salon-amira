import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import Calendar from '../components/Calendar'
import { MONTHS, formatPrice } from '../utils'
import { ServiceIllustration } from '../components/ServiceIllustration'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const FULL_DAY_MINUTES = 540 // 9h (09:00-18:00)

export default function ClientBooking() {
  const [step, setStep] = useState(1)
  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [appointments, setAppointments] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nextDayInfo, setNextDayInfo] = useState(null)  // { days_ahead, date } for banner
  const [monthAvailability, setMonthAvailability] = useState({})  // { "YYYY-MM-DD": { has_slots, slot_count } }

  useEffect(() => { api.getServices().then(setServices).catch(e => { if (import.meta.env.DEV) console.error(e) }) }, [])

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
    if (!d || selectedServices.length === 0) return
    setLoading(true)
    try {
      const ids = selectedServices.map(s => s.id)
      const data = await api.getSlots(d, ids)
      setSlots(data)
    } catch (e) {
      if (import.meta.env.DEV) console.error('loadSlots failed', e)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  const goToStep = async (s) => {
    setError('')
    setNextDayInfo(null)
    if (s === 2 && selectedServices.length > 0) {
      setLoading(true)
      const ids = selectedServices.map(sv => sv.id)
      const data = await api.getNextSlots(ids, selectedDate)
      if (data.date) {
        if (data.days_ahead > 0) {
          setNextDayInfo({ days_ahead: data.days_ahead, date: data.date })
          setSelectedDate(data.date)
        }
        setSlots(data.slots)
      } else {
        setSlots([])
        setError(data.message || 'Aucun créneau disponible')
      }
      setLoading(false)
    }
    setStep(s)
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    if (step === 2 && selectedServices.length > 0) loadSlots(date)
  }

  const handleMonthChange = async (year, month) => {
    if (selectedServices.length === 0) return
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    try {
      const data = await api.getMonthAvailability(monthStr, selectedServices.map(s => s.id))
      const map = {}
      for (const d of data.days) map[d.date] = { has_slots: d.has_slots, slot_count: d.slot_count }
      setMonthAvailability(map)
    } catch { /* silently ignore — user will just see no dots */ }
  }

  const toggleService = (svc) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === svc.id)
      if (exists) return prev.filter(s => s.id !== svc.id)
      return [...prev, svc]
    })
    setError('')
  }

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `${m} min`
  }

  const handleConfirm = async () => {
    if (!clientName.trim() || !clientPhone.trim()) { setError('Veuillez remplir tous les champs'); return }
    setLoading(true)
    setError('')
    try {
      const ids = selectedServices.map(s => s.id)
      const result = await api.createAppointment({
        service_ids: ids,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        start_time: `${selectedDate}T${selectedSlot}:00`,
      })
      setAppointments(Array.isArray(result) ? result : [result])
      setStep(4)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1); setSelectedServices([]); setSelectedSlot(null)
    setClientName(''); setClientPhone(''); setAppointments(null)
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const { full, short } = displayDate()

  // ─── Step 2: render slot chip ───
  const renderSlotChip = (s) => {
    const time = s.start.split('T')[1]
    const endTime = s.end.split('T')[1]
    const hasSegments = s.segments && s.segments.length > 0

    return (
      <div
        key={time}
        className={`slot-chip ${selectedSlot === time ? 'selected' : ''}`}
        onClick={() => setSelectedSlot(time)}
      >
        {hasSegments ? (
          s.segments.map((seg, i) => (
            <div key={i} style={{
              fontSize: i === 0 ? '0.85rem' : '0.72rem',
              fontWeight: i === 0 ? 600 : 400,
              opacity: i === 0 ? 1 : 0.7,
              lineHeight: 1.3,
            }}>
              {seg.start} – {seg.end}
            </div>
          ))
        ) : (
          <>
            <div style={{ fontWeight: 600 }}>{time}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>→ {endTime}</div>
          </>
        )}
        {s.has_break && (
          <div style={{ fontSize: '0.62rem', opacity: 0.45, fontStyle: 'italic', marginTop: 2 }}>
            ↳ avec pause
          </div>
        )}
      </div>
    )
  }

  // ─── Step 2: empty slots message ───
  const renderEmptySlots = () => {
    if (totalDuration > FULL_DAY_MINUTES) {
      return (
        <div className="text-center py-8">
          <p className="text-muted mb-2">
            ⚠️ {formatDuration(totalDuration)} dépasse les horaires d'ouverture ({formatDuration(FULL_DAY_MINUTES)}).
          </p>
          <p className="text-muted" style={{fontSize:'0.85rem'}}>
            Essayez de scinder en deux réservations distinctes.
          </p>
        </div>
      )
    }
    return (
      <p className="text-center text-muted py-8">
        Aucun créneau de {formatDuration(totalDuration)} disponible ce jour.
      </p>
    )
  }

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

      {/* Step 1: Multi-service selection */}
      {step === 1 && (
        <div>
          <h1 className="text-center font-bold mb-2" style={{ fontSize: 22 }}>Choisissez vos prestations</h1>
          <p className="text-center text-muted mb-6">Sélectionnez une ou plusieurs prestations</p>
          <div className="landing-services-grid">
            {services.map(s => {
              const isSelected = selectedServices.some(ss => ss.id === s.id)
              return (
                <div
                  key={s.id}
                  className={`landing-service-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleService(s)}
                >
                  <div className="landing-service-icon">
                    <ServiceIllustration serviceName={s.name} size={72} />
                  </div>
                  <h3 className="landing-service-name">{s.name}</h3>
                  <p className="landing-service-desc">{s.description || 'Prestation beauté'}</p>
                  <div className="landing-service-footer">
                    <span className="landing-service-meta">⏱ {s.duration_minutes} min</span>
                    <span className="landing-service-price">{formatPrice(s.price)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Sticky bottom bar */}
          {selectedServices.length > 0 && (
            <div className="booking-sticky-bar">
              <div className="booking-sticky-info">
                <span className="label">Votre sélection</span>
                <span>
                  {selectedServices.length} prestation{selectedServices.length > 1 ? 's' : ''}
                  {' · '}{formatDuration(totalDuration)}{' · '}{formatPrice(totalPrice)}
                </span>
              </div>
              <button className="btn btn-primary booking-sticky-btn" onClick={() => goToStep(2)}>
                Voir les créneaux →
              </button>
            </div>
          )}
          {selectedServices.length > 0 && <div style={{ height: 80 }} />}
        </div>
      )}

      {/* Step 2: Slot selection */}
      {step === 2 && selectedServices.length > 0 && (
        <div>
          <h1 className="text-center font-bold mb-2" style={{ fontSize: 22 }}>Choisissez votre créneau</h1>
          <p className="text-center text-muted mb-2">
            {selectedServices.map(s => s.name).join(' + ')}
          </p>
          <p className="text-center mb-6" style={{ fontSize: '0.85rem', color: 'var(--rose)' }}>
            ⏱ Bloc de {formatDuration(totalDuration)} · {formatPrice(totalPrice)}
          </p>

          {/* Banner: next available day */}
          {nextDayInfo && (
            <div style={{
              maxWidth: 500, margin: '0 auto 16px', padding: '10px 16px',
              borderRadius: 'var(--radius)', background: '#e8f4fd',
              border: '1px solid #b8d8f0', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: 8, color: '#1a6daa',
            }}>
              <span>📅</span>
              <span>
                Prochain créneau : <strong>{(() => {
                  const d = new Date(nextDayInfo.date + 'T12:00:00')
                  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
                })()}</strong>
                {' '}(dans {nextDayInfo.days_ahead} jour{nextDayInfo.days_ahead > 1 ? 's' : ''})
              </span>
            </div>
          )}

          {/* Error: no slots found in 14 days */}
          {error && step === 2 && slots.length === 0 && (
            <div style={{
              maxWidth: 500, margin: '0 auto 16px', padding: '10px 16px',
              borderRadius: 'var(--radius)', background: '#fef3c7',
              border: '1px solid #fcd34d', fontSize: '0.9rem', color: '#92400e',
            }}>
              ⚠️ {error}
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Calendar selected={selectedDate} onSelect={handleDateSelect} availabilityMap={monthAvailability} onMonthChange={handleMonthChange} />
          </div>
          <div className="card max-w-lg mx-auto">
            <h3 className="font-semibold mb-4 text-muted">Créneaux disponibles — {short}</h3>
            {loading ? (
              <p className="text-center text-muted">Chargement...</p>
            ) : slots.length === 0 ? (
              renderEmptySlots()
            ) : (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8}}>
                {slots.map(renderSlotChip)}
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3 mt-6">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Retour</button>
            <button className="btn btn-primary" disabled={!selectedSlot} onClick={() => goToStep(3)}>Continuer →</button>
          </div>
        </div>
      )}

      {/* Step 3: Client info + summary */}
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
              {selectedServices.map((svc) => (
                <div key={svc.id} className="flex justify-between">
                  <span className="text-muted">{svc.name}</span>
                  <span className="font-medium">{svc.duration_minutes} min · {formatPrice(svc.price)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2" style={{borderTop:'1px solid var(--border)'}}>
                <span className="text-muted">Total</span>
                <span className="font-bold" style={{color:'var(--rose)'}}>{formatDuration(totalDuration)} · {formatPrice(totalPrice)}</span>
              </div>
            </div>
            <div className="p-4 text-sm space-y-1" style={{ borderRadius: 'var(--radius)', background: 'var(--body-bg)' }}>
              <div className="flex justify-between"><span className="text-muted">Date</span><span className="font-medium">{full}</span></div>
              <div className="flex justify-between"><span className="text-muted">Début</span><span className="font-medium">{selectedSlot}</span></div>
              <div className="flex justify-between"><span className="text-muted">Fin</span><span className="font-medium">
                {slots.find(s => s.start.endsWith(selectedSlot))?.end?.split('T')[1] || ''}
              </span></div>
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
      {step === 4 && appointments && (
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
              {appointments.length > 1 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Réf : {appointments[0].booking_ref}
                </div>
              )}
              <h2 className="font-bold" style={{ fontSize: 20 }}>
                {selectedServices.map(s => s.name).join(' + ')}
              </h2>
              <p className="text-muted">{full}</p>
            </div>
            <div className="space-y-3 text-sm">
              {appointments.map((apt, i) => (
                <div key={i} className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}>
                  <div>
                    <div className="font-medium">{apt.service_name}</div>
                    <div className="text-muted" style={{fontSize:'0.78rem'}}>
                      {apt.start_time?.split('T')[1]?.substring(0, 5)} – {apt.end_time?.split('T')[1]?.substring(0, 5)}
                      {' · '}{apt.service_duration} min
                    </div>
                  </div>
                  <span className="font-bold" style={{color:'var(--rose)'}}>{formatPrice(apt.service_price)}</span>
                </div>
              ))}
              {appointments.length > 1 && (
                <div className="flex justify-between py-2 font-bold">
                  <span>Total</span>
                  <span style={{color:'var(--rose)'}}>{formatDuration(totalDuration)} · {formatPrice(totalPrice)}</span>
                </div>
              )}
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Client</span><span className="font-medium">{appointments[0].client_name}</span></div>
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Téléphone</span><span className="font-medium">{appointments[0].client_phone}</span></div>
              <div className="flex justify-between py-2" style={{borderBottom:'1px solid var(--border)'}}><span className="text-muted">Adresse</span><span className="font-medium">Alger Centre</span></div>
            </div>
            <div className="alert alert-warning mt-6 text-center">
              Pensez à sauvegarder — prenez une capture d'écran ou téléchargez le récapitulatif.
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn btn-ghost flex-1" onClick={() => window.print()}>Imprimer</button>
              <a className="btn btn-primary flex-1" href={api.getAppointmentPdfUrl(appointments[0].id)} target="_blank" rel="noopener">
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
