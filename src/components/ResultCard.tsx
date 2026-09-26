import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { useLanguage } from '../context/LanguageContext';
import { InstagramMediaResult, MediaFormat } from '../types';
import {
  Download,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Music,
  Heart,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Play,
  Share2,
  Sparkles,
  QrCode,
  Smartphone,
  Copy,
  Check,
  X,
  Radio,
  Loader2,
  Archive,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export interface DownloadProgressInfo {
  formatId: string;
  filename: string;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedText?: string;
  downloadUrl?: string;
  status: 'connecting' | 'downloading' | 'completed' | 'error';
  errorMessage?: string;
}

interface ResultCardProps {
  result: InstagramMediaResult;
  onClear: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onClear }) => {
  const { translations, currentLang } = useLanguage();
  const isAr = currentLang === 'ar';

  const localizeQualityLabel = (q: string): string => {
    if (!isAr) return q;
    return q
      .replace(/1080p Full HD \(Original Video\)/i, '1080p Full HD (الفيديو الأصلي)')
      .replace(/1080p Full HD \(MP4\)/i, '1080p Full HD (فيديو MP4)')
      .replace(/1080p Full HD \(Item #(\d+)\)/i, '1080p Full HD (العنصر #$1)')
      .replace(/720p HD \(Fast Mobile\)/i, '720p HD (سريع للهاتف)')
      .replace(/720p HD \(MP4\)/i, '720p HD (فيديو MP4)')
      .replace(/Original Master HD \(JPG\)/i, 'الدقة الأصلية الكاملة (JPG)')
      .replace(/Original Resolution \(JPG\)/i, 'الدقة الأصلية الكاملة (JPG)')
      .replace(/Original Photo \(Item #(\d+)\)/i, 'الصورة الأصلية (العنصر #$1)')
      .replace(/Audio Only \(MP3\)/i, 'الصوت فقط (MP3)')
      .replace(/Download All (\d+) Items \(\.ZIP Archive\)/i, 'تحميل جميع العناصر ($1) كملف مضغوط (.ZIP)');
  };

  const localizeResolutionLabel = (r?: string): string => {
    if (!r || !isAr) return r || '';
    return r
      .replace(/Original MP4 Stream/i, 'بث MP4 الأصلي')
      .replace(/1080x1920 Full HD/i, '1080x1920 دقة كاملة')
      .replace(/720x1280 HD/i, '720x1280 عالي الوضوح')
      .replace(/320 kbps Original Track/i, '320 kbps المسار الصوتي الأصلي')
      .replace(/Original Full HD/i, 'الدقة الأصلية الكاملة')
      .replace(/Fast Mobile/i, 'سريع للهاتف')
      .replace(/Full HD Photo/i, 'صورة عالية الوضوح')
      .replace(/320kbps Stereo Audio/i, 'صوت ستيريو 320kbps')
      .replace(/Full Album/i, 'الألبوم الكامل');
  };

  const localizeSizeLabel = (s?: string): string => {
    if (!s || !isAr) return s || '';
    return s
      .replace(/High Definition/i, 'دقة فائقة الوضوح')
      .replace(/Standard HD/i, 'دقة قياسية')
      .replace(/Original Audio/i, 'صوت أصلي نقي')
      .replace(/Lossless Original/i, 'جودة أصلية بدون ضغط');
  };

  const localizeMediaBadge = (t?: string): string => {
    if (!t) return isAr ? 'وسائط' : 'MEDIA';
    const lower = t.toLowerCase();
    if (lower === 'highlight' || lower === 'highlights') return translations.highlightItems || (isAr ? 'الهايلايت' : 'Highlight');
    if (lower === 'carousel') return translations.carouselSlides || (isAr ? 'ألبوم متعدد' : 'Carousel');
    if (lower === 'stories' || lower === 'story') return translations.storiesList || (isAr ? 'ستوري' : 'Story');
    if (lower === 'reels' || lower === 'reel') return translations.navReels || (isAr ? 'ريلز' : 'REELS');
    if (lower === 'video') return translations.navVideo || (isAr ? 'فيديو' : 'VIDEO');
    if (lower === 'photo') return translations.navPhoto || (isAr ? 'صور' : 'PHOTO');
    return t.toUpperCase();
  };
  const safeLikesCount = Number(result?.likesCount ?? 0) || 0;
  const safeCommentsCount = Number(result?.commentsCount ?? 0) || 0;
  const safeNetworkLatencyMs = Number(result?.networkLatencyMs ?? 45) || 45;
  const safeMediaType = result?.type || (result?.mediaType as any) || 'video';
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressInfo | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(result?.selectedIndex ?? 0);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<{ text: string; url?: string } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [selectedQrFormat, setSelectedQrFormat] = useState<MediaFormat | null>(null);
  const [qrMode, setQrMode] = useState<'direct' | 'proxy'>('direct');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrShortUrl, setQrShortUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  useEffect(() => {
    if (typeof result?.selectedIndex === 'number') {
      setActiveSlideIndex(result.selectedIndex);
    } else {
      setActiveSlideIndex(0);
    }
  }, [result?.selectedIndex, result?.id]);

  const authorUsername = result?.author?.username || 'instagram_user';
  const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorUsername)}&background=E1306C&color=fff&size=160&bold=true`;
  const [authorAvatarSrc, setAuthorAvatarSrc] = useState<string>(result?.author?.avatar || fallbackAvatarUrl);

  useEffect(() => {
    setAuthorAvatarSrc(result?.author?.avatar || fallbackAvatarUrl);
  }, [result?.author?.avatar, result?.author?.username]);

  const currentSlide = result?.slides && result.slides[activeSlideIndex];
  const isSlideVideo = currentSlide ? currentSlide.type === 'video' : (safeMediaType !== 'photo' && Boolean(result?.videoUrl));
  const activeVideoUrl = currentSlide?.videoUrl || (currentSlide?.type === 'video' ? currentSlide.url : result?.videoUrl);
  const activeThumbnail = currentSlide?.thumbnail || result?.thumbnail;

  // Dynamically compute available formats for the currently selected slide or main item
  const activeFormats: MediaFormat[] = useMemo(() => {
    if (!currentSlide) return result?.formats || [];

    const isVid = currentSlide.type === 'video';
    const targetUrl = currentSlide.downloadUrl || currentSlide.url;
    const directUrl = currentSlide.directUrl || targetUrl;
    const slideNum = activeSlideIndex + 1;
    const isHighlight = result.type === 'highlight';
    const isCarousel = result.type === 'carousel';
    const prefix = isHighlight ? 'highlight' : (isCarousel ? 'carousel' : 'media');

    const dynamicList: MediaFormat[] = [];
    if (isVid) {
      dynamicList.push({
        id: `slide-fmt-1080p-${activeSlideIndex}`,
        quality: `1080p Full HD (MP4)`,
        resolution: currentSlide.resolution || '1080x1920 Full HD',
        extension: 'mp4',
        size: 'High Definition',
        downloadUrl: currentSlide.downloadUrl || `/api/download/proxy?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(`insta1000gram_${prefix}_${slideNum}.mp4`)}&type=video`,
        directUrl,
      });
      dynamicList.push({
        id: `slide-fmt-720p-${activeSlideIndex}`,
        quality: `720p HD (MP4)`,
        resolution: '720x1280 HD',
        extension: 'mp4',
        size: 'Standard HD',
        downloadUrl: currentSlide.downloadUrl || `/api/download/proxy?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(`insta1000gram_${prefix}_${slideNum}_720p.mp4`)}&type=video`,
        directUrl,
      });
      dynamicList.push({
        id: `slide-fmt-audio-${activeSlideIndex}`,
        quality: translations.downloadAudio || 'Audio Only (MP3)',
        resolution: '320 kbps Original Track',
        extension: 'mp3',
        size: 'Original Audio',
        downloadUrl: `/api/download/proxy?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(`insta1000gram_${prefix}_${slideNum}_audio.mp3`)}&type=audio&quality=audio`,
        directUrl,
        isAudio: true,
      });
    } else {
      dynamicList.push({
        id: `slide-fmt-photo-${activeSlideIndex}`,
        quality: `Original Master HD (JPG)`,
        resolution: currentSlide.resolution || 'Original Full HD',
        extension: 'jpg',
        size: 'Lossless Original',
        downloadUrl: currentSlide.downloadUrl || `/api/download/proxy?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(`insta1000gram_${prefix}_${slideNum}.jpg`)}&type=photo&quality=original`,
        directUrl,
      });
    }

    // Preserve the ZIP download format if present in the main result
    const zipFormat = result.formats?.find((f) => f.extension === 'zip');
    if (zipFormat) {
      dynamicList.push(zipFormat);
    }

    return dynamicList;
  }, [currentSlide, activeSlideIndex, result, translations]);

  const primaryFormat =
    activeFormats.find((f) => f.quality?.includes('1080p') || f.quality?.includes('Master')) ||
    activeFormats[0] || {
      id: 'fmt-direct',
      quality: '1080p Full HD',
      resolution: '1080p HD',
      extension: isSlideVideo ? 'mp4' : 'jpg',
      size: 'HD',
      downloadUrl: result?.directUrl || '',
      directUrl: result?.directUrl || '',
    };
  const activeFormatForQr = selectedQrFormat || primaryFormat;

  const directCandidate =
    activeFormatForQr?.directUrl ||
    result?.directUrl ||
    currentSlide?.directUrl ||
    activeVideoUrl ||
    result?.sourceUrl;
  const proxyCandidate =
    activeFormatForQr?.downloadUrl ||
    currentSlide?.downloadUrl ||
    primaryFormat?.downloadUrl ||
    '';
  const fullProxyUrl = proxyCandidate.startsWith('http')
    ? proxyCandidate
    : typeof window !== 'undefined'
    ? `${window.location.origin}${proxyCandidate}`
    : proxyCandidate;
  const fullQrTargetUrl = qrMode === 'direct' && directCandidate ? directCandidate : fullProxyUrl;

  // Generate ultra-short, camera-scannable QR code whenever the modal opens or format changes
  useEffect(() => {
    if (!isQrModalOpen) return;

    let isMounted = true;
    setIsGeneratingQr(true);

    const targetMediaUrl = fullQrTargetUrl;
    const ext = activeFormatForQr?.extension || (isSlideVideo ? 'mp4' : 'jpg');
    const targetFilename = `insta1000gram_${result.type}_${(
      activeFormatForQr?.quality || '1080p'
    ).replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;

    fetch('/api/qr/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: targetMediaUrl,
        proxyUrl: fullProxyUrl,
        mode: qrMode,
        sourceUrl: result.sourceUrl,
        slideIndex: activeSlideIndex,
        extension: ext,
        filename: targetFilename,
        quality: activeFormatForQr?.quality || '1080p Ultra HD',
        thumbnail: activeThumbnail,
        author: result.author.username,
      }),
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (!isMounted) return;
        const mobileUrl =
          data.shortUrl ||
          (typeof window !== 'undefined' ? `${window.location.origin}${data.path}` : data.path);
        setQrShortUrl(mobileUrl);
        const dataUrl = await QRCode.toDataURL(mobileUrl, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (!isMounted) return;
        setQrCodeDataUrl(dataUrl);
        setIsGeneratingQr(false);
      })
      .catch(async () => {
        if (!isMounted) return;
        const fallbackDlUrl = fullProxyUrl || targetMediaUrl;
        setQrShortUrl(fallbackDlUrl);
        try {
          const dataUrl = await QRCode.toDataURL(fallbackDlUrl, {
            width: 280,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' },
          });
          if (isMounted) setQrCodeDataUrl(dataUrl);
        } catch {}
        if (isMounted) setIsGeneratingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isQrModalOpen, activeFormatForQr, qrMode, activeSlideIndex, result.sourceUrl]);

  /**
   * Complete download pipeline with LIVE PROGRESS TRACKING:
   * 1. Connects to streaming proxy endpoint
   * 2. Reads chunks via response.body.getReader()
   * 3. Live calculates percent, downloaded MB, total MB, speed
   * 4. Converts to binary Blob
   * 5. Triggers native browser download dialog
   * 6. Provides instant browser fallback link
   */
  const downloadViaBlob = async (targetUrl: string, filename: string, formatId?: string) => {
    const fid = formatId || 'default';
    setDownloadingFormatId(fid);
    setDownloadError(null);

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Build the proxy download URL if targetUrl is raw or relative
    let downloadProxyUrl = targetUrl;
    if (
      !downloadProxyUrl.startsWith('/api/download/proxy') &&
      !downloadProxyUrl.includes('/api/download/proxy') &&
      !downloadProxyUrl.startsWith('/api/download/zip') &&
      !downloadProxyUrl.includes('/api/download/zip')
    ) {
      const ext = safeFilename.split('.').pop()?.toLowerCase() || 'mp4';
      const isImg = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
      const type = ext === 'mp3' ? 'audio' : isImg ? 'photo' : 'video';
      downloadProxyUrl = `/api/download/proxy?url=${encodeURIComponent(
        targetUrl
      )}&filename=${encodeURIComponent(safeFilename)}&type=${type}`;
    }

    setDownloadProgress({
      formatId: fid,
      filename: safeFilename,
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
      downloadUrl: downloadProxyUrl,
      status: 'connecting',
    });

    try {
      setDownloadSuccessMessage({
        text: `${translations.downloading || 'Downloading'} ${safeFilename}...`,
        url: downloadProxyUrl,
      });

      // 1. Fetch binary data through the server-side proxy
      const response = await fetch(downloadProxyUrl, {
        method: 'GET',
        headers: {
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        let errBody = '';
        try {
          const jsonErr = await response.json();
          errBody = jsonErr.error || jsonErr.message || '';
        } catch {}
        throw new Error(
          errBody || `Download server returned HTTP ${response.status} (${response.statusText})`
        );
      }

      const contentLength = Number(response.headers.get('content-length')) || 0;
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      const startTime = Date.now();

      // 2. Read live data chunks with real progress calculation
      if (response.body && response.body.getReader) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedLength += value.length;
            const elapsed = (Date.now() - startTime) / 1000;
            const speedMb =
              elapsed > 0 ? (receivedLength / (1024 * 1024) / elapsed).toFixed(1) : '1.5';

            let pct = -1;
            if (contentLength > 0) {
              pct = Math.min(99, Math.round((receivedLength / contentLength) * 100));
            } else {
              // Exact: Content-Length unavailable, do not fake a percentage
              pct = -1;
            }

            setDownloadProgress({
              formatId: fid,
              filename: safeFilename,
              percent: pct,
              loadedBytes: receivedLength,
              totalBytes: contentLength,
              speedText: `${speedMb} MB/s`,
              downloadUrl: downloadProxyUrl,
              status: 'downloading',
            });
          }
        }
      } else {
        const blobFallback = await response.blob();
        chunks.push(new Uint8Array(await blobFallback.arrayBuffer()));
        receivedLength = blobFallback.size;
      }

      const sizeMb = (receivedLength / (1024 * 1024)).toFixed(1);
      const contentType =
        response.headers.get('content-type') ||
        (safeFilename.endsWith('.zip')
          ? 'application/zip'
          : safeFilename.endsWith('.mp4')
          ? 'video/mp4'
          : 'image/jpeg');

      // 3. Assemble binary Blob
      const blob = new Blob(chunks as BlobPart[], { type: contentType });
      if (!blob || blob.size === 0) {
        throw new Error('Downloaded media file is empty (0 bytes received).');
      }

      // 4. Verify that response is media and not an HTML error
      if (
        blob.type.includes('text/html') ||
        blob.type.includes('text/plain') ||
        blob.type.includes('application/json')
      ) {
        const textSample = await blob.text();
        let extractedErr = 'Received HTML page instead of playable media data.';
        try {
          const parsed = JSON.parse(textSample);
          if (parsed.error) extractedErr = parsed.error;
        } catch {}
        throw new Error(extractedErr);
      }

      // Mark progress 100%
      setDownloadProgress({
        formatId: fid,
        filename: safeFilename,
        percent: 100,
        loadedBytes: receivedLength,
        totalBytes: receivedLength,
        speedText: 'Complete',
        downloadUrl: downloadProxyUrl,
        status: 'completed',
      });

      // 5. Create same-origin Object URL and trigger download
      const objectUrl = window.URL.createObjectURL(blob);
      const tempAnchor = document.createElement('a');
      tempAnchor.style.display = 'none';
      tempAnchor.href = objectUrl;
      tempAnchor.download = safeFilename;
      document.body.appendChild(tempAnchor);
      tempAnchor.click();
      document.body.removeChild(tempAnchor);

      setTimeout(() => {
        try {
          window.URL.revokeObjectURL(objectUrl);
        } catch {}
      }, 30000);

      setDownloadSuccessMessage({
        text: `${translations.downloadComplete || 'Downloaded'} ${safeFilename} (${sizeMb} MB) ${
          translations.savingToDevice || 'saved to your device!'
        }`,
        url: downloadProxyUrl,
      });
    } catch (err: any) {
      console.error('[insta1000gram] Download error:', err);
      const errMsg = err?.message || 'Download failed. Please try the direct mirror link.';
      setDownloadError(errMsg);
      setDownloadProgress({
        formatId: fid,
        filename: safeFilename,
        percent: 0,
        loadedBytes: 0,
        totalBytes: 0,
        downloadUrl: downloadProxyUrl,
        status: 'error',
        errorMessage: errMsg,
      });

      // Direct fallback
      try {
        const fallbackAnchor = document.createElement('a');
        fallbackAnchor.href = downloadProxyUrl;
        fallbackAnchor.target = '_blank';
        fallbackAnchor.rel = 'noopener noreferrer';
        fallbackAnchor.download = safeFilename;
        document.body.appendChild(fallbackAnchor);
        fallbackAnchor.click();
        document.body.removeChild(fallbackAnchor);
      } catch {}
    } finally {
      setDownloadingFormatId(null);
    }
  };

  const handleTriggerDownload = (format: MediaFormat) => {
    const isZip = format.extension === 'zip';
    const filename = isZip
      ? `insta1000gram_${result.type || 'album'}_all.zip`
      : `insta1000gram_${result.type}_${format.quality.replace(/[^a-zA-Z0-9]/g, '_')}.${
          format.extension
        }`;

    let downloadTarget = format.downloadUrl || format.directUrl || '';
    if (!isZip) {
      const candidate =
        format.directUrl ||
        (format.downloadUrl?.includes('url=')
          ? decodeURIComponent(format.downloadUrl.split('url=')[1].split('&')[0])
          : '');
      const isDirectMediaCdn =
        candidate && !candidate.includes('instagram.com/reel') && !candidate.includes('instagram.com/p/');
      if (isDirectMediaCdn) {
        const ext = (format.extension || '').toLowerCase();
        const isImg = ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
        const proxyType = format.isAudio || ext === 'mp3' ? 'audio' : isImg ? 'photo' : 'video';
        downloadTarget = `/api/download/proxy?url=${encodeURIComponent(
          candidate
        )}&filename=${encodeURIComponent(filename)}&type=${proxyType}`;
      }
    }
    if (downloadTarget) {
      downloadViaBlob(downloadTarget, filename, format.id);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 my-6 sm:my-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
        {/* Top Badges Bar */}
        <div className="bg-slate-50 px-5 sm:px-8 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              {localizeMediaBadge(result.type)}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 font-semibold text-slate-500">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {isAr ? `سرعة الاستجابة ${safeNetworkLatencyMs}ms` : `${safeNetworkLatencyMs}ms CDN Stream`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {translations.anonymousBadge || (isAr ? 'تصفح مجهول نشط' : 'Anonymous Active')}
            </span>
            <button
              onClick={onClear}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              title={translations.close || (isAr ? 'إغلاق' : 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LIVE DOWNLOAD PROGRESS BAR CARD */}
        {downloadProgress && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-4 rounded-2xl border transition-all ${
              downloadProgress.status === 'completed'
                ? 'bg-emerald-50/70 border-emerald-300'
                : downloadProgress.status === 'error'
                ? 'bg-rose-50 border-rose-300'
                : 'bg-gradient-to-r from-pink-50/80 via-purple-50/50 to-indigo-50/80 border-pink-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {downloadProgress.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : downloadProgress.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-pink-600 animate-spin shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {downloadProgress.status === 'completed'
                      ? (translations.downloadComplete || 'Download Complete!')
                      : downloadProgress.status === 'error'
                      ? (translations.downloadNotice || 'Download Notice')
                      : (translations.downloading || 'Downloading...')}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    {downloadProgress.filename}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                {downloadProgress.status === 'completed' ? (
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{translations.downloadComplete || 'Download complete'}</span>
                  </span>
                ) : downloadProgress.percent >= 0 ? (
                  <span className="text-sm sm:text-base font-black text-pink-600 font-mono">
                    {downloadProgress.percent}%
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-pink-600 font-mono">
                    {(downloadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>

            {/* Visual Animated Progress Bar Track */}
            <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/60 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  downloadProgress.status === 'completed'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : downloadProgress.status === 'error'
                    ? 'bg-rose-500'
                    : downloadProgress.percent >= 0
                    ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 animate-pulse'
                }`}
                style={{
                  width:
                    downloadProgress.status === 'completed'
                      ? '100%'
                      : downloadProgress.percent >= 0
                      ? `${Math.max(5, downloadProgress.percent)}%`
                      : '100%',
                }}
              />
            </div>

            {/* Bottom info stats and immediate browser download fallback */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-600 font-medium">
              <div>
                {downloadProgress.status === 'completed' ? (
                  <span className="text-emerald-700 font-bold">
                    ✓ {translations.downloadComplete || 'Download complete'} • {(downloadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                ) : downloadProgress.status === 'error' ? (
                  <span className="text-rose-700">{downloadProgress.errorMessage}</span>
                ) : (
                  <span>
                    {(downloadProgress.loadedBytes / (1024 * 1024)).toFixed(1)} MB
                    {downloadProgress.totalBytes > 0
                      ? ` / ${(downloadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB`
                      : ` ${translations.downloaded || 'downloaded'}`}
                    {downloadProgress.speedText && ` • ${downloadProgress.speedText}`}
                  </span>
                )}
              </div>

              {downloadProgress.downloadUrl && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <a
                    href={downloadProgress.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:text-pink-700 font-bold underline flex items-center gap-1"
                  >
                    <span>{translations.browserDownloadFallback || 'Save directly in browser'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Result Content */}
        <div className="p-5 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Media Preview + Slide Carousel */}
          <div className="md:col-span-5 flex flex-col items-center">
            {/* Creator Author Bar */}
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={authorAvatarSrc}
                  alt={authorUsername}
                  onError={() => {
                    if (authorAvatarSrc !== fallbackAvatarUrl) {
                      setAuthorAvatarSrc(fallbackAvatarUrl);
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-pink-200 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800 block truncate">
                    @{authorUsername}
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium">
                    {translations.creatorBadge || 'Instagram Creator'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold">
                {safeLikesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    {safeLikesCount > 999
                      ? `${(safeLikesCount / 1000).toFixed(1)}k`
                      : safeLikesCount}
                  </span>
                )}
                {safeCommentsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                    {safeCommentsCount}
                  </span>
                )}
              </div>
            </div>

            {/* Media Player or Thumbnail Box */}
            <div className="relative w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-md group">
              {isSlideVideo && activeVideoUrl ? (
                <video
                  key={activeVideoUrl}
                  src={activeVideoUrl}
                  poster={activeThumbnail}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  key={activeThumbnail}
                  src={activeThumbnail}
                  alt={result.title || 'Instagram media'}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (currentSlide?.directUrl && !img.src.includes('/api/download/proxy')) {
                      img.src = `/api/download/proxy?url=${encodeURIComponent(
                        currentSlide.directUrl
                      )}&type=photo`;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Slide Counter Overlay for Carousel / Highlights */}
              {result.slides && result.slides.length > 1 && (
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span>
                    #{activeSlideIndex + 1} / {result.slides.length}
                  </span>
                </div>
              )}

              {/* HD Badge Overlay */}
              <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>{translations.readyInHD || '1080p Ultra HD'}</span>
              </div>
            </div>

            {/* Multi-Slide Thumbnail Selector (If Carousel, Stories, or Highlights) */}
            {result.slides && result.slides.length > 1 && (
              <div className="w-full mt-3">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <p className="text-xs font-bold text-slate-700">
                    {result.type === 'stories' || result.type === 'story'
                      ? (translations.storiesList || 'Stories List')
                      : result.type === 'highlight'
                      ? (translations.highlightItems || 'Highlight Items')
                      : (translations.carouselSlides || 'Carousel Slides')}{' '}
                    ({result.slides.length} {isAr ? 'عنصر' : 'items'}):
                  </p>
                  <span className="text-[11px] text-pink-600 font-semibold">
                    #{activeSlideIndex + 1} ({currentSlide?.type === 'video' ? (translations.videoLabel || 'Video') : (translations.photoLabel || 'Photo')})
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {result.slides.map((slide, idx) => (
                    <button
                      key={slide.id || idx}
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeSlideIndex === idx
                          ? 'border-pink-600 scale-105 shadow-md ring-2 ring-pink-400/50'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                      title={`Select Item #${idx + 1}`}
                    >
                      <img
                        src={slide.thumbnail}
                        alt={`Item ${idx + 1}`}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/75 text-white text-[9px] px-1 font-bold">
                        #{idx + 1}
                      </span>
                      {slide.type === 'video' && (
                        <div className="absolute top-1 left-1 bg-black/60 rounded-full p-0.5">
                          <Play className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Title, Caption, Formats List */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug line-clamp-2">
                {isAr
                  ? (result.title || '')
                      .replace(/^Instagram Reels \/ Media Stream$/i, 'مقطع ريلز / وسائط انستقرام')
                      .replace(/^Instagram Video by @/i, 'فيديو انستقرام من حساب @')
                      .replace(/^Instagram Post by @/i, 'منشور انستقرام من حساب @')
                      .replace(/^Instagram Story by @/i, 'ستوري انستقرام من حساب @')
                      .replace(/^Instagram Highlight by @/i, 'هايلايت انستقرام من حساب @')
                  : result.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {isAr
                  ? (result.caption || '')
                      .replace(
                        /Original high-definition media fetched via (1kgram|insta1000gram)\./i,
                        'وسائط أصلية فائقة الوضوح تم استخراجها عبر 1kgram.'
                      )
                  : result.caption}
              </p>

              {/* Download Success Notice with Direct Mirror Link */}
              {downloadSuccessMessage && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{downloadSuccessMessage.text}</span>
                  </div>
                  {downloadSuccessMessage.url && (
                    <a
                      href={downloadSuccessMessage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap self-end sm:self-auto"
                    >
                      {translations.directLink || 'Mirror / Open File ↗'}
                    </a>
                  )}
                </div>
              )}

              {/* Active Slide / Story Download Action Box */}
              {currentSlide && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border border-pink-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-pink-700 tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                      {result.type === 'stories' || result.type === 'story'
                        ? `${translations.downloadStory || 'Download Story'} #${activeSlideIndex + 1}`
                        : result.type === 'highlight'
                        ? `${translations.downloadHighlight || 'Download Highlight'} #${activeSlideIndex + 1}`
                        : `${translations.downloadSlide || 'Download Slide'} #${activeSlideIndex + 1}`}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      {currentSlide.type === 'video'
                        ? (isAr ? 'فيديو MP4' : 'MP4 Video')
                        : (isAr ? 'صورة JPG' : 'JPG Image')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const ext = currentSlide.type === 'video' ? 'mp4' : 'jpg';
                        const prefix =
                          result.type === 'highlight'
                            ? 'highlight'
                            : result.type === 'carousel'
                            ? 'carousel'
                            : result.type || 'media';
                        const filename = `insta1000gram_${prefix}_${activeSlideIndex + 1}.${ext}`;
                        const url = currentSlide.downloadUrl || currentSlide.url;
                        downloadViaBlob(url, filename, `slide-${activeSlideIndex}`);
                      }}
                      disabled={downloadingFormatId === `slide-${activeSlideIndex}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-75"
                    >
                      {downloadingFormatId === `slide-${activeSlideIndex}` ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>
                            {downloadProgress?.formatId === `slide-${activeSlideIndex}` &&
                            downloadProgress.percent > 0
                              ? `${translations.downloading || 'Downloading'} ${downloadProgress.percent}%`
                              : translations.downloading || 'Downloading...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>
                            {currentSlide.type === 'video'
                              ? translations.downloadVideo || 'Download Video (MP4)'
                              : translations.downloadPhoto || 'Download Image (JPG)'}
                          </span>
                        </>
                      )}
                    </button>

                    <a
                      href={currentSlide.downloadUrl || currentSlide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white border border-pink-200 text-pink-700 hover:bg-pink-100/50 transition-colors"
                      title={translations.directLink || 'Direct Link in New Tab / Mirror'}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Available Formats Section */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {translations.availableStreamsTitle || translations.readyInHD || 'Available Streams & Resolutions'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedQrFormat(primaryFormat);
                      setIsQrModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-700 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{translations.scanQrCode || 'Scan with Phone'}</span>
                  </button>
                </div>

                {activeFormats.map((fmt) => {
                  const isCurrentLoading = downloadingFormatId === fmt.id;
                  const isAudio = fmt.isAudio;
                  const isZip = fmt.extension === 'zip';

                  return (
                    <div
                      key={fmt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 rounded-2xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/20 bg-slate-50/50 transition-all gap-3"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isZip
                              ? 'bg-purple-100 text-purple-800'
                              : isAudio
                              ? 'bg-amber-100 text-amber-800'
                              : fmt.quality.includes('1080p')
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isZip ? (
                            <Archive className="w-4 h-4" />
                          ) : isAudio ? (
                            <Music className="w-4 h-4" />
                          ) : (
                            fmt.extension.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {localizeQualityLabel(fmt.quality)}
                            </span>
                            {fmt.quality.includes('1080p') && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white shrink-0">
                                {isAr ? 'فائق الوضوح' : 'ULTRA HD'}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium block truncate">
                            {localizeResolutionLabel(fmt.resolution)} • {localizeSizeLabel(fmt.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        {/* Interactive Direct Blob Download with Live Progress */}
                        <button
                          type="button"
                          onClick={() => handleTriggerDownload(fmt)}
                          disabled={isCurrentLoading}
                          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer disabled:opacity-75 ${
                            isZip
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                              : fmt.quality.includes('1080p')
                              ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isCurrentLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>
                                {downloadProgress?.formatId === fmt.id && downloadProgress.percent > 0
                                  ? `${translations.downloading || 'Downloading'} ${downloadProgress.percent}%`
                                  : translations.downloading || 'Downloading...'}
                              </span>
                            </>
                          ) : (
                            <>
                              {isZip ? <Archive className="w-3.5 h-3.5 shrink-0" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
                              <span>
                                {isZip
                                  ? translations.downloadZip || 'Download All (.ZIP)'
                                  : translations.downloadFileBtn}
                              </span>
                            </>
                          )}
                        </button>

                        {/* Phone QR Code */}
                        {!isZip && (
                          <button
                            onClick={() => {
                              setSelectedQrFormat(fmt);
                              setIsQrModalOpen(true);
                            }}
                            className="p-2.5 sm:p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-pink-600 hover:border-pink-300 transition-colors cursor-pointer shrink-0"
                            title={`Scan QR code for ${fmt.quality} on phone`}
                          >
                            <QrCode className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}

                        {/* Mirror in New Tab */}
                        <a
                          href={fmt.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 sm:p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-pink-600 hover:border-pink-200 transition-colors shrink-0"
                          title="Open in New Tab / Mirror"
                        >
                          <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* All Items Quick Download List if Multi-Item */}
              {result.slides && result.slides.length > 1 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                    {result.type === 'highlight'
                      ? (translations.highlightItems || 'Highlight Items')
                      : result.type === 'carousel'
                      ? (translations.carouselSlides || 'Carousel Slides')
                      : (translations.storiesList || 'Stories')}{' '}
                    ({result.slides.length} {isAr ? 'متاح' : 'Available'})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {result.slides.map((s, idx) => {
                      const isItemLoading = downloadingFormatId === `item-${idx}`;
                      const ext = s.type === 'video' ? 'mp4' : 'jpg';
                      const prefix =
                        result.type === 'highlight'
                          ? 'highlight'
                          : result.type === 'carousel'
                          ? 'carousel'
                          : 'story';
                      const filename = `insta1000gram_${prefix}_${idx + 1}.${ext}`;
                      return (
                        <button
                          key={s.id || idx}
                          type="button"
                          onClick={() =>
                            downloadViaBlob(s.downloadUrl || s.url, filename, `item-${idx}`)
                          }
                          disabled={isItemLoading}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/30 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[10px] flex items-center justify-center text-slate-700 shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {result.type === 'highlight'
                                ? (translations.itemLabel || 'Item')
                                : result.type === 'carousel'
                                ? (translations.slideLabel || 'Slide')
                                : (translations.storyLabel || 'Story')}{' '}
                              #{idx + 1} ({s.type === 'video' ? 'MP4' : 'JPG'})
                            </span>
                          </div>
                          {isItemLoading ? (
                            <Loader2 className="w-3.5 h-3.5 text-pink-600 animate-spin shrink-0" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <a
                href={result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
              >
                <span>{translations.viewOriginalPost || 'View original post on Instagram'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={onClear}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {translations.downloadAnother || 'Download Another Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PHONE QR CODE TRANSFER MODAL (Rendered to document.body via Portal) */}
      {isQrModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
            onClick={() => setIsQrModalOpen(false)}
          >
            <div
              className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200 z-[100000]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20 shrink-0">
                    <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-1.5 flex-wrap">
                      <span>{translations.scanQrCode || 'Scan to Phone'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-700 uppercase">
                        {activeFormatForQr?.quality.split(' ')[0] || '1080p'}
                      </span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      {translations.pointCamera || 'Point camera to save directly into Camera Roll / Gallery'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
                  title={translations.close || 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Stream Mode Selector */}
              <div className="mt-3.5 p-1 bg-slate-100 rounded-xl flex items-center text-xs font-bold">
                <button
                  onClick={() => setQrMode('direct')}
                  className={`flex-1 py-1.5 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs ${
                    qrMode === 'direct'
                      ? 'bg-white text-pink-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {translations.directMobileStream || '⚡ Direct Mobile Stream'}
                </button>
                <button
                  onClick={() => setQrMode('proxy')}
                  className={`flex-1 py-1.5 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs ${
                    qrMode === 'proxy'
                      ? 'bg-white text-pink-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {translations.downloadProxy || '🌐 Download Proxy'}
                </button>
              </div>

              {/* QR Code Container with sleek scan frame */}
              <div className="my-4 sm:my-5 flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-xl flex flex-col items-center relative w-full max-w-[250px] min-h-[220px] justify-center">
                  {isGeneratingQr ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                      <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-2" />
                      <span className="text-xs font-semibold">{translations.generatingQr || 'Generating HD QR code...'}</span>
                    </div>
                  ) : qrCodeDataUrl ? (
                    <>
                      <img
                        src={qrCodeDataUrl}
                        alt="Scan QR code with phone camera"
                        width={220}
                        height={220}
                        className="rounded-xl block shadow-2xs max-w-[190px] sm:max-w-[220px] w-full h-auto aspect-square object-contain"
                        loading="eager"
                      />
                      <div className="mt-2.5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-800">
                          <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {activeFormatForQr?.quality || '1080p Ultra HD'} • {translations.scanFastBadge || 'Scans in 0.1s'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-rose-500 p-4 font-bold">
                      Failed to render QR. Use the link below.
                    </div>
                  )}
                </div>
                {qrShortUrl && (
                  <p className="mt-2 text-[11px] text-slate-400 font-mono tracking-tight break-all text-center">
                    {qrShortUrl.replace(/^https?:\/\//, '')}
                  </p>
                )}
              </div>

              {/* Platform Instructions */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <span className="text-base leading-none shrink-0">🍏</span>
                  <div>
                    <p className="font-bold text-slate-900">{translations.iosGuideTitle || 'iPhone / iPad (iOS):'}</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {translations.iosGuideDesc || 'Open Camera app → aim at code → tap yellow banner → tap Download.'}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                  <span className="text-base leading-none shrink-0">🤖</span>
                  <div>
                    <p className="font-bold text-slate-900">{translations.androidGuideTitle || 'Android (Samsung, Pixel, Xiaomi):'}</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {translations.androidGuideDesc || 'Open Camera or Google Lens → tap popup link → file saves directly into Gallery / Downloads.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrShortUrl || fullQrTargetUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">{translations.linkCopied || 'Link Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{translations.copyMobileLink || 'Copy Mobile Link'}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={qrShortUrl || fullQrTargetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    title="Preview this exact link in your browser"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{translations.testLink || 'Test Link'}</span>
                  </a>

                  <button
                    onClick={() => setIsQrModalOpen(false)}
                    className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    {translations.close || 'Done'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
