import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Below this many options, a search box only adds a click before the list itself. */
const SEARCH_THRESHOLD = 8

interface MultiSelectFilterProps {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  searchPlaceholder: string
  emptyMessage: string
}

/**
 * A searchable multi-select filter: a button that states what's active, opening a
 * Command list of checkable options. Built from ShadcnUI's Popover + Command rather than
 * a native multi-select, which cannot show a search box or a checked state per item.
 *
 * Used for the Ratings tab's developer/publisher/genre filters, where the option count
 * comes from whatever the profile owner has actually rated - potentially long enough that
 * the list needs its own internal scroll (via Command's list, capped below) and its own
 * search box, which only appears once the option count makes typing faster than scanning.
 */
function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
  emptyMessage,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  const toggle = (option: string) => {
    const next = new Set(selected)
    if (next.has(option)) {
      next.delete(option)
    } else {
      next.add(option)
    }
    onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 justify-between gap-2 px-3',
            selected.size > 0 && 'border-accent/50 text-accent'
          )}
        >
          <span className="truncate">{label}</span>
          {selected.size > 0 && (
            <Badge variant="secondary" className="rounded-full px-1.5 text-caption">
              {selected.size}
            </Badge>
          )}
          <ChevronDown className="size-4 shrink-0 text-text-secondary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          {options.length > SEARCH_THRESHOLD && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                  <Check className={cn('size-4', selected.has(option) ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default MultiSelectFilter
