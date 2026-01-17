import { Box, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Button, Slider } from '@mui/material'
import { Search, GridView, PhotoSizeSelectLarge } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

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
  onCardSizeChange
}: SearchFilterBarProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder={t('games.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.paper',
              minHeight: 48,
            }
          }}
        />
      </Box>

      {/* Filters and Sorting */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <InputLabel>{t('games.sortBy')}</InputLabel>
          <Select
            value={sortBy}
            label={t('games.sortBy')}
            onChange={(e) => onSortChange(e.target.value)}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 400,
                }
              }
            }}
            sx={{ minHeight: 48 }}
          >
            <MenuItem value="name-asc">{t('games.sortNameAsc')}</MenuItem>
            <MenuItem value="name-desc">{t('games.sortNameDesc')}</MenuItem>
            <MenuItem value="date-newest">{t('games.sortNewest')}</MenuItem>
            <MenuItem value="date-oldest">{t('games.sortOldest')}</MenuItem>
            <MenuItem value="rating-high">{t('games.sortRatingHigh')}</MenuItem>
            <MenuItem value="rating-low">{t('games.sortRatingLow')}</MenuItem>
            <MenuItem value="sessions-high">{t('games.sortSessionsHigh')}</MenuItem>
            <MenuItem value="sessions-low">{t('games.sortSessionsLow')}</MenuItem>
            <MenuItem value="playtime-high">{t('games.sortPlaytimeHigh')}</MenuItem>
            <MenuItem value="playtime-low">{t('games.sortPlaytimeLow')}</MenuItem>
            <MenuItem value="status-active">{t('games.sortStatusActive')}</MenuItem>
            <MenuItem value="status-completed">{t('games.sortStatusCompleted')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <InputLabel>{t('games.genre')}</InputLabel>
          <Select
            value={filterGenre}
            label={t('games.genre')}
            onChange={(e) => onGenreChange(e.target.value)}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                }
              }
            }}
            sx={{ minHeight: 48 }}
          >
            <MenuItem value="">{t('games.allGenres')}</MenuItem>
            {availableGenres.map(genre => (
              <MenuItem key={genre} value={genre}>{genre}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
          <InputLabel>{t('games.platform')}</InputLabel>
          <Select
            value={filterPlatform}
            label={t('games.platform')}
            onChange={(e) => onPlatformChange(e.target.value)}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                }
              }
            }}
            sx={{ minHeight: 48 }}
          >
            <MenuItem value="">{t('games.allPlatforms')}</MenuItem>
            {availablePlatforms.map(platform => (
              <MenuItem key={platform} value={platform}>{platform}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
          <InputLabel>{t('games.year')}</InputLabel>
          <Select
            value={filterYear}
            label={t('games.year')}
            onChange={(e) => onYearChange(e.target.value)}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                }
              }
            }}
            sx={{ minHeight: 48 }}
          >
            <MenuItem value="">{t('games.allYears')}</MenuItem>
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Card Size Slider - Hidden on mobile */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' }, 
          alignItems: 'center', 
          gap: 1, 
          minWidth: 200, 
          px: 2, 
          py: 1, 
          borderRadius: 2, 
          bgcolor: 'background.paper', 
          border: '1px solid', 
          borderColor: 'rgba(0,0,0,0.08)' 
        }}>
          <GridView sx={{ color: 'text.disabled', fontSize: 18 }} />
          <Slider
            value={cardSize}
            onChange={(_e, newValue) => onCardSizeChange(Array.isArray(newValue) ? newValue[0] : newValue)}
            min={1}
            max={3}
            step={1}
            marks={[{ value: 1, label: 'S' }, { value: 2, label: 'M' }, { value: 3, label: 'L' }]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => [t('games.cardSizeSmall'), t('games.cardSizeMedium'), t('games.cardSizeLarge')][value - 1]}
            sx={{
              color: 'grey.300',
              '& .MuiSlider-thumb': { width: 16, height: 16, backgroundColor: '#fff', border: '2px solid currentColor', transition: '0.3s cubic-bezier(.47,1.64,.41,.8)', '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(0, 0, 0, 0.08)' } },
              '& .MuiSlider-track': { height: 3, border: 'none' },
              '& .MuiSlider-rail': { height: 3, opacity: 0.3, backgroundColor: 'grey.300' },
              '& .MuiSlider-mark': { height: 8, width: 2, backgroundColor: 'grey.400' },
              '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.7rem' },
            }}
          />
          <PhotoSizeSelectLarge sx={{ color: 'text.disabled', fontSize: 20 }} />
        </Box>

        {hasActiveFilters && (
          <Button 
            size="small" 
            onClick={onClearFilters}
            sx={{ 
              ml: { xs: 0, sm: 'auto' },
              width: { xs: '100%', sm: 'auto' },
              minHeight: 44,
            }}
          >
            {t('games.clearFilters')}
          </Button>
        )}
      </Box>
    </>
  )
}

export default SearchFilterBar
