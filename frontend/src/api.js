const BASE = '/api'

function getToken() {
  try { return sessionStorage.getItem('admin_token') } catch { return null }
}

function setToken(token) {
  try { sessionStorage.setItem('admin_token', token) } catch {}
}

function clearToken() {
  try { sessionStorage.removeItem('admin_token') } catch {}
}

// ─── Translate Pydantic validation errors → French ───

const FIELD_LABELS = {
  name: 'Nom',
  start_time: 'Heure de début',
  end_time: 'Heure de fin',
  duration_minutes: 'Durée',
  price: 'Prix',
  client_name: 'Nom du client',
  client_phone: 'Téléphone',
  day_of_week: 'Jour',
  override_date: 'Date',
  password: 'Mot de passe',
  status: 'Statut',
  reason: 'Raison',
  color: 'Couleur',
  notes: 'Notes',
  value: 'Valeur',
  service_id: 'Service',
  is_active: 'Actif',
  is_available: 'Disponible',
}

function translateError(err) {
  const msg = err.msg || ''
  const field = (err.loc || []).slice(-1)[0] || ''
  const ctx = err.ctx || {}
  const label = FIELD_LABELS[field] || field

  switch (err.type) {
    case 'string_pattern_mismatch':
      if (field === 'start_time' || field === 'end_time') return `${label} : format HH:MM requis (ex: 09:00)`
      if (field === 'status') return `${label} : valeur invalide`
      if (field === 'client_phone') return `${label} : numéro invalide (ex: 0550 12 34 56)`
      if (field === 'client_name') return `${label} : caractères non autorisés (< >)`
      return `${label} : format invalide`

    case 'string_too_short':
      return `${label} : ${ctx.min_length || 1} caractère${(ctx.min_length || 1) > 1 ? 's' : ''} minimum`

    case 'string_too_long':
      return `${label} : ${ctx.max_length || 100} caractères maximum`

    case 'greater_than':
      return `${label} : doit être supérieur à ${ctx.gt != null ? ctx.gt : 0}`

    case 'greater_than_equal':
      return `${label} : doit être supérieur ou égal à ${ctx.ge != null ? ctx.ge : 0}`

    case 'less_than':
      return `${label} : doit être inférieur à ${ctx.lt != null ? ctx.lt : 0}`

    case 'less_than_equal':
      return `${label} : doit être inférieur ou égal à ${ctx.le != null ? ctx.le : 0}`

    case 'int_type':
    case 'float_type':
    case 'int_parsing':
      return `${label} : doit être un nombre`

    case 'string_type':
      return `${label} : doit être du texte`

    case 'bool_type':
    case 'bool_parsing':
      return `${label} : valeur invalide`

    case 'date_from_datetime_parsing':
    case 'datetime_parsing':
      return `${label} : date invalide`

    case 'missing':
      return `${label} : ce champ est requis`

    case 'value_error':
      // model_validator errors — already in French from backend
      return msg

    case 'too_short':
      return `${label} : ${ctx.min_length || 1} élément${(ctx.min_length || 1) > 1 ? 's' : ''} minimum`

    case 'too_long':
      return `${label} : ${ctx.max_length || 100} éléments maximum`

    default:
      return msg
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    headers,
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    let message = 'Erreur serveur'
    if (Array.isArray(err.detail)) {
      // FastAPI 422 validation errors: [{loc, msg, type, ctx}, ...]
      message = err.detail.map(e => translateError(e)).join(' · ')
    } else if (typeof err.detail === 'string') {
      message = err.detail
    }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  // Services
  getServices: () => request('/services'),
  getAllServices: () => request('/services/all'),
  createService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Slots — accepts single service_id or multiple service_ids (array)
  getSlots: (date, serviceIds) => {
    if (Array.isArray(serviceIds) && serviceIds.length > 1) {
      return request(`/slots?date=${date}&service_ids=${serviceIds.join(',')}`)
    }
    const sid = Array.isArray(serviceIds) ? serviceIds[0] : serviceIds
    return request(`/slots?date=${date}&service_id=${sid}`)
  },

  // Next available day — finds the closest day with slots
  getNextSlots: (serviceIds, fromDate) => {
    const from = fromDate || new Date().toISOString().split('T')[0]
    return request(`/slots/next?service_ids=${serviceIds.join(',')}&from_date=${from}`)
  },

  // Month availability — returns has_slots / slot_count per day for calendar red-dot indicator
  getMonthAvailability: (month, serviceIds) =>
    request(`/slots/month?month=${month}&service_ids=${serviceIds.join(',')}`),

  // Appointments
  createAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  getAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/appointments${qs ? '?' + qs : ''}`)
  },
  getAppointment: (id) => request(`/appointments/${id}`),
  updateAppointmentStatus: (id, status) =>
    request(`/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updateAppointment: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  getAppointmentPdfUrl: (id) => `${BASE}/appointments/${id}/pdf`,

  // Availabilities
  getAvailabilities: () => request('/availabilities'),
  createAvailability: (data) => request('/availabilities', { method: 'POST', body: JSON.stringify(data) }),
  updateAvailability: (id, data) => request(`/availabilities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAvailability: (id) => request(`/availabilities/${id}`, { method: 'DELETE' }),

  // Overrides
  getOverrides: () => request('/overrides'),
  createOverride: (data) => request('/overrides', { method: 'POST', body: JSON.stringify(data) }),
  updateOverride: (id, data) => request(`/overrides/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOverride: (id) => request(`/overrides/${id}`, { method: 'DELETE' }),

  // Blocked slots
  getBlockedSlots: () => request('/blocked-slots'),
  createBlockedSlot: (data) => request('/blocked-slots', { method: 'POST', body: JSON.stringify(data) }),
  updateBlockedSlot: (id, data) => request(`/blocked-slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBlockedSlot: (id) => request(`/blocked-slots/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: (startDate, endDate) => {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    const qs = params.toString()
    return request(`/analytics${qs ? '?' + qs : ''}`)
  },

  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Admin auth
  login: async (password) => {
    const data = await request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
    setToken(data.token)
    return data
  },
  logout: async () => {
    try { await request('/admin/logout', { method: 'POST' }) } catch {}
    clearToken()
  },
  checkAuth: () => request('/admin/check'),
  isAuthenticated: () => !!getToken(),

  // Settings (mini-CMS)
  getSettings: () => request('/settings'),
  adminGetSettings: () => request('/admin/settings'),
  updateSetting: (key, value) => request(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
}
