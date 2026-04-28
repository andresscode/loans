const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatCop(n: number): string {
  return cop.format(n)
}

type Props = {
  headlineValue: number
  subheadlineValue: number
  subheadlineLabel: string
}

export function MoneyCell({
  headlineValue,
  subheadlineValue,
  subheadlineLabel,
}: Props) {
  return (
    <div className="py-1">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-base text-foreground tabular-nums leading-none tracking-[-0.01em]">
          {formatCop(headlineValue)}
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11.5px]">
        <span className="flex items-baseline gap-1">
          <span className="text-muted-foreground">{subheadlineLabel}:</span>
          <span className="text-muted-foreground tabular-nums">
            {formatCop(subheadlineValue)}
          </span>
        </span>
      </div>
    </div>
  )
}
