/** Decorative icons for marketing category / topic cards (reference UI). */

type IconProps = { className?: string };

export function BcsEmblemIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E8F5E9" stroke="#2E7D32" strokeWidth="2" />
      <circle cx="24" cy="24" r="14" fill="#fff" stroke="#C62828" strokeWidth="2" />
      <path
        d="M24 12l2.4 7.2H34l-6 4.4 2.3 7.2L24 26.4l-6.3 4.4 2.3-7.2-6-4.4h7.6L24 12z"
        fill="#2E7D32"
      />
    </svg>
  );
}

export function BankTempleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E3F2FD" />
      <path
        d="M10 34h28v3H10v-3zm2-3h24v-2H12v2zm1-4h4V18h-4v9zm7 0h4V18h-4v9zm7 0h4V18h-4v9zM12 16h24l-12-8-12 8z"
        fill="#1565C0"
      />
    </svg>
  );
}

export function GovSealIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#FFF3E0" stroke="#E53935" strokeWidth="2" />
      <circle cx="24" cy="24" r="12" fill="#FFFDE7" stroke="#F9A825" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" fill="#E53935" />
    </svg>
  );
}

export function GradCapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E3F2FD" />
      <path d="M8 20l16-8 16 8-16 8-16-8z" fill="#1565C0" />
      <path d="M16 24v8c0 2 3.5 4 8 4s8-2 8-4v-8" stroke="#1565C0" strokeWidth="2.5" fill="none" />
      <path d="M40 20v10" stroke="#1565C0" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function GearBlueIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E8EEF7" />
      <path
        fill="#1E3A5F"
        d="M19.2 14.8l1.3-2.2 3 .8V10h2.9v3.4l3-.8 1.3 2.2-2.5 2.1.9 3.1 2.9-.2.4 2.9-2.8 1.1v3l2.8 1.1-.4 2.9-2.9-.2-.9 3.1 2.5 2.1-1.3 2.2-3-.8v3.4h-2.9v-3.4l-3 .8-1.3-2.2 2.5-2.1-.9-3.1-2.9.2-.4-2.9 2.8-1.1v-3l-2.8-1.1.4-2.9 2.9.2.9-3.1-2.5-2.1zM24 20.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z"
      />
    </svg>
  );
}

export function BanglaBookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <rect x="10" y="12" width="22" height="26" rx="2" fill="#2E7D32" />
      <rect x="14" y="12" width="22" height="26" rx="2" fill="#43A047" />
      <circle cx="25" cy="25" r="6" fill="#E53935" />
      <path d="M14 12h4v26h-4" fill="#1B5E20" />
    </svg>
  );
}

export function EnglishLangIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E3F2FD" />
      <text x="14" y="30" fontSize="16" fontWeight="700" fill="#1565C0" fontFamily="sans-serif">
        A
      </text>
      <text x="26" y="22" fontSize="12" fontWeight="700" fill="#0D47A1" fontFamily="sans-serif">
        文
      </text>
    </svg>
  );
}

export function MathSymbolsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E8F0FE" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="#1565C0"
        fontFamily="sans-serif"
      >
        + − × =
      </text>
    </svg>
  );
}

export function GkGlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <circle cx="24" cy="24" r="22" fill="#E0F2F1" />
      <circle cx="24" cy="24" r="12" stroke="#00897B" strokeWidth="2.2" fill="#B2DFDB" />
      <ellipse cx="24" cy="24" rx="5" ry="12" stroke="#00695C" strokeWidth="1.6" />
      <path d="M12 24h24M14 19h20M14 29h20" stroke="#00695C" strokeWidth="1.4" />
    </svg>
  );
}

export function LightbulbGearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <path
        d="M24 6c-7.2 0-13 5.5-13 12.3 0 4.4 2.3 8.2 5.8 10.4V34h14.4v-5.3c3.5-2.2 5.8-6 5.8-10.4C37 11.5 31.2 6 24 6z"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M19 37h10M20.5 41h7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="20" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M24 14.5v2M24 23.5v2M18.5 20h2M27.5 20h2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
