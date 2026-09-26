import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Shield, Sparkles, Wifi, EyeOff } from 'lucide-react';

export const Features: React.FC = () => {
  const { translations, currentLang } = useLanguage();

  const features = [
    {
      title: translations.feature1Title,
      desc: translations.feature1Desc,
      icon: <Sparkles className="w-6 h-6 text-pink-500" />,
      badge: '1080p 60fps',
    },
    {
      title: translations.feature2Title,
      desc: translations.feature2Desc,
      icon: <EyeOff className="w-6 h-6 text-purple-500" />,
      badge:
        currentLang === 'ar'
          ? 'مجهول 100%'
          : currentLang === 'es'
          ? 'Anónimo'
          : currentLang === 'fr'
          ? 'Anonyme'
          : currentLang === 'de'
          ? 'Anonym'
          : currentLang === 'tr'
          ? 'Anonim'
          : currentLang === 'ru'
          ? 'Анонимно'
          : 'Anonymous',
    },
    {
      title: translations.feature3Title,
      desc: translations.feature3Desc,
      icon: <Wifi className="w-6 h-6 text-emerald-500" />,
      badge:
        currentLang === 'ar'
          ? 'خوادم سريعة'
          : currentLang === 'es'
          ? 'Red Rápida'
          : currentLang === 'fr'
          ? 'Réseau Rapide'
          : currentLang === 'de'
          ? 'Schnell-CDN'
          : currentLang === 'tr'
          ? 'Hızlı Sunucu'
          : currentLang === 'ru'
          ? 'Быстрый CDN'
          : 'Smart Retry',
    },
    {
      title: translations.feature4Title,
      desc: translations.feature4Desc,
      icon: <Shield className="w-6 h-6 text-blue-500" />,
      badge:
        currentLang === 'ar'
          ? 'MP4 بدون علامة'
          : currentLang === 'es'
          ? 'MP4 Limpio'
          : currentLang === 'fr'
          ? 'MP4 Propre'
          : currentLang === 'de'
          ? 'Reines MP4'
          : currentLang === 'tr'
          ? 'Filigransız MP4'
          : currentLang === 'ru'
          ? 'Чистый MP4'
          : 'Clean MP4',
    },
  ];

  return (
    <section className="py-14 sm:py-20 bg-slate-50 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-black tracking-widest text-pink-600 uppercase bg-pink-100/70 px-3 py-1 rounded-full">
            {translations.performanceBadge || 'Performance & Reliability'}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mt-3 tracking-tight">
            {translations.featuresTitle}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 font-medium">
            {translations.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {f.badge}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">
                {f.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
