'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown, Sparkles, X, Search } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageOption } from '@/components/providers/language-provider';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'mobile' | 'floating';
  className?: string;
}

export function LanguageSelector({ variant = 'navbar', className = '' }: LanguageSelectorProps) {
  const { currentLanguage, activeLanguageOption, changeLanguage, isTranslating } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    changeLanguage(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Top quick-access farmer languages
  const quickLanguages = ['hi', 'mr', 'pa', 'gu', 'te', 'en'];

  if (variant === 'mobile') {
    return (
      <div className={`p-3 bg-[#F4EFE6] rounded-xl border border-[#DFD8CB] ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#233D22] uppercase tracking-wider">
            <Globe className="w-4 h-4 text-[#3E5C3C]" />
            <span>भाषा / Language</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#233D22] text-[#F7F5EE]">
            {activeLanguageOption.nativeName}
          </span>
        </div>
        <p className="text-[11px] text-[#5A6050] mb-2.5">
          Select your local dialect to translate all crop prices and calculations:
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-[#233D22] text-[#FAF8F2] font-bold shadow-xs'
                    : 'bg-[#FCFAF6] text-[#283C22] border border-[#E2DBD0] hover:bg-[#EAE4D6]'
                }`}
              >
                <div>
                  <div className="font-serif font-bold text-sm leading-tight">{lang.nativeName}</div>
                  <div className={`text-[10px] ${isSelected ? 'text-[#D0E2CE]' : 'text-[#6B7260]'}`}>
                    {lang.name}
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative notranslate ${className}`} ref={dropdownRef}>
      {/* Navbar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 bg-[#FFFFFF] hover:bg-[#F2ECE1] text-[#233D22] border border-[#DFD8CB] hover:border-[#233D22] rounded-md transition-all shadow-2xs group cursor-pointer"
        title="Change site language / भाषा बदलें"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-[#3E5C3C] group-hover:rotate-12 transition-transform" />
        <span className="font-serif font-bold text-xs sm:text-sm text-[#233D22]">
          {activeLanguageOption.nativeName}
        </span>
        <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#EAE4D6] text-[#554019] rounded">
          {activeLanguageOption.code}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#6B7260] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Language Selection Modal / Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] max-w-[90vw] bg-[#FCFAF6] border border-[#D5CCBC] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-[#F2EDE2] border-b border-[#E0D7C6]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#233D22] text-[#F7F5EE] flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#1E221B] flex items-center gap-1.5">
                    <span>भाषा चुनें / Select Language</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#BD8728]" />
                  </h3>
                  <p className="text-[11px] text-[#636858]">
                    100% full-site translation for Indian farmers & mandis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-[#7A806E] hover:text-[#1E221B] hover:bg-[#E4DDCF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick-Select Pills for Top Agrarian States */}
            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-[#7A806E]">Popular:</span>
              {quickLanguages.map((code) => {
                const opt = SUPPORTED_LANGUAGES.find((l) => l.code === code);
                if (!opt) return null;
                const isSelected = currentLanguage === opt.code;
                return (
                  <button
                    key={opt.code}
                    onClick={() => handleSelectLanguage(opt.code)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#233D22] text-[#FAF8F2] font-bold'
                        : 'bg-[#FFFFFF] text-[#2E4A2C] border border-[#D5CCBC] hover:bg-[#EAE4D6]'
                    }`}
                  >
                    {opt.nativeName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar */}
          <div className="p-2.5 border-b border-[#EFEAE0] bg-[#FAF8F2]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8A8F7E] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language or state (e.g. Marathi, Hindi, Punjab)..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-[#FFFFFF] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A8F7E] focus:outline-hidden focus:border-[#233D22]"
                autoFocus
              />
            </div>
          </div>

          {/* Language Cards Grid */}
          <div className="p-2.5 max-h-[320px] overflow-y-auto space-y-1.5">
            {filteredLanguages.map((lang) => {
              const isSelected = currentLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#233D22] bg-[#EDF3ED] text-[#233D22] shadow-xs'
                      : 'border-[#EAE4D8] bg-[#FFFFFF] hover:border-[#233D22] hover:bg-[#FAF8F2] text-[#1E221B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md bg-[#F2EDE2] border border-[#DFD8CB] flex items-center justify-center font-bold text-xs text-[#283C22] shrink-0 uppercase font-mono">
                      {lang.code}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-base text-[#1E221B]">
                          {lang.nativeName}
                        </span>
                        <span className="text-xs font-medium text-[#5F6553]">
                          ({lang.name})
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7A806E] block">
                        {lang.region}
                      </span>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-[#233D22] text-[#F7F5EE] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-[#8A8F7E] group-hover:text-[#233D22]">
                      Select
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with Reset */}
          <div className="p-2.5 bg-[#F7F4EC] border-t border-[#EAE4D8] flex items-center justify-between text-xs text-[#636858]">
            <span>
              {isTranslating ? 'Translating page...' : `Active: ${activeLanguageOption.name}`}
            </span>
            {currentLanguage !== 'en' && (
              <button
                onClick={() => handleSelectLanguage('en')}
                className="text-xs font-semibold text-[#233D22] hover:underline cursor-pointer"
              >
                Reset to English
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
