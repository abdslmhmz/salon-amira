import { useState, useEffect, useCallback, useRef } from 'react'

const MOBILE_BREAKPOINT = 768

const STEPS = [
  {
    target: '.admin-brand',
    title: 'Bienvenue sur votre espace Salon Amira',
    description: "Vous allez découvrir comment gérer votre salon en toute simplicité : tableau de bord, rendez-vous, services et plus. C'est parti !",
    position: 'bottom',
    tab: null,
  },
  {
    target: '.sidebar-link:nth-child(1)',
    targetMobile: '#section-dashboard',
    title: 'Tableau de bord',
    description: "Votre page d'accueil. D'un coup d'œil, voyez les rendez-vous du jour avec leur statut (confirmé, en cours, terminé), le chiffre d'affaires en direct, et la liste des clientes. Passez sur l'onglet Demain pour préparer la journée suivante : fiches clientes, checklist de préparation, et créneaux à remplir.",
    position: 'right',
    positionMobile: 'bottom',
    tab: 'dashboard',
  },
  {
    target: '.sidebar-link:nth-child(2)',
    targetMobile: '#section-agenda',
    title: 'Agenda',
    description: 'Ici, vous voyez tous les rendez-vous du jour. Changez la date avec le calendrier pour naviguer dans le temps. Vous pouvez modifier le statut (confirmé, terminé, annulé) et les détails de chaque rendez-vous.',
    position: 'right',
    positionMobile: 'bottom',
    tab: 'agenda',
  },
  {
    target: '.sidebar-link:nth-child(3)',
    targetMobile: '#section-services',
    title: 'Services',
    description: 'Gérez toutes vos prestations. Ajoutez, modifiez ou désactivez un service temporairement. Les services désactivés ne sont plus visibles des clientes sur le site.',
    position: 'right',
    positionMobile: 'bottom',
    tab: 'services',
  },
  {
    target: '.sidebar-link:nth-child(4)',
    targetMobile: '#section-availabilities',
    title: 'Disponibilités',
    description: "Définissez vos horaires d'ouverture habituels pour chaque jour de la semaine. Par exemple : Lundi au Vendredi de 9h à 17h, Samedi de 9h à 13h. Ces plages déterminent quand les clientes peuvent réserver.",
    position: 'right',
    positionMobile: 'bottom',
    tab: 'availabilities',
  },
  {
    target: '.sidebar-link:nth-child(5)',
    targetMobile: '#section-blocked',
    title: 'Créneaux bloqués',
    description: 'Bloquez des plages horaires spécifiques où vous êtes indisponible — une pause déjeuner, un rendez-vous personnel, ou une demi-journée de congé. Ces créneaux ne seront pas proposés aux clientes.',
    position: 'right',
    positionMobile: 'bottom',
    tab: 'blocked',
  },
  {
    target: '.sidebar-link:nth-child(6)',
    targetMobile: '#section-exceptions',
    title: 'Exceptions',
    description: 'Gérez les jours spéciaux : fermeture pour jour férié, horaires décalés pendant le Ramadan, ou ouverture exceptionnelle un dimanche. Ces exceptions écrasent vos disponibilités habituelles pour une date précise.',
    position: 'right',
    positionMobile: 'bottom',
    tab: 'exceptions',
  },
  {
    target: '.sidebar-link:nth-child(7)',
    targetMobile: '#section-analytics',
    title: 'Statistiques',
    description: "Consultez vos chiffres en un coup d'œil : nombre de rendez-vous, chiffre d'affaires, clientes uniques, et taux de rendez-vous honorés. Filtrez par période pour analyser vos performances.",
    position: 'right',
    positionMobile: 'bottom',
    tab: 'analytics',
  },
  {
    target: '.sidebar-link:nth-child(8)',
    targetMobile: '#section-settings',
    title: 'Paramètres',
    description: "Personnalisez les informations affichées sur votre site public : nom du salon, adresse, téléphone, horaires et textes de la page d'accueil. Les modifications sont visibles immédiatement.",
    position: 'right',
    positionMobile: 'bottom',
    tab: 'cms-settings',
  },
]

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
}

export default function OnboardingTour({ isOpen, onClose, onNavigate }) {
  const [step, setStep] = useState(0)
  const [spotlight, setSpotlight] = useState({ top: 0, left: 0, width: 0, height: 0 })
  const [mounted, setMounted] = useState(false)
  const tooltipRef = useRef(null)

  // Resolve the correct target selector for current viewport
  const resolveTarget = useCallback((stepData) => {
    if (!stepData) return null
    if (isMobile() && stepData.targetMobile) {
      return stepData.targetMobile
    }
    return stepData.target
  }, [])

  // Resolve the correct tooltip position for current viewport
  const resolvePosition = useCallback((stepData) => {
    if (!stepData) return 'bottom'
    if (isMobile() && stepData.positionMobile) {
      return stepData.positionMobile
    }
    return stepData.position || 'bottom'
  }, [])

  // Position the spotlight and tooltip relative to the target element
  const positionElements = useCallback(() => {
    const current = STEPS[step]
    if (!current) return

    const selector = resolveTarget(current)
    if (!selector) return

    const el = document.querySelector(selector)
    if (!el) {
      // Fallback: spotlight on admin-content with tooltip centered
      const fallback = document.querySelector('.admin-content')
      if (fallback) {
        const fr = fallback.getBoundingClientRect()
        setSpotlight({
          top: fr.top + 60,
          left: fr.left + 16,
          width: fr.width - 32,
          height: 40,
          targetRect: { top: fr.top + 60, left: fr.left + 16, width: fr.width - 32, height: 40, bottom: fr.top + 100, right: fr.right - 16 },
        })
      } else {
        setSpotlight(null)
      }
      return
    }

    const rect = el.getBoundingClientRect()
    const padding = 8

    setSpotlight({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      targetRect: rect,
    })
  }, [step, resolveTarget])

  // Re-position on mount and on resize/scroll
  useEffect(() => {
    if (!isOpen) return
    // Delay to let DOM settle after tab switch
    const timer = setTimeout(() => {
      positionElements()
      setMounted(true)
    }, 250)
    return () => clearTimeout(timer)
  }, [isOpen, step, positionElements])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', positionElements)
    window.addEventListener('scroll', positionElements)
    return () => {
      window.removeEventListener('resize', positionElements)
      window.removeEventListener('scroll', positionElements)
    }
  }, [isOpen, positionElements])

  // Navigate to the tab for this step
  useEffect(() => {
    if (!isOpen) return
    const current = STEPS[step]
    if (current && current.tab) {
      onNavigate(current.tab)
    }
  }, [step, isOpen, onNavigate])

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setMounted(false)
      setStep(step + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setMounted(false)
      setStep(step - 1)
    }
  }

  if (!isOpen) return null

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const tooltipPos = resolvePosition(current)
  const mobile = isMobile()

  // Compute tooltip position based on target position
  const getTooltipStyle = () => {
    if (!spotlight || !spotlight.targetRect) return { opacity: 0 }

    const tr = spotlight.targetRect
    const pos = tooltipPos
    const gap = 16
    const tooltipW = mobile ? Math.min(340, window.innerWidth - 32) : 340
    const tooltipH = 200

    let top, left
    const vw = window.innerWidth
    const vh = window.innerHeight

    switch (pos) {
      case 'bottom':
        top = tr.bottom + gap
        left = tr.left + tr.width / 2 - tooltipW / 2
        break
      case 'right':
        top = tr.top + tr.height / 2 - tooltipH / 2
        left = tr.right + gap
        break
      case 'left':
        top = tr.top + tr.height / 2 - tooltipH / 2
        left = tr.left - tooltipW - gap
        break
      case 'top':
        top = tr.top - tooltipH - gap
        left = tr.left + tr.width / 2 - tooltipW / 2
        break
      default:
        top = tr.bottom + gap
        left = tr.left + tr.width / 2 - tooltipW / 2
    }

    // Clamp to viewport
    if (left < 16) left = 16
    if (left + tooltipW > vw - 16) left = vw - tooltipW - 16
    if (top < 80) top = 80
    if (top + tooltipH > vh - 16) top = vh - tooltipH - 16

    return { top, left, opacity: mounted ? 1 : 0 }
  }

  return (
    <div className="onboarding-overlay">
      {/* Spotlight cutout */}
      {spotlight && (
        <div
          className="onboarding-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Tooltip card */}
      {current && (
        <div
          ref={tooltipRef}
          className={`onboarding-tooltip ${mounted ? 'onboarding-tooltip-visible' : ''}`}
          style={{
            ...getTooltipStyle(),
            width: mobile ? 'calc(100vw - 32px)' : 340,
          }}
        >
          {/* Step indicator */}
          <div className="onboarding-step">
            Étape {step + 1} sur {STEPS.length}
          </div>

          <h3 className="onboarding-title">{current.title}</h3>
          <p className="onboarding-desc">{current.description}</p>

          <div className="onboarding-actions">
            {!isFirst && (
              <button className="btn btn-ghost btn-sm" onClick={handlePrev}>
                ← Précédent
              </button>
            )}
            <div className="flex-1" />
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Passer
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleNext}>
              {isLast ? 'Terminer' : 'Suivant →'}
            </button>
          </div>

          {/* Dots */}
          <div className="onboarding-dots">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                onClick={() => { setMounted(false); setStep(i) }}
                aria-label={`Étape ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
