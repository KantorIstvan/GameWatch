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
import bn from './locales/bn.json'
import cs from './locales/cs.json'
import da from './locales/da.json'
import el from './locales/el.json'
import fa from './locales/fa.json'
import fi from './locales/fi.json'
import hr from './locales/hr.json'
import id from './locales/id.json'
import is from './locales/is.json'
import pl from './locales/pl.json'
import sr from './locales/sr.json'
import sv from './locales/sv.json'
import tr from './locales/tr.json'
import ur from './locales/ur.json'
import vi from './locales/vi.json'
import af from './locales/af.json'
import bg from './locales/bg.json'
import hi from './locales/hi.json'
import et from './locales/et.json'
import ro from './locales/ro.json'
import sk from './locales/sk.json'
import no from './locales/no.json'
import nl from './locales/nl.json'
import ml from './locales/ml.json'
import lv from './locales/lv.json'
import lt from './locales/lt.json'
import th from './locales/th.json'
import sl from './locales/sl.json'
import uk from './locales/uk.json'


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
      ,bn: {
        translation: bn
      },
      cs: {
        translation: cs
      },
      da: {
        translation: da
      },
      el: {
        translation: el
      },
      fa: {
        translation: fa
      },
      fi: {
        translation: fi
      },
      hr: {
        translation: hr
      },
      id: {
        translation: id
      },
      is: {
        translation: is
      },
      pl: {
        translation: pl
      },
      sr: {
        translation: sr
      },
      sv: {
        translation: sv
      },
      tr: {
        translation: tr
      },
      ur: {
        translation: ur
      },
      vi: {
        translation: vi
      }
      ,af: {
        translation: af
      },
      bg: {
        translation: bg
      },
      hi: {
        translation: hi
      },
      et: {
        translation: et
      },
      ro: {
        translation: ro
      },
      sk: {
        translation: sk
      },
      no: {
        translation: no
      },
      nl: {
        translation: nl
      },
      ml: {
        translation: ml
      },
      lv: {
        translation: lv
      },
      lt: {
        translation: lt
      },
      th: {
        translation: th
      },
      sl: {
        translation: sl
      },
      uk: {
        translation: uk
      }
    },
    fallbackLng: 'en',
    debug: false,
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
