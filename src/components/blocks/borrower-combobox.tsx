import {
  ChevronsUpDownIcon,
  Loader2Icon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { loansService } from '@/services/loans'
import type { Borrower } from '@/types'

export type BorrowerSelection =
  | { type: 'existing'; id: number; name: string }
  | { type: 'new'; name: string }

type BorrowerComboboxProps = {
  value: BorrowerSelection | null
  onChange: (value: BorrowerSelection | null) => void
}

export function BorrowerCombobox({ value, onChange }: BorrowerComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const requestCounterRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query.length < 2) {
      setBorrowers([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    debounceTimerRef.current = setTimeout(async () => {
      const currentRequest = ++requestCounterRef.current
      try {
        const results = await loansService.searchBorrowers(query)
        if (currentRequest === requestCounterRef.current) {
          setBorrowers(results)
        }
      } finally {
        if (currentRequest === requestCounterRef.current) {
          setIsLoading(false)
        }
      }
    }, 300)
  }, [query])

  const trimmedQuery = query.trim()
  const showCreateOption =
    trimmedQuery.length >= 2 &&
    !borrowers.some((b) => b.name.toLowerCase() === trimmedQuery.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            <span className="truncate">
              {value ? value.name : 'Buscar prestatario...'}
            </span>
            <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
              setQuery('')
              setBorrowers([])
            }}
            className="absolute top-1/2 right-8 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Escribe para buscar..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {query.length >= 2 &&
                  borrowers.length === 0 &&
                  !showCreateOption && (
                    <CommandEmpty>No se encontraron prestatarios.</CommandEmpty>
                  )}
                {borrowers.length > 0 && (
                  <CommandGroup>
                    {borrowers.map((borrower) => (
                      <CommandItem
                        key={borrower.id}
                        value={String(borrower.id)}
                        data-checked={
                          value?.type === 'existing' && value.id === borrower.id
                        }
                        onSelect={() => {
                          onChange({
                            type: 'existing',
                            id: borrower.id,
                            name: borrower.name,
                          })
                          setOpen(false)
                        }}
                      >
                        {borrower.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {showCreateOption && (
                  <CommandGroup>
                    <CommandItem
                      value={`create-${trimmedQuery}`}
                      onSelect={() => {
                        onChange({ type: 'new', name: trimmedQuery })
                        setOpen(false)
                      }}
                    >
                      <UserPlusIcon className="size-4 text-muted-foreground" />
                      <span>
                        Crear prestatario:{' '}
                        <span className="font-medium">{trimmedQuery}</span>
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
