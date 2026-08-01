import React, { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { ListPlus, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Game } from '../types'
import DatePicker from './DatePicker'
import StyledDialog from './StyledDialog'

interface CreatePlaythroughDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  games: Game[]
  selectedGame: Game | null
  setSelectedGame: (game: Game | null) => void
  playthroughType: string
  setPlaythroughType: (type: string) => void
  playthroughTitle: string
  setPlaythroughTitle: (title: string) => void
  platform: string
  setPlatform: (platform: string) => void
  startDate: string
  setStartDate: (date: string) => void
}

function CreatePlaythroughDialog({
  open,
  onClose,
  onSubmit,
  games,
  selectedGame,
  setSelectedGame,
  playthroughType,
  setPlaythroughType,
  playthroughTitle,
  setPlaythroughTitle,
  platform,
  setPlatform,
  startDate,
  setStartDate,
}: CreatePlaythroughDialogProps) {
  const { t } = useTranslation()
  const [gamePickerOpen, setGamePickerOpen] = useState(false)
  const gameListRef = useRef<HTMLDivElement>(null)

  // The game list is a Popover nested inside a Dialog; Radix's dialog scroll-lock
  // intercepts wheel events before they reach the popover's own scroll container,
  // so mouse-wheel scrolling silently does nothing. Take over scrolling manually
  // with a non-passive listener so preventDefault actually applies.
  useEffect(() => {
    const el = gameListRef.current
    if (!el || !gamePickerOpen) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      el.scrollTop += e.deltaY
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [gamePickerOpen])

  const availablePlatforms = useMemo(() => {
    if (!selectedGame?.platforms) return []
    return selectedGame.platforms.split(',').map(p => p.trim()).filter(Boolean)
  }, [selectedGame])

  React.useEffect(() => {
    if (selectedGame && platform && !availablePlatforms.includes(platform)) {
      setPlatform('')
    }
  }, [selectedGame, platform, availablePlatforms, setPlatform])

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('playthrough.create')}
      icon={<ListPlus className="size-10 sm:size-12" />}
      actions={
        <>
          <Button onClick={onClose} variant="outline" size="lg" className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onSubmit}
            size="lg"
            className="flex-1"
            disabled={!selectedGame || !playthroughType || !platform || !startDate}
          >
            {t('playthrough.create')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t('playthrough.selectGame')} *</Label>
          <Popover open={gamePickerOpen} onOpenChange={setGamePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={gamePickerOpen}
                className="w-full justify-between font-normal"
              >
                <span className={cn(!selectedGame && 'text-muted-foreground')}>
                  {selectedGame ? selectedGame.name : t('playthrough.selectGame')}
                </span>
                <ChevronsUpDown className="size-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
              <Command>
                <CommandInput placeholder={t('playthrough.selectGame')} />
                <CommandList ref={gameListRef}>
                  <CommandEmpty>No games found.</CommandEmpty>
                  <CommandGroup>
                    {games.map((game) => (
                      <CommandItem
                        key={game.id}
                        value={game.name}
                        onSelect={() => {
                          setSelectedGame(game)
                          setGamePickerOpen(false)
                        }}
                      >
                        {game.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t('playthrough.playthroughTitle')}</Label>
          <Input
            value={playthroughTitle}
            onChange={(e) => setPlaythroughTitle(e.target.value)}
            placeholder={selectedGame ? `${selectedGame.name} playthrough` : ''}
          />
          <p className="text-caption text-text-secondary">{t('playthrough.playthroughTitleHelper')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t('playthrough.type')} *</Label>
          <Select value={playthroughType} onValueChange={setPlaythroughType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="story">Story</SelectItem>
              <SelectItem value="100%">100%</SelectItem>
              <SelectItem value="speedrun">Speedrun</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t('playthrough.platform')} *</Label>
          <Select
            value={platform}
            onValueChange={setPlatform}
            disabled={!selectedGame || availablePlatforms.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availablePlatforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-caption text-text-secondary">
            {!selectedGame ? t('playthrough.selectGameFirst') : availablePlatforms.length === 0 ? t('playthrough.noPlatformsAvailable') : ''}
          </p>
        </div>

        <DatePicker
          label={t('playthrough.startDate')}
          value={startDate}
          onChange={setStartDate}
          required
          maxDate={dayjs()}
        />
      </div>
    </StyledDialog>
  )
}

export default CreatePlaythroughDialog
