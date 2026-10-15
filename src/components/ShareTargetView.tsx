import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ResultCard } from './ResultCard';
import { DownloaderBox } from './DownloaderBox';
import { InstagramMediaResult, MediaType } from '../types';
import { extractInstagramUrlFromShared, detectMediaTypeFromUrl } from '../utils/router';
import {
  Share2,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Download,
  Zap,
  CheckCircle2,
  Settings2,
  Smartphone,
  Info,
} from 'lucide-react';

interface ShareTargetViewProps {
  onBackHome: () => void;
}

export const ShareTargetView: React.FC<ShareTargetViewProps> = ({ onBackHome }) => {
  const { currentLang } = useLanguage();
  const isAr = currentLang === 'ar';

  const [sharedRawUrl, setSharedRawUrl] = useState<string>('');
  const [cleanInstagramUrl, setCleanInstagramUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstagramMediaResult | null>(null);
  const [activeTab, setActiveTab] = useState<MediaType>('reel');

  // Auto-download preference & countdown state
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sssclips_auto_download') === 'true';
  });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleAutoDownload = (enabled: boolean) => {
    setAutoDownloadEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sssclips_auto_download', enabled ? 'true' : 'false');
    }
    if (!enabled && countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      setCountdown(null);
    }
  };

  const triggerDownloadAction = () => {
    if (!result) return;
    setDownloadTriggered(true);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      setCountdown(null);
    }

    const targetUrl =
      result.videoUrl ||
      result.directUrl ||
      (result.slides && result.slides[0]?.url) ||
      '';
    const ext = result.type === 'photo' ? 'jpg' : 'mp4';
    const safeFilename = `sssclips_${result.type || 'reel'}_${result.shortcode || 'video'}.${ext}`;

    const downloadProxyUrl = `/api/download/proxy?url=${encodeURIComponent(
      targetUrl
    )}&filename=${encodeURIComponent(safeFilename)}&type=${result.type === 'photo' ? 'photo' : 'video'}`;

    const anchor = document.createElement('a');
    anchor.href = downloadProxyUrl;
    anchor.download = safeFilename;
    anchor.target = '_self';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  useEffect(() => {
    // 1. Read url, text, and title from window.location.search
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const rawUrlParam = params.get('url') || '';
    const rawTextParam = params.get('text') || '';
    const rawTitleParam = params.get('title') || '';
    const combined = rawUrlParam || rawTextParam || rawTitleParam;

    setSharedRawUrl(combined);

    // 2. Extract clean Instagram link
    const extracted = extractInstagramUrlFromShared(combined);
    setCleanInstagramUrl(extracted);

    if (!extracted) {
      setIsLoading(false);
      setError(
        isAr
          ? 'لم يتم العثور على رابط انستقرام في المشاركة. يمكنك لصق الرابط يدوياً أدناه.'
          : 'No valid Instagram link was found in the shared text. You can paste the link below.'
      );
      return;
    }

    const detected = detectMediaTypeFromUrl(extracted);
    setActiveTab(detected);

    // 3. Call download extraction API
    const resolveMedia = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/instagram/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: extracted,
            mediaType: detected,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Download extraction failed (HTTP ${res.status})`);
        }

        const data: InstagramMediaResult = await res.json();
        setResult(data);

        // If user enabled auto-download, start a 3-second countdown
        const shouldAuto = localStorage.getItem('sssclips_auto_download') === 'true';
        if (shouldAuto) {
          setCountdown(3);
        }
      } catch (err: any) {
        setError(err?.message || (isAr ? 'تعذر استخراج الوسائط' : 'Extraction failed.'));
      } finally {
        setIsLoading(false);
      }
    };

    resolveMedia();

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // Handle countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (countdown === 0) {
      triggerDownloadAction();
      setCountdown(null);
    }
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [countdown]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 my-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">
              {isAr ? 'مشاركة من تطبيق انستقرام' : 'Shared from Instagram'}
            </h1>
            <p className="text-xs text-slate-400">
              {cleanInstagramUrl ? (
                <span className="font-mono text-pink-400 truncate max-w-xs sm:max-w-md inline-block">
                  {cleanInstagramUrl}
                </span>
              ) : (
                isAr ? 'جاري تجهيز التحميل المباشر...' : 'Preparing direct media download...'
              )}
            </p>
          </div>
        </div>

        <button
          onClick={onBackHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{isAr ? 'الرئيسية' : 'Home'}</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-pink-500/30 border-t-pink-500 animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-pink-400 absolute inset-0 m-auto" />
          </div>
          <h2 className="text-lg font-black text-white mb-1">
            {isAr ? 'جاري استخراج الفيديو بجودة 1080p...' : 'Resolving 1080p Full HD Stream...'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isAr
              ? 'يتم الاتصال بسيرفرات انستقرام الأصلية لتحميل الريلز أو المنشور بدون علامة مائية...'
              : 'Connecting to master edge CDN to prepare your watermark-free video...'}
          </p>
        </div>
      )}

      {/* Quick Action & Auto-Download Control Bar */}
      {!isLoading && result && (
        <div className="mb-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isAr ? 'جاهز للتحميل بجودة 1080p' : 'Ready in 1080p Full HD'}
                </span>
                {downloadTriggered && (
                  <span className="text-[11px] text-pink-400 font-bold animate-pulse">
                    {isAr ? 'بدأ التنزيل على جهازك!' : 'Download started on your device!'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {isAr
                  ? 'تم استخراج الفيديو بنجاح من انستقرام بأعلى دقة أصلية بدون علامة مائية.'
                  : 'Successfully extracted master media with zero compression & no watermark.'}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              {countdown !== null && countdown > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerDownloadAction}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 cursor-pointer animate-pulse"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isAr ? `تحميل الآن (${countdown} ثوانٍ)` : `Download Now (${countdown}s)`}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                      setCountdown(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Pause'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={triggerDownloadAction}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-pink-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>{isAr ? 'تحميل مباشر بنقرة واحدة (1080p)' : 'Instant 1-Tap Download (1080p)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* User Preference: Auto vs Manual */}
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                {isAr
                  ? 'التحميل اليدوي بنقرة واحدة يضمن نجاح التنزيل 100% دون أن يحظره المتصفح.'
                  : 'Manual 1-tap download is recommended to prevent mobile browser pop-up blocks.'}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoDownloadEnabled}
                onChange={(e) => toggleAutoDownload(e.target.checked)}
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 focus:ring-offset-slate-900 bg-slate-800 border-slate-700"
              />
              <span className="font-semibold text-slate-300">
                {isAr ? 'تفعيل التنزيل التلقائي عند المشاركة' : 'Auto-download automatically on share'}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Display the video ready to download when extracted */}
      {!isLoading && result && (
        <ResultCard
          result={result}
          onClear={() => {
            setResult(null);
            onBackHome();
          }}
        />
      )}

      {/* Error or manual fallback input */}
      {!isLoading && !result && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-2xl text-xs sm:text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <p className="text-xs sm:text-sm text-slate-300 font-bold mb-4">
              {isAr
                ? 'ألصق رابط المنشور أو الريلز أدناه للتحميل الفوري:'
                : 'Paste your Instagram post or reel link below for instant download:'}
            </p>
            <DownloaderBox
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onResult={(res) => setResult(res)}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              initialUrl={cleanInstagramUrl || sharedRawUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
};
