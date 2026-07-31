import { useState, useMemo } from 'react'
import { Search, CircleHelp, Mail, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface FAQ {
  question: string
  answer: string
  category: string
}

function Help() {
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

  const faqData: FAQ[] = useMemo(() => {
    const faqs: FAQ[] = []

    for (let i = 1; i <= 3; i++) {
      const question = t(`faq.gettingStarted.q${i}`)
      const answer = t(`faq.gettingStarted.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'gettingStarted' })
      }
    }

    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.sessionTracking.q${i}`)
      const answer = t(`faq.sessionTracking.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'sessionTracking' })
      }
    }

    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.statistics.q${i}`)
      const answer = t(`faq.statistics.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'statistics' })
      }
    }

    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.accountSettings.q${i}`)
      const answer = t(`faq.accountSettings.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'accountSettings' })
      }
    }

    for (let i = 1; i <= 4; i++) {
      const question = t(`faq.troubleshooting.q${i}`)
      const answer = t(`faq.troubleshooting.a${i}`)
      if (question && answer) {
        faqs.push({ question, answer, category: 'troubleshooting' })
      }
    }

    return faqs
  }, [t])

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
    <div className="mx-auto max-w-4xl py-4 sm:py-8">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-accent/10">
          <CircleHelp className="size-8 text-accent" />
        </div>
        <h1 className="mb-2 text-h1 font-semibold">{t('faq.title')}</h1>
        <p className="mx-auto max-w-150 text-body text-text-secondary">
          Find answers to common questions about GameWatch
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          placeholder={t('faq.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 border-none bg-surface pl-9"
        />
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        <Badge
          onClick={() => setSelectedCategory('all')}
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer px-3 py-1.5"
        >
          All
        </Badge>
        {categories.slice(1).map((category) => (
          <Badge
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1.5"
          >
            {category.icon} {category.label}
          </Badge>
        ))}
      </div>

      <div className="mb-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleExpandAll} className="text-accent">
          {expandedAll ? t('faq.collapseAll') : t('faq.expandAll')}
        </Button>
      </div>

      <div className="mb-8">
        {filteredFAQs.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <p className="mb-1 text-h4 font-semibold">{t('faq.noResults')}</p>
            <p className="text-body-sm text-text-secondary">{t('faq.noResultsDescription')}</p>
          </div>
        ) : (
          <Accordion type="multiple" value={expanded} onValueChange={setExpanded} className="flex flex-col gap-2">
            {filteredFAQs.map((faq, index) => (
              <AccordionItem
                key={`faq-${index}`}
                value={`faq-${index}`}
                className="rounded-md border border-border bg-surface px-4"
              >
                <AccordionTrigger className="font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="leading-7 text-text-secondary">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <Separator className="my-8" />

      <div className="rounded-md border border-accent/20 bg-accent/5 p-8 text-center">
        <p className="mb-2 text-h3 font-semibold">{t('faq.stillNeedHelp')}</p>
        <p className="mb-6 text-body-sm text-text-secondary">{t('faq.responseTime')}</p>
        <Button asChild size="lg" className="px-8">
          <a href="mailto:kantoristvan13@gmail.com">
            <Mail className="size-4" />
            {t('faq.contactSupport')}
          </a>
        </Button>
      </div>

      {!isMobile && (
        <div className="fixed bottom-20 right-8">
          <Button size="icon" onClick={scrollToTop} className="size-12 rounded-full">
            <ChevronUp className="size-5" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default Help
