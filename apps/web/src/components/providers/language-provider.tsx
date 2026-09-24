'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import Script from 'next/script';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'All India / Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North & Central India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra (Nashik, Pune)' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab & Haryana' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra Pradesh & Telangana' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Northern & Deccan belt' },
];

interface LanguageContextType {
  currentLanguage: string;
  activeLanguageOption: LanguageOption;
  changeLanguage: (code: string) => void;
  isTranslating: boolean;
  supportedLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en',
  activeLanguageOption: SUPPORTED_LANGUAGES[0]!,
  changeLanguage: () => {},
  isTranslating: false,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export const useLanguage = () => useContext(LanguageContext);

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    // 1. Check cookies for googtrans
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    // 2. Check localStorage
    const saved = localStorage.getItem('aroha_user_language');
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch (err) {
    console.warn('Error reading stored language:', err);
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [isTranslating, startTransition] = useTransition();

  useEffect(() => {
    const initial = getInitialLanguage();
    setCurrentLanguage(initial);

    // Setup window callback for google translate element
    (window as any).googleTranslateElementInit = () => {
      try {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,mr,pa,gu,te,ta,kn,bn,ml,or,ur',
            autoDisplay: false,
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        );
      } catch (e) {
        console.warn('Google translate init issue:', e);
      }
    };
  }, []);

  const changeLanguage = (langCode: string) => {
    startTransition(() => {
      try {
        localStorage.setItem('aroha_user_language', langCode);
        setCurrentLanguage(langCode);

        const domain = window.location.hostname;
        
        if (langCode === 'en') {
          // Clear translation cookies
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
          if (domain.includes('.')) {
            document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
          }
          // Attempt combo update or reload
          const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
          if (combo) {
            combo.value = 'en';
            combo.dispatchEvent(new Event('change'));
          } else {
            window.location.reload();
          }
          return;
        }

        // Set Google Translate cookie format: /en/hi, /en/mr, etc.
        const cookieVal = `/en/${langCode}`;
        document.cookie = `googtrans=${cookieVal}; path=/;`;
        document.cookie = `googtrans=${cookieVal}; path=/; domain=${domain};`;
        if (domain.includes('.')) {
          document.cookie = `googtrans=${cookieVal}; path=/; domain=.${domain};`;
        }

        // Trigger Google Translate hidden select if present in DOM
        const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo');
        if (combo) {
          combo.value = langCode;
          combo.dispatchEvent(new Event('change'));
        } else {
          // Refresh page so Google translate script picks up the newly configured cookie
          window.location.reload();
        }
      } catch (err) {
        console.error('Failed to change language:', err);
      }
    });
  };

  const activeLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0]!;

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        activeLanguageOption,
        changeLanguage,
        isTranslating,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {/* Hidden mount point for Google Translate Engine */}
      <div id="google_translate_element" style={{ display: 'none', visibility: 'hidden' }} aria-hidden="true" />
      
      {/* External Google Translate Library script */}
      <Script
        id="google-translate-script"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />

      {children}
    </LanguageContext.Provider>
  );
}
