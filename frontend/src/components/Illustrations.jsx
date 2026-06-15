/* ═══════════════════════════════════════════
   Salon Amira — SVG Beauty Illustrations
   Warm Editorial design system
   ═══════════════════════════════════════════ */

/* All use the CSS variable --rose (#c44569) for coloring */
import { useMemo } from 'react'

const R = 'var(--rose)'

const iconProps = (size = 28) => ({ width: size, height: size, viewBox: '0 0 28 28', fill: 'none', 'aria-hidden': true })

export function ScissorsIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="10" cy="10" r="5" stroke={R} strokeWidth="1.5" opacity="0.55" />
      <circle cx="10" cy="22" r="5" stroke={R} strokeWidth="1.5" opacity="0.55" />
      <line x1="10" y1="15" x2="10" y2="17" stroke={R} strokeWidth="1.5" opacity="0.45" />
    </svg>
  )
}

export function CombIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="6" y="7" width="16" height="3" rx="1" fill={R} opacity="0.2" />
      <line x1="9" y1="10" x2="8" y2="22" stroke={R} strokeWidth="1" opacity="0.35" />
      <line x1="12" y1="10" x2="11" y2="22" stroke={R} strokeWidth="1" opacity="0.35" />
      <line x1="14" y1="10" x2="14" y2="23" stroke={R} strokeWidth="1" opacity="0.35" />
      <line x1="17" y1="10" x2="18" y2="22" stroke={R} strokeWidth="1" opacity="0.35" />
      <line x1="20" y1="10" x2="21" y2="22" stroke={R} strokeWidth="1" opacity="0.35" />
    </svg>
  )
}

export function HairIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M14 4c-3 0-6 5-6 11s3 9 6 9 6-4 6-9-3-11-6-11z" fill={R} opacity="0.18" />
      <circle cx="14" cy="10" r="2" fill={R} opacity="0.35" />
    </svg>
  )
}

export function BrushIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="7" y="6" width="14" height="3" rx="1.5" fill={R} opacity="0.2" />
      <rect x="9" y="9" width="10" height="15" rx="2" fill={R} opacity="0.12" />
      <line x1="12" y1="9" x2="12" y2="24" stroke={R} strokeWidth="0.8" opacity="0.25" />
      <line x1="16" y1="9" x2="16" y2="24" stroke={R} strokeWidth="0.8" opacity="0.25" />
    </svg>
  )
}

export function FaceIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="14" cy="14" r="9" fill={R} opacity="0.1" />
      <circle cx="10" cy="12" r="1.5" fill={R} opacity="0.35" />
      <circle cx="18" cy="12" r="1.5" fill={R} opacity="0.35" />
      <path d="M10 18c2 2 6 2 8 0" stroke={R} strokeWidth="1.5" opacity="0.35" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function MakeupIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="7" y="5" width="14" height="15" rx="3" fill={R} opacity="0.18" />
      <rect x="9" y="9" width="10" height="7" rx="1" fill={R} opacity="0.25" />
      <circle cx="11" cy="7" r="1.5" fill={R} opacity="0.25" />
      <circle cx="17" cy="7" r="1.5" fill={R} opacity="0.25" />
    </svg>
  )
}

export function NailIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="6" y="8" width="16" height="5" rx="2.5" fill={R} opacity="0.16" />
      <ellipse cx="10" cy="8" rx="2.5" ry="2" fill={R} opacity="0.3" />
      <ellipse cx="14" cy="8" rx="2.5" ry="2" fill={R} opacity="0.3" />
      <ellipse cx="18" cy="8" rx="2.5" ry="2" fill={R} opacity="0.3" />
    </svg>
  )
}

export function LipstickIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <rect x="14" y="4" width="4" height="3" rx="1" fill={R} opacity="0.5" />
      <path d="M12 7h8l-1 16h-6l-1-16z" fill={R} opacity="0.3" />
      <rect x="13" y="10" width="6" height="10" rx="1" fill={R} opacity="0.18" />
    </svg>
  )
}

export function SpaFlowerIcon({ size = 28 }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="14" cy="14" r="5" fill={R} opacity="0.15" />
      {[0, 72, 144, 216, 288].map(deg => (
        <ellipse
          key={deg}
          cx="14" cy="14"
          rx="2.5" ry="6"
          fill={R} opacity="0.1"
          transform={`rotate(${deg} 14 14)`}
        />
      ))}
      <circle cx="14" cy="14" r="2.5" fill={R} opacity="0.3" />
    </svg>
  )
}

export function SalonChairIcon({ size = 80 }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 80 72" fill="none" aria-hidden="true">
      <ellipse cx="40" cy="20" rx="16" ry="12" fill={R} opacity="0.14" />
      <rect x="24" y="22" width="32" height="30" rx="5" fill={R} opacity="0.1" />
      <rect x="36" y="52" width="8" height="16" rx="2" fill={R} opacity="0.18" />
      <ellipse cx="40" cy="68" rx="14" ry="4" fill={R} opacity="0.08" />
    </svg>
  )
}

/* Hero floating illustrations */
export function HeroIllustrations() {
  return (
    <div className="landing-hero-canvas hero-illustration" aria-hidden="true">
      <div className="illustration-circle lg" />
      <div className="illustration-circle md" />
      <div className="illustration-circle sm" />

      {/* Lipstick */}
      <svg className="cosmetic-icon" style={{position:'absolute', right:'340px', top:'50px'}} width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="22" y="5" width="4" height="3" rx="1" fill={R} opacity="0.6" />
        <rect x="16" y="8" width="16" height="22" rx="3" fill={R} opacity="0.45" />
        <rect x="18" y="10" width="12" height="18" rx="2" fill={R} opacity="0.25" />
      </svg>

      {/* Nail polish */}
      <svg className="cosmetic-icon" style={{position:'absolute', right:'50px', top:'220px'}} width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="16" y="4" width="6" height="8" rx="2" fill={R} opacity="0.55" />
        <path d="M14 12h12l-2 22h-8l-2-22z" fill={R} opacity="0.3" rx="2" />
      </svg>

      {/* Scissors */}
      <svg className="cosmetic-icon" style={{position:'absolute', right:'380px', top:'290px'}} width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="11" r="6" fill="none" stroke={R} strokeWidth="2" opacity="0.45" />
        <circle cx="22" cy="33" r="6" fill="none" stroke={R} strokeWidth="2" opacity="0.45" />
        <line x1="22" y1="17" x2="22" y2="27" stroke={R} strokeWidth="2" opacity="0.35" />
      </svg>

      {/* Spa flower */}
      <svg className="cosmetic-icon" style={{position:'absolute', right:'150px', top:'370px'}} width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="7" fill={R} opacity="0.15" />
        <circle cx="18" cy="18" r="3" fill={R} opacity="0.3" />
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <ellipse key={deg} cx="18" cy="18" rx="3" ry="7" fill={R} opacity="0.1" transform={`rotate(${deg} 18 18)`} />
        ))}
      </svg>
    </div>
  )
}

/* Service icon map */
const iconMap = {
  scissors: ScissorsIcon,
  comb: CombIcon,
  hair: HairIcon,
  brush: BrushIcon,
  face: FaceIcon,
  makeup: MakeupIcon,
  nail: NailIcon,
  lipstick: LipstickIcon,
  spa: SpaFlowerIcon,
}

export function ServiceIcon({ name, size = 28 }) {
  const Icon = iconMap[name] || SpaFlowerIcon
  return <Icon size={size} />
}

export default {
  ScissorsIcon, CombIcon, HairIcon, BrushIcon,
  FaceIcon, MakeupIcon, NailIcon, LipstickIcon,
  SpaFlowerIcon, SalonChairIcon, HeroIllustrations,
  ServiceIcon,
}
