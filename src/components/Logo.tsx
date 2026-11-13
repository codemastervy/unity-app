/** Unity logo: a "U" of two arms cradling a sun — support, warmth, togetherness. */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id="unity-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC27A" />
          <stop offset="1" stopColor="#E86F2B" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill="url(#unity-g)" />
      <path d="M27 38v14a23 23 0 0 0 46 0V38" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" />
      <circle cx="50" cy="41" r="10.5" fill="#FFF4E0" />
    </svg>
  )
}

export function Wordmark({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Unity">
      <LogoMark size={size} />
      <span className="font-display font-bold text-ink" style={{ fontSize: size * 0.72 }} aria-hidden>
        unity
      </span>
    </span>
  )
}
