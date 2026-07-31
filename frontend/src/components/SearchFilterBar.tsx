import { Search, LayoutGrid, Image } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

interface SearchFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
  filterGenre: string
  onGenreChange: (genre: string) => void
  filterPlatform: string
  onPlatformChange: (platform: string) => void
  filterYear: string
  onYearChange: (year: string) => void
  availableGenres: string[]
  availablePlatforms: string[]
  availableYears: string[]
  hasActiveFilters: boolean
  onClearFilters: () => void
  cardSize: number
  onCardSizeChange: (size: number) => void
}

const ALL = '__all__'

function SearchFilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterGenre,
  onGenreChange,
  filterPlatform,
  onPlatformChange,
  filterYear,
  onYearChange,
  availableGenres,
  availablePlatforms,
  availableYears,
  hasActiveFilters,
  onClearFilters,
  cardSize,
  onCardSizeChange,
}: SearchFilterBarProps) {
  const { t } = useTranslation()
  const cardSizeLabel = [t('games.cardSizeSmall'), t('games.cardSizeMedium'), t('games.cardSizeLarge')][cardSize - 1]

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('games.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 bg-surface pl-9"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-col flex-wrap items-stretch gap-4 sm:flex-row sm:items-center">
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-12 w-full sm:w-37.5">
            <SelectValue placeholder={t('games.sortBy')} />
          </SelectTrigger>
          <SelectContent className="max-h-100">
            <SelectItem value="name-asc">{t('games.sortNameAsc')}</SelectItem>
            <SelectItem value="name-desc">{t('games.sortNameDesc')}</SelectItem>
            <SelectItem value="date-newest">{t('games.sortNewest')}</SelectItem>
            <SelectItem value="date-oldest">{t('games.sortOldest')}</SelectItem>
            <SelectItem value="rating-high">{t('games.sortRatingHigh')}</SelectItem>
            <SelectItem value="rating-low">{t('games.sortRatingLow')}</SelectItem>
            <SelectItem value="sessions-high">{t('games.sortSessionsHigh')}</SelectItem>
            <SelectItem value="sessions-low">{t('games.sortSessionsLow')}</SelectItem>
            <SelectItem value="playtime-high">{t('games.sortPlaytimeHigh')}</SelectItem>
            <SelectItem value="playtime-low">{t('games.sortPlaytimeLow')}</SelectItem>
            <SelectItem value="status-active">{t('games.sortStatusActive')}</SelectItem>
            <SelectItem value="status-completed">{t('games.sortStatusCompleted')}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterGenre || ALL} onValueChange={(v) => onGenreChange(v === ALL ? '' : v)}>
          <SelectTrigger className="h-12 w-full sm:w-37.5">
            <SelectValue placeholder={t('games.genre')} />
          </SelectTrigger>
          <SelectContent className="max-h-75">
            <SelectItem value={ALL}>{t('games.allGenres')}</SelectItem>
            {availableGenres.map(genre => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPlatform || ALL} onValueChange={(v) => onPlatformChange(v === ALL ? '' : v)}>
          <SelectTrigger className="h-12 w-full sm:w-37.5">
            <SelectValue placeholder={t('games.platform')} />
          </SelectTrigger>
          <SelectContent className="max-h-75">
            <SelectItem value={ALL}>{t('games.allPlatforms')}</SelectItem>
            {availablePlatforms.map(platform => (
              <SelectItem key={platform} value={platform}>{platform}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear || ALL} onValueChange={(v) => onYearChange(v === ALL ? '' : v)}>
          <SelectTrigger className="h-12 w-full sm:w-30">
            <SelectValue placeholder={t('games.year')} />
          </SelectTrigger>
          <SelectContent className="max-h-75">
            <SelectItem value={ALL}>{t('games.allYears')}</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden min-w-50 items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 md:flex">
          <LayoutGrid className="size-4.5 text-text-disabled" />
          <Slider
            value={[cardSize]}
            onValueChange={([v]) => onCardSizeChange(v)}
            min={1}
            max={3}
            step={1}
            aria-label={cardSizeLabel}
          />
          <Image className="size-5 text-text-disabled" />
        </div>

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={onClearFilters} className="w-full sm:ml-auto sm:w-auto">
            {t('games.clearFilters')}
          </Button>
        )}
      </div>
    </>
  )
}

export default SearchFilterBar
