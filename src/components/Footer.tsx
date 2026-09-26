import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SupportedLanguage, DownloaderSlug } from '../types';
import { DOWNLOADER_PAGES, GUIDE_PAGES } from '../config/downloaders';
import { getDownloaderDataForLocale } from '../translations/downloadersData';

interface FooterProps {
  onOpenAdmin: () => void;
  onNavigateHome: () => void;
  onNavigateTool?: (slug: DownloaderSlug) => void;
  onNavigateGuide?: (guideSlug: string) => void;
}

const ARABIC_GUIDE_TITLES: Record<string, string> = {
  'how-to-download-instagram-reels-on-iphone': 'كيفية تحميل ريلز انستقرام على الآيفون والآيباد',
  'how-to-download-instagram-reels-on-android': 'كيفية تحميل ريلز انستقرام على هواتف أندرويد',
  'how-to-download-instagram-stories-anonymously': 'كيفية مشاهدة وتحميل ستوري انستقرام بشكل مجهول',
  'how-to-save-instagram-photos-in-hd': 'كيفية حفظ صور وألبومات انستقرام بأعلى جودة HD',
  'how-to-use-insta1000gram-url-shortcut': 'كيفية استخدام اختصار الرابط 1kgram.com للتحميل الفوري',
};

export const Footer: React.FC<FooterProps> = ({
  onOpenAdmin,
  onNavigateHome,
  onNavigateTool,
  onNavigateGuide,
}) => {
  const { translations, availableLanguages, currentLang, setLanguage } = useLanguage();
  const isAr = currentLang === 'ar';

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-14 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Col 1: Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                1k
              </div>
              <span className="text-xl font-black text-white tracking-tight">
                <span className="text-pink-500">1k</span>gram
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {translations.brandTagline}
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>{isAr ? 'بث فائق الوضوح 1080p متصل الآن' : 'Ultra HD 1080p Stream Online'}</span>
            </div>
          </div>

          {/* Col 2: Downloaders */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
              {translations.downloadersColTitle || (isAr ? 'أدوات التحميل' : 'Downloaders')}
            </h4>
            <ul className="space-y-2">
              {DOWNLOADER_PAGES.map((tool) => {
                const localizedTool = getDownloaderDataForLocale(currentLang, tool.slug);
                return (
                  <li key={tool.slug}>
                    <button
                      onClick={() => onNavigateTool && onNavigateTool(tool.slug)}
                      className="hover:text-pink-400 transition-colors text-xs text-left rtl:text-right"
                    >
                      {localizedTool.h1 || tool.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 3: Popular Guides */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
              {translations.guidesColTitle || (isAr ? 'أدلة وشروحات الاستخدام' : 'Guides & Tutorials')}
            </h4>
            <ul className="space-y-2">
              {GUIDE_PAGES.slice(0, 5).map((guide) => (
                <li key={guide.slug}>
                  <button
                    onClick={() => onNavigateGuide && onNavigateGuide(guide.slug)}
                    className="hover:text-pink-400 transition-colors text-xs text-left rtl:text-right line-clamp-1"
                  >
                    {isAr ? ARABIC_GUIDE_TITLES[guide.slug] || guide.title : guide.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: 1k Trick */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-3">
              ⚡ {translations.secretShortcutBadge || (isAr ? 'اختصار 1k السريع' : '1k Quick Trick')}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {translations.secretShortcutDesc}
            </p>
            <div className="mt-3 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 font-mono text-[11px] text-slate-300 break-all" dir="ltr">
              https://www.<span className="text-pink-400 font-bold">1k</span>gram.com/reels/...
            </div>
          </div>
        </div>

        {/* 29 Languages Pill Matrix */}
        <div className="py-8 border-b border-slate-800">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>{translations.supportedLanguagesTitle || (isAr ? 'اللغات المدعومة' : 'Supported Languages')} (29)</span>
            <span className="text-[10px] text-pink-400 font-mono">
              {isAr ? '145 صفحة مترجمة' : '145 Localized SEO Pages'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {availableLanguages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code as SupportedLanguage)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                  currentLang === l.code
                    ? 'bg-pink-600 text-white font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.nativeName}</span>
                {l.dir === 'rtl' && <span className="text-[9px] text-amber-400 font-mono">RTL</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Status Notice */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-slate-400 font-medium">{translations.sslSecureNotice}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-medium">{translations.fastSpeedNotice}</span>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-6 border-t border-slate-800 text-center sm:text-left rtl:sm:text-right flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>{translations.footerRights}</p>
          <p className="text-slate-500 max-w-xl text-center sm:text-right rtl:sm:text-left">
            {translations.footerDisclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
};
