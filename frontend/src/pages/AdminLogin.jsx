import { useState } from 'react'
import { api } from '../api'

export default function AdminLogin({ onSuccess }) {
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onSuccess()}>
      <div className="modal">
        <h3 className="font-bold mb-2" style={{fontSize:18}}>Accès administrateur</h3>
        <p className="text-muted text-sm mb-4">Espace réservé au personnel du salon</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="alert alert-warning" style={{marginBottom:0}}>{error}</div>}
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
