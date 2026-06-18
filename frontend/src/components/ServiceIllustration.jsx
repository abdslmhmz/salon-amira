// SVG illustrations pour les services du Salon Amira
// Style: ligne élégante, minimal, palette rose (#c44569)
// Format: React components qui héritent de currentColor pour l'accent

const ILLUSTRATIONS = {
  // Coiffure Femme — ciseaux + cheveux fluides
  coiffure: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chevelure fluide */}
      <path d="M35 85C25 65 30 30 50 15C55 12 62 10 68 15C72 19 70 28 65 35" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.25"/>
      <path d="M40 80C32 62 35 35 52 22" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M45 78C40 65 42 40 55 30" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.45"/>
      {/* Silhouette tête */}
      <circle cx="60" cy="38" r="18" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      {/* Cheveux */}
      <path d="M48 30C48 18 58 10 68 15C72 18 74 25 74 32" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M46 35C44 22 55 8 68 12" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
      {/* Ciseaux */}
      <g transform="translate(78, 75) rotate(-30)">
        <ellipse cx="0" cy="0" rx="6" ry="3.5" stroke="currentColor" strokeWidth="2" fill="none"/>
        <ellipse cx="0" cy="0" rx="3.5" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <line x1="6" y1="0" x2="22" y2="0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="0" y1="-3.5" x2="18" y2="-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  ),

  // Brushing — sèche-cheveux + vagues
  brushing: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vagues de cheveux */}
      <path d="M30 55C35 40 45 55 50 42C55 28 62 52 68 40C74 28 78 50 82 42"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M28 65C34 52 42 63 48 52C54 40 60 60 66 50C72 40 76 58 82 50"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5"/>
      {/* Sèche-cheveux */}
      <g transform="translate(55, 58)">
        {/* Corps */}
        <path d="M-8 12L-25 0L-20 -14L0 -10L8 12Z" stroke="currentColor" strokeWidth="2.5" 
          strokeLinejoin="round" fill="none"/>
        {/* Poignée */}
        <rect x="-2" y="12" width="12" height="18" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        {/* Bouton */}
        <circle cx="4" cy="20" r="2" fill="currentColor" opacity="0.5"/>
        {/* Air flow */}
        <line x1="-22" y1="-2" x2="-30" y2="-2" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
        <line x1="-22" y1="0" x2="-32" y2="0" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
        <line x1="-22" y1="2" x2="-28" y2="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      </g>
    </svg>
  ),

  // Coloration — goutte + mèches colorées
  coloration: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cheveux avec mèches */}
      <path d="M55 20C55 10 65 8 70 15C73 19 72 26 68 32" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Mèches colorées */}
      <path d="M52 25C45 35 42 50 45 65C47 72 52 78 55 82" 
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7"/>
      <path d="M58 28C54 38 53 55 55 72" 
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M68 32C70 42 72 58 70 75" 
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5"/>
      {/* Goutte de teinture */}
      <g transform="translate(88, 75)">
        <path d="M0 -12C0 -12 8 -2 8 4C8 8.5 4.5 12 0 12C-4.5 12-8 8.5-8 4C-8-2 0-12 0-12Z" 
          stroke="currentColor" strokeWidth="2" fill="none"/>
        {/* Reflet */}
        <ellipse cx="-2" cy="3" rx="1.5" ry="1" fill="currentColor" opacity="0.3"/>
      </g>
      {/* Pinceau */}
      <line x1="78" y1="78" x2="88" y2="72" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="78" y1="78" x2="72" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="72" cy="92" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  ),

  // Manucure — main + vernis
  manucure: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main stylisée */}
      <path d="M30 80L25 55C22 40 28 30 38 28C48 26 52 35 50 45" 
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Doigts */}
      <path d="M38 28L40 10C40 6 44 4 45 8L45 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M42 26L48 8C49 4 53 3 53 7L52 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M47 26L55 10C56 6 60 5 60 9L59 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M50 30L60 15C62 11 66 12 65 16L63 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Ongles (vernis accent) */}
      <circle cx="40" cy="10" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="48" cy="8" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="55" cy="10" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="62" cy="14" r="3" fill="currentColor" opacity="0.7"/>
      {/* Flacon vernis */}
      <g transform="translate(82, 55)">
        <rect x="-6" y="-12" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="-4" y="-20" width="8" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="-5" y="-18" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="0" cy="-6" r="3" fill="currentColor" opacity="0.5"/>
      </g>
    </svg>
  ),

  // Soin Visage — visage + masque
  soin_visage: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Visage */}
      <ellipse cx="55" cy="50" rx="28" ry="35" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      {/* Yeux */}
      <ellipse cx="48" cy="42" rx="3" ry="2.5" fill="currentColor" opacity="0.4"/>
      <ellipse cx="62" cy="42" rx="3" ry="2.5" fill="currentColor" opacity="0.4"/>
      {/* Sourcils */}
      <path d="M43 37C44 35 48 34 50 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M67 37C66 35 62 34 60 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Sourire doux */}
      <path d="M50 58C53 62 57 62 60 58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Masque facial (appliqué) */}
      <path d="M34 48C38 40 48 38 55 38C62 38 72 40 76 48C78 54 76 60 72 64C66 69 44 69 38 64C34 60 32 54 34 48Z" 
        stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" strokeDasharray="3 2"/>
      {/* Étoiles (effet soin) */}
      <circle cx="28" cy="30" r="2" fill="currentColor" opacity="0.3"/>
      <circle cx="82" cy="35" r="1.5" fill="currentColor" opacity="0.25"/>
      <circle cx="35" cy="75" r="1.5" fill="currentColor" opacity="0.2"/>
    </svg>
  ),

  // Maquillage — pinceau + blush
  maquillage: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pinceau maquillage */}
      <g transform="translate(35, 30) rotate(-35)">
        {/* Manche */}
        <rect x="-3" y="20" width="6" height="40" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        {/* Ferrule */}
        <rect x="-4" y="14" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
        {/* Poils du pinceau */}
        <path d="M-7 14C-12 8-14 0-8-4C-4-6 0-6 4-4C8-2 10 2 7 5L-7 14Z" 
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
      </g>
      {/* Poudre / blush */}
      <circle cx="80" cy="65" r="18" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <circle cx="80" cy="65" r="12" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
      {/* Particules */}
      <circle cx="72" cy="55" r="2" fill="currentColor" opacity="0.25"/>
      <circle cx="88" cy="58" r="1.5" fill="currentColor" opacity="0.2"/>
      <circle cx="75" cy="75" r="1.5" fill="currentColor" opacity="0.25"/>
      {/* Rouge à lèvres */}
      <g transform="translate(60, 95)">
        <rect x="-4" y="-10" width="8" height="20" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none"/>
        <rect x="-3" y="-15" width="6" height="7" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="-3.5" y="-13" width="7" height="3" rx="1" fill="currentColor" opacity="0.4"/>
      </g>
    </svg>
  ),

  // Épilation — jambe + cire (stylisé, élégant)
  epilation: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Silhouette jambe élégante */}
      <path d="M65 30C62 25 58 22 55 25C52 28 53 40 56 55C59 70 58 90 55 105C54 110 58 112 62 108C66 104 65 95 66 82"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Deuxième jambe (arrière-plan) */}
      <path d="M72 32C70 28 67 26 65 28" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
      {/* Feuille / plante (cire naturelle) */}
      <g transform="translate(40, 75)">
        <path d="M0 0C-8-10-15-8-12 2C-9 12 0 15 0 0Z" 
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <path d="M0 0C2-12 10-10 8 0C6 10 0 15 0 0Z" 
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        <line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      </g>
      {/* Feuille 2 */}
      <g transform="translate(38, 65) rotate(-20) scale(0.7)">
        <path d="M0 0C-8-10-15-8-12 2C-9 12 0 15 0 0Z" 
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.5"/>
        <path d="M0 0C2-12 10-10 8 0C6 10 0 15 0 0Z" 
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.5"/>
      </g>
    </svg>
  ),

  // Henné — main décorée de motifs floraux
  henne: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M45 95L40 75C38 65 42 55 50 50C58 45 62 52 58 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M50 50L55 35C56 30 60 28 62 32L60 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M56 48L64 34C66 30 70 30 70 35L67 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M62 51L72 40C75 37 79 38 78 43L73 54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Motifs floraux sur la main */}
      <circle cx="52" cy="58" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6"/>
      <circle cx="60" cy="55" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <circle cx="68" cy="58" r="3.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5"/>
      <path d="M48 63C50 62 54 63 52 66" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
      <path d="M57 60C60 59 63 61 60 64" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
      <path d="M65 62C68 61 70 63 68 65" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4"/>
      {/* Cône de henné */}
      <g transform="translate(38, 38) rotate(-40)">
        <path d="M0 0L-4 18C-5 22-3 24 0 24C3 24 5 22 4 18Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="0" cy="0" r="1.5" fill="currentColor" opacity="0.5"/>
      </g>
    </svg>
  ),

  // Spa / Hammam — vapeur + pierres
  spa: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pierres */}
      <ellipse cx="45" cy="85" rx="15" ry="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
      <ellipse cx="60" cy="88" rx="18" ry="9" stroke="currentColor" strokeWidth="2" fill="none"/>
      <ellipse cx="75" cy="85" rx="14" ry="7" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
      <ellipse cx="52" cy="82" rx="10" ry="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/>
      <ellipse cx="68" cy="83" rx="11" ry="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
      {/* Vapeur */}
      <path d="M45 45C40 50 38 58 40 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25"/>
      <path d="M55 35C48 42 45 52 48 65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M65 40C58 46 55 55 58 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M75 45C70 50 68 58 70 65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25"/>
      {/* Gouttes */}
      <circle cx="42" cy="30" r="2" fill="currentColor" opacity="0.2"/>
      <circle cx="60" cy="22" r="3" fill="currentColor" opacity="0.15"/>
      <circle cx="78" cy="32" r="2" fill="currentColor" opacity="0.2"/>
    </svg>
  ),

  // Mariée — robe + bouquet
  wedding: (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Buste */}
      <path d="M45 70L50 40C50 35 70 35 70 40L75 70" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Robe */}
      <path d="M45 70L35 110M75 70L85 110M60 70L60 110" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M40 85C55 80 65 80 80 85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
      {/* Tête */}
      <circle cx="60" cy="28" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Voile */}
      <path d="M50 28C45 20 50 10 60 8C70 10 75 20 70 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5"/>
      {/* Bouquet */}
      <g transform="translate(80, 60)">
        <circle cx="0" cy="0" r="2" fill="currentColor" opacity="0.6"/>
        <circle cx="3" cy="-3" r="2" fill="currentColor" opacity="0.5"/>
        <circle cx="-3" cy="-2" r="2" fill="currentColor" opacity="0.5"/>
        <circle cx="2" cy="3" r="2" fill="currentColor" opacity="0.4"/>
        <circle cx="-2" cy="3" r="2" fill="currentColor" opacity="0.4"/>
        <line x1="0" y1="5" x2="0" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M-1 10L-4 7M1 10L4 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      </g>
    </svg>
  ),
};

// Mapping nom de service → clé d'illustration
const SERVICE_MAP = {
  'coiffure femme': 'coiffure',
  'coiffure': 'coiffure',
  'coiffure mariée': 'coiffure',
  'brushing': 'brushing',
  'brushing & coiffage': 'brushing',
  'lissage brésilien': 'coiffure',
  'coloration': 'coloration',
  'coloration & mèches': 'coloration',
  'manucure': 'manucure',
  'nail art': 'manucure',
  'pédicure': 'manucure',
  'soin visage': 'soin_visage',
  'soin': 'soin_visage',
  'soin kératine': 'soin_visage',
  'soin anti-âge': 'soin_visage',
  'sourcils': 'soin_visage',
  'microblading': 'soin_visage',
  'extensions de cils': 'soin_visage',
  'maquillage': 'maquillage',
  'maquillage mariée': 'maquillage',
  'épilation': 'epilation',
  'epilation': 'epilation',
  'épilation jambes': 'epilation',
  'épilation maillot': 'epilation',
  'épilation visage': 'epilation',
  'gommage corps': 'epilation',
  'henné': 'henne',
  'hammam & gommage': 'spa',
  'massage relaxant': 'spa',
  'forfait mariée': 'wedding',
};

// Fallback: generic beauty illustration for unmapped services
const FALLBACK_ILLUSTRATION = (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="50" r="30" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5"/>
    <path d="M45 55C48 62 55 68 60 68C65 68 72 62 75 55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
    <circle cx="50" cy="42" r="3" fill="currentColor" opacity="0.4"/>
    <circle cx="70" cy="42" r="3" fill="currentColor" opacity="0.4"/>
    <path d="M35 30C40 22 55 15 60 15C65 15 80 22 85 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"/>
    <path d="M40 28C45 18 55 20 60 20C65 20 75 18 80 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
    <circle cx="55" cy="85" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/>
    <circle cx="65" cy="85" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3"/>
    <path d="M58 95L60 100L62 95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
    <circle cx="30" cy="70" r="2" fill="currentColor" opacity="0.2"/>
    <circle cx="90" cy="60" r="2" fill="currentColor" opacity="0.2"/>
  </svg>
);

export function getServiceIllustration(name) {
  const cleanName = name.toLowerCase().trim();
  const key = SERVICE_MAP[cleanName];
  if (!key) return null;
  return ILLUSTRATIONS[key] || null;
}

export function ServiceIllustration({ serviceName, size = 80, className = '' }) {
  const svg = getServiceIllustration(serviceName) || FALLBACK_ILLUSTRATION;
  
  return (
    <div 
      className={className}
      style={{ 
        width: size, 
        height: size, 
        color: '#c44569',
        opacity: 0.85,
        flexShrink: 0,
      }}
    >
      {svg}
    </div>
  );
}

export default ServiceIllustration;
