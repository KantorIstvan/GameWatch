import { useState, useRef, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { gamesApi } from '../services/api'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'

interface GameOption {
  id: string
  name: string
  coverUrl?: string
  bannerImageUrl?: string
  releaseDate?: string
  rating?: number
  genres?: string[]
}

interface GameSearchAutocompleteProps {
  onGameSelect: (game: GameOption) => void
  disabled: boolean
}

function GameSearchAutocomplete({ onGameSelect, disabled }: GameSearchAutocompleteProps) {
  const { t } = useTranslation()
  const [options, setOptions] = useState<GameOption[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>('')
  const [open, setOpen] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setOptions([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const response = await gamesApi.search(searchQuery)
      setOptions(response.data || [])
    } catch (err) {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (newInputValue: string) => {
    setInputValue(newInputValue)
    setOpen(true)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!newInputValue || newInputValue.length < 2) {
      setOptions([])
      setLoading(false)
      return
    }

    setLoading(true)

    debounceTimerRef.current = setTimeout(() => {
      performSearch(newInputValue)
    }, 300)
  }

  const handleSelect = async (option: GameOption) => {
    setLoading(true)
    try {
      const response = await gamesApi.getDetails(option.id)
      onGameSelect(response.data)
    } catch (err) {
      onGameSelect(option)
    } finally {
      setLoading(false)
    }
    setInputValue('')
    setOptions([])
    setOpen(false)
  }

  const emptyMessage = useMemo(
    () => (inputValue.length < 2 ? t('games.typeAtLeast2Chars') : t('games.noGamesFound')),
    [inputValue, t]
  )

  return (
    <Popover open={open && inputValue.length >= 2} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex flex-col gap-1.5">
          <Label>{t('games.searchForGame')}</Label>
          <div className="relative">
            <Input
              value={inputValue}
              disabled={disabled}
              placeholder={t('games.typeToSearch')}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => inputValue.length >= 2 && setOpen(true)}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-75">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => handleSelect(option)}
                  className="group gap-3 py-2"
                >
                  <Avatar className="size-15 rounded-md">
                    <AvatarImage src={option.bannerImageUrl} alt={option.name} className="object-cover" />
                    <AvatarFallback className="rounded-md">{option.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-body">{option.name}</p>
                    <p className="text-caption text-text-secondary transition-colors duration-150 ease-standard group-data-[selected=true]:text-accent-foreground">
                      {option.releaseDate && `${t('games.released')}: ${option.releaseDate}`}
                    </p>
                    {option.genres && (
                      <p className="block text-caption text-text-secondary transition-colors duration-150 ease-standard group-data-[selected=true]:text-accent-foreground">
                        {option.genres}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default GameSearchAutocomplete
