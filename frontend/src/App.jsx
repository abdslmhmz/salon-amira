import React, { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { api } from './api'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const ClientBooking = lazy(() => import('./pages/ClientBooking'))
const LookupAppointment = lazy(() => import('./pages/LookupAppointment'))
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))

// ═══════════════════════════════════════════
//  CLIENT LAYOUT — clean topnav, zero admin references
// ═══════════════════════════════════════════

function ClientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [settings, setSettings] = useState({})

  useEffect(() => {
    api.getSettings().then(setSettings).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  const salonName = settings.salon_name || 'Salon Amira'
  const initials = salonName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const links = [
    { path: '/', label: 'Accueil' },
    { path: '/reserver', label: 'Réserver' },
    { path: '/rdv', label: 'Retrouver RDV' },
  ]

  const isActive = (path) => location.pathname === path
  const closeMenu = () => setMobileMenuOpen(false)
  const select = (path) => { navigate(path); closeMenu() }

  return (
    <div className="app">
      <nav className="topnav">
        <div className="topnav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="topnav-logo">{initials}</div>
          <div>
            <div className="topnav-title">{salonName}</div>
            <div className="topnav-sub">Beauté & Bien-être — Alger Centre</div>
          </div>
        </div>

        <div className="topnav-tabs topnav-desktop">
          {links.map(l => (
            <button key={l.path} className={`topnav-tab ${isActive(l.path) ? 'active' : ''}`}
              onClick={() => select(l.path)}>{l.label}</button>
          ))}
        </div>

        <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu" aria-expanded={mobileMenuOpen}>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </nav>

      {mobileMenuOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={closeMenu} />
          <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-drawer-header">
              <div className="topnav-brand">
                <div className="topnav-logo">{initials}</div>
                <div><div className="topnav-title">{salonName}</div></div>
              </div>
              <button className="mobile-drawer-close" onClick={closeMenu} aria-label="Fermer">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              {links.map(l => (
                <button key={l.path} className={`mobile-drawer-link ${isActive(l.path) ? 'active' : ''}`}
                  onClick={() => select(l.path)}>{l.label}</button>
              ))}
            </nav>
          </div>
        </>
      )}

      <main className={location.pathname === '/' ? 'main-landing' : 'main-default'}>
        <ErrorBoundary>
          <Suspense fallback={<div className="text-center py-8">Chargement...</div>}>
            <Outlet context={{ navigate }} />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════
//  PAGE WRAPPERS — pass callbacks to pages from router context
// ═══════════════════════════════════════════

function LandingPageWrapper() {
  const navigate = useNavigate()
  return <LandingPage onBookNow={() => navigate('/reserver')} />
}

// ═══════════════════════════════════════════
//  ADMIN LAYOUT — /admin/* — auth gate + provider dashboard
// ═══════════════════════════════════════════

function AdminLayout() {
  const [auth, setAuth] = useState(null) // null=checking
  const navigate = useNavigate()

  useEffect(() => {
    if (api.isAuthenticated()) {
      api.checkAuth()
        .then(() => setAuth(true))
        .catch(e => { if (import.meta.env.DEV) console.error('auth check failed', e); api.logout().catch(err => { if (import.meta.env.DEV) console.error('logout failed', err) }); setAuth(false) })
    } else {
      setAuth(false)
    }
  }, [])

  const handleLogin = () => {
    setAuth(true)
    navigate('/admin/agenda', { replace: true })
  }

  const handleLogout = async () => {
    await api.logout()
    setAuth(false)
    navigate('/admin', { replace: true })
  }

  if (auth === null) return <div className="text-center py-8">Vérification...</div>

  if (!auth) {
    return (
      <Suspense fallback={<div className="text-center py-8">Connexion...</div>}>
        <AdminLogin onSuccess={handleLogin} standalone />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div className="text-center py-8">Chargement...</div>}>
      <ToastProvider>
        <ErrorBoundary>
          <ProviderDashboard onLogout={handleLogout} />
        </ErrorBoundary>
      </ToastProvider>
    </Suspense>
  )
}

// ═══════════════════════════════════════════
//  APP — Router root
// ═══════════════════════════════════════════

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Client-facing routes */}
        <Route element={<ClientLayout />}>
          <Route index element={<LandingPageWrapper />} />
          <Route path="reserver" element={<ClientBooking />} />
          <Route path="rdv" element={<LookupAppointment />} />
        </Route>

        {/* Admin routes — separate layout */}
        <Route path="admin/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
