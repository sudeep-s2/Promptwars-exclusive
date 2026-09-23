interface LexLensLogoProps {
  size?: number;
  className?: string;
}

export const LexLensLogo = ({ size = 36, className = '' }: LexLensLogoProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`lexlens-logo-svg ${className}`}
    >
      <defs>
        {/* Futuristic Tech Gradients */}
        <linearGradient id="lexlens-primary-grad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>

        <linearGradient id="lexlens-glow-grad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="lexlens-core-grad" x1="24" y1="16" x2="24" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>

        <filter id="lexlens-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Hexagonal Tech Aperture Frame */}
      <polygon
        points="24,3 43,13.5 43,34.5 24,45 5,34.5 5,13.5"
        stroke="url(#lexlens-primary-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(15, 23, 42, 0.6)"
      />

      {/* Internal Focal Ring */}
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="rgba(56, 189, 248, 0.4)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />

      {/* Optical Focus Crosshairs */}
      <line x1="24" y1="6" x2="24" y2="10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="42" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="24" x2="10" y2="24" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="24" x2="42" y2="24" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />

      {/* Central Geometric Tech Scales / Core Lens Prism */}
      <path
        d="M24 15L16 23H32L24 15Z"
        fill="url(#lexlens-glow-grad)"
        stroke="url(#lexlens-primary-grad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 33L16 25H32L24 33Z"
        fill="url(#lexlens-glow-grad)"
        stroke="url(#lexlens-primary-grad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* High-Luminance Center Focal Point */}
      <circle
        cx="24"
        cy="24"
        r="3"
        fill="url(#lexlens-core-grad)"
        filter="url(#lexlens-glow)"
      />
    </svg>
  );
};
