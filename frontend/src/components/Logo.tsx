export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="tc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#06283d" />
          <stop offset="1" stopColor="#0b6b72" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#tc-bg)" />
      <path d="M20 14v36M32 18v32M44 12v30" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <rect x="14" y="26" width="12" height="16" rx="3" fill="#ff6b70" />
      <rect x="26" y="24" width="12" height="18" rx="3" fill="#2fd4a0" />
      <rect x="38" y="16" width="12" height="20" rx="3" fill="#2fd4a0" />
    </svg>
  );
}
