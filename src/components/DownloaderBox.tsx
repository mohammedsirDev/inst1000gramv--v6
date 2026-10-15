import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MediaType, InstagramMediaResult } from '../types';
import { detectMediaTypeFromUrl } from '../utils/router';
import { Download, Clipboard, X, Loader2, Sparkles, Wifi, ShieldCheck, Film, Video, Image, History, Tv, Share2, Smartphone } from 'lucide-react';
import { IOSShareModal } from './IOSShareModal';

interface DownloaderBoxProps {
  activeTab: MediaType;
  onSelectTab: (tab: MediaType) => void;
  onResult: (result: InstagramMediaResult) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  initialUrl?: string;
  autoTrigger?: boolean;
}

export const DownloaderBox: React.FC<DownloaderBoxProps> = ({
  activeTab,
  onSelectTab,
  onResult,
  isLoading,
  setIsLoading,
  initialUrl,
  autoTrigger,
}) => {
  const { translations, currentLang } = useLanguage();
  const isAr = currentLang === 'ar';
  const [url, setUrl] = useState(initialUrl || '');
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIOS(/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()));
    }
  }, []);

  const sampleLinks: { label: string; url: string; type: MediaType }[] = [
    {
      label: isAr
        ? '🎬 ريلز تجريبي (1080p)'
        : `🎬 ${translations.navReels || 'Verified Reel'} (1080p)`,
      url: 'https://www.instagram.com/reel/DdclRxYT4UJ/?stkn=cTdwcjg3Njl6amw2',
      type: 'reel',
    },
    {
      label: isAr
        ? '📸 ألبوم صور تجريبي'
        : `📸 ${translations.navPhoto || 'Verified Post'} (HD)`,
      url: 'https://www.instagram.com/p/Ddl1lsKjgw_/?stkn=MWFvZWZocGs3ODZiZw==',
      type: 'photo',
    },
    {
      label: isAr
        ? '✨ ستوري تجريبي (فيديو)'
        : `✨ ${translations.navStories || 'Verified Story'} (HD)`,
      url: 'https://www.instagram.com/stories/chikafakeid/3991863628785469455?utm_source=ig_story_item_share&stkn=MXhqbHBqMWl3MGFyMQ==',
      type: 'story',
    },
  ];

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setUrl(clean);
        setError(null);
        // If it looks like an Instagram URL, automatically start the resolution
        if (clean.includes('instagram.com') || clean.includes('sssclips.com')) {
          handleDownload(clean);
        }
      } else {
        setError(
          isAr
            ? 'الحافظة فارغة، يرجى نسخ رابط المنشور من انستقرام أولاً.'
            : 'Clipboard is empty. Please copy a link from Instagram first.'
        );
      }
    } catch {
      setError(
        isAr
          ? 'اضغط مطولاً داخل الصندوق واختر "لصق" لإدراج الرابط.'
          : 'Tap and hold the input box, then tap "Paste" to insert your link.'
      );
    }
  };

  const handleDownload = async (customUrl?: string) => {
    let targetUrl = (customUrl || url).trim();
    if (!targetUrl) {
      setError(translations.inputPlaceholder);
      return;
    }

    // Auto-normalize if user typed or pasted sssclips.com, sssclips, 1kgram.com, or insta1000gram.com URL
    if (
      targetUrl.includes('sssclips.com') ||
      targetUrl.includes('sssclips') ||
      targetUrl.includes('1kgram.com') ||
      targetUrl.includes('insta1000gram.com') ||
      targetUrl.includes('inst1000gram.com')
    ) {
      targetUrl = targetUrl
        .replace(/^(https?:\/\/)?(www\.)?sssclips\.com/i, 'https://www.instagram.com')
        .replace(/^(https?:\/\/)?(www\.)?sssclips/i, 'https://www.instagram.com')
        .replace(/^(https?:\/\/)?(www\.)?1kgram\.com/i, 'https://www.instagram.com')
        .replace(/^(https?:\/\/)?(www\.)?insta(1000)?gram\.com/i, 'https://www.instagram.com')
        .replace(/^(https?:\/\/)?(www\.)?inst(1000)?gram\.com/i, 'https://www.instagram.com');
      setUrl(targetUrl);
    }

    if (targetUrl.startsWith('/')) {
      targetUrl = 'https://www.instagram.com' + targetUrl;
      setUrl(targetUrl);
    }

    // Detect URL media type BEFORE media extraction and update selectedType / activeTab immediately!
    const detectedType = detectMediaTypeFromUrl(targetUrl);
    onSelectTab(detectedType);

    setError(null);
    setIsLoading(true);
    setRetryCount(0);
    setStatusMessage(translations.resolvingText);

    try {
      const stepTimer = setTimeout(() => {
        setStatusMessage(translations.processingStream);
      }, 500);

      const envApi = (typeof import.meta !== 'undefined' && ((import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.NEXT_PUBLIC_API_URL)) || '';
      const candidateEndpoints: string[] = [];

      // 1. Primary relative serverless/local endpoints:
      candidateEndpoints.push('/api/instagram/resolve');
      candidateEndpoints.push('/api/instagram/resolve/');

      // 2. Custom environment-specified endpoint (if configured and not already root):
      if (envApi && !envApi.startsWith('/')) {
        const cleanEnv = envApi.replace(/\/$/, '');
        candidateEndpoints.push(`${cleanEnv}/api/instagram/resolve`);
        candidateEndpoints.push(`${cleanEnv}/api/instagram/resolve/`);
      }

      // 3. Redundant backup server on PythonAnywhere:
      candidateEndpoints.push('https://simo1999.pythonanywhere.com/api/instagram/resolve/');

      // Filter duplicates while preserving priority order
      const uniqueEndpoints = Array.from(new Set(candidateEndpoints));

      let lastError: Error | null = null;
      let successfulData: InstagramMediaResult | null = null;

      for (let i = 0; i < uniqueEndpoints.length; i++) {
        const endpoint = uniqueEndpoints[i];
        if (i > 0) {
          setRetryCount(i);
          setStatusMessage(`${translations.retryAttempt || 'Retrying stream through backup edge CDN...'} (${i + 1}/${uniqueEndpoints.length})`);
        }

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: targetUrl,
              mediaType: detectedType,
            }),
          });

          if (res.ok) {
            successfulData = await res.json();
            break;
          }

          const errorJson = await res.json().catch(() => null);
          const serverError = errorJson?.error;
          const suggestion = errorJson?.suggestion ? ` ${errorJson.suggestion}` : '';

          // If the server answered with an Instagram media condition (private, invalid, rate limit):
          if (res.status === 403 || errorJson?.code === 'PRIVATE_MEDIA' || errorJson?.isPrivate) {
            const privateErrMsg =
              serverError ||
              (isAr
                ? '🔒 هذا الحساب أو المنشور خاص (Private Account). يقيد انستقرام التحميل من الحسابات العامة فقط. يرجى التأكد من أن الحساب عام.'
                : '🔒 Private Account: This Instagram Reel or Post is from a private account. Instagram restricts media downloads to public accounts only. Please verify that the post is from a public profile.');
            setError(privateErrMsg);
            setIsLoading(false);
            setStatusMessage('');
            clearTimeout(stepTimer);
            return;
          }
          if (res.status === 400) {
            lastError = new Error(
              serverError || 'Invalid Instagram URL format (400). Please provide a valid Instagram post, reel, story, or highlight link.'
            );
            continue;
          }
          if (res.status === 429) {
            lastError = new Error(
              serverError || 'Instagram rate limit reached (429). Please wait a few seconds and try again.'
            );
            continue;
          }
          if (res.status === 422) {
            if (serverError?.toLowerCase().includes('private') || errorJson?.isPrivate) {
              const privateErrMsg =
                serverError ||
                (isAr
                  ? '🔒 هذا المنشور أو الحساب خاص (Private Account). يسمح انستقرام بالتحميل من الحسابات العامة فقط.'
                  : '🔒 Private Account: This Instagram media is private. Instagram restricts downloads to public accounts only.');
              setError(privateErrMsg);
              setIsLoading(false);
              setStatusMessage('');
              clearTimeout(stepTimer);
              return;
            }
            lastError = new Error(
              (serverError ? `${serverError}${suggestion}` : null) ||
              'Could not extract media for this Instagram URL. The media might be private, expired, or age-restricted.'
            );
            continue;
          }

          // If it was a 404 (endpoint not found on this host), save error and allow loop to try backup endpoint!
          if (res.status === 404) {
            lastError = new Error(
              serverError || `API route not found (404) at ${endpoint}. Attempting backup node...`
            );
            continue;
          }

          if (res.status >= 500) {
            lastError = new Error(
              serverError || `Server error (${res.status}) on ${endpoint}. Attempting backup node...`
            );
            continue;
          }

          lastError = new Error(serverError || `Request failed with HTTP ${res.status}`);
        } catch (fetchErr: any) {
          lastError = fetchErr;
        }
      }

      clearTimeout(stepTimer);

      if (!successfulData) {
        if (lastError) {
          throw lastError;
        }
        throw new Error('All Instagram API nodes are temporarily unreachable. Please verify your connection.');
      }

      onResult(successfulData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Unable to resolve Instagram media stream. Please verify the URL.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // Auto-trigger if initialUrl and autoTrigger passed
  React.useEffect(() => {
    if (initialUrl && autoTrigger) {
      setUrl(initialUrl);
      handleDownload(initialUrl);
    }
  }, [initialUrl, autoTrigger]);

  const isMatchingTab = (itemType: MediaType, currentTab: MediaType) => {
    if (itemType === currentTab) return true;
    if ((itemType === 'reel' || itemType === 'reels') && (currentTab === 'reel' || currentTab === 'reels')) return true;
    if ((itemType === 'story' || itemType === 'stories') && (currentTab === 'story' || currentTab === 'stories')) return true;
    if ((itemType === 'highlight' || itemType === 'highlights') && (currentTab === 'highlight' || currentTab === 'highlights')) return true;
    if ((itemType === 'photo' || itemType === 'carousel') && (currentTab === 'photo' || currentTab === 'carousel')) return true;
    return false;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Downloader Card Box */}
      <div className="bg-slate-900/95 rounded-3xl p-4 sm:p-7 shadow-2xl shadow-black/50 border border-slate-800 relative overflow-hidden transition-all backdrop-blur-md">
        {/* Subtle accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600" />

        {/* Tab Pills for Filter */}
        <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {[
            { id: 'reel', label: translations.navReels, icon: <Film className="w-3.5 h-3.5" /> },
            { id: 'video', label: translations.navVideo, icon: <Video className="w-3.5 h-3.5" /> },
            { id: 'photo', label: translations.navPhoto, icon: <Image className="w-3.5 h-3.5" /> },
            { id: 'story', label: translations.navStories, icon: <History className="w-3.5 h-3.5" /> },
            { id: 'highlight', label: translations.navHighlights, icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'igtv', label: translations.navIgtv || 'IGTV', icon: <Tv className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isSelected = isMatchingTab(tab.id as MediaType, activeTab);
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id as MediaType)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Input Form */}
        <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDownload();
              }}
              placeholder={translations.inputPlaceholder}
              className="w-full h-14 sm:h-16 pl-4 pr-24 rtl:pr-4 rtl:pl-24 bg-slate-950 border-2 border-slate-800 focus:border-pink-500 focus:bg-slate-950 focus:outline-none rounded-2xl text-sm sm:text-base text-white placeholder-slate-500 transition-all font-medium"
            />

            {/* Clear and Paste buttons inside input */}
            <div className="absolute top-1/2 -translate-y-1/2 right-2.5 rtl:right-auto rtl:left-2.5 flex items-center gap-1.5">
              {url && (
                <button
                  onClick={() => setUrl('')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handlePaste}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-xs hover:text-pink-400 transition-all cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{translations.pasteBtn}</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDownload()}
            className="h-14 sm:h-16 px-6 sm:px-8 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-base sm:text-lg rounded-2xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{translations.resolvingText.split('...')[0]}</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>{translations.downloadBtn}</span>
              </>
            )}
          </button>
        </div>

        {/* iPhone Share Sheet Helper Callout */}
        {isIOS && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-300 bg-purple-950/40 border border-purple-800/50 px-3.5 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">
                {isAr ? 'مستخدم آيفون؟ يمكنك إضافة sssclips لقائمة المشاركة بنقرة واحدة.' : 'On iPhone? Add sssclips directly to your iOS Share Sheet.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSModal(true)}
              className="text-pink-400 hover:text-pink-300 font-extrabold underline cursor-pointer text-[11px] shrink-0"
            >
              {isAr ? 'طريقة الإعداد' : 'How it works'}
            </button>
          </div>
        )}

        {/* Error / Private Account Message */}
        {error && (
          <div
            className={`mt-3.5 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in ${
              error.includes('Private') || error.includes('خاص')
                ? 'bg-amber-950/40 border border-amber-600/60 text-amber-200'
                : 'bg-rose-950/40 border border-rose-600/60 text-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                error.includes('Private') || error.includes('خاص') ? 'bg-amber-400' : 'bg-rose-500'
              }`}
            />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Dynamic Loading Step Notification */}
        {isLoading && statusMessage && (
          <div className="mt-3.5 p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
              <span className="font-semibold text-slate-200">{statusMessage}</span>
            </div>
            {retryCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-900/60 text-amber-300 font-mono text-[11px] rounded-md font-bold border border-amber-700/60">
                Relay Switch #{retryCount}
              </span>
            )}
          </div>
        )}

        {/* Quick Sample Links & Network Resilience Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              {translations.quickTestLabel}
            </span>
            {sampleLinks.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUrl(s.url);
                  onSelectTab(s.type);
                  handleDownload(s.url);
                }}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-pink-950/40 hover:text-pink-300 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700/60 cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/60">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">{translations.reliableNetworkBadge}</span>
          </div>
        </div>
      </div>

      {/* Dedicated iOS Share Sheet Setup Modal */}
      <IOSShareModal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
      />
    </div>
  );
};
