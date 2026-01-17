import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import hu from './locales/hu.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import it from './locales/it.json'
import pt from './locales/pt.json'
import ja from './locales/ja.json'
import ru from './locales/ru.json'
import zh from './locales/zh.json'
import ko from './locales/ko.json'
import ar from './locales/ar.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      hu: {
        translation: hu
      },
      es: {
        translation: es
      },
      fr: {
        translation: fr
      },
      de: {
        translation: de
      },
      it: {
        translation: it
      },
      pt: {
        translation: pt
      },
      ja: {
        translation: ja
      },
      ru: {
        translation: ru
      },
      zh: {
        translation: zh
      },
      ko: {
        translation: ko
      },
      ar: {
        translation: ar
      }
    },
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    react: {
      useSuspense: true
    }
  })

export default i18n
