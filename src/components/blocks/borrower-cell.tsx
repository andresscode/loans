type Props = {
  name: string
}

export function BorrowerCell({ name }: Props) {
  const initials = (() => {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  })()

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-stone-50 to-stone-200/90 font-medium text-[12px] text-stone-700 tracking-tight ring-1 ring-stone-200/80 ring-inset">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-[15px] text-foreground leading-snug tracking-tight">
          {name}
        </p>
      </div>
    </div>
  )
}
