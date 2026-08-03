import { useTranslation } from 'react-i18next'

export const TimelineToolbar = () => {
  const { t } = useTranslation()

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:mb-8">
      <h1 className="text-h2 font-medium text-text-primary">{t('calendar.title')}</h1>
    </div>
  )
}
