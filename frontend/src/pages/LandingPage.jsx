import { useState, useEffect } from 'react'
import { api } from '../api'
import { formatPrice } from '../utils'
import { HeroIllustrations, ServiceIcon, SalonChairIcon } from '../components/Illustrations'
import { ServiceIllustration } from '../components/ServiceIllustration'

const whyItems = [
  { icon: 'spa',  title: 'Expertise',     desc: 'Des coiffeuses et esthéticiennes qui se forment régulièrement aux dernières techniques.' },
  { icon: 'face', title: 'Produits doux',  desc: 'On choisit des produits adaptés à chaque type de peau et de cheveu, sans agresser.' },
  { icon: 'nail', title: 'Réservation facile', desc: 'Vous réservez en ligne en 2 minutes. Pas de compte à créer, pas d\'appel.' },
  { icon: 'makeup', title: 'Ambiance cocooning', desc: 'Un endroit calme et élégant, pensé pour que vous déconnectiez vraiment.' },
]

const steps = [
  { num: '01', title: 'Choisissez votre service', desc: 'Parcourez nos prestations et sélectionnez celle qui vous correspond.' },
  { num: '02', title: 'Choisissez un créneau',    desc: 'Notre calendrier vous montre les disponibilités en temps réel.' },
  { num: '03', title: 'Confirmez vos infos',       desc: 'Nom, téléphone — et c\'est réservé. Aucun paiement en ligne.' },
  { num: '04', title: 'Présentez-vous au salon',   desc: 'Vous recevez une confirmation. Le jour J, on s\'occupe de tout.' },
]

const testimonials = [
  { stars: 5, text: '« Un accueil chaleureux et un travail impeccable. Amira a su comprendre exactement ce que je voulais pour ma coloration. Je recommande les yeux fermés. »', author: 'Sarah B.' },
  { stars: 5, text: '« Le meilleur soin visage que j\'aie eu à Alger. Produits de qualité, ambiance apaisante, résultat visible dès la première séance. »', author: 'Amina K.' },
  { stars: 5, text: '« Réservation en ligne hyper simple, pas d\'attente. Le salon est propre, élégant, et ma manucure a tenu deux semaines. Je reviens chaque mois. »', author: 'Nadia M.' },
]

export default function LandingPage({ onBookNow }) {
  const [services, setServices] = useState([])
  const [settings, setSettings] = useState({})
  const [showAllServices, setShowAllServices] = useState(false)
  const [servicesPerPage, setServicesPerPage] = useState(12) // 4 rows × 3 cols default

  useEffect(() => {
    const update = () => setServicesPerPage(window.innerWidth < 640 ? 4 : 12)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    api.getServices().then(setServices).catch(e => { if (import.meta.env.DEV) console.error(e) })
    api.getSettings().then(setSettings).catch(e => { if (import.meta.env.DEV) console.error(e) })
  }, [])

  const setting = (key, fallback = '') => settings[key] || fallback
  const activeServices = services.filter(sv => sv.is_active)
  const visibleServices = showAllServices ? activeServices : activeServices.slice(0, servicesPerPage)

  return (
    <div>

      {/* ═══════════════ HERO ═══════════════ */}
      <div className="landing-hero">
        <HeroIllustrations />

        <div className="landing-hero-content">
          <div className="landing-badge">{setting('landing_hero_badge', '✨ Alger Centre · Beauté Féminine')}</div>
          <h1>
            {setting('landing_hero_title', 'Salon Amira')}
          </h1>
          <p>
            {setting('landing_hero_subtitle', 'Un salon intime au cœur d\'Alger, où chaque geste est pensé pour révéler votre éclat naturel.')}
          </p>
          <div className="landing-hero-actions">
            <button className="btn btn-primary" onClick={onBookNow} style={{padding:'14px 28px',fontSize:16}}>
              Prendre rendez-vous →
            </button>
            <a href="#services" className="btn btn-ghost" style={{padding:'14px 28px',fontSize:16}}>
              Nos prestations
            </a>
          </div>
          <div className="landing-hero-stats">
            <div><strong>{activeServices.length}</strong> prestations</div>
            <div><strong>{setting('salon_hours_weekday', 'Lun–Sam')}</strong> {setting('salon_hours_time', '9h–18h')}</div>
            <div><strong>{setting('salon_address', 'Alger Centre').split(',')[0]}</strong></div>
          </div>
        </div>
      </div>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <div style={{background:'var(--surface)', padding:'var(--space-section) clamp(16px, 4vw, 24px)'}}>
        <div className="landing-section" style={{padding:0, maxWidth:'100%'}}>
          <p className="landing-section-label">Comment ça marche</p>
          <h2 className="landing-section-title">Réservez en 4 étapes</h2>
          <div className="landing-steps">
            {steps.map(s => (
              <div key={s.num} className="landing-step">
                <div className="landing-step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ SERVICES ═══════════════ */}
      <div id="services" className="landing-section">
        <p className="landing-section-label">Nos prestations</p>
        <h2 className="landing-section-title">Des soins pensés pour vous</h2>
        <p className="landing-section-desc">
          {activeServices.length} services essentiels, réalisés avec des produits de qualité
          professionnelle dans un cadre apaisant.
        </p>
        <div className="landing-services-grid">
          {visibleServices.map(sv => (
            <div key={sv.id} className="landing-service-card">
              <div className="landing-service-icon">
                <ServiceIllustration serviceName={sv.name} size={72} />
              </div>
              <h3 className="landing-service-name">{sv.name}</h3>
              <p className="landing-service-desc">{sv.description || ''}</p>
              <div className="landing-service-footer">
                <span className="landing-service-meta">⏱ {sv.duration_minutes} min</span>
                <span className="landing-service-price">{formatPrice(sv.price)}</span>
              </div>
            </div>
          ))}
        </div>
        {activeServices.length > servicesPerPage && (
          <div className="text-center mt-6">
            <button className="btn btn-ghost" onClick={() => setShowAllServices(!showAllServices)}>
              {showAllServices ? 'Voir moins ↑' : `Voir plus (${activeServices.length - servicesPerPage} autres prestations) ↓`}
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════ WHY US ═══════════════ */}
      <div className="landing-section">
        <p className="landing-section-label">Pourquoi {setting('salon_name', 'Salon Amira')}</p>
        <h2 className="landing-section-title">Un salon à votre image</h2>
        <div className="landing-why-grid">
          {whyItems.map(w => (
            <div key={w.title} className="landing-why-card">
              <div className="landing-why-icon">
                <ServiceIcon name={w.icon} size={22} />
              </div>
              <h3 className="landing-why-title">{w.title}</h3>
              <p className="landing-why-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ ABOUT ═══════════════ */}
      <div style={{background:'var(--surface)', padding:'var(--space-section) clamp(16px, 4vw, 24px)'}}>
        <div className="landing-section landing-about-grid" style={{padding:0, maxWidth:'100%'}}>
          <div style={{position:'relative', height:360, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{
              width:'100%', height:'100%', borderRadius:'var(--radius-lg)',
              background:'linear-gradient(135deg, var(--rose-light), var(--body-bg))',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <SalonChairIcon size={160} />
            </div>
            <div style={{position:'absolute', width:70, height:70, borderRadius:'50%', background:'var(--rose)', opacity:0.06, top:16, right:32}} />
            <div style={{position:'absolute', width:100, height:100, borderRadius:'50%', background:'var(--rose)', opacity:0.04, bottom:32, left:16}} />
          </div>
          <div>
            <p className="landing-section-label">À propos</p>
            <h2 className="landing-section-title">L'excellence à {setting('salon_address', 'Alger Centre').split(',')[0] || 'Alger Centre'}</h2>
            <p style={{color:'var(--text-secondary)', fontSize:'1.05rem', marginBottom:16, lineHeight:1.7}}>
              {setting('salon_name', 'Salon Amira')} est né d'une passion pour la beauté authentique.
              Situé au cœur de {setting('salon_address', 'Alger Centre').split(',')[0] || 'Alger Centre'}, nous accueillons chaque cliente
              dans un espace chaleureux et apaisant, loin de l'agitation.
            </p>
            <p style={{color:'var(--text-secondary)', fontSize:'1.05rem', marginBottom:28, lineHeight:1.7}}>
              Notre équipe de professionnelles qualifiées vous accompagne
              avec écoute et précision — parce que chaque femme mérite de
              se sentir belle.
            </p>
            <div className="landing-about-stats">
              <div>
                <div style={{fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'var(--rose)', lineHeight:1}}>{activeServices.length}</div>
                <div style={{fontSize:'0.82rem', color:'var(--text-muted)'}}>Services premium</div>
              </div>
              <div>
                <div style={{fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'var(--rose)', lineHeight:1}}>8+</div>
                <div style={{fontSize:'0.82rem', color:'var(--text-muted)'}}>Ans d'expérience</div>
              </div>
              <div>
                <div style={{fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'var(--rose)', lineHeight:1}}>3K+</div>
                <div style={{fontSize:'0.82rem', color:'var(--text-muted)'}}>Clientes satisfaites</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <div className="landing-section">
        <p className="landing-section-label">Témoignages</p>
        <h2 className="landing-section-title">Ce que disent nos clientes</h2>
        <div className="landing-services-grid" style={{marginTop:36}}>
          {testimonials.map((t, i) => (
            <div key={i} className="landing-service-card">
              <p style={{color:'var(--rose)', marginBottom:10, letterSpacing:2, fontSize:13}}>
                {'★'.repeat(t.stars)}
              </p>
              <p style={{fontStyle:'italic', fontSize:'0.9rem', lineHeight:1.7, marginBottom:14}}>
                {t.text}
              </p>
              <p style={{fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:500}}>
                — {t.author}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ CTA ═══════════════ */}
      <div className="landing-cta">
        <div className="landing-cta-card">
          <h2 className="landing-cta-title">Prête à vous faire chouchouter ?</h2>
          <p className="landing-cta-desc">
            Réservez votre créneau en ligne en moins de 2 minutes.
            Aucun paiement en ligne — vous réglez au salon.
          </p>
          <button className="btn btn-light" onClick={onBookNow} style={{padding:'14px 32px',fontSize:15}}>
            Je réserve mon créneau →
          </button>
        </div>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div className="landing-footer">
        <div>
          <strong>{setting('salon_name', 'Salon Amira')}</strong><br />
          {setting('salon_address', 'Alger Centre')} · {setting('salon_hours_weekday', 'Lun–Sam')} {setting('salon_hours_time', '9h00–18h00')}
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)'}}>
          © 2026 {setting('salon_name', 'Salon Amira')} — Beauté & Bien-être
        </div>
      </div>
    </div>
  )
}
