import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function AdminLogin({ onSuccess, onClose, standalone }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) { setError('Mot de passe requis'); return }
    setLoading(true)
    setError('')
    try {
      await api.login(password)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  // Standalone page mode (used at /admin before login)
  if (standalone) {
    return (
      <div className="app">
        <main className="main-default" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
          <div style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div className="topnav-logo" style={{ margin: '0 auto 12px', width: 48, height: 48, fontSize: 20 }}>SA</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Salon Amira</h2>
              <p className="text-muted text-sm">Espace administrateur</p>
            </div>
            <div className="card">
              <h3 className="font-bold mb-2" style={{ fontSize: 18 }}>Connexion</h3>
              <p className="text-muted text-sm mb-4">Réservé au personnel du salon</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input className="input" type="password" placeholder="Mot de passe"
                  value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                {error && <div className="alert alert-warning" style={{ marginBottom: 0 }}>{error}</div>}
                <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
            </div>
            <p className="text-center text-muted text-sm mt-4">
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>← Retour au site</Link>
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Modal mode (legacy, used if called with onClose)
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <h3 className="font-bold mb-2" style={{ fontSize: 18 }}>Accès administrateur</h3>
        <p className="text-muted text-sm mb-4">Espace réservé au personnel du salon</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input" type="password" placeholder="Mot de passe"
            value={password} onChange={e => setPassword(e.target.value)} autoFocus />
          {error && <div className="alert alert-warning" style={{ marginBottom: 0 }}>{error}</div>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
