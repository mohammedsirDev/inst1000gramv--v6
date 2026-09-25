'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, LanguageConfig } from '../types';
import { LANGUAGES, DEFAULT_TRANSLATIONS, TranslationDictionary } from '../translations';

interface LanguageContextType {
  currentLang: SupportedLanguage;
  config: LanguageConfig;
  translations: TranslationDictionary;
  setLanguage: (lang: SupportedLanguage) => void;
  availableLanguages: LanguageConfig[];
  updateTranslationString: (lang: SupportedLanguage, key: keyof TranslationDictionary, value: string) => void;
  resetTranslations: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLang?: SupportedLanguage;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, initialLang }) => {
  // Always initialize deterministically without reading localStorage on server
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => {
    if (initialLang && LANGUAGES[initialLang]) {
      return initialLang;
    }
    return 'en';
  });

  const [customTranslations, setCustomTranslations] = useState<Record<SupportedLanguage, Partial<TranslationDictionary>>>({} as any);

  const [activeLanguages, setActiveLanguages] = useState<Record<SupportedLanguage, boolean>>({
    en: true,
    es: true,
    fr: true,
    pt: true,
    ar: true,
  } as any);

  // Client-side hydration: load stored preferences from localStorage after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check URL path language first (highest priority)
    const match = window.location.pathname.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]+)?)(?:\/|$)/);
    let resolvedLang: SupportedLanguage | null = null;
    if (match) {
      const urlLang = (match[1].includes('-') ? match[1] : match[1].toLowerCase()) as SupportedLanguage;
      if (LANGUAGES[urlLang]) {
        resolvedLang = urlLang;
      }
    }

    // 2. If no URL language and no initialLang, check localStorage
    if (!resolvedLang && !initialLang) {
      try {
        const saved = localStorage.getItem('insta1000gram_lang') as SupportedLanguage;
        if (saved && LANGUAGES[saved]) {
          resolvedLang = saved;
        }
      } catch {}
    }

    if (resolvedLang && resolvedLang !== currentLang) {
      setCurrentLang(resolvedLang);
    }

    // 3. Load custom translations if saved
    try {
      const storedTrans = localStorage.getItem('insta1000gram_custom_translations');
      if (storedTrans) {
        setCustomTranslations(JSON.parse(storedTrans));
      }
    } catch {}

    // 4. Load active languages configuration
    try {
      const storedActive = localStorage.getItem('insta1000gram_active_langs');
      if (storedActive) {
        setActiveLanguages(JSON.parse(storedActive));
      }
    } catch {}
  }, [initialLang]);

  // Listen for browser navigation to keep language in sync with URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUrlChange = () => {
      const match = window.location.pathname.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]+)?)(?:\/|$)/);
      if (match) {
        const urlLang = (match[1].includes('-') ? match[1] : match[1].toLowerCase()) as SupportedLanguage;
        if (LANGUAGES[urlLang] && urlLang !== currentLang) {
          setCurrentLang(urlLang);
        }
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [currentLang]);

  const config = LANGUAGES[currentLang] || LANGUAGES.en;

  // Sync RTL / LTR and fonts on HTML document element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isRtl = config.dir === 'rtl';
    document.documentElement.dir = config.dir;
    document.documentElement.lang = currentLang;
    
    if (isRtl) {
      document.body.classList.add('font-arabic');
      document.body.setAttribute('data-lang', 'ar');
    } else {
      document.body.classList.remove('font-arabic');
      document.body.removeAttribute('data-lang');
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('insta1000gram_lang', currentLang);
      }
    } catch {}
  }, [currentLang, config]);

  const setLanguage = (lang: SupportedLanguage) => {
    if (LANGUAGES[lang]) {
      setCurrentLang(lang);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('insta1000gram_lang', lang);
        }
      } catch {}
    }
  };

  const updateTranslationString = (lang: SupportedLanguage, key: keyof TranslationDictionary, value: string) => {
    setCustomTranslations((prev) => {
      const updated = {
        ...prev,
        [lang]: {
          ...prev[lang],
          [key]: value,
        },
      };
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('insta1000gram_custom_translations', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  };

  const resetTranslations = () => {
    setCustomTranslations({} as Record<SupportedLanguage, Partial<TranslationDictionary>>);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('insta1000gram_custom_translations');
      }
    } catch {}
  };

  const mergedTranslations: TranslationDictionary = {
    ...DEFAULT_TRANSLATIONS[currentLang],
    ...(customTranslations[currentLang] || {}),
  };

  const availableLanguages = Object.values(LANGUAGES).map((l) => ({
    ...l,
    active: activeLanguages[l.code] ?? true,
  }));

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        config,
        translations: mergedTranslations,
        setLanguage,
        availableLanguages,
        updateTranslationString,
        resetTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

