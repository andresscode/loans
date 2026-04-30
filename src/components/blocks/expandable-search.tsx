import { SearchIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type ExpandableSearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ExpandableSearch({
  value,
  onChange,
  placeholder = 'Buscar...',
}: ExpandableSearchProps) {
  const [expanded, setExpanded] = useState(value.length > 0)
  const [local, setLocal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (local === value) return
    const handle = setTimeout(() => onChange(local), 250)
    return () => clearTimeout(handle)
  }, [local, value, onChange])

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setExpanded(true)
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
            aria-label="Buscar deudor"
          >
            <SearchIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Buscar deudor</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="relative w-45">
      <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local.length === 0) setExpanded(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setLocal('')
            onChange('')
            setExpanded(false)
          }
        }}
        placeholder={placeholder}
        className="pr-8 pl-8"
      />
      {local.length > 0 && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setLocal('')
            onChange('')
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  )
}
