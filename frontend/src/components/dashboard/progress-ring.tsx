import { cn } from '@/lib/utils';

type Props = {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  color?: string;
  trackColor?: string;
};

export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  label,
  sublabel,
  className,
  color = 'var(--highlight)',
  trackColor = 'var(--line)',
}: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ? (
          <p className="font-display text-xl font-bold tabular-nums text-[var(--ink)]">{label}</p>
        ) : null}
        {sublabel ? <p className="text-xs font-medium text-[var(--muted-strong)]">{sublabel}</p> : null}
      </div>
    </div>
  );
}
