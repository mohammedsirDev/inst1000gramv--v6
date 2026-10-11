import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ResultCard } from './ResultCard';
import { DownloaderBox } from './DownloaderBox';
import { InstagramMediaResult, MediaType } from '../types';
import { extractInstagramUrlFromShared, detectMediaTypeFromUrl } from '../utils/router';
import { Share2, Loader2, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react';

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

  useEffect(() => {
    // 1. Read url and text from window.location.search
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const rawUrlParam = params.get('url') || '';
    const rawTextParam = params.get('text') || '';
    const combined = rawUrlParam || rawTextParam;

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

    // 3. Call existing download extraction API
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
      } catch (err: any) {
        setError(err?.message || (isAr ? 'تعذر استخراج الوسائط' : 'Extraction failed.'));
      } finally {
        setIsLoading(false);
      }
    };

    resolveMedia();
  }, []);

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
