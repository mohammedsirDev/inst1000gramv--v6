import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Clipboard, Download, X, Sparkles, Smartphone, ArrowRight } from 'lucide-react';
import { extractInstagramUrlFromShared } from '../utils/router';

interface ClipboardDetectorBannerProps {
  onDownloadUrl: (url: string) => void;
  onOpenIOSShareGuide?: () => void;
}

export const ClipboardDetectorBanner: React.FC<ClipboardDetectorBannerProps> = ({
  onDownloadUrl,
  onOpenIOSShareGuide,
}) => {
  const { currentLang } = useLanguage();
  const isAr = currentLang === 'ar';

  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(new Set());
  const checkedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const checkClipboardForInstagramUrl = async () => {
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
          return;
        }
        // Only attempt reading if document is focused to prevent browser warnings
        if (document.hasFocus && !document.hasFocus()) return;

        const text = await navigator.clipboard.readText();
        if (text && (text.includes('instagram.com') || text.includes('sssclips.com'))) {
          const clean = extractInstagramUrlFromShared(text);
          if (clean && !dismissedUrls.has(clean)) {
            setDetectedUrl(clean);
          }
        }
      } catch {
        // Safari / iOS may restrict clipboard access without user gesture; silently ignore
      }
    };

    // Check on window focus and visibility change (e.g. user copied link in Instagram then switched back to sssclips)
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkClipboardForInstagramUrl();
      }
    };

    // Run initial check after slight delay
    const initialTimer = setTimeout(() => {
      checkClipboardForInstagramUrl();
    }, 800);

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [dismissedUrls]);

  const handleDismiss = () => {
    if (detectedUrl) {
      setDismissedUrls((prev) => new Set(prev).add(detectedUrl));
    }
    setDetectedUrl(null);
  };

  const handleDownload = () => {
    if (detectedUrl) {
      onDownloadUrl(detectedUrl);
      setDetectedUrl(null);
    }
  };

  const handleManualClipboardPaste = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text) {
          const clean = extractInstagramUrlFromShared(text);
          if (clean) {
            onDownloadUrl(clean);
            return;
          }
        }
      }
    } catch {
      // Ignored
    }
  };

  if (!detectedUrl) {
    return null;
  }

  return (
    <div className="fixed top-16 sm:top-20 inset-x-0 z-50 px-4 sm:px-6 pointer-events-none animate-in slide-in-from-top-4 duration-300">
      <div className="max-w-2xl mx-auto bg-slate-900/95 border-2 border-pink-500/80 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-pink-500/20 backdrop-blur-md pointer-events-auto text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
            <Clipboard className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase font-black bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/30">
                {isAr ? 'تم نسخ الرابط' : 'Link Copied'}
              </span>
              <span className="text-xs font-bold text-slate-200">
                {isAr ? 'تم اكتشاف رابط انستقرام!' : 'Instagram link detected!'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-300 truncate max-w-xs sm:max-w-sm">
              {detectedUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAr ? 'تحميل الآن (1080p)' : 'Download Now (1080p)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
