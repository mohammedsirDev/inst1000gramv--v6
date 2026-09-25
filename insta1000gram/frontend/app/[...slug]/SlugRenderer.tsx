'use client';

import React, { useState, useEffect } from 'react';
import { LanguageProvider } from '../../context/LanguageContext';
import { Header } from '../../components/Header';
import { DownloaderBox } from '../../components/DownloaderBox';
import { ResultCard } from '../../components/ResultCard';
import { Features } from '../../components/Features';
import { HowToGuide } from '../../components/HowToGuide';
import { FaqSection } from '../../components/FaqSection';
import { PseoDirectory } from '../../components/PseoDirectory';
import { Footer } from '../../components/Footer';
import { AdminModal } from '../../components/admin/AdminModal';
import { DownloaderPageView } from '../../components/DownloaderPageView';
import { GuidePageView } from '../../components/GuidePageView';
import { PseoPageView } from '../../components/PseoPageView';
import {
  MediaType,
  InstagramMediaResult,
  SupportedLanguage,
  DownloaderSlug,
  PseoPage,
} from '../../types';
import { DOWNLOADER_PAGES, GUIDE_PAGES } from '../../config/downloaders';
import { ALL_SUPPORTED_LANGUAGES, LANGUAGES } from '../../config/languages';
import { getDownloaderDataForLocale } from '../../translations/downloadersData';
import { parseCurrentRoute, navigateTo, RouteType } from '../../utils/router';
import { Zap, Sparkles } from 'lucide-react';
import AdSlot from '../components/AdSlot';

interface SlugRendererProps {
  initialSlugPath: string;
  initialRoute: RouteType;
  initialDownloaderData?: any;
  initialGuideData?: any;
  initialPseoData?: any;
  ads?: Record<string, { name: string; code: string }>;
}

export default function SlugRenderer({
  initialSlugPath,
  initialRoute,
  initialDownloaderData,
  initialGuideData,
  initialPseoData,
  ads = {},
}: SlugRendererProps) {
  const [currentRoute, setCurrentRoute] = useState<RouteType>(() => {
    if (typeof window !== 'undefined') {
      return parseCurrentRoute(window.location.pathname, window.location.search);
    }
    return initialRoute;
  });

  const [activeTab, setActiveTab] = useState<MediaType>('reels');
  const [downloadResult, setDownloadResult] = useState<InstagramMediaResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [adminOpen, setAdminOpen] = useState<boolean>(false);
  const [previewPseoPage, setPreviewPseoPage] = useState<PseoPage | null>(null);

  // Sync route on popstate / back / forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseCurrentRoute(window.location.pathname, window.location.search);
      setCurrentRoute(parsed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Admin shortcut (Ctrl+Shift+A or ?admin=1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }
    };
    if (typeof window !== 'undefined' && window.location.search.includes('admin=1')) {
      setAdminOpen(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine active locale for LanguageProvider
  const activeLocale: SupportedLanguage =
    currentRoute.type === 'downloader' || currentRoute.type === 'guide'
      ? currentRoute.locale
      : currentRoute.type === 'home' && currentRoute.locale
      ? currentRoute.locale
      : 'en';

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    if (currentRoute.type === 'downloader') {
      navigateTo(`/${newLang}/${currentRoute.slug}`);
    } else if (currentRoute.type === 'guide') {
      navigateTo(`/${newLang}/guide/${currentRoute.guideSlug}`);
    } else {
      navigateTo(`/${newLang}/`);
    }
  };

  return (
    <LanguageProvider initialLang={activeLocale}>
      {/* 1. Downloader Page (e.g. /ar/reels-downloader, /fr/reels-downloader, /en/video-downloader) */}
      {currentRoute.type === 'downloader' && (() => {
        const meta =
          initialRoute.type === 'downloader' && currentRoute.locale === initialRoute.locale && initialDownloaderData
            ? initialDownloaderData
            : getDownloaderDataForLocale(currentRoute.locale, currentRoute.slug);

        return (
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
            <Header
              activeTab={meta.type}
              onSelectTab={(tab) => {
                const match = DOWNLOADER_PAGES.find((p) => p.type === tab);
                if (match) {
                  navigateTo(`/${currentRoute.locale}/${match.slug}`);
                }
              }}
              onOpenAdmin={() => setAdminOpen(true)}
              onNavigateHome={() => navigateTo(`/${currentRoute.locale}/`)}
              onLanguageChange={handleLanguageChange}
            />

            <main className="flex-1">
              <DownloaderPageView
                meta={meta}
                locale={currentRoute.locale}
                onNavigateTool={(targetSlug) => navigateTo(`/${currentRoute.locale}/${targetSlug}`)}
                onNavigateGuide={(gSlug) => navigateTo(`/${currentRoute.locale}/guide/${gSlug}`)}
                onNavigateHome={() => navigateTo(`/${currentRoute.locale}/`)}
              />
            </main>

            <Footer
              onOpenAdmin={() => setAdminOpen(true)}
              onNavigateHome={() => navigateTo(`/${currentRoute.locale}/`)}
              onNavigateTool={(targetSlug) => navigateTo(`/${currentRoute.locale}/${targetSlug}`)}
              onNavigateGuide={(gSlug) => navigateTo(`/${currentRoute.locale}/guide/${gSlug}`)}
            />

            <AdminModal
              isOpen={adminOpen}
              onClose={() => setAdminOpen(false)}
              onPreviewPseoPage={(page) => setPreviewPseoPage(page)}
            />
          </div>
        );
      })()}

      {/* 2. Guide Page (e.g. /ar/guide/how-to-download-instagram-reels) */}
      {currentRoute.type === 'guide' && (() => {
        const guide =
          GUIDE_PAGES.find((g) => g.slug === currentRoute.guideSlug) ||
          initialGuideData ||
          GUIDE_PAGES[0];

        return (
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
            <Header
              activeTab={guide.category}
              onSelectTab={(tab) => {
                const match = DOWNLOADER_PAGES.find((p) => p.type === tab);
                if (match) {
                  navigateTo(`/${currentRoute.locale}/${match.slug}`);
                }
              }}
              onOpenAdmin={() => setAdminOpen(true)}
              onNavigateHome={() => navigateTo(`/${currentRoute.locale}/`)}
              onLanguageChange={handleLanguageChange}
            />

            <main className="flex-1">
              <GuidePageView
                guide={guide}
                locale={currentRoute.locale}
                onNavigateHome={() => navigateTo(`/${currentRoute.locale}/`)}
                onNavigateTool={(targetSlug) => navigateTo(`/${currentRoute.locale}/${targetSlug}`)}
                onBack={() => navigateTo(`/${currentRoute.locale}/`)}
              />
            </main>

            <Footer
              onOpenAdmin={() => setAdminOpen(true)}
              onNavigateHome={() => navigateTo(`/${currentRoute.locale}/`)}
              onNavigateTool={(targetSlug) => navigateTo(`/${currentRoute.locale}/${targetSlug}`)}
              onNavigateGuide={(gSlug) => navigateTo(`/${currentRoute.locale}/guide/${gSlug}`)}
            />

            <AdminModal
              isOpen={adminOpen}
              onClose={() => setAdminOpen(false)}
              onPreviewPseoPage={(page) => setPreviewPseoPage(page)}
            />
          </div>
        );
      })()}

      {/* 3. Localized or Root Homepage, Smart URL, or Legacy pSEO */}
      {(currentRoute.type === 'home' || currentRoute.type === 'smart-media' || currentRoute.type === 'pseo-legacy' || currentRoute.type === 'not-found') && (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-pink-500 selection:text-white">
          {/* Top Notification Announcement Bar */}
          <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white text-[11px] sm:text-xs font-semibold py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span>
              insta1000gram Engine 3.2 • Multi-stream 1080p resolution active • Free &amp; Anonymous
            </span>
          </div>

          {/* Smart URL banner if smart-media */}
          {currentRoute.type === 'smart-media' && (
            <div className="bg-slate-900 border-b border-pink-500/30 text-white px-4 py-3 sm:py-3.5">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                  <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                    <Zap className="w-4 h-4 animate-bounce" />
                  </span>
                  <span>
                    <strong>Smart URL Shortcut Activated:</strong> Converted{' '}
                    <span className="text-slate-400 line-through">instagram.com</span> to{' '}
                    <span className="text-pink-400 font-bold">insta1000gram.com</span>. Resolving{' '}
                    <span className="font-mono text-pink-300 font-bold">
                      {currentRoute.mediaType.toUpperCase()} ({currentRoute.mediaId})
                    </span>
                    ...
                  </span>
                </div>
                <button
                  onClick={() => navigateTo(`/${activeLocale}/`)}
                  className="text-xs text-slate-400 hover:text-white underline shrink-0 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <Header
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setDownloadResult(null);
              const match = DOWNLOADER_PAGES.find((p) => p.type === tab);
              if (match) {
                navigateTo(`/${activeLocale}/${match.slug}`);
              }
            }}
            onOpenAdmin={() => setAdminOpen(true)}
            onNavigateHome={() => {
              setDownloadResult(null);
              navigateTo(`/${activeLocale}/`);
            }}
            onLanguageChange={handleLanguageChange}
          />

          <main className="flex-1">
            {/* If legacy pSEO page */}
            {initialPseoData ? (
              <PseoPageView
                page={initialPseoData}
                onBack={() => navigateTo(`/${activeLocale}/`)}
                onOpenAdmin={() => setAdminOpen(true)}
              />
            ) : previewPseoPage ? (
              <PseoPageView
                page={previewPseoPage}
                onBack={() => setPreviewPseoPage(null)}
                onOpenAdmin={() => setAdminOpen(true)}
              />
            ) : (
              <>
                {/* Hero Downloader Section */}
                <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-radial from-pink-500/5 via-slate-50 to-slate-50">
                  <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 shadow-2xs mb-6 text-slate-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>1080p Ultra HD Video &amp; Photo Downloader</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                      Download Instagram Reels, Photos, Videos &amp; Stories
                    </h1>

                    <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
                      High-speed anonymous Instagram downloader. Save Reels in full 1080p 60fps HD, carousel photos, audio tracks, and stories without login.
                    </p>

                    <div className="mt-8 sm:mt-10">
                      <DownloaderBox
                        activeTab={activeTab}
                        onSelectTab={(tab) => setActiveTab(tab)}
                        onResult={(res) => setDownloadResult(res)}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        initialUrl={currentRoute.type === 'smart-media' ? currentRoute.instagramUrl : undefined}
                        autoTrigger={currentRoute.type === 'smart-media'}
                      />
                    </div>

                    {downloadResult && (
                      <div className="mt-8">
                        <ResultCard
                          result={downloadResult}
                          onClear={() => setDownloadResult(null)}
                        />
                      </div>
                    )}
                  </div>
                </section>

                <Features />
                <HowToGuide />
                <PseoDirectory onSelectPseoPage={(page) => setPreviewPseoPage(page)} />
                <FaqSection />
              </>
            )}
          </main>

          <Footer
            onOpenAdmin={() => setAdminOpen(true)}
            onNavigateHome={() => {
              setPreviewPseoPage(null);
              setDownloadResult(null);
              navigateTo(`/${activeLocale}/`);
            }}
            onNavigateTool={(targetSlug) => navigateTo(`/${activeLocale}/${targetSlug}`)}
            onNavigateGuide={(gSlug) => navigateTo(`/${activeLocale}/guide/${gSlug}`)}
          />

          <AdminModal
            isOpen={adminOpen}
            onClose={() => setAdminOpen(false)}
            onPreviewPseoPage={(page) => {
              setPreviewPseoPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}
    </LanguageProvider>
  );
}
