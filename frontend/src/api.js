const BASE = '/api'

function getToken() {
  try { return sessionStorage.getItem('admin_token') } catch { return null }
}

function setToken(t) {
  try { sessionStorage.setItem('admin_token', t) } catch {}
}

function clearToken() {
  try { sessionStorage.removeItem('admin_token') } catch {}
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
    throw new Error(err.detail || 'Erreur serveur')
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

  // Slots
  getSlots: (date, serviceId) => request(`/slots?date=${date}&service_id=${serviceId}`),
  getWeekSlots: (startDate, serviceId) => request(`/slots/week?start_date=${startDate}&service_id=${serviceId}`),

  // Appointments
  createAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  getAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/appointments${qs ? '?' + qs : ''}`)
  },
  getAppointment: (id) => request(`/appointments/${id}`),
  updateAppointmentStatus: (id, status) =>
    request(`/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAppointmentPdfUrl: (id) => `${BASE}/appointments/${id}/pdf`,

  // Availabilities
  getAvailabilities: () => request('/availabilities'),
  createAvailability: (data) => request('/availabilities', { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailability: (id) => request(`/availabilities/${id}`, { method: 'DELETE' }),

  // Overrides
  getOverrides: () => request('/overrides'),
  createOverride: (data) => request('/overrides', { method: 'POST', body: JSON.stringify(data) }),
  deleteOverride: (id) => request(`/overrides/${id}`, { method: 'DELETE' }),

  // Blocked slots
  getBlockedSlots: () => request('/blocked-slots'),
  createBlockedSlot: (data) => request('/blocked-slots', { method: 'POST', body: JSON.stringify(data) }),
  deleteBlockedSlot: (id) => request(`/blocked-slots/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: () => request('/analytics'),

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
}
