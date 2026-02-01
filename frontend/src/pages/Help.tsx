import { useState, useMemo } from 'react'
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Chip,
  Paper,
  Divider,
  useMediaQuery,
} from '@mui/material'
import {
  Search,
  ExpandMore,
  HelpOutline,
  Email,
  KeyboardArrowUp,
} from '@mui/icons-material'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'

interface FAQ {
  question: string
  answer: string
  category: string
}

function Help() {
  const { mode } = useTheme()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedAll, setExpandedAll] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const isMobile = useMediaQuery('(max-width:900px)')

  const categories = [
    { id: 'all', label: t('faq.categories.gettingStarted'), icon: '🚀' },
    { id: 'sessionTracking', label: t('faq.categories.sessionTracking'), icon: '⏱️' },
    { id: 'statistics', label: t('faq.categories.statistics'), icon: '📊' },
    { id: 'accountSettings', label: t('faq.categories.accountSettings'), icon: '⚙️' },
    { id: 'troubleshooting', label: t('faq.categories.troubleshooting'), icon: '🔧' },
  ]

  // Build FAQ data from translations
  const faqData: FAQ[] = useMemo(() => {
    const faqs: FAQ[] = []
    
    // Getting Started
    for (let i = 1; i <= 3; i++) {
      const question = t(`faq.gettingStarted.q${i}`)
      const answer = t(`faq.gettingStarted.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'gettingStarted' })
      }
    }
    
    // Session Tracking
    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.sessionTracking.q${i}`)
      const answer = t(`faq.sessionTracking.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'sessionTracking' })
      }
    }
    
    // Statistics
    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.statistics.q${i}`)
      const answer = t(`faq.statistics.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'statistics' })
      }
    }
    
    // Account Settings
    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.accountSettings.q${i}`)
      const answer = t(`faq.accountSettings.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'accountSettings' })
      }
    }
    
    // Troubleshooting
    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.troubleshooting.q${i}`)
      const answer = t(`faq.troubleshooting.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'troubleshooting' })
      }
    }
    
    return faqs
  }, [t])

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    return faqData.filter((faq) => {
      const matchesSearch =
        searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === 'all' || faq.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [faqData, searchQuery, selectedCategory])

  const handleAccordionChange = (index: string) => (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    if (isExpanded) {
      setExpanded([...expanded, index])
    } else {
      setExpanded(expanded.filter((item) => item !== index))
    }
  }

  const handleExpandAll = () => {
    if (expandedAll) {
      setExpanded([])
    } else {
      setExpanded(filteredFAQs.map((_, index) => `faq-${index}`))
    }
    setExpandedAll(!expandedAll)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: { xs: 2, sm: 4 } }}>
        {/* Header */}
        <Box
          sx={{
            textAlign: 'center',
            mb: 4,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(139, 154, 247, 0.1)',
              mb: 2,
            }}
          >
            <HelpOutline sx={{ fontSize: 32, color: mode === 'light' ? '#667eea' : '#8b9af7' }} />
          </Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 600,
              mb: 1,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            {t('faq.title')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Find answers to common questions about GameWatch
          </Typography>
        </Box>

        {/* Search Bar */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            backgroundColor: mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid',
            borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder={t('faq.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: mode === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  border: 'none',
                },
              },
            }}
          />
        </Paper>

        {/* Category Filters */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 3,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Chip
            label="All"
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            sx={{
              fontWeight: selectedCategory === 'all' ? 600 : 400,
              cursor: 'pointer',
            }}
          />
          {categories.slice(1).map((category) => (
            <Chip
              key={category.id}
              label={`${category.icon} ${category.label}`}
              onClick={() => setSelectedCategory(category.id)}
              color={selectedCategory === category.id ? 'primary' : 'default'}
              sx={{
                fontWeight: selectedCategory === category.id ? 600 : 400,
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>

        {/* Expand/Collapse All */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            size="small"
            onClick={handleExpandAll}
            sx={{
              textTransform: 'none',
              color: mode === 'light' ? '#667eea' : '#8b9af7',
            }}
          >
            {expandedAll ? t('faq.collapseAll') : t('faq.expandAll')}
          </Button>
        </Box>

        {/* FAQ Accordions */}
        <Box sx={{ mb: 4 }}>
          {filteredFAQs.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid',
                borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t('faq.noResults')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('faq.noResultsDescription')}
              </Typography>
            </Paper>
          ) : (
            filteredFAQs.map((faq, index) => (
              <Accordion
                key={`faq-${index}`}
                expanded={expanded.includes(`faq-${index}`)}
                onChange={handleAccordionChange(`faq-${index}`)}
                elevation={0}
                sx={{
                  mb: 1,
                  backgroundColor: mode === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid',
                  borderColor: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                  '&:before': {
                    display: 'none',
                  },
                  borderRadius: '8px !important',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 1.5,
                    },
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>{faq.question}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    sx={{
                      color: mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                      lineHeight: 1.7,
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Contact Support Section */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: mode === 'light' ? 'rgba(102, 126, 234, 0.05)' : 'rgba(139, 154, 247, 0.05)',
            border: '1px solid',
            borderColor: mode === 'light' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(139, 154, 247, 0.2)',
            borderRadius: 2,
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            {t('faq.stillNeedHelp')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            {t('faq.responseTime')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Email />}
            href="mailto:support@gamewatch.example.com"
            sx={{
              backgroundColor: mode === 'light' ? '#667eea' : '#8b9af7',
              color: '#ffffff',
              textTransform: 'none',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: mode === 'light' ? '#5568d3' : '#7a8ae6',
              },
            }}
          >
            {t('faq.contactSupport')}
          </Button>
        </Paper>

        {/* Scroll to Top Button */}
        {!isMobile && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 80,
              right: 32,
            }}
          >
            <Button
              variant="contained"
              onClick={scrollToTop}
              sx={{
                minWidth: 48,
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: mode === 'light' ? '#667eea' : '#8b9af7',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: mode === 'light' ? '#5568d3' : '#7a8ae6',
                },
              }}
            >
              <KeyboardArrowUp />
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  )
}

export default Help
