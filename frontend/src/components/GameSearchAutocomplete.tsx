import { useState, useRef, useCallback } from 'react'
import {
  TextField,
  Autocomplete,
  Box,
  Typography,
  CircularProgress,
  Avatar,
} from '@mui/material'
import { gamesApi } from '../services/api'
import { useTranslation } from 'react-i18next'

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

  const handleInputChange = (_event: any, newInputValue: string) => {
    setInputValue(newInputValue)
    
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

  const handleChange = async (_event: any, newValue: GameOption | null) => {
    if (newValue) {
      setLoading(true)
      try {
        const response = await gamesApi.getDetails(newValue.id)
        onGameSelect(response.data)
      } catch (err) {
        onGameSelect(newValue)
      } finally {
        setLoading(false)
      }
      setInputValue('')
      setOptions([])
    }
  }

  return (
    <Autocomplete
      fullWidth
      disabled={disabled}
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      getOptionLabel={(option) => option.name || ''}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('games.searchForGame')}
          placeholder={t('games.typeToSearch')}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {option.bannerImageUrl ? (
            <Avatar
              src={option.bannerImageUrl}
              alt={option.name}
              variant="rounded"
              sx={{ width: 60, height: 60 }}
            />
          ) : (
            <Avatar variant="rounded" sx={{ width: 60, height: 60 }}>
              {option.name?.charAt(0)}
            </Avatar>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1">{option.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.releaseDate && `${t('games.released')}: ${option.releaseDate}`}
              {option.rating && ` • ${t('games.rating')}: ${option.rating}/5`}
            </Typography>
            {option.genres && (
              <Typography variant="caption" display="block" color="text.secondary">
                {option.genres}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      noOptionsText={
        inputValue.length < 2
          ? t('games.typeAtLeast2Chars')
          : t('games.noGamesFound')
      }
    />
  )
}

export default GameSearchAutocomplete
