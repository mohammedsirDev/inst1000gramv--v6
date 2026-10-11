import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PseoPage, SupportedLanguage } from '../types';
import { DOWNLOADER_PAGES } from '../config/downloaders';
import { ALL_SUPPORTED_LANGUAGES, LANGUAGES } from '../config/languages';
import { getDownloaderDataForLocale } from '../translations/downloadersData';
import { navigateTo } from '../utils/router';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface PseoDirectoryProps {
  onSelectPseoPage?: (page: PseoPage) => void;
}

export const PseoDirectory: React.FC<PseoDirectoryProps> = () => {
  const { translations, currentLang } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(currentLang);

  useEffect(() => {
    setSelectedLang(currentLang);
  }, [currentLang]);

  const currentLangConfig = LANGUAGES[selectedLang] || LANGUAGES.en;
  const isAr = currentLang === 'ar';

  return (
    <section className="py-14 sm:py-20 bg-slate-950 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-black tracking-widest text-pink-400 uppercase bg-pink-950/60 border border-pink-800/50 px-3 py-1 rounded-full">
              {isAr ? 'دليل الأدوات المترجمة • 29 لغة' : 'Directory • 29 Languages'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-2 tracking-tight">
              {translations.pseoSectionTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-400 font-medium">
              {translations.pseoSectionSubtitle}
            </p>
          </div>
        </div>

        <div>
          {/* Language Selection Filter (29 Languages) */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {isAr
                ? 'اختر اللغة لمعاينة صفحات التحميل المخصصة:'
                : 'Select Language to Preview Localized Pages:'}
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {ALL_SUPPORTED_LANGUAGES.map((langCode) => {
                const lang = LANGUAGES[langCode];
                const isSelected = selectedLang === langCode;
                return (
                  <button
                    key={langCode}
                    onClick={() => setSelectedLang(langCode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] opacity-75 uppercase">({langCode})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Core Downloader Cards for the Selected Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {DOWNLOADER_PAGES.map((tool) => {
              const urlPath = `/${selectedLang}/${tool.slug}`;
              const localizedTool = getDownloaderDataForLocale(selectedLang, tool.slug);
              return (
                <div
                  key={tool.slug}
                  onClick={() => navigateTo(urlPath)}
                  className="p-5 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-pink-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-pink-950/70 text-pink-300 border border-pink-800/60">
                        {currentLangConfig.code.toUpperCase()}
                      </span>
                      <span className="text-xs">{currentLangConfig.flag}</span>
                    </div>

                    <h3 className="font-bold text-sm text-white group-hover:text-pink-400 transition-colors">
                      {localizedTool.h1 || tool.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {localizedTool.description || tool.tagline}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-pink-400">
                    <span className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]" dir="ltr">
                      {urlPath}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary statistics bar */}
          <div className="mt-8 p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isAr ? (
                  <>
                    <strong>29 لغة × 5 أدوات تحميل = 145 صفحة مخصصة</strong> بدعم كامل لجميع الأجهزة واللغات.
                  </>
                ) : (
                  <>
                    <strong>29 languages × 5 downloaders = 145 localized tools</strong> with multi-device high-definition streaming.
                  </>
                )}
              </span>
            </div>
            <button
              onClick={() => navigateTo(`/${selectedLang}/`)}
              className="text-pink-400 hover:text-pink-300 font-bold underline cursor-pointer"
            >
              {isAr
                ? `افتح الصفحة الرئيسية (${currentLangConfig.nativeName}) ←`
                : `Open ${currentLangConfig.nativeName} Homepage →`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
