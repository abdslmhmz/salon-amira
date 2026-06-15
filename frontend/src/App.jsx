import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import ClientBooking from './pages/ClientBooking'
import ProviderDashboard from './pages/ProviderDashboard'
import LookupAppointment from './pages/LookupAppointment'
import AdminLogin from './pages/AdminLogin'
import { api } from './api'

const PUBLIC_TABS = [
  { key: 'landing', label: 'Accueil', component: LandingPage },
  { key: 'client', label: 'Réserver', component: ClientBooking },
]

const ADMIN_TABS = [
  { key: 'presta', label: 'Dashboard', component: ProviderDashboard },
  { key: 'lookup', label: 'Retrouver RDV', component: LookupAppointment },
]

export default function App() {
  const [tab, setTab] = useState('landing')
  const [authenticated, setAuthenticated] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (api.isAuthenticated()) {
      api.checkAuth()
        .then(() => setAuthenticated(true))
        .catch(() => {})
    }
  }, [])

  const handleLogin = () => {
    setAuthenticated(true)
    setShowLogin(false)
    setTab('presta')
  }

  const handleLogout = async () => {
    await api.logout()
    setAuthenticated(false)
    setTab('landing')
  }

  const goToBooking = () => setTab('client')

  const selectTab = (key) => {
    setTab(key)
    setMobileMenuOpen(false)
  }

  const tabs = [
    ...PUBLIC_TABS,
    ...(authenticated ? ADMIN_TABS : []),
  ]

  const Active = tabs.find(t => t.key === tab)?.component

  return (
    <div className="app">
      {/* ── Navigation ── */}
      <nav className="topnav">
        <div className="topnav-brand">
          <div className="topnav-logo">SA</div>
          <div>
            <div className="topnav-title">Salon Amira</div>
            <div className="topnav-sub">Beauté & Bien-être — Alger Centre</div>
          </div>
        </div>

        {/* Desktop tabs — hidden on mobile */}
        <div className="topnav-tabs topnav-desktop">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`topnav-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => selectTab(t.key)}
            >
              {t.label}
            </button>
          ))}
          {!authenticated ? (
            <button className="topnav-tab" onClick={() => setShowLogin(true)}>
              Admin
            </button>
          ) : (
            <button className="topnav-tab" onClick={handleLogout} style={{color:'var(--red)'}}>
              Déconnexion
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </nav>

      {/* Mobile slide-out drawer */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-drawer-header">
              <div className="topnav-brand">
                <div className="topnav-logo">SA</div>
                <div>
                  <div className="topnav-title">Salon Amira</div>
                </div>
              </div>
              <button className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <nav className="mobile-drawer-nav">
              {tabs.map(t => (
                <button
                  key={t.key}
                  className={`mobile-drawer-link ${tab === t.key ? 'active' : ''}`}
                  onClick={() => selectTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
              <div className="mobile-drawer-divider" />
              {!authenticated ? (
                <button className="mobile-drawer-link" onClick={() => { setShowLogin(true); setMobileMenuOpen(false) }}>
                  Administration
                </button>
              ) : (
                <button className="mobile-drawer-link" onClick={() => { handleLogout(); setMobileMenuOpen(false) }} style={{color:'var(--red)'}}>
                  Déconnexion
                </button>
              )}
            </nav>
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <main style={{ flex: 1, padding: tab === 'landing' ? '0 24px' : '24px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {Active && (tab === 'landing' ? <Active onBookNow={goToBooking} /> : <Active />)}
      </main>

      {showLogin && <AdminLogin onSuccess={handleLogin} />}
    </div>
  )
}
