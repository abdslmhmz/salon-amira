import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { api } from '../api'
import { useToast } from '../components/Toast'
import Calendar from '../components/Calendar'
import OnboardingTour from '../components/OnboardingTour'
import Dashboard from './Dashboard'
import FormModal from '../components/FormModal'
import { DAYS } from '../utils'

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'))

const TABS = [
  { key: 'dashboard', label: '📊 Tableau de bord' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'services', label: 'Services' },
  { key: 'availabilities', label: 'Disponibilités' },
  { key: 'blocked', label: 'Créneaux bloqués' },
  { key: 'exceptions', label: 'Exceptions' },
  { key: 'analytics', label: 'Statistiques' },
  { key: 'cms-settings', label: '⚙️ Paramètres' },
]

const STATUS_LABELS = { confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'No-show', pending: 'En attente' }
const BADGE_CLASS = {
  'Coiffure Femme': 'badge-rose',
  'Manucure': 'badge-pink', 'Soin Visage': 'badge-green', 'Maquillage': 'badge-gold', 'Épilation': 'badge-sage',
}

const SECTION_HELP = {
  dashboard: 'Vue d\'ensemble de votre activit\u00e9. Consultez le r\u00e9sum\u00e9 du jour et pr\u00e9parez la journ\u00e9e de demain.',
  agenda: 'G\u00e9rez vos rendez-vous du jour. Changez la date avec le calendrier, modifiez le statut ou les d\u00e9tails de chaque r\u00e9servation.',
  services: 'Les prestations que vous proposez. Activez ou désactivez un service — les services inactifs ne sont pas visibles des clientes sur le site.',
  availabilities: 'Vos horaires d\'ouverture habituels pour chaque jour. Les clientes ne peuvent réserver qu\'à l\'intérieur de ces plages.',
  blocked: 'Bloquez des créneaux spécifiques où vous êtes indisponible — une pause, un RDV personnel. Ces créneaux ne seront jamais proposés aux clientes.',
  exceptions: 'Jours exceptionnels qui modifient vos horaires habituels pour une date précise. Utile pour les jours fériés, vacances, ou horaires spéciaux.',
  analytics: 'Vos chiffres clés : nombre de RDV, chiffre d\'affaires, clientes uniques, et taux de rendez-vous honorés.',
  'cms-settings': 'Modifiez les informations affichées sur votre site public. Les changements sont visibles immédiatement.',
}

const EMPTY_STATES = {
  agenda: { icon: '📅', title: 'Aucun rendez-vous ce jour', text: 'Utilisez le calendrier pour naviguer vers une autre date.' },
  services: { icon: '💇', title: 'Aucune prestation', text: 'Ajoutez votre première prestation avec le bouton "+ Ajouter".' },
  availabilities: { icon: '🕐', title: 'Aucune plage horaire', text: 'Définissez vos horaires d\'ouverture pour que les clientes puissent réserver.' },
  blocked: { icon: '🚫', title: 'Aucun créneau bloqué', text: 'Bloquez des créneaux si vous avez une pause ou une indisponibilité ponctuelle.' },
  exceptions: { icon: '📆', title: 'Aucune exception', text: 'Ajoutez des jours exceptionnels (fériés, vacances) avec le bouton "+ Ajouter".' },
}

// ─── Form validation helper ───
function validateServiceForm(form) {
  const errors = {}
  if (!form.name || !form.name.trim()) errors.name = 'Le nom est requis'
  if (!form.duration_minutes || parseInt(form.duration_minutes) < 5) errors.duration_minutes = 'Minimum 5 minutes'
  if (form.price === '' || parseInt(form.price) < 0) errors.price = 'Le prix doit être ≥ 0'
  return errors
}

function validateAvailabilityForm(form) {
  const errors = {}
  if (!form.start_time) errors.start_time = 'Heure de début requise'
  if (!form.end_time) errors.end_time = 'Heure de fin requise'
  if (form.start_time && form.end_time && form.start_time >= form.end_time) errors.end_time = 'Doit être après le début'
  return errors
}

function validateBlockedSlotForm(form) {
  const errors = {}
  if (!form.start_time) errors.start_time = 'Date/heure de début requise'
  if (!form.end_time) errors.end_time = 'Date/heure de fin requise'
  return errors
}

function validateOverrideForm(form) {
  const errors = {}
  if (!form.override_date) errors.override_date = 'Date requise'
  if (!form.start_time) errors.start_time = 'Heure de début requise'
  if (!form.end_time) errors.end_time = 'Heure de fin requise'
  return errors
}

function validateAppointmentForm(form) {
  const errors = {}
  if (!form.client_name || !form.client_name.trim()) errors.client_name = 'Nom requis'
  if (!form.client_phone || !form.client_phone.trim()) errors.client_phone = 'Téléphone requis'
  if (!form.start_time) errors.start_time = 'Date/heure requise'
  return errors
}

// ─── Edit modals as inline helper functions ───

function EditServiceModal({ service, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    name: service?.name || '',
    duration_minutes: service?.duration_minutes || 30,
    price: service ? (service.price || 0) : 0,
    description: service?.description || '',
    is_active: service ? service.is_active : true,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const v = validateServiceForm(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSaving(true)
    try {
      await onSave(service?.id, {
        name: form.name.trim(),
        duration_minutes: parseInt(form.duration_minutes),
        price: parseInt(form.price),
        description: form.description.trim() || null,
        is_active: form.is_active,
      })
      onClose()
    } catch (e) {
      setErrors({ _save: e.message || 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      await onDelete(service.id, service.name)
      onClose()
    } catch (e) {
      setErrors({ _save: e.message || 'Erreur lors de la suppression' })
    }
  }

  const title = service ? 'Modifier le service' : 'Nouveau service'
  const saveLabel = service ? 'Enregistrer' : 'Créer'

  const deleteSection = service ? (
    <div className="pt-3 border-t" style={{borderColor:'var(--border)'}}>
      <button className="btn btn-danger btn-sm w-full" onClick={del}>
        {confirmDelete ? 'Confirmer la suppression ?' : 'Supprimer ce service'}
      </button>
    </div>
  ) : null

  return (
    <FormModal title={title} onSave={save} onClose={onClose} saving={saving} error={errors._save} saveLabel={saveLabel} footerExtra={deleteSection}>
      <div>
        <input className="input" placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        {errors.name && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.name}</p>}
      </div>
      <div>
        <input className="input" type="number" placeholder="Durée (minutes)" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
        {errors.duration_minutes && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.duration_minutes}</p>}
      </div>
      <div>
        <input className="input" type="number" placeholder="Prix (DA)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        {errors.price && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.price}</p>}
      </div>
      <div>
        <textarea className="input" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{resize:'vertical'}} />
      </div>
      <div className="flex items-center gap-2">
        <div className={`toggle ${form.is_active ? 'on' : ''}`} onClick={() => setForm({ ...form, is_active: !form.is_active })} />
        <span className="text-sm text-muted">{form.is_active ? 'Actif' : 'Inactif'}</span>
      </div>
    </FormModal>
  )
}

function EditAvailabilityModal({ availability, onSave, onClose }) {
  const [form, setForm] = useState({
    day_of_week: availability?.day_of_week ?? 0,
    start_time: availability?.start_time || '09:00',
    end_time: availability?.end_time || '12:00',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const v = validateAvailabilityForm(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSaving(true)
    try {
      await onSave(availability?.id, form)
      onClose()
    } catch (e) {
      setErrors({ _save: e.message || 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  const title = availability ? 'Modifier la plage' : 'Nouvelle plage'

  return (
    <FormModal title={title} onSave={save} onClose={onClose} saving={saving} error={errors._save}>
      <select className="input" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: parseInt(e.target.value) })}>
        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
      </select>
      <div>
        <label className="text-sm text-muted">Début</label>
        <input className="input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        {errors.start_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.start_time}</p>}
      </div>
      <div>
        <label className="text-sm text-muted">Fin</label>
        <input className="input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
        {errors.end_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.end_time}</p>}
      </div>
    </FormModal>
  )
}

function EditOverrideModal({ override, onSave, onClose }) {
  const [form, setForm] = useState({
    override_date: override?.override_date || '',
    start_time: override?.start_time || '',
    end_time: override?.end_time || '',
    is_available: override?.is_available ?? true,
    reason: override?.reason || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const v = validateOverrideForm(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSaving(true)
    try {
      await onSave(override?.id, form)
      onClose()
    } catch (e) {
      setErrors({ _save: e.message || 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  const title = override ? "Modifier l'exception" : 'Nouvelle exception'

  return (
    <FormModal title={title} onSave={save} onClose={onClose} saving={saving} error={errors._save}>
      <div>
        <input className="input" type="date" value={form.override_date} onChange={e => setForm({ ...form, override_date: e.target.value })} disabled={!!override} />
        {errors.override_date && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.override_date}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          className={`toggle ${form.is_available ? 'on' : ''}`}
          onClick={() => setForm({ ...form, is_available: !form.is_available })}
          aria-pressed={form.is_available}
          aria-label={form.is_available ? 'Indisponible' : 'Disponible'}
        />
        <span className="text-sm">{form.is_available ? 'Disponible' : 'Indisponible'}</span>
      </div>
      <div>
        <label className="text-sm text-muted">{form.is_available ? 'Début' : 'Début de l\'indisponibilité'}</label>
        <input className="input" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        {errors.start_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.start_time}</p>}
      </div>
      <div>
        <label className="text-sm text-muted">{form.is_available ? 'Fin' : 'Fin de l\'indisponibilité'}</label>
        <input className="input" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
        {errors.end_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.end_time}</p>}
      </div>
      <input className="input" placeholder="Raison" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
    </FormModal>
  )
}

function EditBlockedSlotModal({ blockedSlot, onSave, onClose }) {
  const [form, setForm] = useState({
    start_time: blockedSlot?.start_time ? blockedSlot.start_time.slice(0, 16) : '',
    end_time: blockedSlot?.end_time ? blockedSlot.end_time.slice(0, 16) : '',
    reason: blockedSlot?.reason || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const v = validateBlockedSlotForm(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSaving(true)
    try {
      await onSave(blockedSlot?.id, form)
      onClose()
    } catch (e) {
      setErrors({ _save: e.message || 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  const title = blockedSlot ? 'Modifier le créneau bloqué' : 'Bloquer un créneau'
  const saveLabel = blockedSlot ? 'Enregistrer' : 'Bloquer'

  return (
    <FormModal title={title} onSave={save} onClose={onClose} saving={saving} error={errors._save} saveLabel={saveLabel}>
      <div>
        <label className="text-sm text-muted">Début</label>
        <input className="input" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        {errors.start_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.start_time}</p>}
      </div>
      <div>
        <label className="text-sm text-muted">Fin</label>
        <input className="input" type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
        {errors.end_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.end_time}</p>}
      </div>
      <input className="input" placeholder="Raison (optionnel)" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
    </FormModal>
  )
}

function EditAppointmentModal({ appointment, onSave, onClose }) {
  const [form, setForm] = useState({
    client_name: appointment?.client_name || '',
    client_phone: appointment?.client_phone || '',
    start_time: appointment?.start_time ? appointment.start_time.slice(0, 16) : '',
    notes: appointment?.notes || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const v = validateAppointmentForm(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSaving(true)
    try {
      await onSave(appointment.id, {
        client_name: form.client_name.trim(),
        client_phone: form.client_phone.trim(),
        start_time: form.start_time ? new Date(form.start_time).toISOString() : undefined,
        notes: form.notes,
      })
      onClose()
    } catch (e) {
      setErrors({ _save: e.message || 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      title="Modifier le rendez-vous"
      subtitle={`${appointment?.service_name} — ${appointment?.start_time?.split('T')[0]}`}
      onSave={save} onClose={onClose} saving={saving} error={errors._save}
    >
      <div>
        <input className="input" placeholder="Nom du client" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
        {errors.client_name && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.client_name}</p>}
      </div>
      <div>
        <input className="input" placeholder="Téléphone" value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} />
        {errors.client_phone && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.client_phone}</p>}
      </div>
      <div>
        <label className="text-sm text-muted">Nouvelle date/heure</label>
        <input className="input" type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
        {errors.start_time && <p className="text-sm" style={{color:'var(--red)', marginTop:4}}>{errors.start_time}</p>}
      </div>
      <input className="input" placeholder="Notes (optionnel)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
    </FormModal>
  )
}

// ─── Main component ───

export default function ProviderDashboard({ onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0])
  const [services, setServices] = useState([])
  const [availabilities, setAvailabilities] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [overrides, setOverrides] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loadError, setLoadError] = useState('')
  const toast = useToast()

  // CMS settings for dynamic branding
  const [cmsSettings, setCmsSettings] = useState([])

  // Onboarding & guidance
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => sessionStorage.getItem('salon_amira_welcome_dismissed') === 'true'
  )
  const [showTour, setShowTour] = useState(false)

  const dismissWelcome = () => {
    sessionStorage.setItem('salon_amira_welcome_dismissed', 'true')
    setWelcomeDismissed(true)
  }

  const startTour = () => {
    dismissWelcome()
    setShowTour(true)
  }

  const handleTourNavigate = (tourTab) => {
    setTab(tourTab)
    setSidebarOpen(false)
  }

  // Modal states
  const [editingService, setEditingService] = useState(undefined)
  const [editingAvailability, setEditingAvailability] = useState(undefined)
  const [editingOverride, setEditingOverride] = useState(undefined)
  const [editingBlockedSlot, setEditingBlockedSlot] = useState(undefined)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [confirmDeleteAppt, setConfirmDeleteAppt] = useState(null)

  // Per-tab lazy loading — only fetch what's visible
  const loadAgenda = useCallback(() => {
    api.getAppointments({ date: apptDate }).then(setAppointments).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [apptDate])

  const loadServices = useCallback(() => {
    api.getAllServices().then(setServices).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  const loadAvailabilities = useCallback(() => {
    api.getAvailabilities().then(setAvailabilities).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  const loadBlockedSlots = useCallback(() => {
    api.getBlockedSlots().then(setBlockedSlots).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  const loadOverrides = useCallback(() => {
    api.getOverrides().then(setOverrides).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  const loadDashboard = useCallback(() => {
    api.getDashboard().then(setDashboard).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  // Load agenda on mount + when date changes
  useEffect(() => { loadAgenda() }, [loadAgenda])

  // Load CMS settings for branding
  useEffect(() => { api.adminGetSettings().then(setCmsSettings).catch(e => { if (import.meta.env.DEV) console.error(e) }) }, [])

  const salonName = cmsSettings.find(s => s.key === 'salon_name')?.value || 'Salon Amira'
  const initials = salonName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  // Load data for the active tab when switching
  useEffect(() => {
    switch (tab) {
      case 'dashboard': loadDashboard(); break
      case 'services': loadServices(); break
      case 'availabilities': loadAvailabilities(); break
      case 'blocked': loadBlockedSlots(); break
      case 'exceptions': loadOverrides(); break
    }
  }, [tab, loadServices, loadAvailabilities, loadBlockedSlots, loadOverrides, loadDashboard])

  const refresh = () => {
    switch (tab) {
      case 'dashboard': loadDashboard(); break
      case 'agenda': loadAgenda(); break
      case 'services': loadServices(); break
      case 'availabilities': loadAvailabilities(); break
      case 'blocked': loadBlockedSlots(); break
      case 'exceptions': loadOverrides(); break
    }
  }

  const handleStatus = async (id, status, clientName) => {
    try {
      await api.updateAppointmentStatus(id, status)
      toast.success(`RDV ${clientName || ''} \u2192 ${STATUS_LABELS[status]}`)
      loadAgenda()
    } catch (e) { toast.error(e.message) }
  }
  const handleCheckIn = async (id) => {
    try {
      await api.updateAppointmentStatus(id, 'confirmed')
      toast.success('✓ Cliente arrivée — RDV confirmé')
      loadDashboard()
    } catch (e) { toast.error(e.message) }
  }
  const toggleService = async (s) => {
    try {
      await api.updateService(s.id, { is_active: !s.is_active })
      toast.success(`${s.name} ${s.is_active ? 'd\u00e9sactiv\u00e9' : 'activ\u00e9'}`)
      refresh()
    } catch (e) { toast.error(e.message) }
  }

  const saveService = async (id, data) => {
    try {
      if (id) await api.updateService(id, data)
      else await api.createService(data)
      refresh()
    } catch (e) { throw e }
  }

  const deleteService = async (id, name) => {
    try {
      await api.deleteService(id)
      toast.success(`Service \u00ab ${name} \u00bb supprim\u00e9`)
      refresh()
    } catch (e) { toast.error(e.message) }
  }

  const saveAvailability = async (id, data) => {
    try {
      if (id) await api.updateAvailability(id, data)
      else await api.createAvailability(data)
      toast.success(id ? 'Plage modifi\u00e9e' : 'Plage ajout\u00e9e')
      refresh()
    } catch (e) { toast.error(e.message) }
  }

  const saveOverride = async (id, data) => {
    try {
      if (id) await api.updateOverride(id, { ...data, override_date: undefined })
      else await api.createOverride(data)
      toast.success(id ? 'Exception modifi\u00e9e' : 'Exception ajout\u00e9e')
      refresh()
    } catch (e) { toast.error(e.message) }
  }

  const saveBlockedSlot = async (id, data) => {
    const payload = {
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      reason: data.reason,
    }
    try {
      if (id) await api.updateBlockedSlot(id, payload)
      else await api.createBlockedSlot(payload)
      toast.success(id ? 'Cr\u00e9neau modifi\u00e9' : 'Cr\u00e9neau bloqu\u00e9')
      refresh()
    } catch (e) { toast.error(e.message) }
  }

  const saveAppointment = async (id, data) => {
    try {
      await api.updateAppointment(id, data)
      toast.success('Rendez-vous modifi\u00e9')
      refresh()
      setEditingAppointment(null)
    } catch (e) { toast.error(e.message) }
  }

  const deleteAppointment = async (id, name) => {
    try {
      await api.deleteAppointment(id)
      toast.success(`RDV de ${name || 'cliente'} supprim\u00e9`)
      setConfirmDeleteAppt(null)
      refresh()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="admin-layout">
      {/* ═══ TOPBAR ═══ */}
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="admin-brand-icon">{initials}</span>
          <span className="admin-brand-text">{salonName}</span>
        </div>
        <div className="admin-topbar-spacer" />
        <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu" aria-expanded={sidebarOpen}>
          <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${sidebarOpen ? 'open' : ''}`} />
        </button>
      </header>

      <div className="admin-body">
        {/* Overlay — mobile only */}
        {sidebarOpen && <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ═══ SIDEBAR ═══ */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="admin-sidebar-header">
            <span className="sidebar-title" style={{ marginBottom: 0 }}>Navigation</span>
            <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}
              aria-label="Fermer le menu">×</button>
          </div>
          <nav className="admin-sidebar-nav">
            {TABS.map(t => (
              <a key={t.key} role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && (setTab(t.key), setSidebarOpen(false))}
                className={`sidebar-link ${tab === t.key ? 'active' : ''}`}
                onClick={() => { setTab(t.key); setSidebarOpen(false) }}>
                {t.label}
              </a>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <div className="admin-sidebar-stats">
              <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Aujourd'hui</div>
              <div className="font-bold" style={{ fontSize: 16, fontFamily: 'var(--font-display)' }}>
                {new Date(apptDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div><span className="font-bold" style={{ fontSize: 18 }}>{dashboard?.today?.total_count ?? '...'}</span> <span className="text-muted">RDV</span></div>
            </div>
            <a role="button" className="sidebar-link" style={{ color: 'var(--accent)' }}
              onClick={() => { setShowTour(true); setSidebarOpen(false) }}>
              🗺️ Visite guidée
            </a>
            <a href="/" className="sidebar-link"
              onClick={e => { e.preventDefault(); window.location.href = '/' }}>
              ← Retour au site
            </a>
            <a role="button" className="sidebar-link" style={{ color: 'var(--red)' }}
              onClick={onLogout}>
              Déconnexion
            </a>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <section className="admin-content">
          {/* Welcome banner — first visit */}
          {!welcomeDismissed && (
            <div className="welcome-banner">
              <div className="welcome-banner-icon">🌸</div>
              <div className="welcome-banner-content">
                <div className="welcome-banner-title">Bienvenue dans votre espace de gestion</div>
                <div className="welcome-banner-text">
                  Vous pouvez gérer vos rendez-vous, vos prestations, vos disponibilités et bien plus.
                  Si c'est votre première visite, nous vous recommandons la visite guidée.
                </div>
                <div className="welcome-banner-actions">
                  <button className="btn btn-primary btn-sm" onClick={startTour}>
                    Commencer la visite guidée
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={dismissWelcome}>
                    Plus tard
                  </button>
                </div>
              </div>
              <button className="welcome-banner-close" onClick={dismissWelcome} aria-label="Fermer">
                ✕
              </button>
            </div>
          )}

          {tab === 'dashboard' && (
            <div id="section-dashboard">
              <Dashboard data={dashboard} onNavigate={(t) => setTab(t)} onCheckIn={handleCheckIn} />
            </div>
          )}

          {tab === 'agenda' && (
            <div className="card">
              <div className="agenda-header mb-6">
                <div>
                  <h2 className="font-bold" id="section-agenda" style={{ fontSize: 20 }}>Agenda — {new Date(apptDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</h2>
                  <p className="section-help">{SECTION_HELP.agenda}</p>
                </div>
                <Calendar selected={apptDate} onSelect={setApptDate} />
              </div>
              <div className="space-y-1">
                {appointments.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">{EMPTY_STATES.agenda.icon}</div>
                    <div className="empty-state-title">{EMPTY_STATES.agenda.title}</div>
                    <div className="empty-state-text">{EMPTY_STATES.agenda.text}</div>
                  </div>
                )}
                {appointments.map(a => (
                  <div key={a.id} className="agenda-slot">
                    <div className="agenda-slot-left">
                      <span className={`badge ${BADGE_CLASS[a.service_name] || 'badge-rose'}`}>{a.service_name}</span>
                      <span className="agenda-time">{a.start_time?.split('T')[1]?.substring(0,5)} – {a.end_time?.split('T')[1]?.substring(0,5)}</span>
                      <span className="agenda-client">{a.client_name}</span>
                    </div>
                    <div className="agenda-slot-actions">
                      <label htmlFor={`status-${a.id}`} className="sr-only">Statut du RDV</label>
                      <select id={`status-${a.id}`} className="badge-select" value={a.status} onChange={e => handleStatus(a.id, e.target.value, a.client_name)} title="Changer le statut de ce rendez-vous">
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </select>
                      <button className="btn btn-ghost btn-sm" data-tooltip="Modifier le nom, téléphone ou la date" onClick={() => setEditingAppointment(a)}>Modifier</button>
                      {confirmDeleteAppt === a.id ? (
                        <div className="flex gap-1 items-center">
                          <div>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteAppointment(a.id, a.client_name)}>Confirmer la suppression</button>
                            <p className="confirm-context">Ce rendez-vous sera définitivement supprimé.</p>
                          </div>
                          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteAppt(null)}>Annuler</button>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-sm" data-tooltip="Supprimer définitivement ce rendez-vous" onClick={() => setConfirmDeleteAppt(a.id)}>Supprimer</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn btn-ghost btn-sm" data-tooltip="Bloquer une plage horaire" onClick={() => setEditingBlockedSlot(null)}>Bloquer un créneau</button>
                <button className="btn btn-ghost btn-sm" data-tooltip="Ajouter une exception de date" onClick={() => setEditingOverride(null)}>Ajouter exception</button>
              </div>
            </div>
          )}

          {tab === 'services' && (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="font-bold" id="section-services" style={{ fontSize: 20 }}>Services</h2>
                  <p className="section-help">{SECTION_HELP.services}</p>
                </div>
                <button className="btn btn-primary btn-sm" data-tooltip="Créer une nouvelle prestation" onClick={() => setEditingService(null)}>+ Ajouter</button>
              </div>
              <div className="space-y-3">
                {services.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">{EMPTY_STATES.services.icon}</div>
                    <div className="empty-state-title">{EMPTY_STATES.services.title}</div>
                    <div className="empty-state-text">{EMPTY_STATES.services.text}</div>
                  </div>
                )}
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: 'var(--body-bg)', opacity: s.is_active ? 1 : 0.55 }}>
                    <div className="flex items-center gap-4">
                      <div className="font-semibold" style={{ textDecoration: s.is_active ? 'none' : 'line-through' }}>{s.name}</div>
                      {!s.is_active && <span className="badge text-sm" style={{ background: 'var(--text-muted)', color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>Inactif</span>}
                      <div className="text-sm text-muted">{s.duration_minutes} min · {s.price} DA</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className={`toggle ${s.is_active ? 'on' : ''}`} aria-pressed={s.is_active} aria-label={s.is_active ? 'Désactiver' : 'Activer'} data-tooltip={s.is_active ? 'Désactiver cette prestation' : 'Activer cette prestation'} onClick={() => toggleService(s)} />
                      <button className="btn btn-ghost btn-sm" data-tooltip="Modifier les détails de cette prestation" onClick={() => setEditingService(s)}>Modifier</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'availabilities' && (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="font-bold" id="section-availabilities" style={{ fontSize: 20 }}>Disponibilités récurrentes</h2>
                  <p className="section-help">{SECTION_HELP.availabilities}</p>
                </div>
                <button className="btn btn-primary btn-sm" data-tooltip="Ajouter une nouvelle plage horaire" onClick={() => setEditingAvailability(null)}>+ Ajouter</button>
              </div>
              <div className="space-y-3">
                {availabilities.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">{EMPTY_STATES.availabilities.icon}</div>
                    <div className="empty-state-title">{EMPTY_STATES.availabilities.title}</div>
                    <div className="empty-state-text">{EMPTY_STATES.availabilities.text}</div>
                  </div>
                )}
                {availabilities.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: 'var(--body-bg)' }}>
                    <div><span className="font-semibold">{['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][a.day_of_week]}</span><span className="ml-4 text-muted">{a.start_time} – {a.end_time}</span></div>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" data-tooltip="Modifier cette plage" onClick={() => setEditingAvailability(a)}>Modifier</button>
                      <button className="btn btn-danger btn-sm" data-tooltip="Supprimer définitivement cette plage" onClick={async () => { try { await api.deleteAvailability(a.id); toast.success('Plage supprimée'); refresh() } catch(e) { toast.error(e.message) } }}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'blocked' && (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="font-bold" id="section-blocked" style={{ fontSize: 20 }}>Créneaux bloqués</h2>
                  <p className="section-help">{SECTION_HELP.blocked}</p>
                </div>
                <button className="btn btn-primary btn-sm" data-tooltip="Bloquer un nouveau créneau" onClick={() => setEditingBlockedSlot(null)}>+ Bloquer</button>
              </div>
              <div className="space-y-3">
                {blockedSlots.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">{EMPTY_STATES.blocked.icon}</div>
                    <div className="empty-state-title">{EMPTY_STATES.blocked.title}</div>
                    <div className="empty-state-text">{EMPTY_STATES.blocked.text}</div>
                  </div>
                )}
                {blockedSlots.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: 'var(--red-light)' }}>
                    <div>
                      <div className="font-semibold">{new Date(b.start_time).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} – {new Date(b.end_time).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      {b.reason && <div className="text-sm text-muted">{b.reason}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" data-tooltip="Modifier ce créneau bloqué" onClick={() => setEditingBlockedSlot(b)}>Modifier</button>
                      <button className="btn btn-danger btn-sm" data-tooltip="Supprimer ce blocage (le créneau redevient disponible)" onClick={async () => { try { await api.deleteBlockedSlot(b.id); toast.success('Blocage supprimé'); refresh() } catch(e) { toast.error(e.message) } }}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'exceptions' && (
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="font-bold" id="section-exceptions" style={{ fontSize: 20 }}>Exceptions de dates</h2>
                  <p className="section-help">{SECTION_HELP.exceptions}</p>
                </div>
                <button className="btn btn-primary btn-sm" data-tooltip="Ajouter une exception (jour férié, vacances...)" onClick={() => setEditingOverride(null)}>+ Ajouter</button>
              </div>
              <div className="space-y-3">
                {overrides.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">{EMPTY_STATES.exceptions.icon}</div>
                    <div className="empty-state-title">{EMPTY_STATES.exceptions.title}</div>
                    <div className="empty-state-text">{EMPTY_STATES.exceptions.text}</div>
                  </div>
                )}
                {overrides.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-4" style={{ borderRadius: 'var(--radius)', background: o.is_available ? 'var(--green-light)' : 'var(--red-light)' }}>
                    <div>
                      <div className="font-semibold">{new Date(o.override_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}{o.start_time ? ` — ${o.start_time} à ${o.end_time}` : ' — Journée complète'}</div>
                      <div className="text-sm text-muted">{o.is_available ? 'Disponible' : 'Indisponible'}{o.reason ? ` · ${o.reason}` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-ghost btn-sm" data-tooltip="Modifier cette exception" onClick={() => setEditingOverride(o)}>Modifier</button>
                      <button className="btn btn-danger btn-sm" data-tooltip="Supprimer cette exception (les horaires habituels reprennent)" onClick={async () => { try { await api.deleteOverride(o.id); toast.success('Exception supprimée'); refresh() } catch(e) { toast.error(e.message) } }}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="card">
              <h2 className="font-bold mb-2" id="section-analytics" style={{ fontSize: 20 }}>Statistiques</h2>
              <p className="section-help">{SECTION_HELP.analytics}</p>
              <Suspense fallback={<div className="text-center py-8">Chargement des analytics...</div>}>
                <AnalyticsDashboard />
              </Suspense>
            </div>
          )}

          {/* ── CMS: Paramètres ── */}
          {tab === 'cms-settings' && (
            <SettingsEditor />
          )}
        </section>
      </div>

      {/* Modals */}
      {editingService !== undefined && <EditServiceModal service={editingService} onSave={saveService} onDelete={deleteService} onClose={() => setEditingService(undefined)} />}
      {editingAvailability !== undefined && <EditAvailabilityModal availability={editingAvailability} onSave={saveAvailability} onClose={() => setEditingAvailability(undefined)} />}
      {editingOverride !== undefined && <EditOverrideModal override={editingOverride} onSave={saveOverride} onClose={() => setEditingOverride(undefined)} />}
      {editingBlockedSlot !== undefined && <EditBlockedSlotModal blockedSlot={editingBlockedSlot} onSave={saveBlockedSlot} onClose={() => setEditingBlockedSlot(undefined)} />}
      {editingAppointment && <EditAppointmentModal appointment={editingAppointment} onSave={saveAppointment} onClose={() => setEditingAppointment(null)} />}

      {/* Onboarding tour */}
      <OnboardingTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onNavigate={handleTourNavigate}
      />
    </div>
  )
}


function SettingsEditor() {
  const toast = useToast()
  const [settings, setSettings] = useState([])
  const [edited, setEdited] = useState({})
  const [saving, setSaving] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.adminGetSettings().then(d => { setSettings(d); setLoading(false) }).catch(e => { if (import.meta.env.DEV) console.error('settings load failed', e); setLoading(false) }) }, [])

  const handleSave = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      await api.updateSetting(key, edited[key])
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: edited[key] } : s))
      setEdited(prev => { const n = { ...prev }; delete n[key]; return n })
      toast.success('Paramètre enregistré')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  if (loading) return <div className="card text-center text-muted py-8">Chargement...</div>

  const LABELS = {
    salon_name: 'Nom du salon',
    salon_subtitle: 'Sous-titre',
    salon_address: 'Adresse',
    salon_phone: 'Téléphone',
    salon_hours_weekday: "Jours d'ouverture",
    salon_hours_time: 'Horaires',
    landing_hero_title: 'Titre Hero',
    landing_hero_subtitle: 'Sous-titre Hero',
    landing_hero_badge: 'Badge Hero',
  }

  const DESCRIPTION = {
    salon_name: 'Le nom affiché dans la barre de navigation et le pied de page.',
    salon_subtitle: 'Un court texte sous le nom du salon.',
    salon_address: "L'adresse complète visible par les clientes.",
    salon_phone: 'Le numéro de téléphone du salon.',
    salon_hours_weekday: "Les jours d'ouverture affichés (ex: Lun-Sam).",
    salon_hours_time: 'Les horaires affichés (ex: 9h00 – 18h00).',
    landing_hero_title: 'Le grand titre sur la page d\'accueil.',
    landing_hero_subtitle: 'Le texte sous le titre principal.',
    landing_hero_badge: 'Le petit badge en haut de la page d\'accueil.',
  }

  return (
    <div className="card">
      <h2 className="font-bold mb-2" id="section-settings" style={{ fontSize: 20 }}>⚙️ Paramètres du salon</h2>
      <p className="section-help">{SECTION_HELP['cms-settings']}</p>
      <div className="cms-settings-grid">
        {settings.map(s => (
          <div key={s.key} className="cms-settings-row">
            <label>
              {LABELS[s.key] || s.key}
              <span className="info-icon" data-info={DESCRIPTION[s.key] || 'Modifiez ce paramètre'}>?</span>
            </label>
            <input
              className="input"
              value={edited[s.key] !== undefined ? edited[s.key] : s.value}
              onChange={e => setEdited(prev => ({ ...prev, [s.key]: e.target.value }))}
            />
            <button
              className="btn btn-primary btn-sm"
              data-tooltip-bottom="Enregistrer ce paramètre"
              disabled={edited[s.key] === undefined || edited[s.key] === s.value || saving[s.key]}
              onClick={() => handleSave(s.key)}
            >
              {saving[s.key] ? '...' : '✓'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
