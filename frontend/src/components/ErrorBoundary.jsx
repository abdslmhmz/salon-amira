import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-8" style={{ padding: '48px 24px' }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            borderRadius: '50%', background: 'var(--red-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="var(--red)" strokeWidth="2" />
              <line x1="9" y1="9" x2="19" y2="19" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
              <line x1="19" y1="9" x2="9" y2="19" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Une erreur est survenue
          </h2>
          <p className="text-muted text-sm" style={{ marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            {this.state.error?.message || 'Un problème inattendu est arrivé. Veuillez réessayer.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleRetry}>
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
