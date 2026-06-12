import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, languageOptions, resources } from '../i18n/resources.js';

const LANGUAGE_STORAGE_KEY = 'crm.preferences.language';

const LanguageContext = createContext(null);

function getStoredLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return resources[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE;
}

function getLanguageOption(language) {
  return languageOptions.find((option) => option.code === language) || languageOptions[0];
}

function resolveTranslation(language, key) {
  return key.split('.').reduce((currentValue, keyPart) => {
    if (!currentValue || typeof currentValue !== 'object') {
      return undefined;
    }

    return currentValue[keyPart];
  }, resources[language]);
}

function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);
  const languageOption = getLanguageOption(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = languageOption.direction;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, languageOption.direction]);

  const value = useMemo(
    () => ({
      language,
      direction: languageOption.direction,
      languageOptions,
      setLanguage(nextLanguage) {
        setLanguageState(resources[nextLanguage] ? nextLanguage : DEFAULT_LANGUAGE);
      },
      t(key) {
        return (
          resolveTranslation(language, key) ??
          resolveTranslation(DEFAULT_LANGUAGE, key) ??
          key
        );
      },
    }),
    [language, languageOption.direction],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}

export default LanguageProvider;
