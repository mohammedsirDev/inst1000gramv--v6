import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SupportedLanguage, MediaType } from '../types';
import { Film, Video, Image, History, Sparkles, Globe, Search, Tv, User, Bookmark, Share2 } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: MediaType;
  onSelectTab: (tab: MediaType) => void;
  onOpenAdmin: () => void;
  onNavigateHome: () => void;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onOpenBookmarklet?: () => void;
  onOpenIOSShare?: () => void;
  onNavigateProfileDownloader?: () => void;
  isProfileActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAdmin,
  onNavigateHome,
  onLanguageChange,
  onOpenBookmarklet,
  onOpenIOSShare,
  onNavigateProfileDownloader,
  isProfileActive,
}) => {
  const { currentLang, setLanguage, availableLanguages, translations, config } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');

  const isMatchingTab = (itemType: MediaType, currentTab: MediaType) => {
    if (isProfileActive) return false;
    if (itemType === currentTab) return true;
    if ((itemType === 'reel' || itemType === 'reels') && (currentTab === 'reel' || currentTab === 'reels')) return true;
    if ((itemType === 'story' || itemType === 'stories') && (currentTab === 'story' || currentTab === 'stories')) return true;
    if ((itemType === 'highlight' || itemType === 'highlights') && (currentTab === 'highlight' || currentTab === 'highlights')) return true;
    if ((itemType === 'photo' || itemType === 'carousel') && (currentTab === 'photo' || currentTab === 'carousel')) return true;
    return false;
  };

  const navItems: { type: MediaType; label: string; icon: React.ReactNode }[] = [
    { type: 'reel', label: translations.navReels, icon: <Film className="w-4 h-4" /> },
    { type: 'video', label: translations.navVideo, icon: <Video className="w-4 h-4" /> },
    { type: 'photo', label: translations.navPhoto, icon: <Image className="w-4 h-4" /> },
    { type: 'story', label: translations.navStories, icon: <History className="w-4 h-4" /> },
    { type: 'highlight', label: translations.navHighlights, icon: <Sparkles className="w-4 h-4" /> },
    { type: 'igtv', label: translations.navIgtv || 'IGTV', icon: <Tv className="w-4 h-4" /> },
  ];

  const filteredLanguages = useMemo(() => {
    if (!langSearch.trim()) return availableLanguages;
    const query = langSearch.toLowerCase();
    return availableLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.nativeName.toLowerCase().includes(query) ||
        l.code.toLowerCase().includes(query)
    );
  }, [availableLanguages, langSearch]);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    if (onLanguageChange) {
      onLanguageChange(code);
    }
    setLangMenuOpen(false);
    setLangSearch('');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/90 transition-colors shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left rtl:text-right focus:outline-none group cursor-pointer"
            >
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform">
                <span className="font-extrabold text-sm tracking-tight">sss</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                </span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-pink-400 transition-colors">
                  <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">sss</span>clips
                </span>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                  {translations.brandTagline}
                </p>
              </div>
            </button>
          </div>

          {/* Center Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const isActive = isMatchingTab(item.type, activeTab);
              return (
                <button
                  key={item.type}
                  onClick={() => onSelectTab(item.type)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Task 5: Profile DP tab */}
            {onNavigateProfileDownloader && (
              <button
                onClick={onNavigateProfileDownloader}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  isProfileActive
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <User className="w-4 h-4" />
                <span>{currentLang === 'ar' ? 'صورة الحساب (DP)' : 'Profile DP'}</span>
              </button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA iPhone / Mobile Installation Action */}
            <PWAInstallButton variant="header" />

            {/* iOS Share Sheet helper shortcut */}
            {onOpenIOSShare && (
              <button
                onClick={onOpenIOSShare}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-pink-300 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-700/50 rounded-xl transition-all cursor-pointer shadow-xs"
                title={currentLang === 'ar' ? 'إعداد قائمة المشاركة على الآيفون' : 'iPhone Share Sheet Setup'}
              >
                <Share2 className="w-3.5 h-3.5 text-pink-400" />
                <span>{currentLang === 'ar' ? 'مشاركة الآيفون' : 'iOS Share'}</span>
              </button>
            )}

            {/* Task 4: Desktop Bookmarklet Shortcut */}
            {onOpenBookmarklet && (
              <button
                onClick={onOpenBookmarklet}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-pink-300 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-700/50 rounded-xl transition-all cursor-pointer shadow-xs"
                title={currentLang === 'ar' ? 'اختصار متصفح الكمبيوتر' : '1-Click Desktop Bookmarklet'}
              >
                <Bookmark className="w-3.5 h-3.5 text-pink-400" />
                <span>{currentLang === 'ar' ? 'اختصار الكمبيوتر' : 'Desktop Shortcut'}</span>
              </button>
            )}

            {/* Language Switcher (29 Languages) */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
                aria-label="Select Language"
              >
                <Globe className="w-4 h-4 text-pink-400" />
                <span className="text-base">{config.flag}</span>
                <span className="hidden sm:inline font-bold uppercase">{config.code}</span>
              </button>

              {langMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setLangMenuOpen(false);
                      setLangSearch('');
                    }}
                  />
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-800">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-2.5" />
                        <input
                          type="text"
                          value={langSearch}
                          onChange={(e) => setLangSearch(e.target.value)}
                          placeholder={
                            currentLang === 'ar'
                              ? 'ابحث في 29 لغة...'
                              : currentLang === 'es'
                              ? 'Buscar 29 idiomas...'
                              : currentLang === 'fr'
                              ? 'Rechercher 29 langues...'
                              : currentLang === 'de'
                              ? '29 Sprachen durchsuchen...'
                              : currentLang === 'tr'
                              ? '29 dilde ara...'
                              : currentLang === 'ru'
                              ? 'Поиск среди 29 языков...'
                              : 'Search 29 languages...'
                          }
                          className="w-full text-xs pl-8 pr-3 rtl:pr-8 rtl:pl-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-700">
                      {filteredLanguages.map((lang) => {
                        const isSelected = currentLang === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => handleSelectLanguage(lang.code as SupportedLanguage)}
                            className={`w-full text-left rtl:text-right px-3.5 py-2 text-xs sm:text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-pink-400 font-bold bg-pink-950/40'
                                : 'text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className="text-base">{lang.flag}</span>
                              <span className={lang.code === 'ar' || lang.code === 'fa' ? 'font-amiri text-sm font-bold' : 'font-medium'}>
                                {lang.nativeName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">
                                ({lang.code})
                              </span>
                            </span>
                            {lang.dir === 'rtl' && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-amber-950/70 text-amber-300 rounded font-mono font-bold border border-amber-800/60">
                                RTL
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Horizontal Tabs */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-850 scrollbar-none gap-2">
          {navItems.map((item) => {
            const isActive = isMatchingTab(item.type, activeTab);
            return (
              <button
                key={item.type}
                onClick={() => onSelectTab(item.type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Task 5: Mobile Profile DP tab */}
          {onNavigateProfileDownloader && (
            <button
              onClick={onNavigateProfileDownloader}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isProfileActive
                  ? 'bg-pink-600 text-white'
                  : 'text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{currentLang === 'ar' ? 'صورة الحساب' : 'Profile DP'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
