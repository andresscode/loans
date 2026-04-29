import type { DashboardCardIconColor } from './dashboard-card'

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCop(n: number): string {
  return cop.format(n)
}

const dotColorClasses: Record<DashboardCardIconColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-500',
}

type Detail = {
  label: string
  value: number
  color?: DashboardCardIconColor
}

type Props = {
  headline: number
  details?: Detail[]
  progressText?: string
  progressValue?: number
}

function ProgressRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 9
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-2 shrink-0 -rotate-90"
      role="img"
      aria-label={`${Math.round(clamped)}% completado`}
    >
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="6"
        className="stroke-muted"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        className="stroke-emerald-500"
      />
    </svg>
  )
}

export function AmountCell({
  headline,
  details,
  progressText,
  progressValue,
}: Props) {
  return (
    <div className="py-1">
      <div className="font-semibold text-foreground text-lg tabular-nums leading-none tracking-[-0.01em]">
        {formatCop(headline)}
      </div>

      {(details?.length || progressText) && (
        <div className="mt-1.5 text-[11.5px]">
          {details && details.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 text-muted-foreground">
              {details.map((detail) => (
                <span key={detail.label} className="flex items-center gap-1">
                  <span
                    className={`flex size-1.5 rounded-full ${dotColorClasses[detail.color ?? 'slate']}`}
                  />
                  <span>{detail.label}</span>
                  <span className="w-19 tabular-nums">
                    {formatCop(detail.value)}
                  </span>
                </span>
              ))}
            </div>
          )}
          {progressText && (
            <span className="flex items-center gap-1 text-muted-foreground">
              {progressValue !== undefined && (
                <ProgressRing value={progressValue} />
              )}
              <span className="tabular-nums">{progressText}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
