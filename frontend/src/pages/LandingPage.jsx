import { HeroIllustrations, ServiceIcon, SalonChairIcon } from '../components/Illustrations'

const services = [
  { icon: 'scissors', name: 'Coiffure Femme',   desc: 'Coupe, brushing et coiffage sur mesure.',       price: '2 500 DA',  duration: '45 min' },
  { icon: 'comb',     name: 'Coupe Homme',       desc: 'Coupe classique ou tendance, finition soignée.', price: '1 500 DA',  duration: '30 min' },
  { icon: 'hair',     name: 'Coloration',        desc: 'Coloration complète, mèches ou balayage.',       price: 'à partir de 4 500 DA', duration: '60–90 min' },
  { icon: 'brush',    name: 'Brushing',          desc: 'Brushing lissant ou bouclé professionnel.',      price: 'à partir de 1 800 DA', duration: '30–45 min' },
  { icon: 'face',     name: 'Soin Visage',       desc: 'Nettoyage, hydratation et masque adapté.',      price: '3 500 DA',  duration: '60 min' },
  { icon: 'makeup',   name: 'Maquillage',        desc: 'Maquillage jour, soirée ou mariage.',           price: '3 000 DA',  duration: '45 min' },
  { icon: 'nail',     name: 'Manucure',          desc: 'Pose de vernis classique ou semi-permanent.',   price: '1 500 DA',  duration: '30 min' },
]

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
  return (
    <div>

      {/* ═══════════════ HERO ═══════════════ */}
      <div className="landing-hero">
        <HeroIllustrations />

        <div className="landing-hero-content">
          <div className="landing-badge">✨ Alger Centre · Beauté Féminine</div>
          <h1>
            Votre beauté,<br />
            <span>notre art.</span>
          </h1>
          <p>
            Un salon intime au cœur d'Alger, où chaque geste est pensé pour
            révéler votre éclat naturel. Réservation en ligne, sans attente.
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
            <div><strong>7</strong> prestations</div>
            <div><strong>Lun–Sam</strong> 9h–18h</div>
            <div><strong>Alger Centre</strong></div>
          </div>
        </div>
      </div>

      {/* ═══════════════ SERVICES ═══════════════ */}
      <div id="services" className="landing-section">
        <p className="landing-section-label">Nos prestations</p>
        <h2 className="landing-section-title">Des soins pensés pour vous</h2>
        <p className="landing-section-desc">
          Sept services essentiels, réalisés avec des produits de qualité
          professionnelle dans un cadre apaisant.
        </p>
        <div className="landing-services-grid">
          {services.map(s => (
            <div key={s.name} className="landing-service-card">
              <div className="landing-service-icon">
                <ServiceIcon name={s.icon} size={26} />
              </div>
              <h3 className="landing-service-name">{s.name}</h3>
              <p className="landing-service-desc">{s.desc}</p>
              <div className="landing-service-footer">
                <span className="landing-service-meta">⏱ {s.duration}</span>
                <span className="landing-service-price">{s.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <div style={{background:'var(--surface)', padding:'80px 0'}}>
        <div className="landing-section" style={{padding:0}}>
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

      {/* ═══════════════ WHY US ═══════════════ */}
      <div className="landing-section">
        <p className="landing-section-label">Pourquoi Salon Amira</p>
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
      <div style={{background:'var(--surface)', padding:'80px 0'}}>
        <div className="landing-section" style={{padding:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'64px', alignItems:'center'}}>
          <div style={{position:'relative', height:360, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{
              width:'100%', height:'100%', borderRadius:'var(--radius-lg)',
              background:'linear-gradient(135deg, var(--rose-light), var(--body-bg))',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <SalonChairIcon size={160} />
            </div>
            {/* Floating shapes */}
            <div style={{position:'absolute', width:70, height:70, borderRadius:'50%', background:'var(--rose)', opacity:0.06, top:16, right:32}} />
            <div style={{position:'absolute', width:100, height:100, borderRadius:'50%', background:'var(--rose)', opacity:0.04, bottom:32, left:16}} />
          </div>
          <div>
            <p className="landing-section-label">À propos</p>
            <h2 className="landing-section-title">L'excellence à Alger Centre</h2>
            <p style={{color:'var(--text-secondary)', fontSize:'1.05rem', marginBottom:16, lineHeight:1.7}}>
              Salon Amira est né d'une passion pour la beauté authentique.
              Situé au cœur d'Alger Centre, nous accueillons chaque cliente
              dans un espace chaleureux et apaisant, loin de l'agitation.
            </p>
            <p style={{color:'var(--text-secondary)', fontSize:'1.05rem', marginBottom:28, lineHeight:1.7}}>
              Notre équipe de professionnelles qualifiées vous accompagne
              avec écoute et précision — parce que chaque femme mérite de
              se sentir belle.
            </p>
            <div style={{display:'flex', gap:40}}>
              <div>
                <div style={{fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'var(--rose)', lineHeight:1}}>7</div>
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
          <strong>Salon Amira</strong><br />
          Alger Centre · Lun–Sam 9h00–18h00
        </div>
        <div style={{fontSize:12, color:'var(--text-muted)'}}>
          © 2026 Salon Amira — Beauté & Bien-être
        </div>
      </div>
    </div>
  )
}
